import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { departmentQuery } from "../utils/departments.js";

const router = express.Router();

router.use(authenticate, authorize("tpo", "admin"));

const getCollegeFilter = (req, res) => {
  if (!req.user.collegeId) {
    res.status(403).json({
      message: "Your account is not associated with a college."
    });
    return null;
  }

  return {
    role: "student",
    collegeId: req.user.collegeId
  };
};

// Department TPOs only handle students of their own department;
// the college admin (main TPO) handles every department.
const getApprovalFilter = (req, res) => {
  const filter = getCollegeFilter(req, res);
  if (!filter || req.user.role !== "tpo") return filter;

  if (!req.user.department?.trim()) {
    res.status(403).json({
      message: "Your TPO account has no department assigned. Ask your college admin to set one."
    });
    return null;
  }

  return { ...filter, department: departmentQuery(req.user.department) };
};

router.get("/pending", async (req, res) => {
  try {
    const filter = getApprovalFilter(req, res);
    if (!filter) return;

    const students = await User.find({
      ...filter,
      isActive: true,
      $or: [
        { approvalStatus: "pending" },
        { approvalStatus: { $exists: false } }
      ]
    })
      .select("-passwordHash -emailVerificationToken -emailVerificationExpires")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      students,
      count: students.length
    });
  } catch (error) {
    console.error("Fetch pending students error:", error);
    return res.status(500).json({
      message: "Failed to fetch pending students."
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = getCollegeFilter(req, res);
    if (!filter) return;

    const students = await User.find(filter)
      .select("-passwordHash -emailVerificationToken -emailVerificationExpires")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(students);
  } catch (error) {
    console.error("Fetch students error:", error);
    return res.status(500).json({
      message: "Failed to fetch students."
    });
  }
});

router.patch("/:studentId/approve", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        message: "Invalid student ID."
      });
    }

    const filter = getApprovalFilter(req, res);
    if (!filter) return;

    const student = await User.findOne({
      ...filter,
      _id: studentId,
      isActive: true,
      $or: [
        { approvalStatus: "pending" },
        { approvalStatus: { $exists: false } }
      ]
    });

    if (!student) {
      return res.status(404).json({
        message: "Pending student not found in your college."
      });
    }

    student.approvalStatus = "approved";
    student.approvedBy = req.user.id;
    student.approvedAt = new Date();

    await student.save();

    return res.status(200).json({
      message: "Student approved successfully.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        approvalStatus: student.approvalStatus,
        approvedBy: student.approvedBy,
        approvedAt: student.approvedAt
      }
    });
  } catch (error) {
    console.error("Approve student error:", error);
    return res.status(500).json({
      message: "Failed to approve student."
    });
  }
});

router.patch("/:studentId/reject", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        message: "Invalid student ID."
      });
    }

    const filter = getApprovalFilter(req, res);
    if (!filter) return;

    const student = await User.findOne({
      ...filter,
      _id: studentId,
      isActive: true,
      $or: [
        { approvalStatus: "pending" },
        { approvalStatus: { $exists: false } }
      ]
    });

    if (!student) {
      return res.status(404).json({
        message: "Pending student not found in your college."
      });
    }

    student.approvalStatus = "rejected";
    student.approvedBy = req.user.id;
    student.approvedAt = new Date();

    await student.save();

    return res.status(200).json({
      message: "Student registration rejected.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        approvalStatus: student.approvalStatus
      }
    });
  } catch (error) {
    console.error("Reject student error:", error);
    return res.status(500).json({
      message: "Failed to reject student."
    });
  }
});

export default router;