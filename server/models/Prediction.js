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

module.exports = mongoose.model("Prediction", PredictionSchema);
