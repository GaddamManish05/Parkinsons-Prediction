import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import NotificationCenter from "./NotificationCenter";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🎙️</span>
          <span className="brand-text">Parkinson.AI</span>
        </Link>
        
        {user ? (
          <div className="navbar-user" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="user-name">
              <FaUserCircle style={{ marginRight: "6px", verticalAlign: "middle" }} />
              {user.name} ({user.role === "admin" ? "Doctor" : "Patient"})
            </span>
            <NotificationCenter />
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-logout" aria-label="Logout">
              <FaSignOutAlt style={{ marginRight: "4px", verticalAlign: "middle" }} /> Logout
            </button>
          </div>
        ) : (
          <div className="navbar-links">
            <ThemeToggle />
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn-primary btn-small">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
