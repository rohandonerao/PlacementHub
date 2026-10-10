
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("tpo"));

const getCollegeId = (req) => req.user.collegeId;

router.get("/pending-students", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    const students = await User.find({
      role: "student",
      collegeId,
      isVerified: false
    })
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.json({ students });
  } catch {
    return res.status(500).json({
      message: "Failed to fetch pending students."
    });
  }
});

router.patch("/students/:id/approve", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid student ID."
      });
    }

    const student = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "student",
        collegeId,
        isVerified: false
      },
      { $set: { isVerified: true } },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!student) {
      return res.status(404).json({
        message: "Pending student not found in your college."
      });
    }

    return res.json({
      message: "Student approved successfully.",
      student
    });
  } catch {
    return res.status(500).json({
      message: "Failed to approve student."
    });
  }
});

router.patch("/students/:id/reject", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid student ID."
      });
    }

    const student = await User.findOneAndDelete({
      _id: req.params.id,
      role: "student",
      collegeId,
      isVerified: false
    }).select("-passwordHash");

    if (!student) {
      return res.status(404).json({
        message: "Pending student not found in your college."
      });
    }

    return res.json({
      message: "Student registration rejected.",
      student
    });
  } catch {
    return res.status(500).json({
      message: "Failed to reject student."
    });
  }
});

export default router;
