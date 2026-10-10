const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  updateUserPassword
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.route("/me")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put("/me/password", protect, updateUserPassword);

module.exports = router;
