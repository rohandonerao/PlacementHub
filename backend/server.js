import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./src/routes/auth.js";
import profileRoutes from "./src/routes/profile.js";
import resumeRoutes from "./src/routes/resume.js";
import driveRoutes from "./src/routes/drives.js";
import eligibilityRoutes from "./src/routes/eligibility.js";
import applicationRoutes from "./src/routes/applications.js";
import studentsRoutes from "./src/routes/students.js";
import adminRoutes from "./src/routes/admin.js";

import PlacementDrive from "./src/models/PlacementDrive.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "https://placement-hub-liard.vercel.app",
  process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.replace(/\/+$/, "")
    : null
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/drives", driveRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "The request body is not valid JSON."
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "The request is too large."
    });
  }

  console.error("Unhandled error:", error.message);

  return res.status(500).json({
    message: "Something went wrong. Please try again."
  });
});

async function closeExpiredPlacementDrives() {
  try {
    const result = await PlacementDrive.updateMany(
      {
        applicationDeadline: { $lte: new Date() },
        status: "open"
      },
      {
        $set: { status: "closed" }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Automatic close: ${result.modifiedCount} placement drive(s) passed their deadline.`
      );
    }
  } catch (error) {
    console.error(
      "Automatic expired-drive close failed:",
      error.message
    );
  }
}

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");

    await closeExpiredPlacementDrives();

    setInterval(closeExpiredPlacementDrives, 60 * 1000);

    app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();