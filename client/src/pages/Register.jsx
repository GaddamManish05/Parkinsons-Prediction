import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Toast from "../components/Toast";
import { motion } from "framer-motion";
import { FaUser, FaEnvelope, FaLock, FaCheckDouble } from "react-icons/fa";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Please complete all the input fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Password length must be at least 6 characters.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await register(name, email, password);
      setToastMessage("Account created successfully!");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. This email may already be registered."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="auth-wrapper"
    >
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type="success" 
          onClose={() => setToastMessage("")} 
        />
      )}
      
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🎙️</span>
          <h2>Register Account</h2>
          <p>Join the AI-powered voice screening system</p>
        </div>

        {error && (
          <div className="recommendations-box border-red" style={{ padding: "12px 20px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: "600" }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div style={{ position: "relative" }}>
              <FaUser style={{ position: "absolute", left: "14px", top: "16px", color: "var(--text-light)" }} />
              <input
                type="text"
                id="name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: "42px", width: "100%" }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: "relative" }}>
              <FaEnvelope style={{ position: "absolute", left: "14px", top: "16px", color: "var(--text-light)" }} />
              <input
                type="email"
                id="email"
                placeholder="e.g. name@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "42px", width: "100%" }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <FaLock style={{ position: "absolute", left: "14px", top: "16px", color: "var(--text-light)" }} />
              <input
                type="password"
                id="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px", width: "100%" }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <FaCheckDouble style={{ position: "absolute", left: "14px", top: "16px", color: "var(--text-light)" }} />
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: "42px", width: "100%" }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Login here</Link>
        </div>
      </div>
    </motion.div>
  );
}
