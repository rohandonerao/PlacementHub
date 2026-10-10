import express from "express";
import mongoose from "mongoose";
import PlacementDrive from "../models/PlacementDrive.js";
import Application from "../models/Application.js";
import {
  authenticate,
  authorize,
  requireApprovedStudent
} from "../middleware/auth.js";

const router = express.Router();

const getCollegeId = req => req.user.collegeId;

router.post(
  "/",
  authenticate,
  authorize("tpo", "admin"),
  async (req, res) => {
    try {
      const {
        companyName,
        jobTitle,
        description,
        packageLPA,
        minimumCgpa,
        maximumBacklogs,
        eligibleDepartments,
        eligibleGraduationYears,
        requiredSkills,
        applicationDeadline
      } = req.body;

      const collegeId = getCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      if (
        !companyName?.trim() ||
        !jobTitle?.trim() ||
        !description?.trim() ||
        minimumCgpa == null ||
        maximumBacklogs == null ||
        !applicationDeadline
      ) {
        return res.status(400).json({
          message: "Please provide all required placement drive fields."
        });
      }

      const deadline = new Date(applicationDeadline);

      if (Number.isNaN(deadline.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid application deadline."
        });
      }

      if (deadline <= new Date()) {
        return res.status(400).json({
          message: "The application deadline must be in the future."
        });
      }

      const drive = await PlacementDrive.create({
        companyName,
        jobTitle,
        description,
        packageLPA,
        minimumCgpa,
        maximumBacklogs,
        eligibleDepartments,
        eligibleGraduationYears,
        requiredSkills,
        applicationDeadline: deadline,
        createdBy: req.user.id,
        collegeId
      });

      return res.status(201).json({
        message: "Placement drive created successfully.",
        drive
      });
    } catch (error) {
      if (
        error.name === "ValidationError" ||
        error.name === "CastError"
      ) {
        return res.status(400).json({
          message: error.message
        });
      }

      console.error("Create placement drive error:", error);

      return res.status(500).json({
        message: "Failed to create placement drive."
      });
    }
  }
);

router.get(
  "/",
  authenticate,
  requireApprovedStudent,
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const drives = await PlacementDrive.find({ collegeId })
        .sort({ createdAt: -1 })
        .lean();

      return res.json(drives);
    } catch (error) {
      console.error("Fetch placement drives error:", error);

      return res.status(500).json({
        message: "Failed to fetch placement drives."
      });
    }
  }
);

router.get(
  "/:id",
  authenticate,
  requireApprovedStudent,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid placement drive ID."
        });
      }

      const collegeId = getCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const drive = await PlacementDrive.findOne({
        _id: req.params.id,
        collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      return res.json(drive);
    } catch (error) {
      console.error("Fetch placement drive error:", error);

      return res.status(500).json({
        message: "Failed to fetch placement drive."
      });
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize("tpo", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid placement drive ID."
        });
      }

      const collegeId = getCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const drive = await PlacementDrive.findOne({
        _id: id,
        collegeId
      });

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      await Application.deleteMany({
        drive: drive._id
      });

      await PlacementDrive.deleteOne({
        _id: drive._id,
        collegeId
      });

      return res.json({
        message:
          "Placement drive and its associated applications were deleted successfully.",
        driveId: id
      });
    } catch (error) {
      console.error("Delete placement drive error:", error);

      return res.status(500).json({
        message: "Failed to delete placement drive and its applications."
      });
    }
  }
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("tpo", "admin"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid placement drive ID."
        });
      }

      const collegeId = getCollegeId(req);

      if (!collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      const { status } = req.body;

      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({
          message: "Status must be open or closed."
        });
      }

      const drive = await PlacementDrive.findOneAndUpdate(
        {
          _id: req.params.id,
          collegeId
        },
        { $set: { status } },
        { new: true, runValidators: true }
      );

      if (!drive) {
        return res.status(404).json({
          message: "Placement drive not found in your college."
        });
      }

      return res.json({
        message: "Placement drive status updated successfully.",
        drive
      });
    } catch (error) {
      console.error("Update placement drive status error:", error);

      return res.status(500).json({
        message: "Failed to update placement drive status."
      });
    }
  }
);

export default router;
