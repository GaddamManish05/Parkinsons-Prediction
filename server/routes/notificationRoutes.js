const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getActivityTimeline
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getNotifications);
router.get("/activity", protect, getActivityTimeline);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

module.exports = router;
