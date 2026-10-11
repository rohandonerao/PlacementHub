import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    officialEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    principalName: {
      type: String,
      required: true,
      trim: true
    },
    departments: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

collegeSchema.index({ officialEmail: 1 }, { unique: true });

export default mongoose.model("College", collegeSchema);