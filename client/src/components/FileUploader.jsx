import { useState } from "react";
import { FaCloudUploadAlt, FaFileAudio, FaExclamationCircle } from "react-icons/fa";

export default function FileUploader({ onAudioSubmit }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    const validExtensions = [".wav", ".mp3", ".webm", ".ogg"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setError("Invalid format. Please upload a WAV, MP3, WEBM, or OGG file.");
      setFile(null);
      return false;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit. Please upload a smaller sample.");
      setFile(null);
      return false;
    }

    setError("");
    setFile(selectedFile);
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onAudioSubmit(file);
    }
  };

  return (
    <form className="file-uploader" onSubmit={handleSubmit} onDragEnter={handleDrag}>
      <div 
        className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <span className="upload-icon" style={{ color: "var(--primary-color)" }}>
          <FaCloudUploadAlt />
        </span>
        <p className="upload-instruction">
          Drag & drop your voice sample here, or{" "}
          <label className="upload-label" style={{ color: "var(--primary-color)", fontWeight: "700", textDecoration: "underline" }}>
            browse files
            <input 
              type="file" 
              className="file-input" 
              accept=".wav,.mp3,.webm,.ogg" 
              onChange={handleChange} 
            />
          </label>
        </p>
        <p className="upload-formats" style={{ fontSize: "12px", color: "var(--text-light)" }}>Supported formats: WAV, MP3, WEBM, OGG (Max: 10MB)</p>
        
        {file && (
          <div className="selected-file-badge" style={{ marginTop: "16px" }}>
            <span className="file-badge-icon" style={{ marginRight: "6px" }}><FaFileAudio /></span>
            <span className="file-badge-name">{file.name}</span>
            <span className="file-badge-size" style={{ marginLeft: "6px", fontWeight: "400", opacity: 0.8 }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
        )}

        {error && (
          <div className="error-message upload-error" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--red)", fontSize: "13px", marginTop: "10px" }}>
            <FaExclamationCircle /> {error}
          </div>
        )}
      </div>

      {file && (
        <button type="submit" className="btn-success btn-block" style={{ width: "100%" }}>
          Analyze Uploaded File
        </button>
      )}
    </form>
  );
}
