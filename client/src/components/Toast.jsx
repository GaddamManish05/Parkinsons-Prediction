import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  return (
    <div className={`toast-alert toast-${type}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close-btn" onClick={onClose}>
        &times;
      </button>
    </div>
  );
}
