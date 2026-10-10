import { useState } from "react";
import { FaSearch, FaSlidersH } from "react-icons/fa";

export default function FeatureTable({ features }) {
  const [query, setQuery] = useState("");

  if (!features) return null;

  const featuresObj = typeof features.toJSON === "function" ? features.toJSON() : features;

  const featureMetadata = [
    { key: "fo", label: "MDVP:Fo (Hz)", desc: "Average vocal fundamental frequency" },
    { key: "fhi", label: "MDVP:Fhi (Hz)", desc: "Maximum vocal fundamental frequency" },
    { key: "flo", label: "MDVP:Flo (Hz)", desc: "Minimum vocal fundamental frequency" },
    { key: "jitter_local", label: "Jitter:Local (%)", desc: "Acoustic frequency relative variation" },
    { key: "jitter_abs", label: "Jitter:Abs (s)", desc: "Absolute vocal jitter index in seconds" },
    { key: "jitter_rap", label: "Jitter:RAP (%)", desc: "Relative average perturbation" },
    { key: "jitter_ppq5", label: "Jitter:PPQ5 (%)", desc: "Five-point period perturbation quotient" },
    { key: "jitter_ddp", label: "Jitter:DDP (%)", desc: "Average absolute difference of differences" },
    { key: "shimmer_local", label: "Shimmer:Local (%)", desc: "Acoustic amplitude relative variation" },
    { key: "shimmer_db", label: "Shimmer:Local (dB)", desc: "Decibel variation of amplitude" },
    { key: "shimmer_apq3", label: "Shimmer:APQ3 (%)", desc: "Three-point amplitude perturbation quotient" },
    { key: "shimmer_apq5", label: "Shimmer:APQ5 (%)", desc: "Five-point amplitude perturbation quotient" },
    { key: "shimmer_apq11", label: "Shimmer:APQ11 (%)", desc: "11-point amplitude perturbation quotient" },
    { key: "shimmer_dda", label: "Shimmer:DDA (%)", desc: "Average absolute difference of shimmer amplitudes" },
    { key: "hnr", label: "HNR (dB)", desc: "Harmonics-to-noise ratio" },
    { key: "nhr", label: "NHR", desc: "Noise-to-harmonics ratio" },
    { key: "dfa", label: "DFA", desc: "Signal fractal scaling exponent" },
    { key: "rpde", label: "RPDE", desc: "Recurrence period density entropy index" },
    { key: "ppe", label: "PPE", desc: "Pitch period entropy variation index" },
    { key: "spread1", label: "Spread1", desc: "Nonlinear measure of fundamental frequency variation (spread 1)" },
    { key: "spread2", label: "Spread2", desc: "Nonlinear measure of fundamental frequency variation (spread 2)" },
    { key: "d2", label: "D2", desc: "Correlation dimension index of voice" }
  ];

  const filteredFeatures = featureMetadata.filter(
    (feat) =>
      feat.label.toLowerCase().includes(query.toLowerCase()) ||
      feat.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Search Input for features */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="form-group" style={{ flex: 1 }}>
          <div style={{ position: "relative" }}>
            <FaSearch style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-light)" }} />
            <input
              type="text"
              placeholder="Search acoustic metrics (e.g. jitter, HNR)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: "42px", paddingRight: "14px", height: "44px", width: "100%", fontSize: "13.5px" }}
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="feature-table">
          <thead>
            <tr>
              <th><FaSlidersH style={{ marginRight: "6px", verticalAlign: "middle" }} /> Acoustic Metric</th>
              <th>Measured Value</th>
              <th>Biological / Acoustic Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.map((feat) => {
              const rawVal = featuresObj[feat.key];
              const displayVal = typeof rawVal === "number" ? rawVal.toFixed(6) : "N/A";
              return (
                <tr key={feat.key}>
                  <td className="font-semibold" style={{ color: "var(--primary-color)" }}>{feat.label}</td>
                  <td className="font-mono text-bold" style={{ color: "var(--text-main)" }}>{displayVal}</td>
                  <td className="text-secondary">{feat.desc}</td>
                </tr>
              );
            })}
            {filteredFeatures.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: "30px", color: "var(--text-light)" }}>
                  No metrics match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
