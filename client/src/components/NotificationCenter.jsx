import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { 
  FaBell, FaCheckDouble, FaNotesMedical, FaFilePdf, 
  FaUser, FaExclamationTriangle, FaCheck, FaHistory, FaClock 
} from "react-icons/fa";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'unread', 'activity'
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/api/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await API.get("/api/notifications/activity");
      setActivities(res.data.activities || []);
    } catch (err) {
      console.error("Failed to fetch activity timeline:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
      if (activeTab === "activity") {
        fetchActivities();
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "activity" && activities.length === 0) {
      fetchActivities();
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await API.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(res.data.unreadCount ?? Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif._id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "assessment":
        return <FaNotesMedical style={{ color: "var(--primary-color)" }} />;
      case "report":
        return <FaFilePdf style={{ color: "var(--red)" }} />;
      case "profile":
        return <FaUser style={{ color: "var(--secondary-color)" }} />;
      case "security":
        return <FaExclamationTriangle style={{ color: "var(--orange)" }} />;
      default:
        return <FaBell style={{ color: "var(--primary-color)" }} />;
    }
  };

  const displayedNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={handleToggle}
        className="btn-secondary"
        style={{
          position: "relative",
          padding: "8px 12px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer"
        }}
        aria-label="Notifications"
      >
        <FaBell style={{ fontSize: "16px", color: unreadCount > 0 ? "var(--primary-color)" : "var(--text-secondary)" }} />
        {unreadCount > 0 && (
          <span
            style={{
              background: "var(--red)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "800",
              borderRadius: "10px",
              padding: "2px 6px",
              lineHeight: "1"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && (
        <div
          className="glass-card shadow-lg"
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            width: "360px",
            maxHeight: "480px",
            zIndex: 1000,
            padding: 0,
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--border-color)",
            background: "var(--card-bg)"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              background: "rgba(148, 163, 184, 0.05)"
            }}
          >
            <h4 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaBell style={{ color: "var(--primary-color)" }} /> Activity & Alerts
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary-color)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <FaCheckDouble /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", background: "rgba(148, 163, 184, 0.02)" }}>
            <button
              onClick={() => handleTabChange("all")}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "all" ? "2px solid var(--primary-color)" : "none",
                color: activeTab === "all" ? "var(--primary-color)" : "var(--text-secondary)",
                fontWeight: activeTab === "all" ? "700" : "500",
                fontSize: "12.5px",
                cursor: "pointer"
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => handleTabChange("unread")}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "unread" ? "2px solid var(--primary-color)" : "none",
                color: activeTab === "unread" ? "var(--primary-color)" : "var(--text-secondary)",
                fontWeight: activeTab === "unread" ? "700" : "500",
                fontSize: "12.5px",
                cursor: "pointer"
              }}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => handleTabChange("activity")}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "activity" ? "2px solid var(--primary-color)" : "none",
                color: activeTab === "activity" ? "var(--primary-color)" : "var(--text-secondary)",
                fontWeight: activeTab === "activity" ? "700" : "500",
                fontSize: "12.5px",
                cursor: "pointer"
              }}
            >
              Timeline
            </button>
          </div>

          {/* Body Content */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "360px" }}>
            {activeTab === "activity" ? (
              /* Activity Timeline List */
              activities.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  <FaHistory style={{ fontSize: "24px", opacity: 0.5, marginBottom: "8px" }} />
                  <p>No activity logged yet.</p>
                </div>
              ) : (
                <div style={{ padding: "8px 12px" }}>
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => {
                        setIsOpen(false);
                        if (act.link) navigate(act.link);
                      }}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        marginBottom: "6px",
                        background: "rgba(148, 163, 184, 0.04)",
                        cursor: act.link ? "pointer" : "default",
                        borderLeft: "3px solid var(--primary-color)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700" }}>
                        <span>{act.title}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <FaClock /> {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>{act.description}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Notifications List */
              displayedNotifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>🔔</span>
                  <p>No notifications to display.</p>
                </div>
              ) : (
                displayedNotifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--border-color)",
                      background: notif.read ? "transparent" : "rgba(2, 132, 199, 0.05)",
                      cursor: "pointer",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      transition: "var(--transition)"
                    }}
                  >
                    <div style={{ fontSize: "16px", marginTop: "2px" }}>{getIcon(notif.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "13px", color: notif.read ? "var(--text-main)" : "var(--primary-color)" }}>
                          {notif.title}
                        </strong>
                        {!notif.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif._id, e)}
                            title="Mark as read"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-light)",
                              fontSize: "11px",
                              cursor: "pointer"
                            }}
                          >
                            <FaCheck />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px", lineHeight: "1.4" }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: "10.5px", color: "var(--text-light)", marginTop: "4px", display: "block" }}>
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
