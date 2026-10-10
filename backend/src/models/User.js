import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["student", "tpo", "admin"],
      default: "student"
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null,
      index: true
    },

    department: {
      type: String,
      default: ""
    },

    phone: {
      type: String,
      default: ""
    },

    college: {
      type: String,
      default: ""
    },

    graduationYear: {
      type: Number,
      default: null
    },

    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },

    backlogs: {
      type: Number,
      min: 0,
      default: 0
    },

    skills: {
      type: [String],
      default: []
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);