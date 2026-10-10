const Notification = require("../models/Notification");
const Prediction = require("../models/Prediction");

// @desc    Get user notifications and unread count
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: "Server error fetching notifications.", error: error.message });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid notification ID format." });
    }

    const notification = await Notification.findOne({ _id: id, user: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found or access denied." });
    }

    notification.read = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    res.json({ notification, unreadCount });
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ message: "Server error updating notification.", error: error.message });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "All notifications marked as read.", unreadCount: 0 });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({ message: "Server error marking notifications as read.", error: error.message });
  }
};

// @desc    Get user activity timeline built from backend records
// @route   GET /api/notifications/activity
// @access  Private
const getActivityTimeline = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const [predictions, notifications] = await Promise.all([
      Prediction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(limit),
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(limit)
    ]);

    const activities = [];

    predictions.forEach((p) => {
      activities.push({
        id: `pred-${p._id}`,
        title: `Voice Assessment (${p.riskLevel} Risk)`,
        description: `Voice screening completed with ${p.confidence.toFixed(1)}% risk confidence probability.`,
        type: "assessment",
        timestamp: p.createdAt,
        link: `/result/${p._id}`
      });
    });

    notifications.forEach((n) => {
      // Avoid duplicate listing if notification is assessment type
      if (n.type !== "assessment") {
        activities.push({
          id: `notif-${n._id}`,
          title: n.title,
          description: n.message,
          type: n.type,
          timestamp: n.createdAt,
          link: n.link || ""
        });
      }
    });

    // Sort chronologically newest first
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      activities: activities.slice(0, limit)
    });
  } catch (error) {
    console.error("getActivityTimeline error:", error);
    res.status(500).json({ message: "Server error fetching activity timeline.", error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getActivityTimeline
};
