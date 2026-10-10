import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Recorder from "../components/Recorder";
import FileUploader from "../components/FileUploader";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { FaMicrophone, FaCloudUploadAlt, FaFileMedicalAlt, FaArrowLeft } from "react-icons/fa";

export default function Prediction() {
  const [activeTab, setActiveTab] = useState("record"); // record | upload
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAudioSubmit = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setError("");
      setLoading(true);
      
      const response = await API.post("/api/predictions/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const predictionId = response.data._id;
      navigate(`/result/${predictionId}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        "Acoustic analysis failed. The machine learning service may be offline or overloaded."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container center-container" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner message="Extracting vocal acoustic metrics and running machine learning models..." />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container prediction-container"
    >
      {/* Header & Back Button */}
      <div className="prediction-header" style={{ marginBottom: "32px" }}>
        <button onClick={() => navigate("/")} className="btn-secondary btn-small" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaArrowLeft /> Dashboard
        </button>
        <h1 className="page-title">New Parkinson's Assessment</h1>
        <p className="page-subtitle" style={{ marginTop: "6px" }}>
          Upload an audio file or record a sustained voice sample. Our AI microservice will analyze vocal tremor, Jitter, Shimmer, and spectral properties.
        </p>
      </div>

      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError("")} 
        />
      )}

      {/* Tabs */}
      <div className="prediction-tabs-card">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === "record" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("record")}
          >
            <FaMicrophone /> Record Live Speech
          </button>
          <button
            className={`tab-btn ${activeTab === "upload" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <FaCloudUploadAlt /> Upload Audio File
          </button>
        </div>

        <div className="tab-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "record" ? (
                <Recorder onAudioSubmit={handleAudioSubmit} />
              ) : (
                <FileUploader onAudioSubmit={handleAudioSubmit} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Guidelines */}
      <div className="instructions-card mt-8" style={{ background: "linear-gradient(135deg, rgba(2, 132, 199, 0.04) 0%, rgba(13, 148, 136, 0.04) 100%)" }}>
        <h3 className="instructions-title font-semibold" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-color)" }}>
          <FaFileMedicalAlt /> Vocal Screening Guidelines & Protocol
        </h3>
        <ul className="instructions-list" style={{ marginTop: "12px" }}>
          <li>Ensure you are in a quiet room with minimal background noise.</li>
          <li>Position your microphone approximately 10-15 cm (4-6 inches) from your mouth.</li>
          <li>Take a deep breath and vocalize a sustained 'ah' sound steadily at a comfortable volume.</li>
          <li>Keep the sound stable for at least 5-10 seconds.</li>
          <li>Ensure the sample contains no coughing, whispers, or ambient interference.</li>
        </ul>
      </div>
    </motion.div>
  );
}
