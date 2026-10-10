import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";

export default function Charts({ stats }) {
  // 1. Risk Distribution Donut Data
  const rawDistribution = stats.riskDistribution || { Low: 0, Medium: 0, High: 0 };
  const filteredRiskData = Object.keys(rawDistribution)
    .map((key) => ({
      name: `${key} Risk`,
      value: rawDistribution[key],
      rawName: key
    }))
    .filter(item => item.value > 0); // Hide 0 categories

  const RISK_COLORS = {
    "Low Risk": "#10b981",     // Green
    "Medium Risk": "#f59e0b",  // Orange
    "High Risk": "#ef4444"     // Red
  };

  // Calculate dominant category to display in the center of the donut
  let totalPredictions = 0;
  let dominantCategory = null;
  filteredRiskData.forEach(d => {
    totalPredictions += d.value;
    if (!dominantCategory || d.value > dominantCategory.value) {
      dominantCategory = d;
    }
  });

  const dominantName = dominantCategory ? dominantCategory.name : "No Data";
  const dominantPercent = dominantCategory && totalPredictions > 0
    ? Math.round((dominantCategory.value / totalPredictions) * 100)
    : 0;

  // 2. Monthly Trend Data
  const trendData = stats.monthlyCounts && stats.monthlyCounts.length > 0
    ? stats.monthlyCounts
    : [{ month: "No Data", count: 0 }];

  // 3. Confidence Timeline Data
  const timelineData = stats.timeline && stats.timeline.length > 0
    ? stats.timeline.map((item, idx) => ({
        index: idx + 1,
        date: item.date,
        confidence: item.confidence,
        riskLevel: item.riskLevel
      }))
    : [];

  return (
    <div className="charts-grid">
      {/* 1. RISK DISTRIBUTION DONUT */}
      <div className="chart-card">
        <h3 className="chart-title">Risk Proportion Analytics</h3>
        <div className="chart-container-wrapper">
          {totalPredictions === 0 ? (
            <div className="chart-empty-state">No screening data logged.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={filteredRiskData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                  isAnimationActive={true}
                >
                  {filteredRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || "var(--primary-color)"} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--text-main)" }}
                />
                <Legend verticalAlign="bottom" height={36} />
                
                {/* Center text showing percentage & dominant name to prevent label overlaps */}
                <text x="50%" y="40%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "14px", fontWeight: "700", fill: "var(--text-secondary)", fontFamily: "Outfit" }}>
                  {dominantName}
                </text>
                <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "24px", fontWeight: "800", fill: RISK_COLORS[dominantName], fontFamily: "Outfit" }}>
                  {dominantPercent}%
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. MONTHLY VOLUME BAR CHART */}
      <div className="chart-card">
        <h3 className="chart-title">Monthly Screening Rate</h3>
        <div className="chart-container-wrapper">
          {totalPredictions === 0 ? (
            <div className="chart-empty-state">No screening data logged.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)" }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text-secondary)" }} />
                <Tooltip 
                  contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--text-main)" }}
                />
                <Bar dataKey="count" fill="var(--secondary-color)" radius={[6, 6, 0, 0]} isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. CONFIDENCE & ACOUSTIC MEASUREMENT TREND CHART */}
      <div className="chart-card chart-full-width">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
          <h3 className="chart-title" style={{ margin: 0 }}>Historical Acoustic Feature Measurements</h3>
          <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontStyle: "italic" }}>
            Tracks recorded measurement shifts over time — NOT proof of disease progression or treatment effectiveness.
          </span>
        </div>
        <div className="chart-container-wrapper">
          {timelineData.length === 0 ? (
            <div className="chart-empty-state">No screening data logged.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-secondary)" }} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text-secondary)" }} />
                <Tooltip 
                  contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px" }}
                  formatter={(value) => [`${parseFloat(value).toFixed(2)}%`, "Confidence Score"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="var(--primary-color)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorConf)" 
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

