const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Prediction = require("../models/Prediction");
const { generateReportPDF } = require("../utils/pdfGenerator");
const { createNotification } = require("../utils/notificationHelper");
const { sendAssessmentCompletedEmail, sendReportEmail } = require("../utils/emailService");

// @desc    Upload voice file and get ML prediction
// @route   POST /api/predictions/upload
// @access  Private
const createPrediction = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded" });
    }

    const filePath = req.file.path;
    const rawPythonUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
    const pythonServiceUrl = rawPythonUrl.replace(/\/+$/, "");

    // Read file and prepare multipart form-data for Python ML service
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append("file", blob, req.file.originalname);

    // Call Python ML microservice with cold-start resilience & retry (60s timeout accommodates Render free-tier cold starts)
    let mlResponse;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        mlResponse = await axios.post(`${pythonServiceUrl}/predict`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 60000
        });
        break;
      } catch (mlErr) {
        const isRetryable =
          attempt < maxAttempts &&
          (mlErr.code === "ECONNABORTED" ||
           mlErr.code === "ECONNRESET" ||
           mlErr.code === "ECONNREFUSED" ||
           !mlErr.response ||
           mlErr.response.status === 502 ||
           mlErr.response.status === 504);

        if (isRetryable) {
          console.warn(`ML service attempt ${attempt} failed (${mlErr.message}). Retrying in 2s for cold-start recovery...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        console.error("ML service communication failed:", mlErr.message);
        // Clean up uploaded file on processing error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        const statusCode = mlErr.response?.status || 502;
        const detailMsg = mlErr.response?.data?.detail || "Machine learning microservice unavailable or returned an error";
        return res.status(statusCode).json({
          message: detailMsg,
          error: mlErr.message
        });
      }
    }

    const { features, label, probability, confidence, riskLevel, modelVersion, globalFeatureImportances, featureDeviations } = mlResponse.data;

    // Save prediction record to Database
    const relativeVoicePath = path.join("uploads", req.file.filename).replace(/\\/g, "/");

    const prediction = new Prediction({
      user: req.user.id,
      label,
      confidence,
      riskLevel,
      features,
      voicePath: relativeVoicePath,
      modelVersion: modelVersion || "1.0.0",
      globalFeatureImportances: globalFeatureImportances || {},
      featureDeviations: featureDeviations || {}
    });

    await prediction.save();

    // Trigger notification for assessment completion
    await createNotification(
      req.user.id,
      "Voice Assessment Completed",
      `Acoustic evaluation processed: ${riskLevel} Risk Classification (${confidence.toFixed(1)}% confidence).`,
      "assessment",
      `/result/${prediction._id}`
    );

    // Non-blocking email dispatch for assessment completion
    sendAssessmentCompletedEmail(req.user, prediction._id).catch((err) => console.error("Assessment email notice:", err));

    res.status(201).json(prediction);
  } catch (error) {
    console.error("Prediction creation error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user predictions (paginated, filtered)
// @route   GET /api/predictions
// @access  Private
const getPredictions = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = req.user.role === "admin" ? {} : { user: req.user.id };

  if (req.query.riskLevel && req.query.riskLevel !== "All") {
    query.riskLevel = req.query.riskLevel;
  }

  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      if (!isNaN(start.getTime())) {
        query.createdAt.$gte = start;
      }
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
  }

  try {
    const count = await Prediction.countDocuments(query);
    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      predictions,
      page,
      pages: Math.ceil(count / limit) || 1,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single prediction by ID
// @route   GET /api/predictions/:id
// @access  Private
const getPredictionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }

    const query = req.user.role === "admin" ? { _id: id } : { _id: id, user: req.user.id };
    const prediction = await Prediction.findOne(query);

    if (!prediction) {
      return res.status(404).json({ message: "Assessment record not found or access denied." });
    }

    res.json(prediction);
  } catch (error) {
    console.error("getPredictionById error:", error);
    res.status(500).json({ message: "Server error retrieving assessment record.", error: error.message });
  }
};

// @desc    Compare two prediction assessments
// @route   GET /api/predictions/compare
// @access  Private
const getPredictionComparison = async (req, res) => {
  try {
    const { id1, id2 } = req.query;

    if (!id1 || !id2) {
      return res.status(400).json({ message: "Two prediction IDs (id1 and id2) are required for comparison." });
    }

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!id1.match(objectIdPattern) || !id2.match(objectIdPattern)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }

    if (id1 === id2) {
      return res.status(400).json({ message: "Cannot compare an assessment with itself. Select two different assessments." });
    }

    const query1 = req.user.role === "admin" ? { _id: id1 } : { _id: id1, user: req.user.id };
    const query2 = req.user.role === "admin" ? { _id: id2 } : { _id: id2, user: req.user.id };

    const [pred1, pred2] = await Promise.all([
      Prediction.findOne(query1),
      Prediction.findOne(query2)
    ]);

    if (!pred1 || !pred2) {
      return res.status(404).json({ message: "One or both assessment records were not found or access was denied." });
    }

    // Determine earlier vs later deterministically by createdAt
    let earlier = pred1;
    let later = pred2;
    if (new Date(pred1.createdAt) > new Date(pred2.createdAt)) {
      earlier = pred2;
      later = pred1;
    }

    // Extract features maps into JS objects safely
    const feat1 = typeof earlier.features?.toJSON === "function" ? earlier.features.toJSON() : (earlier.features || {});
    const feat2 = typeof later.features?.toJSON === "function" ? later.features.toJSON() : (later.features || {});

    // Canonical list of features
    const allFeatureKeys = Array.from(new Set([...Object.keys(feat1), ...Object.keys(feat2)]));

    const comparisons = {};
    allFeatureKeys.forEach((key) => {
      const val1 = typeof feat1[key] === "number" && !isNaN(feat1[key]) && isFinite(feat1[key]) ? feat1[key] : null;
      const val2 = typeof feat2[key] === "number" && !isNaN(feat2[key]) && isFinite(feat2[key]) ? feat2[key] : null;

      let absDiff = null;
      let pctDiff = null;
      let status = "unchanged";

      if (val1 !== null && val2 !== null) {
        absDiff = val2 - val1;
        if (Math.abs(absDiff) > 1e-6) {
          status = absDiff > 0 ? "increased" : "decreased";
        }
        if (val1 !== 0 && isFinite(val1)) {
          pctDiff = (absDiff / Math.abs(val1)) * 100;
          if (isNaN(pctDiff) || !isFinite(pctDiff)) {
            pctDiff = null;
          }
        }
      }

      comparisons[key] = {
        earlierValue: val1 !== null ? Number(val1.toFixed(6)) : null,
        laterValue: val2 !== null ? Number(val2.toFixed(6)) : null,
        absoluteDiff: absDiff !== null ? Number(absDiff.toFixed(6)) : null,
        percentageDiff: pctDiff !== null ? Number(pctDiff.toFixed(2)) : null,
        status
      };
    });

    res.json({
      earlierAssessment: {
        _id: earlier._id,
        createdAt: earlier.createdAt,
        riskLevel: earlier.riskLevel,
        confidence: earlier.confidence,
        label: earlier.label
      },
      laterAssessment: {
        _id: later._id,
        createdAt: later.createdAt,
        riskLevel: later.riskLevel,
        confidence: later.confidence,
        label: later.label
      },
      comparisons
    });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// @desc    Get prediction dashboard stats
// @route   GET /api/predictions/stats
// @access  Private
const getPredictionStats = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user.id }).sort({ createdAt: 1 });

    const total = predictions.length;
    if (total === 0) {
      return res.json({
        totalPredictions: 0,
        positive: 0,
        negative: 0,
        latestPrediction: null,
        riskDistribution: { Low: 0, Medium: 0, High: 0 },
        monthlyCounts: [],
        timeline: []
      });
    }

    let positive = 0;
    let negative = 0;
    const riskDistribution = { Low: 0, Medium: 0, High: 0 };
    const monthlyData = {};

    predictions.forEach((p) => {
      if (p.label === 1) positive++;
      else negative++;

      riskDistribution[p.riskLevel] = (riskDistribution[p.riskLevel] || 0) + 1;

      // Group by month (YYYY-MM)
      const date = new Date(p.createdAt);
      const monthStr = date.toLocaleString("default", { month: "short", year: "numeric" });
      monthlyData[monthStr] = (monthlyData[monthStr] || 0) + 1;
    });

    const monthlyCounts = Object.keys(monthlyData).map((month) => ({
      month,
      count: monthlyData[month]
    }));

    const timeline = predictions.map((p) => ({
      date: new Date(p.createdAt).toLocaleDateString(),
      confidence: p.confidence,
      riskLevel: p.riskLevel
    }));

    res.json({
      totalPredictions: total,
      positive,
      negative,
      latestPrediction: predictions[total - 1],
      riskDistribution,
      monthlyCounts,
      timeline
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Download PDF Report
// @route   GET /api/predictions/:id/report
// @access  Private
const getPredictionReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }

    const query = req.user.role === "admin" ? { _id: id } : { _id: id, user: req.user.id };
    const prediction = await Prediction.findOne(query).populate("user", "name email");

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found or access denied." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=parkinson-report-${prediction._id}.pdf`
    );

    // Call PDF Kit generator helper and stream response
    generateReportPDF(prediction, res);
  } catch (error) {
    console.error("PDF generation failed:", error);
    res.status(500).json({ message: "Server error generating PDF report", error: error.message });
  }
};

