const Notification = require("../models/Notification");

/**
 * Safely creates a user notification without blocking the main request cycle.
 */
const createNotification = async (userId, title, message, type = "assessment", link = "") => {
  try {
    if (!userId) return null;
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      link,
      read: false
    });
    return await notification.save();
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
};

module.exports = { createNotification };
