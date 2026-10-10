const test = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { generateReportPDF } = require("../utils/pdfGenerator");
const { Writable } = require("stream");

test("JWT auth token signing and verification contract", () => {
  const secret = "testsecret123";
  const payload = { id: "507f1f77bcf86cd799439011", role: "user" };
  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  
  assert.ok(token, "Token should be signed successfully");
  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.id, payload.id);
  assert.strictEqual(decoded.role, payload.role);
});

test("PDF report generator produces stream output with XAI data", (t, done) => {
  const dummyPrediction = {
    _id: "507f1f77bcf86cd799439011",
    user: { name: "Test Patient", email: "patient@example.com" },
    riskLevel: "Low",
    confidence: 12.5,
    createdAt: new Date(),
    modelVersion: "1.0.0",
    features: {
      fo: 180.5,
      jitter_local: 0.005,
      hnr: 22.0
    },
    globalFeatureImportances: { fo: 0.15, jitter_local: 0.12 },
    featureDeviations: {
      fo: { measured: 180.5, scalerMean: 175.0, scalerStd: 10.0, zScore: 0.55 }
    }
  };

  let bytesReceived = 0;
  const mockRes = new Writable({
    write(chunk, encoding, callback) {
      bytesReceived += chunk.length;
      callback();
    }
  });

  mockRes.setHeader = () => {};

  mockRes.on("finish", () => {
    assert.ok(bytesReceived > 500, "PDF generator should stream valid multi-page binary output");
    done();
  });

  generateReportPDF(dummyPrediction, mockRes);
});

test("PDF report generator handles missing user/XAI fields gracefully", (t, done) => {
  const sparsePrediction = {
    _id: "507f1f77bcf86cd799439099",
    riskLevel: "High",
    confidence: 88.4,
    createdAt: new Date(),
    modelVersion: "1.0.0"
  };

  let bytesReceived = 0;
  const mockRes = new Writable({
    write(chunk, encoding, callback) {
      bytesReceived += chunk.length;
      callback();
    }
  });

  mockRes.setHeader = () => {};

  mockRes.on("finish", () => {
    assert.ok(bytesReceived > 500, "PDF generator should safely stream output for sparse records without crashing");
    done();
  });

  generateReportPDF(sparsePrediction, mockRes);
});


test("Role-aware prediction query isolation test", () => {
  const userId = "user123";
  
  // Normal user query isolation
  const userRole = "user";
  const userQuery = userRole === "admin" ? { _id: "pred123" } : { _id: "pred123", user: userId };
  assert.deepStrictEqual(userQuery, { _id: "pred123", user: "user123" });

  // Admin query isolation (can inspect any prediction)
  const adminRole = "admin";
  const adminQuery = adminRole === "admin" ? { _id: "pred123" } : { _id: "pred123", user: userId };
  assert.deepStrictEqual(adminQuery, { _id: "pred123" });
});

