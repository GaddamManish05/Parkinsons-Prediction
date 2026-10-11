const mongoose = require("mongoose");

const PredictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    label: {
      type: Number,
      required: true
    },
    confidence: {
      type: Number,
      required: true
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High"]
    },
    features: {
      type: Map,
      of: Number,
      required: true
    },
    voicePath: {
      type: String,
      required: true
    },
    modelVersion: {
      type: String,
      default: "1.0.0"
    },
    doctorNotes: {
      type: String,
      default: ""
    },
    recommendations: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    notesUpdatedAt: {
      type: Date,
      default: null
    },
    recommendationUpdatedAt: {
      type: Date,
      default: null
    },
    globalFeatureImportances: {
      type: Map,
      of: Number,
      default: {}
    },
    featureDeviations: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for optimizing prediction queries and administrative risk analytics
PredictionSchema.index({ user: 1, createdAt: -1 });
PredictionSchema.index({ createdAt: -1 });
PredictionSchema.index({ riskLevel: 1, createdAt: -1 });

module.exports = mongoose.model("Prediction", PredictionSchema);
