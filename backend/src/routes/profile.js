
import express from "express";
import User from "../models/User.js";
import College from "../models/College.js";
import { findDepartment, normalizeDepartment } from "../utils/departments.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const college = user.collegeId
      ? await College.findById(user.collegeId).select("departments").lean()
      : null;

    return res.status(200).json({
      user,
      collegeDepartments: college?.departments || []
    });
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

    // A TPO's department decides which approvals they handle, so only the
    // college admin can change it. Students must use the college's list.
    if (updates.department !== undefined) {
      if (req.user.role === "tpo") {
        delete updates.department;
      } else {
        const college = req.user.collegeId
          ? await College.findById(req.user.collegeId).select("departments").lean()
          : null;

        updates.department = college?.departments?.length
          ? findDepartment(college, updates.department)
          : normalizeDepartment(updates.department);

        if (updates.department === null) {
          return res.status(400).json({
            message: "Please select your department from the list."
          });
        }
      }
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