
import mongoose from "mongoose";

const placementDriveSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    packageLPA: {
      type: Number,
      min: 0,
      default: null
    },
    minimumCgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    maximumBacklogs: {
      type: Number,
      required: true,
      min: 0
    },
    eligibleDepartments: {
      type: [String],
      default: []
    },
    eligibleGraduationYears: {
      type: [Number],
      default: []
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    applicationDeadline: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("PlacementDrive", placementDriveSchema);
