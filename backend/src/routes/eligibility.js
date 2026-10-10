import express from "express";
import mongoose from "mongoose";
import PlacementDrive from "../models/PlacementDrive.js";
import { authenticate, requireApprovedStudent } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get(
  "/:driveId",
  authenticate,
  requireApprovedStudent,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message: "Only students can check placement eligibility."
        });
      }

      if (!mongoose.isValidObjectId(req.params.driveId)) {
        return res.status(400).json({
          message: "Invalid placement drive ID."
        });
      }

      if (!req.user.collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const drive = await PlacementDrive.findOne({
        _id: req.params.driveId,
        collegeId: req.user.collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      const student = await User.findOne({
        _id: req.user.id,
        role: "student",
        collegeId: req.user.collegeId,
        isVerified: true,
        isActive: true,
        approvalStatus: "approved"
      });

      if (!student) {
        return res.status(403).json({
          message: "Your student account is not approved, verified, or active."
        });
      }

      const checks = [
        {
          criterion: "Minimum CGPA",
          required: drive.minimumCgpa,
          actual: student.cgpa ?? null,
          passed:
            student.cgpa != null &&
            student.cgpa >= drive.minimumCgpa
        },
        {
          criterion: "Maximum Backlogs",
          required: drive.maximumBacklogs,
          actual: student.backlogs ?? null,
          passed:
            student.backlogs != null &&
            student.backlogs <= drive.maximumBacklogs
        }
      ];

      if (drive.eligibleDepartments?.length > 0) {
        checks.push({
          criterion: "Eligible Department",
          required: drive.eligibleDepartments,
          actual: student.department || null,
          passed:
            !!student.department &&
            drive.eligibleDepartments.some(
              department =>
                department.trim().toLowerCase() ===
                student.department.trim().toLowerCase()
            )
        });
      }

      if (drive.eligibleGraduationYears?.length > 0) {
        checks.push({
          criterion: "Graduation Year",
          required: drive.eligibleGraduationYears,
          actual: student.graduationYear ?? null,
          passed:
            student.graduationYear != null &&
            drive.eligibleGraduationYears.includes(
              Number(student.graduationYear)
            )
        });
      }

      const deadlinePassed =
        new Date(drive.applicationDeadline).getTime() < Date.now();

      const driveOpen =
        drive.status === "open" && !deadlinePassed;

      const eligible = checks.every(check => check.passed);

      return res.json({
        driveId: drive._id,
        companyName: drive.companyName,
        jobTitle: drive.jobTitle,
        eligible,
        canApply: eligible && driveOpen,
        driveStatus: driveOpen ? "open" : "closed",
        applicationDeadline: drive.applicationDeadline,
        checks
      });
    } catch (error) {
      console.error("Eligibility check error:", error);

      return res.status(500).json({
        message: "Failed to check placement eligibility."
      });
    }
  }
);

export default router;
