import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./src/routes/auth.js";
import tpoRoutes from "./src/routes/tpo.js";
import profileRoutes from "./src/routes/profile.js";
import resumeRoutes from "./src/routes/resume.js";
import driveRoutes from "./src/routes/drives.js";
import eligibilityRoutes from "./src/routes/eligibility.js";
import applicationRoutes from "./src/routes/applications.js";
import studentsRoutes from "./src/routes/students.js";
import PlacementDrive from "./src/models/PlacementDrive.js";
import Application from "./src/models/Application.js";
import adminRoutes from "./src/routes/admin.js";


const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/tpo", tpoRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/drives", driveRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/auth/test", (req, res) => {
  res.json({ message: "Auth route is mounted." });
});

async function deleteExpiredPlacementDrives() {
  try {
    const now = new Date();

    const expiredDrives = await PlacementDrive.find({
      applicationDeadline: { $lte: now }
    })
      .select("_id")
      .lean();

    if (expiredDrives.length === 0) {
      return;
    }

    const expiredDriveIds = expiredDrives.map(drive => drive._id);

    await Application.deleteMany({
      drive: { $in: expiredDriveIds }
    });

    const result = await PlacementDrive.deleteMany({
      _id: { $in: expiredDriveIds },
      applicationDeadline: { $lte: now }
    });

    console.log(
      `Automatic cleanup: deleted ${result.deletedCount} expired placement drive(s) and their applications.`
    );
  } catch (error) {
    console.error("Automatic expired-drive cleanup failed:", error.message);
  }
}

const port = process.env.PORT || 5000;

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await deleteExpiredPlacementDrives();
  setInterval(deleteExpiredPlacementDrives, 60 * 1000);

  app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
  });
} catch (error) {
  console.error("Could not connect to MongoDB:", error.message);
  process.exit(1);
}