// @desc    Get all predictions (admin-only)
// @route   GET /api/predictions/admin/all-predictions
// @access  Private/Admin
const getAllPredictionsAdmin = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const count = await Prediction.countDocuments({});
    const predictions = await Prediction.find({})
      .populate("user", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      predictions,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all users (admin-only)
// @route   GET /api/predictions/admin/all-users
// @access  Private/Admin
const getAllUsersAdmin = async (req, res) => {
  const User = require("../models/User");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const count = await User.countDocuments({});
    const users = await User.find({})
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updatePredictionReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }
    const { doctorNotes, recommendations } = req.body;
    const prediction = await Prediction.findById(id);

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" });
    }

    const now = new Date();
    let isUpdated = false;

    if (doctorNotes !== undefined) {
      prediction.doctorNotes = typeof doctorNotes === "string" ? doctorNotes.trim() : "";
      prediction.notesUpdatedAt = now;
      isUpdated = true;
    }

    if (recommendations !== undefined) {
      prediction.recommendations = typeof recommendations === "string" ? recommendations.trim() : "";
      prediction.recommendationUpdatedAt = now;
      isUpdated = true;
    }

    if (isUpdated) {
      prediction.reviewedBy = req.user?._id || req.user?.id || null;
      prediction.reviewedAt = now;
    }

    await prediction.save();

    await prediction.populate([
      { path: "user", select: "name email role" },
      { path: "reviewedBy", select: "name email" }
    ]);

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserAdmin = async (req, res) => {
  const User = require("../models/User");
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name !== undefined ? name : user.name;
    user.email = email !== undefined ? email : user.email;
    user.role = role !== undefined ? role : user.role;
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteUserAdmin = async (req, res) => {
  const User = require("../models/User");
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.deleteOne({ _id: id });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get audio file for prediction (authenticated & authorized)
// @route   GET /api/predictions/:id/audio
// @access  Private
const getPredictionAudio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }

    const query = req.user.role === "admin" ? { _id: id } : { _id: id, user: req.user.id };
    const prediction = await Prediction.findOne(query);

    if (!prediction) {
      return res.status(404).json({ message: "Assessment record not found or access denied." });
    }

    if (!prediction.voicePath) {
      return res.status(404).json({ message: "Audio recording file reference not found." });
    }

    // Resolve base uploads directory and target requested file path
    const uploadsDir = path.resolve(__dirname, "../uploads");
    const requestedPath = path.resolve(__dirname, "..", prediction.voicePath);

    // Strict path traversal check: ensure requested file is inside uploadsDir boundary
    const uploadsDirWithSep = uploadsDir.endsWith(path.sep) ? uploadsDir : uploadsDir + path.sep;
    if (!requestedPath.startsWith(uploadsDirWithSep)) {
      console.error(`Security Warning: Directory traversal blocked for path: ${prediction.voicePath}`);
      return res.status(403).json({ message: "Access denied." });
    }

    if (!fs.existsSync(requestedPath)) {
      return res.status(404).json({ message: "Audio recording file does not exist on disk." });
    }

    const ext = path.extname(requestedPath).toLowerCase();
    let contentType = "audio/wav";
    if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".webm") contentType = "audio/webm";
    else if (ext === ".ogg") contentType = "audio/ogg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");

    const stream = fs.createReadStream(requestedPath);
    stream.on("error", (streamErr) => {
      console.error("Audio ReadStream error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: "Server error reading audio file." });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("getPredictionAudio error:", error);
    res.status(500).json({ message: "Server error retrieving audio file.", error: error.message });
  }
};

// In-memory rate limiting map for report email dispatch (max 1 request per 30s per prediction ID)
const emailReportRateLimitMap = new Map();

// @desc    Email PDF report link to authenticated user
// @route   POST /api/predictions/:id/email-report
// @access  Private
const emailPredictionReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid assessment ID format." });
    }

    const query = req.user.role === "admin" ? { _id: id } : { _id: id, user: req.user.id };
    const prediction = await Prediction.findOne(query);

    if (!prediction) {
      return res.status(404).json({ message: "Assessment record not found or access denied." });
    }

    // Rate limiting check
    const now = Date.now();
    const lastSent = emailReportRateLimitMap.get(id);
    if (lastSent && now - lastSent < 30000) {
      const waitSec = Math.ceil((30000 - (now - lastSent)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSec} seconds before requesting another email for this report.` });
    }

    emailReportRateLimitMap.set(id, now);

    // Send report access email
    const result = await sendReportEmail(req.user, prediction._id);

    res.json({
      message: "Report access email request processed.",
      status: result.success ? "sent" : (result.skipped ? "skipped" : "failed"),
      messageId: result.messageId || null
    });
  } catch (error) {
    console.error("emailPredictionReport error:", error);
    res.status(500).json({ message: "Server error dispatching report email.", error: error.message });
  }
};

// @desc    Get real administrative risk analytics and trends
// @route   GET /api/predictions/admin/analytics/risk (and /api/admin/analytics/risk)
// @access  Private/Admin
const getAdminRiskAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, riskCategory } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) {
          s.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = s;
        }
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = e;
        }
      }
    }

    if (riskCategory && ["Low", "Medium", "High"].includes(riskCategory)) {
      filter.riskLevel = riskCategory;
    }

    // Fetch matched prediction records sorted chronologically
    const predictions = await Prediction.find(filter)
      .select("riskLevel confidence label createdAt user")
      .sort({ createdAt: 1 })
      .lean();

    const totalAssessments = predictions.length;
    const uniqueUserSet = new Set(predictions.map((p) => p.user?.toString()).filter(Boolean));
    const uniquePatients = uniqueUserSet.size;

    // Calculate risk distributions
    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;
    let sumConfidence = 0;
    let validConfidenceCount = 0;

    // Confidence bands
    let confBandLow = 0;   // < 35%
    let confBandMed = 0;   // 35% - 65%
    let confBandHigh = 0;  // > 65%

    predictions.forEach((p) => {
      if (p.riskLevel === "Low") lowCount++;
      else if (p.riskLevel === "Medium") mediumCount++;
      else if (p.riskLevel === "High") highCount++;

      if (typeof p.confidence === "number" && !isNaN(p.confidence)) {
        // Normalization: 0-1 scale to 0-100%
        const conf = p.confidence > 0 && p.confidence <= 1 ? p.confidence * 100 : p.confidence;
        sumConfidence += conf;
        validConfidenceCount++;

        if (conf < 35) confBandLow++;
        else if (conf <= 65) confBandMed++;
        else confBandHigh++;
      }
    });

    const calcPercentage = (count) =>
      totalAssessments > 0 ? Number(((count / totalAssessments) * 100).toFixed(2)) : 0;

    const riskDistribution = [
      { risk: "Low", count: lowCount, percentage: calcPercentage(lowCount), color: "#10b981" },
      { risk: "Medium", count: mediumCount, percentage: calcPercentage(mediumCount), color: "#f59e0b" },
      { risk: "High", count: highCount, percentage: calcPercentage(highCount), color: "#ef4444" }
    ];

    const confidenceDistribution = [
      { range: "0-35%", label: "Low Risk Band (<35%)", count: confBandLow, percentage: calcPercentage(confBandLow) },
      { range: "35-65%", label: "Medium Risk Band (35-65%)", count: confBandMed, percentage: calcPercentage(confBandMed) },
      { range: "65-100%", label: "High Risk Band (>65%)", count: confBandHigh, percentage: calcPercentage(confBandHigh) }
    ];

    const averageConfidence =
      validConfidenceCount > 0 ? Number((sumConfidence / validConfidenceCount).toFixed(2)) : 0;

    // Build daily chronological trend
    const trendMap = {};
    predictions.forEach((p) => {
      const dKey = new Date(p.createdAt).toISOString().split("T")[0];
      if (!trendMap[dKey]) {
        trendMap[dKey] = {
          date: dKey,
          total: 0,
          low: 0,
          medium: 0,
          high: 0,
          users: new Set(),
          sumConf: 0,
          confCount: 0
        };
      }
      trendMap[dKey].total++;
      if (p.riskLevel === "Low") trendMap[dKey].low++;
      else if (p.riskLevel === "Medium") trendMap[dKey].medium++;
      else if (p.riskLevel === "High") trendMap[dKey].high++;

      if (p.user) trendMap[dKey].users.add(p.user.toString());

      if (typeof p.confidence === "number" && !isNaN(p.confidence)) {
        const conf = p.confidence > 0 && p.confidence <= 1 ? p.confidence * 100 : p.confidence;
        trendMap[dKey].sumConf += conf;
        trendMap[dKey].confCount++;
      }
    });

    // Generate continuous days for clean charts if bounded range
    let rangeStart = null;
    let rangeEnd = null;

    if (filter.createdAt?.$gte) {
      rangeStart = new Date(filter.createdAt.$gte);
      rangeEnd = filter.createdAt.$lte ? new Date(filter.createdAt.$lte) : new Date();
    } else if (predictions.length > 0) {
      rangeStart = new Date(predictions[0].createdAt);
      rangeEnd = new Date(predictions[predictions.length - 1].createdAt);
    }

    const riskTrend = [];
    if (rangeStart && rangeEnd && !isNaN(rangeStart.getTime()) && !isNaN(rangeEnd.getTime())) {
      const cur = new Date(rangeStart);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(rangeEnd);
      end.setHours(23, 59, 59, 999);

      const diffDays = Math.ceil((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90 && diffDays >= 1) {
        while (cur <= end) {
          const dKey = cur.toISOString().split("T")[0];
          const entry = trendMap[dKey];
          riskTrend.push({
            date: dKey,
            total: entry ? entry.total : 0,
            low: entry ? entry.low : 0,
            medium: entry ? entry.medium : 0,
            high: entry ? entry.high : 0,
            uniquePatients: entry ? entry.users.size : 0,
            avgConfidence: entry && entry.confCount > 0 ? Number((entry.sumConf / entry.confCount).toFixed(2)) : 0
          });
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        Object.keys(trendMap).sort().forEach((dKey) => {
          const entry = trendMap[dKey];
          riskTrend.push({
            date: dKey,
            total: entry.total,
            low: entry.low,
            medium: entry.medium,
            high: entry.high,
            uniquePatients: entry.users.size,
            avgConfidence: entry.confCount > 0 ? Number((entry.sumConf / entry.confCount).toFixed(2)) : 0
          });
        });
      }
    } else {
      Object.keys(trendMap).sort().forEach((dKey) => {
        const entry = trendMap[dKey];
        riskTrend.push({
          date: dKey,
          total: entry.total,
          low: entry.low,
          medium: entry.medium,
          high: entry.high,
          uniquePatients: entry.users.size,
          avgConfidence: entry.confCount > 0 ? Number((entry.sumConf / entry.confCount).toFixed(2)) : 0
        });
      });
    }

    res.json({
      totalAssessments,
      uniquePatients,
      averageConfidence,
      riskDistribution,
      confidenceDistribution,
      riskTrend,
      safeguards: {
        isExperimentalModel: true,
        disclaimer: "Classifications generated by Random Forest model on experimental vocal features. Not a clinical diagnosis."
      }
    });
  } catch (error) {
    console.error("getAdminRiskAnalytics error:", error);
    res.status(500).json({ message: "Server error calculating risk analytics", error: error.message });
  }
};

module.exports = {
  createPrediction,
  getPredictions,
  getPredictionById,
  getPredictionComparison,
  getPredictionStats,
  getPredictionReport,
  getPredictionAudio,
  emailPredictionReport,
  getAllPredictionsAdmin,
  getAllUsersAdmin,
  updatePredictionReview,
  updateUserAdmin,
  deleteUserAdmin,
  getAdminRiskAnalytics
};

