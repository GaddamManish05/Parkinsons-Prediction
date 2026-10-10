const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { getJwtSecret } = require("./config/jwtConfig");

// Load Environment Variables
dotenv.config();

// Ensure JWT Secret configuration is valid
getJwtSecret();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists (private storage accessed only via authenticated endpoint)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/parkinson";
mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connection successful"))
  .catch((err) => console.error("MongoDB connection failed:", err));

// Health check endpoints
app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "UP",
    service: "parkinson-express-server",
    timestamp: new Date().toISOString()
  });
});

// Routes configuration
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/predictions", require("./routes/predictionRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandle Server Error:", err.stack);
  res.status(500).json({
    message: err.message || "An unexpected server error occurred",
    error: process.env.NODE_ENV === "production" ? {} : err.stack
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
