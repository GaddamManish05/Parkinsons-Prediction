import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import Toast from "../components/Toast";
import { motion } from "framer-motion";
import { FaUserCircle, FaEnvelope, FaLock, FaSave, FaShieldAlt, FaHeartbeat, FaCheck } from "react-icons/fa";

const AVATARS = ["👤", "🩺", "🎙️", "🧠", "❤️"];

export default function Profile() {
  const { user, updateProfile } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Avatar select
  const [selectedAvatar, setSelectedAvatar] = useState(
    localStorage.getItem(`user_avatar_${user?.id || user?._id}`) || "👤"
  );

  // Medical Info (Simulated persistence)
  const [height, setHeight] = useState(localStorage.getItem(`med_height_${user?.id || user?._id}`) || "172");
  const [weight, setWeight] = useState(localStorage.getItem(`med_weight_${user?.id || user?._id}`) || "68");
  const [baseline, setBaseline] = useState(localStorage.getItem(`med_baseline_${user?.id || user?._id}`) || "None (Healthy Baseline)");
  const [exercises, setExercises] = useState(localStorage.getItem(`med_exercises_${user?.id || user?._id}`) || "Daily Vowel Sustain");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      setProfileError("Please complete all profile inputs.");
      return;
    }

    try {
      setProfileError("");
      setProfileSuccess("");
      setProfileLoading(true);

      const response = await API.put("/api/users/me", { name, email });
      updateProfile(response.data);
      setProfileSuccess("Your profile details were updated successfully.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Profile synchronization failed.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleMedicalUpdate = (e) => {
    e.preventDefault();
    const userId = user?.id || user?._id;
    localStorage.setItem(`med_height_${userId}`, height);
    localStorage.setItem(`med_weight_${userId}`, weight);
    localStorage.setItem(`med_baseline_${userId}`, baseline);
    localStorage.setItem(`med_exercises_${userId}`, exercises);
    setProfileSuccess("Medical records saved in your local clinical index.");
  };

  const handleSelectAvatar = (av) => {
    setSelectedAvatar(av);
    localStorage.setItem(`user_avatar_${user?.id || user?._id}`, av);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Password confirmations do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password length must be at least 6 characters.");
      return;
    }

    try {
      setPasswordError("");
      setPasswordSuccess("");
      setPasswordLoading(true);

      await API.put("/api/users/me/password", {
        currentPassword,
        newPassword
      });

      setPasswordSuccess("Your authentication password was updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Current password validation failed.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container profile-container"
    >
      <header className="mb-6">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your personal account identity, medical records, and security metrics.</p>
      </header>

      {(profileSuccess || passwordSuccess) && (
        <Toast 
          message={profileSuccess || passwordSuccess} 
          type="success" 
          onClose={() => {
            setProfileSuccess("");
            setPasswordSuccess("");
          }} 
        />
      )}

      {(profileError || passwordError) && (
        <Toast 
          message={profileError || passwordError} 
          type="error" 
          onClose={() => {
            setProfileError("");
            setPasswordError("");
          }} 
        />
      )}

      {/* Profile Header Widget */}
      <div className="glass-card mb-6" style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "58px", background: "rgba(2, 132, 199, 0.1)", width: "90px", height: "90px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {selectedAvatar}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "24px", marginBottom: "4px" }}>{user?.name}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Role Status: <strong style={{ textTransform: "uppercase", color: "var(--primary-color)" }}>{user?.role === "admin" ? "Doctor" : "Patient"}</strong></p>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            {AVATARS.map((av) => (
              <button 
                key={av} 
                onClick={() => handleSelectAvatar(av)}
                style={{ 
                  fontSize: "20px", 
                  background: selectedAvatar === av ? "var(--primary-color)" : "rgba(148, 163, 184, 0.08)", 
                  border: "none", 
                  borderRadius: "50%", 
                  width: "36px", 
                  height: "36px", 
                  cursor: "pointer",
                  transition: "all 0.2s" 
                }}
              >
                {av}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Account settings */}
        <div className="section-card">
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaUserCircle style={{ color: "var(--primary-color)" }} /> Account Settings
          </h2>
          <form onSubmit={handleProfileUpdate} className="profile-form mt-4">
            <div className="form-group">
              <label htmlFor="profile-name">Full Name</label>
              <input
                type="text"
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email Address</label>
              <input
                type="email"
                id="profile-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary font-bold mt-4"
              disabled={profileLoading}
            >
              <FaSave /> {profileLoading ? "Updating..." : "Save Details"}
            </button>
          </form>
        </div>

        {/* Medical Info */}
        <div className="section-card">
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaHeartbeat style={{ color: "var(--red)" }} /> Medical Information
          </h2>
          <form onSubmit={handleMedicalUpdate} className="profile-form mt-4">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label>Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "10px" }}>
              <label>Baseline Diagnosis</label>
              <input type="text" value={baseline} onChange={(e) => setBaseline(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginTop: "10px" }}>
              <label>Prescribed Vocal Therapy Exercises</label>
              <input type="text" value={exercises} onChange={(e) => setExercises(e.target.value)} />
            </div>

            <button type="submit" className="btn-primary font-bold mt-4">
              <FaSave /> Save Medical Records
            </button>
          </form>
        </div>

        {/* Password settings */}
        <div className="section-card" style={{ gridColumn: "span 2" }}>
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaShieldAlt style={{ color: "var(--secondary-color)" }} /> Change Password
          </h2>
          <form onSubmit={handlePasswordUpdate} className="profile-form mt-4">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div className="form-group">
                <label htmlFor="current-pw">Current Password</label>
                <input
                  type="password"
                  id="current-pw"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-pw">New Password</label>
                <input
                  type="password"
                  id="new-pw"
                  placeholder="New password (min 6)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-new-pw">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-new-pw"
                  placeholder="Re-enter password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary font-bold mt-4"
              disabled={passwordLoading}
              style={{ background: "linear-gradient(135deg, var(--secondary-color) 0%, #0d766e 100%)", boxShadow: "0 4px 14px 0 rgba(13, 148, 136, 0.3)" }}
            >
              <FaLock /> {passwordLoading ? "Securing..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
