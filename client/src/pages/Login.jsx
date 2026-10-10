import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Toast from "../components/Toast";
import { motion } from "framer-motion";
import { FaLock, FaEnvelope, FaUserMd, FaUserCheck } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState("user"); // user | admin
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [loading, setLoading] = useState(false);
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Load remembered email
    const remembered = localStorage.getItem("remembered_email");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }

    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate]);

  const handleRoleToggle = (selectedRole) => {
    setRole(selectedRole);
    // Fill mock details for quick evaluation
    if (selectedRole === "admin") {
      setEmail("admin@parkinson.com");
      setPassword("admin123");
    } else {
      setEmail("patient@parkinson.com");
      setPassword("password123");
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setToastType("info");
    setToastMessage("Password recovery link has been simulated. Check console log or contact the system administrator.");
    console.log("Simulating password recovery for: " + (email || "anonymous"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all the required credentials.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const loggedUser = await login(email, password);
      
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      setToastType("success");
      setToastMessage("Access granted. Authenticated successfully!");
      
      setTimeout(() => {
        if (loggedUser.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid authentication credentials. Please try again."
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
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}

      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🎙️</span>
          <h2>Welcome back</h2>
          <p>Access the Parkinson's Risk Prediction Portal</p>
        </div>

        {/* Role Toggle Selector */}
        <div className="role-toggle">
          <button 
            type="button"
            className={`role-btn ${role === "user" ? "active" : ""}`}
            onClick={() => handleRoleToggle("user")}
          >
            <FaUserCheck style={{ marginRight: "6px" }} /> Patient User
          </button>
          <button 
            type="button"
            className={`role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => handleRoleToggle("admin")}
          >
            <FaUserMd style={{ marginRight: "6px" }} /> Admin Portal
          </button>
        </div>

        {error && (
          <div className="recommendations-box border-red" style={{ padding: "12px 20px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: "600" }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: "relative" }}>
              <FaEnvelope style={{ position: "absolute", left: "14px", top: "16px", color: "var(--text-light)" }} />
              <input
                type="email"
                id="email"
                placeholder="e.g. email@domain.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px", width: "100%" }}
                required
              />
            </div>
          </div>

          <div className="remember-forgot">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              Remember me
            </label>
            <a href="#" onClick={handleForgotPassword} className="auth-link" style={{ fontSize: "13px" }}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Authorizing..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Register here</Link>
        </div>
      </div>
    </motion.div>
  );
}