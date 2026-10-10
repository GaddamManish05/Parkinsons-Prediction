export default function LoadingSpinner({ message = "Analyzing vocal biometrics..." }) {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <p className="spinner-text">{message}</p>
      <p className="spinner-subtext">Running feature extraction, noise filtration, and model prediction. Please do not close this window.</p>
    </div>
  );
}
