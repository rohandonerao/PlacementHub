
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import College from "../models/College.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User account not found."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated."
      });
    }

    let college = null;

    if (user.collegeId) {
      college = await College.findById(user.collegeId);

      if (!college) {
        return res.status(403).json({
          message: "Your college association could not be found."
        });
      }

      if (college.status !== "verified") {
        return res.status(403).json({
          message: "Your college is not verified yet."
        });
      }
    } else if (user.role === "admin" || user.role === "tpo") {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId
        ? user.collegeId.toString()
        : null,
      department: user.department,
      isVerified: user.isVerified,
      approvalStatus:
        user.role === "student"
          ? user.approvalStatus || "pending"
          : null
    };

    req.college = college;

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message:
          error.name === "TokenExpiredError"
            ? "Your session has expired. Please log in again."
            : "Invalid authentication token. Please log in again."
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication failed."
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource."
      });
    }

    return next();
  };
};

export const requireVerifiedStudent = (req, res, next) => {
  return next();
};

export const requireApprovedStudent = (req, res, next) => {
  if (req.user?.role !== "student") {
    return next();
  }

  if (req.user.approvalStatus === "rejected") {
    return res.status(403).json({
      code: "STUDENT_REJECTED",
      message: "Your registration was rejected by the TPO."
    });
  }

  if (req.user.approvalStatus !== "approved") {
    return res.status(403).json({
      code: "STUDENT_PENDING_APPROVAL",
      message: "Your account is waiting for TPO approval."
    });
  }

  return next();
};
