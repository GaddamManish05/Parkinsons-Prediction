import { FaNotesMedical, FaExclamationTriangle, FaHeartbeat, FaClock } from "react-icons/fa";

export default function CardStats({ stats }) {
  const getRiskClass = (risk) => {
    if (risk === "Low") return "badge-low";
    if (risk === "Medium") return "badge-medium";
    if (risk === "High") return "badge-high";
    return "";
  };

  const getConfidenceString = (conf) => {
    return conf !== undefined ? `${conf.toFixed(1)}%` : "N/A";
  };

  return (
    <div className="stats-grid">
      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-title">Total Assessments</span>
          <span className="stats-icon icon-blue"><FaNotesMedical /></span>
        </div>
        <div className="stats-value">{stats.totalPredictions}</div>
        <div className="stats-footer">Completed voice screenings to date</div>
      </div>

      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-title">Detected Risk Cases</span>
          <span className="stats-icon icon-red"><FaExclamationTriangle /></span>
        </div>
        <div className="stats-value text-red">{stats.positive}</div>
        <div className="stats-footer">Flagged positive for vocal tremors</div>
      </div>

      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-title">Negative Cases</span>
          <span className="stats-icon icon-green"><FaHeartbeat /></span>
        </div>
        <div className="stats-value text-green">{stats.negative}</div>
        <div className="stats-footer">Assessments confirming baseline healthy metrics</div>
      </div>

      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-title">Latest Outcome</span>
          <span className="stats-icon icon-purple"><FaClock /></span>
        </div>
        {stats.latestPrediction ? (
          <div className="stats-value" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className={`badge ${getRiskClass(stats.latestPrediction.riskLevel)}`}>
              {stats.latestPrediction.riskLevel} Risk
            </span>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
              Confidence: {getConfidenceString(stats.latestPrediction.confidence)}
            </div>
          </div>
        ) : (
          <div className="stats-value" style={{ fontSize: "16px", color: "var(--text-light)" }}>No tests recorded</div>
        )}
        <div className="stats-footer">Most recent acoustic evaluation result</div>
      </div>
    </div>
  );
}
