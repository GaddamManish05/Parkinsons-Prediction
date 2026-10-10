const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["assessment", "report", "profile", "security"],
      default: "assessment"
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    link: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Compound index for fast user-isolated queries sorted by newest
NotificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
