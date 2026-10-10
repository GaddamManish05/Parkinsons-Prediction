import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { motion } from "framer-motion";
import { 
  FaArrowLeft, FaExchangeAlt, FaInfoCircle, FaCalendarAlt, 
  FaHeartbeat, FaSlidersH, FaHistory, FaCheckCircle, FaExclamationTriangle,
  FaFilePdf, FaMicrophone
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";

export default function AssessmentComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const id1Param = searchParams.get("id1") || "";
  const id2Param = searchParams.get("id2") || "";

  const [id1, setId1] = useState(id1Param);
  const [id2, setId2] = useState(id2Param);
  const [allAssessments, setAllAssessments] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");
  const [activeChartGroup, setActiveChartGroup] = useState("frequency");
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPDF = async (predId) => {
    try {
      setDownloadingId(predId);
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
      console.error("Comparison PDF download failed:", err);
      alert("Failed to download PDF report. Session may have expired.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Fetch all user assessments for selection dropdowns
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const res = await API.get("/api/predictions?page=1&limit=100");
        const predictions = res.data.predictions || [];
        setAllAssessments(predictions);

        // Pre-select latest two if parameters not provided
        let sel1 = id1Param;
        let sel2 = id2Param;
        if (!sel1 || !sel2) {
          if (predictions.length >= 2) {
            sel1 = predictions[1]._id; // Earlier
            sel2 = predictions[0]._id; // Later
            setId1(sel1);
            setId2(sel2);
            setSearchParams({ id1: sel1, id2: sel2 });
          }
        }
      } catch (err) {
        console.error("Failed to load assessments:", err);
        setError("Failed to load historical assessments for comparison.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  // Fetch comparison data whenever selected IDs change
  useEffect(() => {
    if (!id1 || !id2 || id1 === id2) return;

    const fetchComparison = async () => {
      try {
        setComparing(true);
        setError("");
        const res = await API.get(`/api/predictions/compare?id1=${id1}&id2=${id2}`);
        setComparisonData(res.data);
      } catch (err) {
        console.error("Comparison fetch error:", err);
        setError(err.response?.data?.message || "Failed to compare selected assessments.");
      } finally {
        setComparing(false);
      }
    };

    fetchComparison();
  }, [id1, id2]);

  const handleSelectCompare = (newId1, newId2) => {
    if (newId1 === newId2) {
      setError("Please select two different assessments to compare.");
      return;
    }
    setId1(newId1);
    setId2(newId2);
    setSearchParams({ id1: newId1, id2: newId2 });
  };

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

  if (loading) return <LoadingSpinner message="Loading historical voice assessments..." />;

  const hasEnoughAssessments = allAssessments.length >= 2;

  // Feature metadata for descriptive table and chart grouping
  const featureMetadata = [
    { key: "fo", label: "F0 (Pitch Hz)", desc: "Average Fundamental Frequency", group: "frequency" },
    { key: "fhi", label: "Fhi (Max Hz)", desc: "Maximum Fundamental Frequency", group: "frequency" },
    { key: "flo", label: "Flo (Min Hz)", desc: "Minimum Fundamental Frequency", group: "frequency" },
    { key: "jitter_local", label: "Jitter Local (%)", desc: "Frequency variation ratio", group: "perturbation", isPct: true },
    { key: "jitter_rap", label: "Jitter RAP (%)", desc: "Relative average perturbation", group: "perturbation", isPct: true },
    { key: "jitter_ppq5", label: "Jitter PPQ5 (%)", desc: "5-point period perturbation", group: "perturbation", isPct: true },
    { key: "shimmer_local", label: "Shimmer Local (%)", desc: "Amplitude variation ratio", group: "perturbation", isPct: true },
    { key: "shimmer_db", label: "Shimmer (dB)", desc: "Amplitude variation in decibels", group: "spectral" },
    { key: "shimmer_apq3", label: "Shimmer APQ3 (%)", desc: "3-point amplitude perturbation", group: "perturbation", isPct: true },
    { key: "shimmer_apq5", label: "Shimmer APQ5 (%)", desc: "5-point amplitude perturbation", group: "perturbation", isPct: true },
    { key: "hnr", label: "HNR (dB)", desc: "Harmonics-to-noise spectral ratio", group: "spectral" },
    { key: "nhr", label: "NHR Ratio", desc: "Noise-to-harmonics ratio", group: "nonlinear" },
    { key: "rpde", label: "RPDE Entropy", desc: "Recurrence period density entropy", group: "nonlinear" },
    { key: "dfa", label: "DFA Exponent", desc: "Signal fractal scaling exponent", group: "nonlinear" },
    { key: "ppe", label: "PPE Entropy", desc: "Pitch period entropy index", group: "nonlinear" },
    { key: "spread1", label: "Spread1 Index", desc: "Nonlinear frequency variation spread 1", group: "nonlinear" },
    { key: "spread2", label: "Spread2 Index", desc: "Nonlinear frequency variation spread 2", group: "nonlinear" },
    { key: "d2", label: "D2 Dimension", desc: "Correlation dimension index", group: "nonlinear" }
  ];

  // Chart data preparation for selected group
  const chartGroupItems = featureMetadata.filter((f) => f.group === activeChartGroup);
  const chartData = comparisonData ? chartGroupItems.map((meta) => {
    const comp = comparisonData.comparisons[meta.key] || {};
    let val1 = comp.earlierValue;
    let val2 = comp.laterValue;
    if (meta.isPct) {
      if (typeof val1 === "number") val1 = Number((val1 * 100).toFixed(3));
      if (typeof val2 === "number") val2 = Number((val2 * 100).toFixed(3));
    }
    return {
      feature: meta.label,
      Earlier: val1,
      Later: val2
    };
  }) : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container history-container"
    >
      {/* Header Block */}
      <div className="result-header-block mb-6">
        <div>
          <button onClick={() => navigate("/history")} className="btn-secondary btn-small" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaArrowLeft /> Back to History
          </button>
          <h1 className="page-title">Voice Assessment Comparison & Trends</h1>
          <p className="page-subtitle">Compare two historical voice evaluations to track acoustic measurement changes over time.</p>
        </div>
      </div>

      {/* Medical Safety Disclaimer Banner */}
      <div className="recommendations-box border-orange mb-6" style={{ background: "rgba(245, 158, 11, 0.06)", borderLeft: "6px solid var(--orange)", padding: "16px" }}>
        <h4 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--orange)", fontWeight: "700", fontSize: "14px" }}>
          <FaInfoCircle /> Important Clinical & Measurement Notice
        </h4>
        <p style={{ fontSize: "13px", marginTop: "6px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Changes in voice measurements or model predictions do <strong>not establish disease progression</strong> or provide a medical diagnosis. 
          Measurements may vary because of recording conditions, microphone differences, ambient background noise, and vocal fatigue. 
          Always consult a qualified healthcare professional for clinical concerns.
        </p>
      </div>

      {error && (
        <div className="recommendations-box border-red mb-6" style={{ padding: "14px" }}>
          <span style={{ color: "var(--red)", fontWeight: "600", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaExclamationTriangle /> {error}
          </span>
        </div>
      )}

      {!hasEnoughAssessments ? (
        <div className="section-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <div className="empty-state">
            <span className="empty-state-icon">📊</span>
            <h3 className="empty-state-title">Insufficient Screening History</h3>
            <p className="empty-state-text" style={{ maxWidth: "500px", margin: "8px auto" }}>
              You need at least <strong>2 completed voice assessments</strong> in your history to compare measurement variations over time.
            </p>
            <Link to="/predict" className="btn-primary mt-4" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <FaMicrophone /> Record New Speech Sample
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Assessment Selection Bar */}
          <div className="glass-card mb-6" style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <div className="form-group" style={{ flex: 1, minWidth: "240px" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaCalendarAlt /> Assessment A (Earlier)
              </label>
              <select value={id1} onChange={(e) => handleSelectCompare(e.target.value, id2)}>
                {allAssessments.map((a) => (
                  <option key={`a-${a._id}`} value={a._id}>
                    {new Date(a.createdAt).toLocaleString()} — {a.riskLevel} Risk ({a.confidence.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "20px" }}>
              <span className="badge badge-low" style={{ padding: "10px 14px", borderRadius: "50%" }}>
                <FaExchangeAlt />
              </span>
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "240px" }}>
              <label style={{ fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaCalendarAlt /> Assessment B (Later)
              </label>
              <select value={id2} onChange={(e) => handleSelectCompare(id1, e.target.value)}>
                {allAssessments.map((a) => (
                  <option key={`b-${a._id}`} value={a._id}>
                    {new Date(a.createdAt).toLocaleString()} — {a.riskLevel} Risk ({a.confidence.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparing && <LoadingSpinner message="Computing acoustic measurement variations..." />}

          {comparisonData && !comparing && (
            <>
              {/* Summary Cards */}
              <div className="profile-grid mb-6">
                {/* Earlier Card */}
                <div className="section-card" style={{ borderTop: "4px solid var(--primary-color)" }}>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "800", color: "var(--primary-color)" }}>
                    Earlier Screening
                  </span>
                  <h3 style={{ fontSize: "18px", marginTop: "4px" }}>
                    {new Date(comparisonData.earlierAssessment.createdAt).toLocaleDateString()}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-light)" }}>
                    {new Date(comparisonData.earlierAssessment.createdAt).toLocaleTimeString()}
                  </p>
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`badge ${getRiskClass(comparisonData.earlierAssessment.riskLevel)}`}>
                      {comparisonData.earlierAssessment.riskLevel} Risk
                    </span>
                    <strong style={{ fontSize: "16px", color: getRiskColor(comparisonData.earlierAssessment.riskLevel) }}>
                      {comparisonData.earlierAssessment.confidence.toFixed(1)}% Conf.
                    </strong>
                  </div>
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link to={`/result/${comparisonData.earlierAssessment._id}`} className="auth-link" style={{ fontSize: "12.5px" }}>
                      View Full Report &rarr;
                    </Link>
                    <button 
                      onClick={() => handleDownloadPDF(comparisonData.earlierAssessment._id)}
                      disabled={downloadingId === comparisonData.earlierAssessment._id}
                      className="btn-secondary btn-small"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                    >
                      <FaFilePdf style={{ color: "var(--red)" }} /> {downloadingId === comparisonData.earlierAssessment._id ? "Downloading..." : "Download PDF"}
                    </button>
                  </div>
                </div>

                {/* Later Card */}
                <div className="section-card" style={{ borderTop: "4px solid var(--secondary-color)" }}>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "800", color: "var(--secondary-color)" }}>
                    Later Screening
                  </span>
                  <h3 style={{ fontSize: "18px", marginTop: "4px" }}>
                    {new Date(comparisonData.laterAssessment.createdAt).toLocaleDateString()}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-light)" }}>
                    {new Date(comparisonData.laterAssessment.createdAt).toLocaleTimeString()}
                  </p>
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`badge ${getRiskClass(comparisonData.laterAssessment.riskLevel)}`}>
                      {comparisonData.laterAssessment.riskLevel} Risk
                    </span>
                    <strong style={{ fontSize: "16px", color: getRiskColor(comparisonData.laterAssessment.riskLevel) }}>
                      {comparisonData.laterAssessment.confidence.toFixed(1)}% Conf.
                    </strong>
                  </div>
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link to={`/result/${comparisonData.laterAssessment._id}`} className="auth-link" style={{ fontSize: "12.5px" }}>
                      View Full Report &rarr;
                    </Link>
                    <button 
                      onClick={() => handleDownloadPDF(comparisonData.laterAssessment._id)}
                      disabled={downloadingId === comparisonData.laterAssessment._id}
                      className="btn-secondary btn-small"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                    >
                      <FaFilePdf style={{ color: "var(--red)" }} /> {downloadingId === comparisonData.laterAssessment._id ? "Downloading..." : "Download PDF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Interactive Bar Chart */}
              <div className="section-card mb-6">
                <div className="section-header mb-4" style={{ flexWrap: "wrap", gap: "12px" }}>
                  <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaSlidersH /> Side-by-Side Feature Comparison
                  </h3>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button 
                      className={`btn-small ${activeChartGroup === "frequency" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setActiveChartGroup("frequency")}
                    >
                      Pitch (Hz)
                    </button>
                    <button 
                      className={`btn-small ${activeChartGroup === "perturbation" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setActiveChartGroup("perturbation")}
                    >
                      Perturbation (%)
                    </button>
                    <button 
                      className={`btn-small ${activeChartGroup === "spectral" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setActiveChartGroup("spectral")}
                    >
                      Spectral (dB)
                    </button>
                    <button 
                      className={`btn-small ${activeChartGroup === "nonlinear" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setActiveChartGroup("nonlinear")}
                    >
                      Nonlinear
                    </button>
                  </div>
                </div>

                <div className="chart-container-wrapper" style={{ marginTop: "16px" }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="feature" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px" }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Earlier" fill="var(--primary-color)" radius={[4, 4, 0, 0]} name="Earlier Value" />
                      <Bar dataKey="Later" fill="var(--secondary-color)" radius={[4, 4, 0, 0]} name="Later Value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed 22-Feature Comparison Table */}
              <div className="section-card">
                <h3 className="section-title" style={{ marginBottom: "16px" }}>Complete Acoustic Feature Variations</h3>
                <div className="table-responsive">
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>Feature Metric</th>
                        <th>Biological Description</th>
                        <th>Earlier Value</th>
                        <th>Later Value</th>
                        <th>Absolute Diff</th>
                        <th>Percentage Shift</th>
                        <th>Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureMetadata.map((meta) => {
                        const comp = comparisonData.comparisons[meta.key] || {};
                        let val1 = comp.earlierValue;
                        let val2 = comp.laterValue;

                        let displayVal1 = "N/A";
                        let displayVal2 = "N/A";

                        if (typeof val1 === "number") {
                          displayVal1 = meta.isPct ? `${(val1 * 100).toFixed(4)}%` : val1.toFixed(5);
                        }
                        if (typeof val2 === "number") {
                          displayVal2 = meta.isPct ? `${(val2 * 100).toFixed(4)}%` : val2.toFixed(5);
                        }

                        const absStr = comp.absoluteDiff !== null ? (comp.absoluteDiff > 0 ? `+${comp.absoluteDiff}` : `${comp.absoluteDiff}`) : "N/A";
                        const pctStr = comp.percentageDiff !== null ? (comp.percentageDiff > 0 ? `+${comp.percentageDiff}%` : `${comp.percentageDiff}%`) : "N/A";

                        return (
                          <tr key={meta.key}>
                            <td className="font-semibold" style={{ color: "var(--primary-color)" }}>{meta.label}</td>
                            <td className="text-secondary" style={{ fontSize: "12.5px" }}>{meta.desc}</td>
                            <td className="font-mono">{displayVal1}</td>
                            <td className="font-mono">{displayVal2}</td>
                            <td className="font-mono text-secondary">{absStr}</td>
                            <td className="font-mono font-bold">{pctStr}</td>
                            <td>
                              {comp.status === "increased" ? (
                                <span className="badge badge-medium" style={{ fontSize: "11px" }}>▲ Increase</span>
                              ) : comp.status === "decreased" ? (
                                <span className="badge badge-low" style={{ fontSize: "11px" }}>▼ Decrease</span>
                              ) : (
                                <span className="badge" style={{ background: "rgba(148, 163, 184, 0.2)", color: "var(--text-secondary)", fontSize: "11px" }}>= Unchanged</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
