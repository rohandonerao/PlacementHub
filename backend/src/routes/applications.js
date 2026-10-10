import express from "express";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import PlacementDrive from "../models/PlacementDrive.js";
import User from "../models/User.js";
import {
  authenticate,
  authorize,
  requireApprovedStudent
} from "../middleware/auth.js";

const router = express.Router();

router.post(
  "/:driveId",
  authenticate,
  authorize("student"),
  requireApprovedStudent,
  async (req, res) => {
    try {
      const { driveId } = req.params;

      if (!mongoose.isValidObjectId(driveId)) {
        return res.status(400).json({
          message: "Invalid placement drive ID."
        });
      }

      if (!req.user.collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
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

      const drive = await PlacementDrive.findOne({
        _id: driveId,
        collegeId: student.collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      if (
        drive.status !== "open" ||
        new Date(drive.applicationDeadline).getTime() < Date.now()
      ) {
        return res.status(400).json({
          message: "This placement drive is closed."
        });
      }

      const existingApplication = await Application.findOne({
        student: student._id,
        drive: drive._id
      });

      if (existingApplication) {
        return res.status(409).json({
          message: "You have already applied for this placement drive."
        });
      }

      const checks = [
        {
          criterion: "Minimum CGPA",
          required: drive.minimumCgpa,
          actual: student.cgpa,
          passed:
            student.cgpa != null &&
            student.cgpa >= drive.minimumCgpa
        },
        {
          criterion: "Maximum Backlogs",
          required: drive.maximumBacklogs,
          actual: student.backlogs,
          passed:
            student.backlogs != null &&
            student.backlogs <= drive.maximumBacklogs
        }
      ];

      if (drive.eligibleDepartments?.length > 0) {
        checks.push({
          criterion: "Eligible Department",
          required: drive.eligibleDepartments,
          actual: student.department,
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
          actual: student.graduationYear,
          passed:
            student.graduationYear != null &&
            drive.eligibleGraduationYears.includes(
              Number(student.graduationYear)
            )
        });
      }

      const failedChecks = checks.filter(check => !check.passed);

      if (failedChecks.length > 0) {
        return res.status(403).json({
          message: "You are not eligible for this placement drive.",
          failedChecks
        });
      }

      const application = await Application.create({
        student: student._id,
        drive: drive._id
      });

      return res.status(201).json({
        message: "Application submitted successfully.",
        application
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "You have already applied for this placement drive."
        });
      }

      console.error("Application submission error:", error);

      return res.status(500).json({
        message: "Failed to submit application."
      });
    }
  }
);

router.get(
  "/student/my-applications",
  authenticate,
  authorize("student"),
  requireApprovedStudent,
  async (req, res) => {
    try {
      if (!req.user.collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const applications = await Application.find({
        student: req.user.id
      })
        .populate({
          path: "drive",
          match: {
            collegeId: req.user.collegeId
          },
          select: "companyName jobTitle packageLPA applicationDeadline status collegeId"
        })
        .sort({ appliedAt: -1 })
        .lean();

      return res.status(200).json(
        applications.filter(application => application.drive !== null)
      );
    } catch (error) {
      console.error("Fetch student applications error:", error);

      return res.status(500).json({
        message: "Failed to fetch applications."
      });
    }
  }
);

router.get(
  "/drive/:driveId",
  authenticate,
  authorize("tpo", "admin"),
  async (req, res) => {
    try {
      const { driveId } = req.params;

      if (!mongoose.isValidObjectId(driveId)) {
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
        _id: driveId,
        collegeId: req.user.collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      const applications = await Application.find({
        drive: drive._id
      })
        .populate({
          path: "student",
          match: {
            collegeId: req.user.collegeId,
            role: "student"
          },
          select: "name email department cgpa graduationYear skills collegeId approvalStatus"
        })
        .sort({ appliedAt: -1 })
        .lean();

      return res.status(200).json(
        applications.filter(application => application.student !== null)
      );
    } catch (error) {
      console.error("Fetch drive applications error:", error);

      return res.status(500).json({
        message: "Failed to fetch applications."
      });
    }
  }
);

router.patch(
  "/:applicationId/status",
  authenticate,
  authorize("tpo", "admin"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(applicationId)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      if (!req.user.collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const allowedStatuses = [
        "shortlisted",
        "rejected",
        "selected"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Status must be shortlisted, rejected, or selected."
        });
      }

      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      const drive = await PlacementDrive.findOne({
        _id: application.drive,
        collegeId: req.user.collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Application not found in your college."
        });
      }

      const student = await User.findOne({
        _id: application.student,
        collegeId: req.user.collegeId,
        role: "student"
      });

      if (!student) {
        return res.status(404).json({
          message: "Student not found in your college."
        });
      }

      application.status = status;
      await application.save();

      return res.status(200).json({
        message: "Application status updated successfully.",
        application
      });
    } catch (error) {
      console.error("Update application status error:", error);

      return res.status(500).json({
        message: "Failed to update application status."
      });
    }
  }
);

export default router;