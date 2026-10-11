const express = require("express");
const router = express.Router();

const {
  createPrediction,
  getPredictions,
  getPredictionById,
  getPredictionComparison,
  getPredictionStats,
  getPredictionReport,
  getPredictionAudio,
  emailPredictionReport,
  getAllPredictionsAdmin,
  getAllUsersAdmin,
  updatePredictionReview,
  updateUserAdmin,
  deleteUserAdmin,
  getAdminRiskAnalytics
} = require("../controllers/predictionController");
const { protect, admin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/upload", protect, upload.single("file"), createPrediction);
router.get("/admin/analytics/risk", protect, admin, getAdminRiskAnalytics);
router.get("/admin/all-predictions", protect, admin, getAllPredictionsAdmin);
router.get("/admin/all-users", protect, admin, getAllUsersAdmin);
router.put("/admin/users/:id", protect, admin, updateUserAdmin);
router.delete("/admin/users/:id", protect, admin, deleteUserAdmin);
router.put("/:id/review", protect, admin, updatePredictionReview);
router.get("/", protect, getPredictions);
router.get("/compare", protect, getPredictionComparison);
router.get("/stats", protect, getPredictionStats);
router.get("/:id", protect, getPredictionById);
router.get("/:id/report", protect, getPredictionReport);
router.get("/:id/audio", protect, getPredictionAudio);
router.post("/:id/email-report", protect, emailPredictionReport);

module.exports = router;
