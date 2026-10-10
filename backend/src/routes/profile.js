
import express from "express";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile." });
  }
});

router.put("/", async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "department",
      "cgpa",
      "backlogs",
      "graduationYear",
      "skills",
      "projects",
      "certifications",
      "linkedin",
      "github",
      "portfolio"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      return res.status(400).json({
        message: "Name cannot be empty."
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(400).json({
      message: "Failed to update profile.",
      error: error.message
    });
  }
});

export default router;