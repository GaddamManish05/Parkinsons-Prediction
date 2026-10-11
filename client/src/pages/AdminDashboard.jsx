import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  FaUsers, FaChartLine, FaClipboardList, FaBrain, FaCog, FaSearch,
  FaUserEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaDownload,
  FaFileCsv, FaFilePdf, FaEye, FaHistory, FaStickyNote, FaMedkit, FaEnvelope, FaExclamationTriangle,
  FaCalendarAlt, FaFilter, FaRedo, FaInfoCircle, FaCheckCircle, FaTimes
} from "react-icons/fa";

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Data stores
  const [allPredictions, setAllPredictions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Sub-states
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState("name"); // name | date | predictions
  const [userFilter, setUserFilter] = useState("All"); // All | Active | Deactive

  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsFilter, setRecordsFilter] = useState("All");

  const [risksSearch, setRisksSearch] = useState("");
  const [risksFilter, setRisksFilter] = useState("All");
  const [risksSort, setRisksSort] = useState("HighestRisk"); // HighestRisk | LowestRisk | HighestConfidence | LowestConfidence | Newest | Oldest

  const [notesSearch, setNotesSearch] = useState("");
  const [recsSearch, setRecsSearch] = useState("");

  // Email Center State
  const [emailTarget, setEmailTarget] = useState("selected"); // selected | high_risk | low_risk | all
  const [emailTemplate, setEmailTemplate] = useState("reminder"); // reminder | advisory
  const [emailSubject, setEmailSubject] = useState("Appointment Reminder - Parkinson's Assessment Portal");
  const [emailBody, setEmailBody] = useState("Dear Patient,\n\nThis is a friendly reminder to schedule your follow-up vocal biomarker screening on our AI platform.\n\nBest regards,\nClinical Team");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Modals / expanded panels
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [reviewingPrediction, setReviewingPrediction] = useState(null);
  const [editingRecommendation, setEditingRecommendation] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [savingReview, setSavingReview] = useState(false);
  const [savingRecommendation, setSavingRecommendation] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // Real Risk Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("30days"); // 7days | 30days | 90days | all | custom
  const [analyticsStartDate, setAnalyticsStartDate] = useState("");
  const [analyticsEndDate, setAnalyticsEndDate] = useState("");
  const [analyticsRiskFilter, setAnalyticsRiskFilter] = useState("All");

  // Pagination states for records
  const [recordsPage, setRecordsPage] = useState(1);
  const recordsPerPage = 6;

  const [risksPage, setRisksPage] = useState(1);
  const risksPerPage = 8;

  useEffect(() => {
    const fetchDoctorPortalData = async () => {
      try {
        setLoading(true);
        const [predsRes, usersRes] = await Promise.all([
          API.get("/api/predictions/admin/all-predictions?limit=1000"),
          API.get("/api/predictions/admin/all-users?limit=1000")
        ]);

        setAllPredictions(predsRes.data.predictions || []);
        setAllUsers(usersRes.data.users || []);
      } catch (err) {
        setError("Failed to synchronize doctor portal statistics. The database might be offline.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorPortalData();
  }, []);

  const fetchRiskAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      let startDate = "";
      let endDate = "";
      const now = new Date();

      if (analyticsTimeframe === "7days") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
      } else if (analyticsTimeframe === "30days") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
      } else if (analyticsTimeframe === "90days") {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
      } else if (analyticsTimeframe === "custom") {
        startDate = analyticsStartDate;
        endDate = analyticsEndDate;
      }

      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (analyticsRiskFilter !== "All") params.riskCategory = analyticsRiskFilter;

      const res = await API.get("/api/predictions/admin/analytics/risk", { params });
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to load risk analytics:", err);
      setAnalyticsError("Could not retrieve real-time risk analytics from the server.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskAnalytics();
  }, [analyticsTimeframe, analyticsRiskFilter]);

  // Update email template details dynamically
  useEffect(() => {
    if (emailTemplate === "reminder") {
      setEmailSubject("Appointment Reminder - Parkinson's Assessment Portal");
      setEmailBody("Dear Patient,\n\nThis is a friendly reminder to schedule your follow-up vocal biomarker screening on our AI platform.\n\nBest regards,\nClinical Team");
    } else {
      setEmailSubject("Health Advisory - Vocal Biomarker Monitoring");
      setEmailBody("Dear Patient,\n\nWe advise maintaining regular vocal exercises and keeping a weekly log of your vocal samples. If your symptoms change, please schedule a clinical consultation.\n\nBest regards,\nClinical Team");
    }
  }, [emailTemplate]);

  if (loading) return <LoadingSpinner message="Securing doctor portal connection..." />;

  // Calculate dynamic stats
  const totalPatients = allUsers.filter(u => u.role !== "admin").length;
  const totalPredictions = allPredictions.length;

  const highRiskPredictions = allPredictions.filter(p => p.riskLevel === "High");
  const lowRiskPredictions = allPredictions.filter(p => p.riskLevel === "Low");

  // Unique patients in high/low risk categories
  const highRiskPatientsCount = new Set(highRiskPredictions.map(p => p.user?._id || p.user)).size;
  const lowRiskPatientsCount = new Set(lowRiskPredictions.map(p => p.user?._id || p.user)).size;

  const pendingReviewsCount = allPredictions.filter(p => !p.doctorNotes && !p.recommendations).length;

  // Time-based calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const todayPredictions = allPredictions.filter(p => new Date(p.createdAt).getTime() >= todayStart).length;
  const weeklyPredictions = allPredictions.filter(p => new Date(p.createdAt).getTime() >= oneWeekAgo).length;
  const monthlyPredictions = allPredictions.filter(p => new Date(p.createdAt).getTime() >= oneMonthAgo).length;

  // Recent activity logs
  const recentActivity = allPredictions.slice(0, 5);

  // --- CHARTS PREPARATION ---

  // 1. Pie Chart - Risk Proportion
  const riskPieData = [
    { name: "High Risk", value: highRiskPredictions.length, color: "var(--red)" },
    { name: "Medium Risk", value: allPredictions.filter(p => p.riskLevel === "Medium").length, color: "var(--orange)" },
    { name: "Low Risk", value: lowRiskPredictions.length, color: "var(--green)" }
  ].filter(d => d.value > 0);

  // 2. Bar Chart - Predictions month count
  const monthlyCounts = {};
  allPredictions.forEach(p => {
    const month = new Date(p.createdAt).toLocaleString("default", { month: "short", year: "2-digit" });
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });
  const barChartData = Object.keys(monthlyCounts).map(month => ({
    month,
    count: monthlyCounts[month]
  })).reverse();

  // 3. Line Chart - Daily predictions & growth
  const dailyCounts = {};
  allPredictions.forEach(p => {
    const day = new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const lineChartData = Object.keys(dailyCounts).map(day => ({
    day,
    predictions: dailyCounts[day]
  })).reverse();

  // 4. Area Chart - Registration Trend
  const registrationTimeline = {};
  allUsers.forEach(u => {
    const day = new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    registrationTimeline[day] = (registrationTimeline[day] || 0) + 1;
  });
  const areaChartData = Object.keys(registrationTimeline).map(day => ({
    day,
    registrations: registrationTimeline[day]
  })).reverse();

  // --- HANDLERS ---

  const handleToggleActivation = async (userId, currentStatus) => {
    try {
      const updatedStatus = currentStatus === undefined ? false : !currentStatus;
      await API.put(`/api/predictions/admin/users/${userId}`, { isActive: updatedStatus });
      setAllUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: updatedStatus } : u));
      setToastMessage("User account status synchronized successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to update user status.");
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/api/predictions/admin/users/${editingUser._id}`, { name: editingUser.name, email: editingUser.email });
      setAllUsers(prev => prev.map(u => u._id === editingUser._id ? { ...u, name: editingUser.name, email: editingUser.email } : u));
      setToastMessage(`Patient profile saved for ${editingUser.name}`);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      setError("Failed to save patient profile.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this patient account? This action is permanent.")) {
      try {
        await API.delete(`/api/predictions/admin/users/${userId}`);
        setAllUsers(prev => prev.filter(u => u._id !== userId));
        setToastMessage("Patient account deleted successfully.");
      } catch (err) {
        console.error(err);
        setError("Failed to delete user account.");
      }
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingPrediction) return;
    try {
      setSavingReview(true);
      const res = await API.put(`/api/predictions/${reviewingPrediction._id}/review`, {
        doctorNotes: reviewingPrediction.doctorNotes,
        recommendations: reviewingPrediction.recommendations
      });
      // Update predictions lists
      setAllPredictions(prev => prev.map(p => p._id === reviewingPrediction._id ? { ...p, ...res.data } : p));
      setToastMessage("Medical notes and clinical recommendations saved.");
      setReviewingPrediction(null);
      fetchRiskAnalytics();
    } catch (err) {
      console.error(err);
      setError("Failed to save clinical review.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveRecommendation = async (e) => {
    e.preventDefault();
    if (!editingRecommendation) return;
    try {
      setSavingRecommendation(true);
      const actionToSave = editingRecommendation.customAction !== undefined && editingRecommendation.recommendations === "Custom Action"
        ? editingRecommendation.customAction.trim()
        : (editingRecommendation.recommendations || "").trim();

      const res = await API.put(`/api/predictions/${editingRecommendation._id}/review`, {
        recommendations: actionToSave
      });
      setAllPredictions(prev => prev.map(p => p._id === editingRecommendation._id ? { ...p, ...res.data } : p));
      setToastMessage("Clinical recommendation action successfully updated and recorded.");
      setEditingRecommendation(null);
      fetchRiskAnalytics();
    } catch (err) {
      console.error("Failed to update recommendation:", err);
      setError("Failed to save recommendation action to database.");
    } finally {
      setSavingRecommendation(false);
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!editingNotes) return;
    try {
      setSavingNotes(true);
      const notesToSave = (editingNotes.doctorNotes || "").trim();

      const res = await API.put(`/api/predictions/${editingNotes._id}/review`, {
        doctorNotes: notesToSave
      });
      setAllPredictions(prev => prev.map(p => p._id === editingNotes._id ? { ...p, ...res.data } : p));
      setToastMessage("Doctor's medical remarks saved successfully.");
      setEditingNotes(null);
      fetchRiskAnalytics();
    } catch (err) {
      console.error("Failed to update doctor notes:", err);
      setError("Failed to save doctor notes to database.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Assessment ID,Patient Name,Patient Email,Risk Classification,Confidence,Timestamp,Doctor Notes,Recommendations\n";
    allPredictions.forEach(p => {
      csvContent += `${p._id},"${p.user?.name || 'Deleted'}","${p.user?.email || 'N/A'}",${p.riskLevel},${p.confidence.toFixed(2)}%,${p.createdAt},"${p.doctorNotes || ''}","${p.recommendations || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `parkinson_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage("CSV Log exported successfully.");
  };

  const handleDownloadPDF = async (predId) => {
    try {
      setDownloadingReportId(predId);
      const response = await API.get(`/api/predictions/${predId}/report`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Parkinson_Report_${predId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Failed to download PDF report. Session may have expired.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleSendEmails = (e) => {
    e.preventDefault();
    let recipients = [];
    if (emailTarget === "selected") {
      recipients = allUsers.filter(u => selectedUserIds.includes(u._id)).map(u => u.email);
    } else if (emailTarget === "high_risk") {
      const highRiskIds = new Set(highRiskPredictions.map(p => p.user?._id || p.user));
      recipients = allUsers.filter(u => highRiskIds.has(u._id)).map(u => u.email);
    } else if (emailTarget === "low_risk") {
      const lowRiskIds = new Set(lowRiskPredictions.map(p => p.user?._id || p.user));
      recipients = allUsers.filter(u => lowRiskIds.has(u._id)).map(u => u.email);
    } else {
      recipients = allUsers.filter(u => u.role !== "admin").map(u => u.email);
    }

    if (recipients.length === 0) {
      setError("No recipients matched the email criteria.");
      return;
    }

    setToastMessage(`Email campaign sent successfully to ${recipients.length} recipients: ${recipients.slice(0, 3).join(", ")}${recipients.length > 3 ? "..." : ""}`);
    setSelectedUserIds([]);
  };

  // --- FILTERS & SORTS ---

  // Patients Management
  const processedUsers = allUsers
    .filter(u => u.role !== "admin")
    .filter(u => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchFilter = userFilter === "All" || (userFilter === "Active" && u.isActive !== false) || (userFilter === "Deactive" && u.isActive === false);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (userSort === "name") return a.name.localeCompare(b.name);
      if (userSort === "date") return new Date(b.createdAt) - new Date(a.createdAt);
      if (userSort === "predictions") {
        const countA = allPredictions.filter(p => (p.user?._id || p.user) === a._id).length;
        const countB = allPredictions.filter(p => (p.user?._id || p.user) === b._id).length;
        return countB - countA;
      }
      return 0;
    });

  // Risk Analysis
  const processedRisks = allPredictions
    .filter(p => {
      const nameMatch = (p.user?.name || "").toLowerCase().includes(risksSearch.toLowerCase());
      const emailMatch = (p.user?.email || "").toLowerCase().includes(risksSearch.toLowerCase());
      const riskMatch = risksFilter === "All" || p.riskLevel === risksFilter;
      return (nameMatch || emailMatch) && riskMatch;
    })
    .sort((a, b) => {
      if (risksSort === "HighestRisk") {
        const score = { High: 3, Medium: 2, Low: 1 };
        return score[b.riskLevel] - score[a.riskLevel] || b.confidence - a.confidence;
      }
      if (risksSort === "LowestRisk") {
        const score = { High: 3, Medium: 2, Low: 1 };
        return score[a.riskLevel] - score[b.riskLevel] || a.confidence - b.confidence;
      }
      if (risksSort === "HighestConfidence") return b.confidence - a.confidence;
      if (risksSort === "LowestConfidence") return a.confidence - b.confidence;
      if (risksSort === "Newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (risksSort === "Oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });

  const paginatedRisks = processedRisks.slice((risksPage - 1) * risksPerPage, risksPage * risksPerPage);
  const risksTotalPages = Math.ceil(processedRisks.length / risksPerPage) || 1;

  // Prediction Records (All Assessments)
  const processedRecords = allPredictions.filter(p => {
    const nameMatch = (p.user?.name || "").toLowerCase().includes(recordsSearch.toLowerCase());
    const idMatch = p._id.toLowerCase().includes(recordsSearch.toLowerCase());
    const riskMatch = recordsFilter === "All" || p.riskLevel === recordsFilter;
    return (nameMatch || idMatch) && riskMatch;
  });

  const paginatedRecords = processedRecords.slice((recordsPage - 1) * recordsPerPage, recordsPage * recordsPerPage);
  const recordsTotalPages = Math.ceil(processedRecords.length / recordsPerPage) || 1;

  // Critical Patients logic (multiple consecutive High Risk predictions)
  const criticalPatients = allUsers
    .filter(u => u.role !== "admin")
    .map(u => {
      const userPreds = allPredictions
        .filter(p => (p.user?._id || p.user) === u._id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort newest first

      let consecutiveHighCount = 0;
      for (let p of userPreds) {
        if (p.riskLevel === "High") {
          consecutiveHighCount++;
        } else {
          break; // Stop counting once we hit non-high
        }
      }
      return { user: u, consecutiveHighCount, lastPrediction: userPreds[0] };
    })
    .filter(item => item.consecutiveHighCount >= 2); // At least 2 consecutive high risk predictions

  const getRiskClass = (risk) => {
    if (risk === "Low") return "badge-low";
    if (risk === "Medium") return "badge-medium";
    if (risk === "High") return "badge-high";
    return "";
  };

  const getRiskColor = (risk) => {
    if (risk === "Low") return "var(--green)";
    if (risk === "Medium") return "var(--orange)";
    if (risk === "High") return "var(--red)";
    return "var(--primary-color)";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return { date: "N/A", time: "" };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: "N/A", time: "" };
    return {
      date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
      time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    };
  };

  return (
    <div className="container admin-container">
      {/* Title */}
      <header className="mb-6">
        <h1 className="page-title">Doctor Portal Dashboard</h1>
        <p className="page-subtitle">Review patient vocal screening records, manage profiles, write notes, and analyze AI performance.</p>
      </header>

      {/* Toast and Error notifications */}
      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage("")} />}
      {error && <Toast message={error} type="error" onClose={() => setError("")} />}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              {/* Stats Widgets */}
              <div className="stats-grid">
                <div className="stats-card">
                  <div className="stats-header">
                    <span className="stats-title">Registered Patients</span>
                    <span className="stats-icon icon-blue"><FaUsers /></span>
                  </div>
                  <div className="stats-value">{totalPatients}</div>
                  <div className="stats-footer">Total registered patient profiles</div>
                </div>
                <div className="stats-card">
                  <div className="stats-header">
                    <span className="stats-title">Total Predictions</span>
                    <span className="stats-icon icon-purple"><FaClipboardList /></span>
                  </div>
                  <div className="stats-value">{totalPredictions}</div>
                  <div className="stats-footer">Total calculated assessments</div>
                </div>
                <div className="stats-card">
                  <div className="stats-header">
                    <span className="stats-title">High Risk Cases</span>
                    <span className="stats-icon icon-red"><FaExclamationTriangle /></span>
                  </div>
                  <div className="stats-value text-red">{highRiskPatientsCount}</div>
                  <div className="stats-footer">Unique patients flagged High Risk</div>
                </div>
                <div className="stats-card">
                  <div className="stats-header">
                    <span className="stats-title">Pending Reviews</span>
                    <span className="stats-icon icon-green"><FaStickyNote /></span>
                  </div>
                  <div className="stats-value text-green">{pendingReviewsCount}</div>
                  <div className="stats-footer">Awaiting doctor notes / advice</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="section-card mt-8">
                <h3 className="section-title" style={{ marginBottom: "16px" }}>Recent Patient Activity</h3>
                <div className="table-responsive">
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Patient Name</th>
                        <th>Patient Email</th>
                        <th>Risk Outcome</th>
                        <th>Confidence</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map(p => {
                        const dt = formatDate(p.createdAt);
                        return (
                          <tr key={p._id}>
                            <td>
                              <div className="table-date-cell" title={new Date(p.createdAt).toLocaleString()}>
                                <span className="date-primary">{dt.date}</span>
                                <span className="date-secondary">{dt.time}</span>
                              </div>
                            </td>
                            <td className="font-bold">
                              <div className="table-truncate" title={p.user?.name || "Deleted Patient"}>
                                {p.user?.name || "Deleted Patient"}
                              </div>
                            </td>
                            <td>
                              <div className="table-truncate-email font-mono" title={p.user?.email || "N/A"}>
                                {p.user?.email || "N/A"}
                              </div>
                            </td>
                            <td><span className={`badge ${getRiskClass(p.riskLevel)}`}>{p.riskLevel} Risk</span></td>
                            <td className="font-mono font-bold" style={{ color: getRiskColor(p.riskLevel) }}>{p.confidence.toFixed(2)}%</td>
                            <td>
                              {p.doctorNotes || p.recommendations ? (
                                <span className="badge badge-low" style={{ textTransform: "capitalize" }}>Reviewed</span>
                              ) : (
                                <span className="badge badge-high" style={{ textTransform: "capitalize" }}>Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT DATABASE */}
          {activeTab === "users" && (
            <div className="section-card">
              <div className="section-header" style={{ marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                <h2 className="section-title">Patient Management Database</h2>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: "250px" }}>
                    <FaSearch style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-light)" }} />
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ paddingLeft: "36px", height: "40px", width: "100%" }}
                    />
                  </div>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    style={{ height: "40px", padding: "0 10px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--card-bg)" }}
                  >
                    <option value="All">All Accounts</option>
                    <option value="Active">Active only</option>
                    <option value="Deactive">Deactivated only</option>
                  </select>
                  <select
                    value={userSort}
                    onChange={(e) => setUserSort(e.target.value)}
                    style={{ height: "40px", padding: "0 10px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--card-bg)" }}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="date">Sort by Reg Date</option>
                    <option value="predictions">Sort by Screenings count</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.length === processedUsers.length && processedUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(processedUsers.map(u => u._id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                        />
                      </th>
                      <th>Registration Date</th>
                      <th>Patient Name</th>
                      <th>Email Address</th>
                      <th style={{ textAlign: "center" }}>Total Predictions</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedUsers.map(u => {
                      const userPredsCount = allPredictions.filter(p => (p.user?._id || p.user) === u._id).length;
                      const dt = formatDate(u.createdAt);
                      return (
                        <tr key={u._id}>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(u._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds(prev => [...prev, u._id]);
                                } else {
                                  setSelectedUserIds(prev => prev.filter(id => id !== u._id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <div className="table-date-cell" title={new Date(u.createdAt).toLocaleString()}>
                              <span className="date-primary">{dt.date}</span>
                              <span className="date-secondary">{dt.time}</span>
                            </div>
                          </td>
                          <td className="font-bold">
                            <div className="table-truncate" title={u.name}>{u.name}</div>
                          </td>
                          <td>
                            <div className="table-truncate-email font-mono" title={u.email}>{u.email}</div>
                          </td>
                          <td className="font-bold" style={{ textAlign: "center" }}>{userPredsCount}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleActivation(u._id, u.isActive)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "22px" }}
                              title={u.isActive === false ? "Activate account" : "Deactivate account"}
                              aria-label={`Toggle activation for ${u.name}`}
                            >
                              {u.isActive === false ? (
                                <FaToggleOff style={{ color: "var(--text-light)" }} />
                              ) : (
                                <FaToggleOn style={{ color: "var(--green)" }} />
                              )}
                            </button>
                          </td>
                          <td className="actions-col" style={{ textAlign: "right" }}>
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn-secondary btn-small"
                                onClick={() => setEditingUser(u)}
                                title="Edit Patient Details"
                                aria-label={`Edit profile for ${u.name}`}
                              >
                                <FaUserEdit /> Edit
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-small"
                                onClick={() => {
                                  const history = allPredictions.filter(p => (p.user?._id || p.user) === u._id);
                                  setSelectedUserHistory({ user: u, history });
                                }}
                                title="View Patient Screening History"
                                aria-label={`View history for ${u.name}`}
                              >
                                <FaHistory /> History
                              </button>
                              <button
                                type="button"
                                className="btn-danger btn-small"
                                onClick={() => handleDeleteUser(u._id)}
                                title="Delete Patient Account"
                                aria-label={`Delete patient ${u.name}`}
                              >
                                <FaTrashAlt />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PREDICTION REPORTS */}
          {activeTab === "records" && (
            <div className="section-card">
              <div className="section-header" style={{ marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                <h2 className="section-title">Acoustic Screening Prediction Logs</h2>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: "250px" }}>
                    <FaSearch style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-light)" }} />
                    <input
                      type="text"
                      placeholder="Search ID or Patient..."
                      value={recordsSearch}
                      onChange={(e) => setRecordsSearch(e.target.value)}
                      style={{ paddingLeft: "36px", height: "40px", width: "100%" }}
                    />
                  </div>
                  <select
                    value={recordsFilter}
                    onChange={(e) => setRecordsFilter(e.target.value)}
                    style={{ height: "40px", padding: "0 12px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--card-bg)" }}
                  >
                    <option value="All">All Risks</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                  <button onClick={handleExportCSV} className="btn-secondary" style={{ height: "40px" }}><FaFileCsv /> Export CSV</button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient Name</th>
                      <th>Patient Email</th>
                      <th>Outcome</th>
                      <th>Confidence</th>
                      <th>Doctor Review</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((pred) => {
                      const dt = formatDate(pred.createdAt);
                      return (
                        <tr key={pred._id}>
                          <td>
                            <div className="table-date-cell" title={new Date(pred.createdAt).toLocaleString()}>
                              <span className="date-primary">{dt.date}</span>
                              <span className="date-secondary">{dt.time}</span>
                            </div>
                          </td>
                          <td className="font-bold">
                            <div className="table-truncate" title={pred.user?.name || "Deleted Patient"}>
                              {pred.user?.name || "Deleted Patient"}
                            </div>
                          </td>
                          <td>
                            <div className="table-truncate-email font-mono" title={pred.user?.email || "N/A"}>
                              {pred.user?.email || "N/A"}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${getRiskClass(pred.riskLevel)}`}>
                              {pred.riskLevel} Risk
                            </span>
                          </td>
                          <td className="font-bold font-mono" style={{ color: getRiskColor(pred.riskLevel) }}>
                            {pred.confidence.toFixed(2)}%
                          </td>
                          <td>
                            {pred.doctorNotes || pred.recommendations ? (
                              <span className="badge badge-low" style={{ textTransform: "capitalize" }}>Reviewed</span>
                            ) : (
                              <span className="badge badge-high" style={{ textTransform: "capitalize" }}>Awaiting Review</span>
                            )}
                          </td>
                          <td className="actions-col" style={{ textAlign: "right" }}>
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn-secondary btn-small font-semibold"
                                onClick={() => setReviewingPrediction(pred)}
                                title="Open Clinical Review & Diagnostic Details"
                                aria-label={`Report and Review assessment ${pred._id}`}
                              >
                                <FaEye /> Report &amp; Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(pred._id)}
                                disabled={downloadingReportId === pred._id}
                                className="btn-success btn-small font-semibold"
                                title="Download Clinical PDF Report"
                                aria-label={`Download PDF report for assessment ${pred._id}`}
                              >
                                <FaFilePdf /> {downloadingReportId === pred._id ? "..." : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {recordsTotalPages > 1 && (
                <div className="pagination-container">
                  <button disabled={recordsPage === 1} onClick={() => setRecordsPage(prev => prev - 1)} className="btn-pagination">&larr; Previous</button>
                  <span className="pagination-text">Page {recordsPage} of {recordsTotalPages}</span>
                  <button disabled={recordsPage === recordsTotalPages} onClick={() => setRecordsPage(prev => prev + 1)} className="btn-pagination">Next &rarr;</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RISK ANALYSIS */}
          {activeTab === "risks" && (
            <div className="section-card">
              <div className="section-header" style={{ marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                <h2 className="section-title">Risk Level Analysis</h2>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: "250px" }}>
                    <FaSearch style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-light)" }} />
                    <input
                      type="text"
                      placeholder="Search patient, email, date..."
                      value={risksSearch}
                      onChange={(e) => setRisksSearch(e.target.value)}
                      style={{ paddingLeft: "36px", height: "40px", width: "100%" }}
                    />
                  </div>
                  <select
                    value={risksFilter}
                    onChange={(e) => setRisksFilter(e.target.value)}
                    style={{ height: "40px", padding: "0 12px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--card-bg)" }}
                  >
                    <option value="All">All Risks</option>
                    <option value="Low">Low Risk Only</option>
                    <option value="Medium">Medium Risk Only</option>
                    <option value="High">High Risk Only</option>
                  </select>
                  <select
                    value={risksSort}
                    onChange={(e) => setRisksSort(e.target.value)}
                    style={{ height: "40px", padding: "0 12px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--card-bg)" }}
                  >
                    <option value="HighestRisk">Highest Risk first</option>
                    <option value="LowestRisk">Lowest Risk first</option>
                    <option value="HighestConfidence">Highest Confidence</option>
                    <option value="LowestConfidence">Lowest Confidence</option>
                    <option value="Newest">Newest Prediction</option>
                    <option value="Oldest">Oldest Prediction</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Prediction Date</th>
                      <th>Patient Name</th>
                      <th>Email</th>
                      <th>Risk Classification</th>
                      <th>Confidence Score</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRisks.map(p => {
                      const dt = formatDate(p.createdAt);
                      return (
                        <tr key={p._id}>
                          <td>
                            <div className="table-date-cell" title={new Date(p.createdAt).toLocaleString()}>
                              <span className="date-primary">{dt.date}</span>
                              <span className="date-secondary">{dt.time}</span>
                            </div>
                          </td>
                          <td className="font-bold">
                            <div className="table-truncate" title={p.user?.name || "Deleted"}>
                              {p.user?.name || "Deleted"}
                            </div>
                          </td>
                          <td>
                            <div className="table-truncate-email font-mono" title={p.user?.email || "N/A"}>
                              {p.user?.email || "N/A"}
                            </div>
                          </td>
                          <td><span className={`badge ${getRiskClass(p.riskLevel)}`}>{p.riskLevel} Risk</span></td>
                          <td className="font-bold font-mono" style={{ color: getRiskColor(p.riskLevel) }}>{p.confidence.toFixed(2)}%</td>
                          <td className="actions-col" style={{ textAlign: "right" }}>
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn-secondary btn-small font-semibold"
                                onClick={() => setReviewingPrediction(p)}
                                title="Open Clinical Review & Diagnostic Details"
                                aria-label={`Report and Review assessment ${p._id}`}
                              >
                                <FaEye /> Report &amp; Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(p._id)}
                                disabled={downloadingReportId === p._id}
                                className="btn-success btn-small font-semibold"
                                title="Download Clinical PDF Report"
                                aria-label={`Download PDF report for assessment ${p._id}`}
                              >
                                <FaFilePdf /> {downloadingReportId === p._id ? "..." : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {risksTotalPages > 1 && (
                <div className="pagination-container">
                  <button disabled={risksPage === 1} onClick={() => setRisksPage(prev => prev - 1)} className="btn-pagination">&larr; Previous</button>
                  <span className="pagination-text">Page {risksPage} of {risksTotalPages}</span>
                  <button disabled={risksPage === risksTotalPages} onClick={() => setRisksPage(prev => prev + 1)} className="btn-pagination">Next &rarr;</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DOCTOR NOTES */}
          {activeTab === "notes" && (
            <div className="section-card">
              <div className="section-header" style={{ marginBottom: "20px" }}>
                <h2 className="section-title">Medical Remarks & Notes</h2>
                <div style={{ position: "relative", width: "280px" }}>
                  <FaSearch style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-light)" }} />
                  <input
                    type="text"
                    placeholder="Search patient or notes..."
                    value={notesSearch}
                    onChange={(e) => setNotesSearch(e.target.value)}
                    style={{ paddingLeft: "36px", height: "40px", width: "100%" }}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Risk Level</th>
                      <th>Last Assessment Date</th>
                      <th>Medical Notes</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPredictions
                      .filter(p => !notesSearch || (p.user?.name || "").toLowerCase().includes(notesSearch.toLowerCase()) || (p.doctorNotes || "").toLowerCase().includes(notesSearch.toLowerCase()))
                      .map(p => {
                        const dt = formatDate(p.createdAt);
                        return (
                          <tr key={p._id}>
                            <td className="font-bold">
                              <div className="table-truncate" title={p.user?.name || "Deleted"}>
                                {p.user?.name || "Deleted"}
                              </div>
                            </td>
                            <td><span className={`badge ${getRiskClass(p.riskLevel)}`}>{p.riskLevel}</span></td>
                            <td>
                              <div className="table-date-cell" title={new Date(p.createdAt).toLocaleString()}>
                                <span className="date-primary">{dt.date}</span>
                                <span className="date-secondary">{dt.time}</span>
                              </div>
                            </td>
                            <td>
                              <div className="table-truncate-notes" title={p.doctorNotes || "No medical remarks entered yet."} style={{ color: p.doctorNotes ? "var(--text-main)" : "var(--text-light)" }}>
                                {p.doctorNotes || "No medical remarks entered yet."}
                              </div>
                              {p.notesUpdatedAt && (
                                <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "4px" }}>
                                  Last updated: {new Date(p.notesUpdatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="actions-col" style={{ textAlign: "right" }}>
                              <div className="actions-cell">
                                <button
                                  type="button"
                                  className="btn-primary btn-small font-semibold"
                                  onClick={() => setEditingNotes({ ...p })}
                                  title="Edit Doctor's Notes for this Assessment"
                                  aria-label={`Edit doctor notes for assessment ${p._id}`}
                                >
                                  <FaUserEdit /> Edit Notes
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-small font-semibold"
                                  onClick={() => setReviewingPrediction(p)}
                                  title="View Full Clinical Assessment & Features"
                                  aria-label={`View clinical assessment ${p._id}`}
                                >
                                  <FaEye /> View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: RECOMMENDATIONS */}
          {activeTab === "recommendations" && (
            <div className="section-card">
              <div className="section-header" style={{ marginBottom: "20px" }}>
                <h2 className="section-title">Personalized Recommendations Management</h2>
                <div style={{ position: "relative", width: "280px" }}>
                  <FaSearch style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-light)" }} />
                  <input
                    type="text"
                    placeholder="Search patient or action..."
                    value={recsSearch}
                    onChange={(e) => setRecsSearch(e.target.value)}
                    style={{ paddingLeft: "36px", height: "40px", width: "100%" }}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Last Assessment Date</th>
                      <th>Recommendation Action</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPredictions
                      .filter(p => !recsSearch || (p.user?.name || "").toLowerCase().includes(recsSearch.toLowerCase()) || (p.recommendations || "").toLowerCase().includes(recsSearch.toLowerCase()))
                      .map(p => {
                        const dt = formatDate(p.createdAt);
                        return (
                          <tr key={p._id}>
                            <td className="font-bold">
                              <div className="table-truncate" title={p.user?.name || "Deleted"}>
                                {p.user?.name || "Deleted"}
                              </div>
                            </td>
                            <td>
                              <div className="table-date-cell" title={new Date(p.createdAt).toLocaleString()}>
                                <span className="date-primary">{dt.date}</span>
                                <span className="date-secondary">{dt.time}</span>
                              </div>
                            </td>
                            <td>
                              {p.recommendations ? (
                                <span className="badge badge-low" style={{ textTransform: "capitalize" }}>{p.recommendations}</span>
                              ) : (
                                <span className="badge badge-high" style={{ textTransform: "capitalize" }}>None set</span>
                              )}
                              {p.recommendationUpdatedAt && (
                                <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "4px" }}>
                                  Updated: {new Date(p.recommendationUpdatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="actions-col" style={{ textAlign: "right" }}>
                              <div className="actions-cell">
                                <button
                                  type="button"
                                  className="btn-primary btn-small font-semibold"
                                  onClick={() => setEditingRecommendation({
                                    ...p,
                                    customAction: ["Consult Neurologist", "Voice Therapy Sessions", "Re-test Vocal Biomarkers in 14 Days", "Urgent Clinical Follow-up", "Daily Exercise", "Daily Vocal Exercise", "Voice Therapy", "Physiotherapy", "Medication Reminder", "Lifestyle Improvements", ""].includes(p.recommendations) ? "" : (p.recommendations || "")
                                  })}
                                  title="Change Clinical Recommendation Action"
                                  aria-label={`Change clinical recommendation for assessment ${p._id}`}
                                >
                                  <FaUserEdit /> Change Action
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary btn-small font-semibold"
                                  onClick={() => setReviewingPrediction(p)}
                                  title="View Full Clinical Assessment & Features"
                                  aria-label={`View clinical assessment ${p._id}`}
                                >
                                  <FaEye /> View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: REAL RISK ANALYTICS */}
          {activeTab === "analytics" && (
            <div>
              {/* Filter Controls Bar */}
              <div className="section-card mb-6" style={{ padding: "18px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h2 className="section-title" style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaChartLine style={{ color: "var(--primary-color)" }} /> Database-Backed Risk Analytics
                    </h2>
                    <p className="section-subtitle">Real-time aggregations from MongoDB vocal assessment records.</p>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Timeframe selector pills */}
                    <div style={{ display: "flex", background: "rgba(148, 163, 184, 0.12)", borderRadius: "10px", padding: "4px" }}>
                      {[
                        { id: "7days", label: "Last 7d" },
                        { id: "30days", label: "Last 30d" },
                        { id: "90days", label: "Last 90d" },
                        { id: "all", label: "All Time" },
                        { id: "custom", label: "Custom" }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAnalyticsTimeframe(t.id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "13px",
                            fontWeight: 600,
                            border: "none",
                            borderRadius: "7px",
                            cursor: "pointer",
                            background: analyticsTimeframe === t.id ? "var(--primary-color)" : "transparent",
                            color: analyticsTimeframe === t.id ? "#ffffff" : "var(--text-main)",
                            transition: "all 0.2s"
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Risk Filter dropdown */}
                    <select
                      value={analyticsRiskFilter}
                      onChange={(e) => setAnalyticsRiskFilter(e.target.value)}
                      style={{ height: "36px", padding: "0 10px", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)" }}
                    >
                      <option value="All">All Risk Tiers</option>
                      <option value="Low">Low Risk Only</option>
                      <option value="Medium">Medium Risk Only</option>
                      <option value="High">High Risk Only</option>
                    </select>

                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => fetchRiskAnalytics()}
                      title="Refresh analytics data"
                      style={{ height: "36px", padding: "0 12px" }}
                    >
                      <FaRedo /> Refresh
                    </button>
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {analyticsTimeframe === "custom" && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-light)" }}>Start Date:</span>
                      <input
                        type="date"
                        value={analyticsStartDate}
                        onChange={(e) => setAnalyticsStartDate(e.target.value)}
                        style={{ padding: "6px 10px", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-light)" }}>End Date:</span>
                      <input
                        type="date"
                        value={analyticsEndDate}
                        onChange={(e) => setAnalyticsEndDate(e.target.value)}
                        style={{ padding: "6px 10px", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)" }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-small"
                      onClick={() => fetchRiskAnalytics()}
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>

              {/* Clinical ML Safeguards Banner */}
              <div style={{
                background: "rgba(2, 132, 199, 0.08)",
                border: "1px solid rgba(2, 132, 199, 0.25)",
                borderRadius: "10px",
                padding: "12px 18px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "13px",
                color: "var(--text-main)"
              }}>
                <FaInfoCircle style={{ color: "var(--primary-color)", fontSize: "20px", flexShrink: 0 }} />
                <span>
                  <strong>Clinical Safeguard Notice:</strong> Risk distributions and scores represent machine learning estimations from experimental vocal biomarkers. They are designed for research and risk stratification, not clinical diagnostic conclusions.
                </span>
              </div>

              {/* Analytics Error or Loading states */}
              {analyticsLoading && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <LoadingSpinner message="Aggregating clinical risk analytics from database..." />
                </div>
              )}

              {analyticsError && !analyticsLoading && (
                <div className="section-card text-center" style={{ padding: "30px", color: "var(--red)" }}>
                  <FaExclamationTriangle style={{ fontSize: "32px", marginBottom: "10px" }} />
                  <p>{analyticsError}</p>
                  <button className="btn-secondary btn-small mt-4" onClick={() => fetchRiskAnalytics()}>Retry Analytics</button>
                </div>
              )}

              {!analyticsLoading && !analyticsError && (
                <>
                  {/* Summary Metric Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px", marginBottom: "26px" }}>
                    <div className="stats-card">
                      <div className="stats-header">
                        <span className="stats-title">Filtered Assessments</span>
                        <span className="stats-icon icon-blue"><FaClipboardList /></span>
                      </div>
                      <div className="stats-value">{analyticsData?.totalAssessments ?? 0}</div>
                      <div className="stats-footer">Total records matching active filters</div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-header">
                        <span className="stats-title">Unique Patients</span>
                        <span className="stats-icon icon-purple"><FaUsers /></span>
                      </div>
                      <div className="stats-value">{analyticsData?.uniquePatients ?? 0}</div>
                      <div className="stats-footer">Distinct patients represented</div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-header">
                        <span className="stats-title">Average Confidence</span>
                        <span className="stats-icon icon-green"><FaBrain /></span>
                      </div>
                      <div className="stats-value">
                        {analyticsData?.averageConfidence !== undefined ? `${analyticsData.averageConfidence}%` : "N/A"}
                      </div>
                      <div className="stats-footer">Normalized model output mean</div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-header">
                        <span className="stats-title">High Risk Share</span>
                        <span className="stats-icon icon-red"><FaExclamationTriangle /></span>
                      </div>
                      <div className="stats-value text-red">
                        {analyticsData?.riskDistribution?.find(r => r.risk === "High")?.percentage ?? 0}%
                      </div>
                      <div className="stats-footer">
                        {analyticsData?.riskDistribution?.find(r => r.risk === "High")?.count ?? 0} high-risk assessments
                      </div>
                    </div>
                  </div>

                  {/* Empty State */}
                  {analyticsData?.totalAssessments === 0 ? (
                    <div className="section-card text-center" style={{ padding: "50px 20px" }}>
                      <FaChartLine style={{ fontSize: "44px", color: "var(--text-light)", opacity: 0.5, marginBottom: "16px" }} />
                      <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No Assessment Data in Selected Timeframe</h3>
                      <p style={{ color: "var(--text-light)", maxWidth: "480px", margin: "0 auto" }}>
                        No vocal screening records match the active date range or risk tier filter. Try selecting &ldquo;All Time&rdquo; or broadening your search parameters.
                      </p>
                      <button
                        className="btn-secondary btn-small mt-4"
                        onClick={() => { setAnalyticsTimeframe("all"); setAnalyticsRiskFilter("All"); }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    /* Charts grid */
                    <div className="charts-grid">
                      {/* Chart 1: Risk Proportion Pie / Donut */}
                      <div className="chart-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h3 className="chart-title">Risk Proportion Analytics</h3>
                          <span style={{ fontSize: "12px", color: "var(--text-light)" }}>N = {analyticsData?.totalAssessments}</span>
                        </div>
                        <div className="chart-container-wrapper">
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie
                                data={analyticsData?.riskDistribution || []}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={88}
                                paddingAngle={4}
                                dataKey="count"
                                nameKey="risk"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              >
                                {(analyticsData?.riskDistribution || []).map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color || (entry.risk === "High" ? "#ef4444" : entry.risk === "Medium" ? "#f59e0b" : "#10b981")} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name, item) => [`${value} assessments (${item.payload.percentage}%)`, name]} />
                              <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Multi-line High vs Medium vs Low Risk Trends Over Time */}
                      <div className="chart-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h3 className="chart-title">Risk Category Trends Over Time</h3>
                          <span style={{ fontSize: "12px", color: "var(--text-light)" }}>Daily counts</span>
                        </div>
                        <div className="chart-container-wrapper">
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={analyticsData?.riskTrend || []}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Legend verticalAlign="top" height={30} />
                              <Line type="monotone" dataKey="high" name="High Risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="medium" name="Medium Risk" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="low" name="Low Risk" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 3: Assessment Volume vs Unique Patients */}
                      <div className="chart-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h3 className="chart-title">Assessment Volume & Unique Patients</h3>
                          <span style={{ fontSize: "12px", color: "var(--text-light)" }}>Chronological volume</span>
                        </div>
                        <div className="chart-container-wrapper">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={analyticsData?.riskTrend || []}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Legend verticalAlign="top" height={30} />
                              <Bar dataKey="total" name="Total Assessments" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="uniquePatients" name="Unique Patients" fill="var(--secondary-color)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 4: Model Confidence Score Distribution */}
                      <div className="chart-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h3 className="chart-title">Confidence Score Distribution</h3>
                          <span style={{ fontSize: "12px", color: "var(--text-light)" }}>Score ranges</span>
                        </div>
                        <div className="chart-container-wrapper">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={analyticsData?.confidenceDistribution || []}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="range" />
                              <YAxis allowDecimals={false} />
                              <Tooltip formatter={(value, name, item) => [`${value} assessments (${item.payload.percentage}%)`, item.payload.label]} />
                              <Bar dataKey="count" name="Assessments" radius={[4, 4, 0, 0]}>
                                {(analyticsData?.confidenceDistribution || []).map((entry, index) => {
                                  const color = entry.range.includes("0-35") ? "#10b981" : entry.range.includes("35-65") ? "#f59e0b" : "#ef4444";
                                  return <Cell key={`cell-conf-${index}`} fill={color} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 8: AI INSIGHTS */}
          {activeTab === "insights" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "30px" }}>
                <div className="stats-card">
                  <span className="stats-title">Avg Prediction Confidence</span>
                  <div className="stats-value">
                    {(allPredictions.reduce((acc, curr) => acc + curr.confidence, 0) / (totalPredictions || 1)).toFixed(2)}%
                  </div>
                  <div className="stats-footer">Across all voice recordings</div>
                </div>

                <div className="stats-card">
                  <span className="stats-title">Avg Predictions Per Patient</span>
                  <div className="stats-value">
                    {(totalPredictions / (totalPatients || 1)).toFixed(1)}
                  </div>
                  <div className="stats-footer">Frequency of vocal tracking</div>
                </div>

                <div className="stats-card">
                  <span className="stats-title">High Risk Proportion</span>
                  <div className="stats-value text-red">
                    {((highRiskPredictions.length / (totalPredictions || 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="stats-footer">Out of total computed predictions</div>
                </div>

                <div className="stats-card">
                  <span className="stats-title">Low Risk Proportion</span>
                  <div className="stats-value text-green">
                    {((lowRiskPredictions.length / (totalPredictions || 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="stats-footer">Out of total computed predictions</div>
                </div>
              </div>

              {/* Critical Patients List */}
              <div className="profile-grid">
                <div className="section-card">
                  <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--red)" }}>
                    <FaExclamationTriangle /> Critical Patients (Consecutive High Risks)
                  </h3>
                  <p className="section-subtitle">Patients showing consecutive positive Parkinsonian tremors during latest voice logs.</p>

                  {criticalPatients.length === 0 ? (
                    <p style={{ color: "var(--text-light)", marginTop: "20px" }}>No critical patient sequences detected.</p>
                  ) : (
                    <div className="table-responsive" style={{ marginTop: "14px" }}>
                      <table className="recent-table">
                        <thead>
                          <tr>
                            <th>Patient Name</th>
                            <th>High Risk Sequence Count</th>
                            <th>Last Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criticalPatients.map(item => (
                            <tr key={item.user._id}>
                              <td className="font-bold">
                                <div className="table-truncate" title={item.user.name}>{item.user.name}</div>
                              </td>
                              <td className="font-bold text-red" style={{ textAlign: "center" }}>{item.consecutiveHighCount} times</td>
                              <td className="font-mono">{item.lastPrediction?.confidence?.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Most Active Patients */}
                <div className="section-card">
                  <h3 className="section-title">Most Active Patients</h3>
                  <p className="section-subtitle">Patients logged most frequently on the platform.</p>
                  <div className="table-responsive" style={{ marginTop: "14px" }}>
                    <table className="recent-table">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Patient Email</th>
                          <th>Logs Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter(u => u.role !== "admin")
                          .map(u => {
                            const count = allPredictions.filter(p => (p.user?._id || p.user) === u._id).length;
                            return { user: u, count };
                          })
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5)
                          .map(item => (
                            <tr key={item.user._id}>
                              <td className="font-bold">
                                <div className="table-truncate" title={item.user.name}>{item.user.name}</div>
                              </td>
                              <td>
                                <div className="table-truncate-email font-mono" title={item.user.email}>{item.user.email}</div>
                              </td>
                              <td className="font-bold" style={{ textAlign: "center" }}>{item.count} logs</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: EMAIL CENTER */}
          {activeTab === "emails" && (
            <div className="section-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
              <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><FaEnvelope style={{ color: "var(--primary-color)" }} /> Email Center</h2>
              <p className="section-subtitle">Simulate clinical appointment notifications and health advisories.</p>

              <form onSubmit={handleSendEmails} className="profile-form mt-6">
                <div className="form-group">
                  <label>Target Audience Recipients</label>
                  <select value={emailTarget} onChange={(e) => setEmailTarget(e.target.value)}>
                    <option value="selected">Selected Patients ({selectedUserIds.length} checked in Patient tab)</option>
                    <option value="high_risk">All High Risk Patients ({highRiskPatientsCount})</option>
                    <option value="low_risk">All Low Risk Patients ({lowRiskPatientsCount})</option>
                    <option value="all">All Registered Patients ({totalPatients})</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Email Notification Template</label>
                  <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        name="template"
                        checked={emailTemplate === "reminder"}
                        onChange={() => setEmailTemplate("reminder")}
                      />
                      Appointment Reminder
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        name="template"
                        checked={emailTemplate === "advisory"}
                        onChange={() => setEmailTemplate("advisory")}
                      />
                      Health Advisory Email
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Body Message</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    style={{ height: "150px" }}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary font-bold">
                  Send Outbreak Email Campaign
                </button>
              </form>
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === "settings" && (
            <div className="profile-grid">
              <div className="section-card">
                <h3 className="section-title">Threshold Parameters Settings</h3>
                <form className="profile-form mt-4" onSubmit={(e) => { e.preventDefault(); setToastMessage("Model limits synchronized."); }}>
                  <div className="form-group">
                    <label>Acoustic Model Microservice URL</label>
                    <input type="text" defaultValue="http://127.0.0.1:8000" />
                  </div>
                  <div className="form-group">
                    <label>Risk warning Medium threshold</label>
                    <input type="number" defaultValue="0.35" step="0.05" />
                  </div>
                  <div className="form-group">
                    <label>Risk warning High threshold</label>
                    <input type="number" defaultValue="0.65" step="0.05" />
                  </div>
                  <button type="submit" className="btn-primary">Update Thresholds</button>
                </form>
              </div>

              <div className="section-card">
                <h3 className="section-title">Clinical Systems Config</h3>
                <form className="profile-form mt-4" onSubmit={(e) => { e.preventDefault(); setToastMessage("Clinical settings saved."); }}>
                  <div className="form-group">
                    <label>Hospital Header Title</label>
                    <input type="text" defaultValue="PARKINSON'S RISK ASSESSMENT REPORT" />
                  </div>
                  <div className="form-group">
                    <label>Diagnostic Notice Disclaimer</label>
                    <textarea style={{ height: "80px" }} defaultValue="This assessment is driven by automated machine learning models based solely on acoustic voice recordings and does not constitute a clinical medical diagnosis." />
                  </div>
                  <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, var(--secondary-color) 0%, #0d766e 100%)", boxShadow: "0 4px 14px 0 rgba(13, 148, 136, 0.3)" }}>Update Settings</button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* UNIFIED MODALS CONTAINER (MOUNTED AT ROOT TO WORK SEAMLESSLY ACROSS TABS) */}
      {/* ========================================================================= */}

      {/* 1. Clinical Assessment Report & Review Modal */}
      {reviewingPrediction && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}
          onClick={() => setReviewingPrediction(null)}
        >
          <div
            className="glass-card"
            style={{ width: "100%", maxWidth: "780px", background: "var(--bg-color)", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaClipboardList style={{ color: "var(--primary-color)" }} /> Clinical Assessment Report &amp; Review
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                  Assessment ID: <span className="font-mono">{reviewingPrediction._id}</span> &bull; Recorded: {new Date(reviewingPrediction.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                className="btn-secondary btn-small"
                onClick={() => setReviewingPrediction(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            {/* Experimental Model Disclaimer Banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "12px", color: "var(--text-color)"
            }}>
              <FaInfoCircle style={{ color: "#f59e0b", fontSize: "16px", flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Clinical Safeguard Notice:</strong> Model predictions reflect probabilistic pattern classification from acoustic voice biomarkers using a Random Forest model trained on experimental voice data. They serve as supportive screening indicators and do not constitute a clinical medical diagnosis.
              </span>
            </div>

            <div className="modal-grid-2col">
              {/* Patient & Diagnostics info */}
              <div>
                <h4 style={{ color: "var(--primary-color)", marginBottom: "12px", fontSize: "15px", fontWeight: "600" }}>Patient &amp; Screening Information</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                  <p><strong>Patient Name:</strong> {reviewingPrediction.user?.name || "Deleted User"}</p>
                  <p><strong>Patient Email:</strong> {reviewingPrediction.user?.email || "N/A"}</p>
                  <p><strong>Date of Screening:</strong> {new Date(reviewingPrediction.createdAt).toLocaleString()}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <strong>Risk Classification:</strong>
                    <span className={`badge ${getRiskClass(reviewingPrediction.riskLevel)}`}>
                      {reviewingPrediction.riskLevel} Risk
                    </span>
                  </div>
                  <p>
                    <strong>Confidence Score:</strong>{" "}
                    <span className="font-bold font-mono" style={{ color: getRiskColor(reviewingPrediction.riskLevel) }}>
                      {reviewingPrediction.confidence?.toFixed(2)}%
                    </span>
                  </p>
                  <p><strong>Prediction Label:</strong> {reviewingPrediction.label === 1 ? "Positive (Tremor pattern detected)" : "Negative (Healthy acoustic pattern)"}</p>
                </div>
              </div>

              {/* Acoustic Features panel */}
              <div style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: "20px" }}>
                <h4 style={{ color: "var(--secondary-color)", marginBottom: "12px", fontSize: "15px", fontWeight: "600" }}>Vocal Biomarkers (Features)</h4>
                <div style={{ maxHeight: "170px", overflowY: "auto", fontSize: "12px", background: "rgba(148,163,184,0.06)", padding: "12px", borderRadius: "8px" }}>
                  {reviewingPrediction.features ? (
                    <div className="modal-features-grid">
                      <div><strong>Fo (Hz):</strong> {reviewingPrediction.features.fo !== undefined ? Number(reviewingPrediction.features.fo).toFixed(2) : "N/A"}</div>
                      <div><strong>Fhi (Hz):</strong> {reviewingPrediction.features.fhi !== undefined ? Number(reviewingPrediction.features.fhi).toFixed(2) : "N/A"}</div>
                      <div><strong>Flo (Hz):</strong> {reviewingPrediction.features.flo !== undefined ? Number(reviewingPrediction.features.flo).toFixed(2) : "N/A"}</div>
                      <div><strong>Jitter (%):</strong> {reviewingPrediction.features.jitter_local !== undefined ? Number(reviewingPrediction.features.jitter_local).toFixed(5) : "N/A"}</div>
                      <div><strong>Shimmer (%):</strong> {reviewingPrediction.features.shimmer_local !== undefined ? Number(reviewingPrediction.features.shimmer_local).toFixed(5) : "N/A"}</div>
                      <div><strong>HNR (dB):</strong> {reviewingPrediction.features.hnr !== undefined ? Number(reviewingPrediction.features.hnr).toFixed(2) : "N/A"}</div>
                      {reviewingPrediction.features.rap !== undefined && <div><strong>RAP:</strong> {Number(reviewingPrediction.features.rap).toFixed(5)}</div>}
                      {reviewingPrediction.features.ppq !== undefined && <div><strong>PPQ:</strong> {Number(reviewingPrediction.features.ppq).toFixed(5)}</div>}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-light)" }}>Feature metrics not stored for this record.</p>
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(reviewingPrediction._id)}
                    disabled={downloadingReportId === reviewingPrediction._id}
                    className="btn-success font-semibold"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <FaFilePdf /> {downloadingReportId === reviewingPrediction._id ? "Generating PDF..." : "Download Clinical Report (PDF)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Doctor remarks & recommendations form */}
            <form onSubmit={handleSaveReview} className="profile-form mt-6" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div className="form-group">
                <label className="font-semibold">Doctor&rsquo;s Remarks &amp; Clinical Notes</label>
                <textarea
                  placeholder="e.g. Patient presents moderate vocal tremors. Recommend clinical follow-up in 30 days and neurological evaluation."
                  value={reviewingPrediction.doctorNotes || ""}
                  onChange={(e) => setReviewingPrediction({ ...reviewingPrediction, doctorNotes: e.target.value })}
                  style={{ height: "90px" }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "14px" }}>
                <label className="font-semibold">Clinical Action Recommendation</label>
                <select
                  value={reviewingPrediction.recommendations || ""}
                  onChange={(e) => setReviewingPrediction({ ...reviewingPrediction, recommendations: e.target.value })}
                >
                  <option value="">No action needed</option>
                  <option value="Consult Neurologist">Consult Neurologist</option>
                  <option value="Voice Therapy Sessions">Voice Therapy Sessions</option>
                  <option value="Re-test Vocal Biomarkers in 14 Days">Re-test Vocal Biomarkers in 14 Days</option>
                  <option value="Urgent Clinical Follow-up">Urgent Clinical Follow-up</option>
                  <option value="Daily Vocal Exercise">Daily Vocal Exercise</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                  <option value="Medication Reminder">Medication Reminder</option>
                  <option value="Lifestyle Improvements">Lifestyle Improvements</option>
                </select>
              </div>

              {/* Audit trail */}
              {reviewingPrediction.reviewedAt && (
                <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaCheckCircle style={{ color: "var(--green)" }} />
                  <span>
                    Last reviewed by <strong>{reviewingPrediction.reviewedBy?.name || "Clinical Reviewer"}</strong> on {new Date(reviewingPrediction.reviewedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={() => setReviewingPrediction(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary font-bold"
                  disabled={savingReview}
                >
                  {savingReview ? "Saving Changes..." : "Save Clinical Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Action / Recommendations Modal */}
      {editingRecommendation && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}
          onClick={() => setEditingRecommendation(null)}
        >
          <div
            className="glass-card"
            style={{ width: "100%", maxWidth: "560px", background: "var(--bg-color)", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaMedkit style={{ color: "var(--secondary-color)" }} /> Update Clinical Recommendation
              </h3>
              <button
                className="btn-secondary btn-small"
                onClick={() => setEditingRecommendation(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ background: "rgba(148,163,184,0.06)", borderRadius: "8px", padding: "12px 16px", marginBottom: "18px", fontSize: "13px" }}>
              <p><strong>Patient:</strong> {editingRecommendation.user?.name || "Deleted"} ({editingRecommendation.user?.email || "N/A"})</p>
              <p style={{ marginTop: "4px" }}>
                <strong>Assessment:</strong> <span className="font-mono">{editingRecommendation._id}</span> &bull;{" "}
                <span className={`badge ${getRiskClass(editingRecommendation.riskLevel)}`}>{editingRecommendation.riskLevel} Risk</span>
              </p>
              {editingRecommendation.recommendationUpdatedAt && (
                <p style={{ marginTop: "4px", color: "var(--text-light)", fontSize: "12px" }}>
                  Last modified: {new Date(editingRecommendation.recommendationUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <form onSubmit={handleSaveRecommendation} className="profile-form">
              <div className="form-group">
                <label className="font-semibold">Recommended Clinical Action</label>
                <select
                  value={
                    ["Consult Neurologist", "Voice Therapy Sessions", "Re-test Vocal Biomarkers in 14 Days", "Urgent Clinical Follow-up", "Daily Exercise", "Daily Vocal Exercise", "Voice Therapy", "Physiotherapy", "Medication Reminder", "Lifestyle Improvements", ""].includes(editingRecommendation.recommendations)
                      ? (editingRecommendation.recommendations || "")
                      : "Custom Action"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Custom Action") {
                      setEditingRecommendation({ ...editingRecommendation, recommendations: "Custom Action" });
                    } else {
                      setEditingRecommendation({ ...editingRecommendation, recommendations: val });
                    }
                  }}
                >
                  <option value="">No action needed</option>
                  <option value="Consult Neurologist">Consult Neurologist</option>
                  <option value="Voice Therapy Sessions">Voice Therapy Sessions</option>
                  <option value="Re-test Vocal Biomarkers in 14 Days">Re-test Vocal Biomarkers in 14 Days</option>
                  <option value="Urgent Clinical Follow-up">Urgent Clinical Follow-up</option>
                  <option value="Daily Vocal Exercise">Daily Vocal Exercise</option>
                  <option value="Voice Therapy">Voice Therapy</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                  <option value="Medication Reminder">Medication Reminder</option>
                  <option value="Lifestyle Improvements">Lifestyle Improvements</option>
                  <option value="Custom Action">Custom Action...</option>
                </select>
              </div>

              {/* If Custom Action selected or custom text exists */}
              {(editingRecommendation.recommendations === "Custom Action" ||
                !["Consult Neurologist", "Voice Therapy Sessions", "Re-test Vocal Biomarkers in 14 Days", "Urgent Clinical Follow-up", "Daily Exercise", "Daily Vocal Exercise", "Voice Therapy", "Physiotherapy", "Medication Reminder", "Lifestyle Improvements", ""].includes(editingRecommendation.recommendations)) && (
                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label className="font-semibold">Custom Recommendation Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule MRI and refer to movement disorder clinic"
                    value={editingRecommendation.customAction !== undefined ? editingRecommendation.customAction : (editingRecommendation.recommendations || "")}
                    onChange={(e) => setEditingRecommendation({ ...editingRecommendation, customAction: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingRecommendation(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary font-bold" disabled={savingRecommendation}>
                  {savingRecommendation ? "Saving..." : "Save Recommendation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Doctor Notes Modal */}
      {editingNotes && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}
          onClick={() => setEditingNotes(null)}
        >
          <div
            className="glass-card"
            style={{ width: "100%", maxWidth: "600px", background: "var(--bg-color)", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaStickyNote style={{ color: "var(--primary-color)" }} /> Edit Clinical Doctor Notes
              </h3>
              <button
                className="btn-secondary btn-small"
                onClick={() => setEditingNotes(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ background: "rgba(148,163,184,0.06)", borderRadius: "8px", padding: "12px 16px", marginBottom: "18px", fontSize: "13px" }}>
              <p><strong>Patient:</strong> {editingNotes.user?.name || "Deleted"} ({editingNotes.user?.email || "N/A"})</p>
              <p style={{ marginTop: "4px" }}>
                <strong>Assessment Date:</strong> {new Date(editingNotes.createdAt).toLocaleString()} &bull;{" "}
                <span className={`badge ${getRiskClass(editingNotes.riskLevel)}`}>{editingNotes.riskLevel} Risk</span>
              </p>
              {editingNotes.notesUpdatedAt && (
                <p style={{ marginTop: "4px", color: "var(--text-light)", fontSize: "12px" }}>
                  Last modified: {new Date(editingNotes.notesUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <form onSubmit={handleSaveNotes} className="profile-form">
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="font-semibold">Medical Remarks &amp; Clinical Observations</label>
                  <span style={{ fontSize: "11px", color: "var(--text-light)" }}>
                    {(editingNotes.doctorNotes || "").length} / 1000 chars
                  </span>
                </div>
                <textarea
                  placeholder="Document patient voice symptoms, tremor stability, recommended therapy plans, or clinical rationale..."
                  value={editingNotes.doctorNotes || ""}
                  onChange={(e) => setEditingNotes({ ...editingNotes, doctorNotes: e.target.value.slice(0, 1000) })}
                  style={{ height: "130px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingNotes(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary font-bold" disabled={savingNotes}>
                  {savingNotes ? "Saving..." : "Save Doctor Notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Patient Profile Modal */}
      {editingUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}
          onClick={() => setEditingUser(null)}
        >
          <div
            className="glass-card"
            style={{ width: "100%", maxWidth: "460px", background: "var(--bg-color)", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaUserEdit style={{ color: "var(--primary-color)" }} /> Edit Patient Profile
              </h3>
              <button
                className="btn-secondary btn-small"
                onClick={() => setEditingUser(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="profile-form">
              <div className="form-group">
                <label className="font-semibold">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: "12px" }}>
                <label className="font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. User History Drill-down Logs Modal */}
      {selectedUserHistory && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}
          onClick={() => setSelectedUserHistory(null)}
        >
          <div
            className="glass-card"
            style={{ width: "95%", maxWidth: "850px", background: "var(--bg-color)", maxHeight: "85vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaHistory style={{ color: "var(--primary-color)" }} /> Historical Screening Logs: {selectedUserHistory.user.name}
              </h3>
              <button
                className="btn-secondary btn-small"
                onClick={() => setSelectedUserHistory(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            {selectedUserHistory.history.length === 0 ? (
              <p style={{ color: "var(--text-light)", padding: "20px 0", textAlign: "center" }}>No screenings logged for this patient.</p>
            ) : (
              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Risk Outcome</th>
                      <th>Confidence</th>
                      <th>Acoustic Metrics</th>
                      <th className="actions-col" style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUserHistory.history.map(p => {
                      const dt = formatDate(p.createdAt);
                      return (
                        <tr key={p._id}>
                          <td>
                            <div className="table-date-cell" title={new Date(p.createdAt).toLocaleString()}>
                              <span className="date-primary">{dt.date}</span>
                              <span className="date-secondary">{dt.time}</span>
                            </div>
                          </td>
                          <td><span className={`badge ${getRiskClass(p.riskLevel)}`}>{p.riskLevel} Risk</span></td>
                          <td className="font-bold" style={{ color: getRiskColor(p.riskLevel) }}>{p.confidence.toFixed(2)}%</td>
                          <td style={{ fontSize: "12px" }}>
                            fo: {p.features?.fo !== undefined ? Number(p.features.fo).toFixed(2) : "N/A"} Hz | Jitter: {p.features?.jitter_local !== undefined ? Number(p.features.jitter_local).toFixed(4) : "N/A"}
                          </td>
                          <td className="actions-col" style={{ textAlign: "right" }}>
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn-secondary btn-small font-semibold"
                                onClick={() => {
                                  setReviewingPrediction(p);
                                  setSelectedUserHistory(null);
                                }}
                                title="Open Clinical Review & Diagnostic Details"
                                aria-label={`Review assessment ${p._id}`}
                              >
                                <FaEye /> Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(p._id)}
                                disabled={downloadingReportId === p._id}
                                className="btn-success btn-small font-semibold"
                                title="Download Clinical PDF Report"
                                aria-label={`Download PDF report for assessment ${p._id}`}
                              >
                                <FaFilePdf /> {downloadingReportId === p._id ? "..." : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