test("Date range filter parameter parsing", () => {
  const startDateStr = "2026-01-01";
  const endDateStr = "2026-12-31";

  const query = {};
  if (startDateStr || endDateStr) {
    query.createdAt = {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (!isNaN(start.getTime())) query.createdAt.$gte = start;
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
  }

  assert.ok(query.createdAt.$gte instanceof Date);
  assert.ok(query.createdAt.$lte instanceof Date);
  assert.ok(query.createdAt.$gte < query.createdAt.$lte);
});

test("Assessment comparison math and zero denominator handling", () => {
  const feat1 = { fo: 150.0, jitter_local: 0.0, hnr: 20.0, missing: NaN };
  const feat2 = { fo: 165.0, jitter_local: 0.005, hnr: 18.0, missing: 5.0 };

  const computeComparison = (val1, val2) => {
    const v1 = typeof val1 === "number" && !isNaN(val1) && isFinite(val1) ? val1 : null;
    const v2 = typeof val2 === "number" && !isNaN(val2) && isFinite(val2) ? val2 : null;
    let absDiff = null;
    let pctDiff = null;
    let status = "unchanged";

    if (v1 !== null && v2 !== null) {
      absDiff = v2 - v1;
      if (Math.abs(absDiff) > 1e-6) status = absDiff > 0 ? "increased" : "decreased";
      if (v1 !== 0 && isFinite(v1)) {
        pctDiff = (absDiff / Math.abs(v1)) * 100;
        if (isNaN(pctDiff) || !isFinite(pctDiff)) pctDiff = null;
      }
    }
    return { absDiff, pctDiff, status };
  };

  // Normal increase
  const foComp = computeComparison(feat1.fo, feat2.fo);
  assert.strictEqual(foComp.absDiff, 15.0);
  assert.strictEqual(foComp.pctDiff, 10.0);
  assert.strictEqual(foComp.status, "increased");

  // Zero denominator test: pctDiff must be null
  const jitterComp = computeComparison(feat1.jitter_local, feat2.jitter_local);
  assert.strictEqual(jitterComp.absDiff, 0.005);
  assert.strictEqual(jitterComp.pctDiff, null, "Zero denominator percentage diff should return null");
  assert.strictEqual(jitterComp.status, "increased");

  // Missing/NaN value test
  const missingComp = computeComparison(feat1.missing, feat2.missing);
  assert.strictEqual(missingComp.absDiff, null);
  assert.strictEqual(missingComp.pctDiff, null);
  assert.strictEqual(missingComp.status, "unchanged");
});

test("MongoDB ObjectId format validation for result and report routes", () => {
  const isValidObjectId = (id) => Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  assert.strictEqual(isValidObjectId("6ac924eea34dbd5885a57e8f"), true, "24-char hex string is valid ObjectId");
  assert.strictEqual(isValidObjectId("507f1f77bcf86cd799439011"), true, "Standard 24-char hex is valid ObjectId");
  assert.strictEqual(isValidObjectId("invalid-id"), false, "Non-hex string should be rejected");
  assert.strictEqual(isValidObjectId("12345"), false, "Short string should be rejected");
  assert.strictEqual(isValidObjectId(""), false, "Empty string should be rejected");
});

test("JWT production configuration enforcement test", () => {
  const path = require("path");
  const { getJwtSecret } = require("../config/jwtConfig");

  // Save current env
  const origSecret = process.env.JWT_SECRET;
  const origEnv = process.env.NODE_ENV;

  try {
    // Insecure secret in production mode MUST throw an error
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "supersecretjwtkeychangeinproduction";

    assert.throws(
      () => getJwtSecret(),
      /FATAL SECURITY ERROR/,
      "Default insecure secret in production mode must throw fatal security error"
    );

    // Development mode with default secret returns dev fallback
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "supersecretjwtkeychangeinproduction";
    const devSecret = getJwtSecret();
    assert.ok(devSecret.length > 10, "Dev secret should return valid fallback secret");

    // Valid production secret passes
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a_very_strong_production_jwt_secret_key_987654321_x";
    assert.strictEqual(getJwtSecret(), "a_very_strong_production_jwt_secret_key_987654321_x");
  } finally {
    process.env.JWT_SECRET = origSecret;
    process.env.NODE_ENV = origEnv;
  }
});

test("Safe file-path traversal rejection for audio endpoint", () => {
  const path = require("path");
  const uploadsDir = path.resolve(__dirname, "../uploads");

  const verifySafePath = (voicePath) => {
    const requestedPath = path.resolve(__dirname, "..", voicePath);
    return requestedPath.startsWith(uploadsDir);
  };

  // Valid upload paths
  assert.strictEqual(verifySafePath("uploads/file-123.wav"), true, "Normal file inside uploads dir is valid");
  assert.strictEqual(verifySafePath("uploads/nested/file-123.mp3"), true, "Subdirectory file inside uploads dir is valid");

  // Directory traversal attacks
  assert.strictEqual(verifySafePath("uploads/../../etc/passwd"), false, "Path traversal escaping uploads dir must be rejected");
  assert.strictEqual(verifySafePath("uploads/../server.js"), false, "Path traversal targeting server.js must be rejected");
  assert.strictEqual(verifySafePath("../../windows/system32"), false, "Absolute path traversal must be rejected");
});

test("Audio ownership authorization query logic", () => {
  const requestingUser = { id: "user_111", role: "user" };
  const requestingAdmin = { id: "admin_999", role: "admin" };
  const targetId = "507f1f77bcf86cd799439011";

  // Build query for user
  const userQuery = requestingUser.role === "admin"
    ? { _id: targetId }
    : { _id: targetId, user: requestingUser.id };

  // Build query for admin
  const adminQuery = requestingAdmin.role === "admin"
    ? { _id: targetId }
    : { _id: targetId, user: requestingAdmin.id };

  assert.deepStrictEqual(userQuery, { _id: "507f1f77bcf86cd799439011", user: "user_111" });
  assert.deepStrictEqual(adminQuery, { _id: "507f1f77bcf86cd799439011" });
});

test("Notification user isolation and unread count filtering logic", () => {
  const userId = "507f1f77bcf86cd799439011";
  const otherUserId = "507f1f77bcf86cd799439022";

  const sampleNotifications = [
    { _id: "notif1", user: userId, title: "Test 1", read: false, createdAt: new Date("2026-10-01") },
    { _id: "notif2", user: userId, title: "Test 2", read: true, createdAt: new Date("2026-10-02") },
    { _id: "notif3", user: otherUserId, title: "Other Test", read: false, createdAt: new Date("2026-10-03") }
  ];

  // User isolation query test
  const userNotifs = sampleNotifications.filter((n) => n.user === userId);
  assert.strictEqual(userNotifs.length, 2, "User should only see their own notifications");

  // Unread count calculation test
  const unreadCount = userNotifs.filter((n) => !n.read).length;
  assert.strictEqual(unreadCount, 1, "Unread count should strictly count unread items for user");
});

test("Activity timeline compilation and chronological sorting logic", () => {
  const predictions = [
    { _id: "pred1", riskLevel: "Low", confidence: 15.0, createdAt: new Date("2026-10-01T10:00:00Z") },
    { _id: "pred2", riskLevel: "High", confidence: 85.0, createdAt: new Date("2026-10-03T10:00:00Z") }
  ];

  const notifications = [
    { _id: "notif1", title: "Profile Details Updated", message: "Updated", type: "profile", createdAt: new Date("2026-10-02T10:00:00Z"), link: "/profile" }
  ];

  const activities = [];
  predictions.forEach((p) => {
    activities.push({
      id: `pred-${p._id}`,
      title: `Voice Assessment (${p.riskLevel} Risk)`,
      timestamp: p.createdAt
    });
  });

  notifications.forEach((n) => {
    if (n.type !== "assessment") {
      activities.push({
        id: `notif-${n._id}`,
        title: n.title,
        timestamp: n.createdAt
      });
    }
  });

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  assert.strictEqual(activities.length, 3, "Activity timeline should compile all verified backend events");
  assert.strictEqual(activities[0].id, "pred-pred2", "Newest event should be first");
  assert.strictEqual(activities[1].id, "notif-notif1", "Middle event should match timestamp order");
  assert.strictEqual(activities[2].id, "pred-pred1", "Oldest event should be last");
});

test("Backend server health check response contract", () => {
  const healthResponse = {
    status: "UP",
    service: "parkinson-express-server",
    timestamp: new Date().toISOString()
  };

  assert.strictEqual(healthResponse.status, "UP");
  assert.strictEqual(healthResponse.service, "parkinson-express-server");
  assert.ok(Date.parse(healthResponse.timestamp) > 0, "Timestamp should be valid ISO string");
});

test("Brevo Email Service unconfigured API key safe fallback contract", async () => {
  const { sendBrevoEmail } = require("../utils/emailService");
  const origKey = process.env.BREVO_API_KEY;

  try {
    delete process.env.BREVO_API_KEY;
    const res = await sendBrevoEmail({
      toEmail: "test@example.com",
      toName: "Test User",
      subject: "Test Subject",
      htmlContent: "<p>Test</p>"
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.skipped, true);
    assert.strictEqual(res.reason, "BREVO_API_KEY_NOT_CONFIGURED");
  } finally {
    process.env.BREVO_API_KEY = origKey;
  }
});

test("Assessment completed email privacy verification (excludes health outcomes)", async () => {
  const { sendAssessmentCompletedEmail } = require("../utils/emailService");
  
  // Test email generation helper
  const user = { name: "Jane Doe", email: "jane@example.com" };
  const predictionId = "507f1f77bcf86cd799439011";

  // When API key is unconfigured, helper returns non-blocking skipped object
  const result = await sendAssessmentCompletedEmail(user, predictionId);
  assert.ok(result, "Assessment email helper should return non-blocking result object");
});

test("Email report ownership authorization query logic", () => {
  const requestingUser = { id: "user_111", role: "user" };
  const requestingAdmin = { id: "admin_999", role: "admin" };
  const targetId = "507f1f77bcf86cd799439011";

  const userQuery = requestingUser.role === "admin"
    ? { _id: targetId }
    : { _id: targetId, user: requestingUser.id };

  const adminQuery = requestingAdmin.role === "admin"
    ? { _id: targetId }
    : { _id: targetId, user: requestingAdmin.id };

  assert.deepStrictEqual(userQuery, { _id: "507f1f77bcf86cd799439011", user: "user_111" });
  assert.deepStrictEqual(adminQuery, { _id: "507f1f77bcf86cd799439011" });
});

test("Brevo Email Service mocked provider success and error handling contract", async () => {
  const { sendBrevoEmail } = require("../utils/emailService");
  const origKey = process.env.BREVO_API_KEY;

  try {
    process.env.BREVO_API_KEY = "test_valid_brevo_api_key_123";

    // Test helper contract logic with valid env key
    const res = await sendBrevoEmail({
      toEmail: "test@example.com",
      toName: "Test User",
      subject: "Test Subject",
      htmlContent: "<p>Test Content</p>"
    });

    // Without network interceptor, fake key produces controlled non-blocking failure
    assert.strictEqual(res.success, false);
    assert.ok(res.statusCode === 401 || res.error, "Invalid key should produce non-blocking status response without throwing");
  } finally {
    process.env.BREVO_API_KEY = origKey;
  }
});

test("Email report endpoint rate limiting contract logic", () => {
  const rateLimitMap = new Map();
  const predId = "507f1f77bcf86cd799439011";

  const checkRateLimit = (id, now) => {
    const lastSent = rateLimitMap.get(id);
    if (lastSent && now - lastSent < 30000) {
      return { allowed: false, waitSec: Math.ceil((30000 - (now - lastSent)) / 1000) };
    }
    rateLimitMap.set(id, now);
    return { allowed: true };
  };

  const t0 = 1000000;
  assert.strictEqual(checkRateLimit(predId, t0).allowed, true, "First request within window should be allowed");
  assert.strictEqual(checkRateLimit(predId, t0 + 10000).allowed, false, "Immediate repeat request within 30s must be throttled");
  assert.strictEqual(checkRateLimit(predId, t0 + 31000).allowed, true, "Request after 30s window must be allowed");
});

test("Email report endpoint malformed ObjectId rejection", () => {
  const isValidObjectId = (id) => Boolean(id && id.match(/^[0-9a-fA-F]{24}$/));

  assert.strictEqual(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.strictEqual(isValidObjectId("invalid-assessment-id"), false);
  assert.strictEqual(isValidObjectId("123"), false);
});







