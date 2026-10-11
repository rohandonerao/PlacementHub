import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import College from "../models/College.js";
import { findDepartment, normalizeDepartment } from "../utils/departments.js";
import { authenticate } from "../middleware/auth.js";
import {
  emailLimiter,
  loginLimiter,
  registerLimiter
} from "../middleware/rateLimit.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s/g, "")
  }
});

const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    hashedToken: crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")
  };
};

const sendVerificationEmail = async (user) => {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");

  if (!backendUrl) {
    throw new Error("BACKEND_URL is missing from the backend .env file.");
  }

  const { token, hashedToken } = createVerificationToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(
    Date.now() + 30 * 60 * 1000
  );

  await user.save();

  const verificationLink =
    `${backendUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: `"PlacementHub" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your PlacementHub email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Verify your college administrator email</h2>
        <p>Hello ${escapeHtml(user.name)},</p>
        <p>Click below to verify your email address.</p>
        <a
          href="${verificationLink}"
          style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px"
        >
          Verify Email Address
        </a>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not register this account, ignore this email.</p>
      </div>
    `
  });
};

// Deletes a college registration that was never verified: a pending college
// whose only accounts are unverified admins. Returns false if it is in use.
const removeUnverifiedRegistration = async (collegeId, user = null) => {
  if (user && (user.role !== "admin" || user.isVerified)) {
    return false;
  }

  const college = collegeId ? await College.findById(collegeId) : null;

  if (college && college.status !== "pending") {
    return false;
  }

  if (college) {
    const members = await User.find({ collegeId: college._id })
      .select("role isVerified")
      .lean();

    if (members.some((member) => member.role !== "admin" || member.isVerified)) {
      return false;
    }

    await User.deleteMany({ collegeId: college._id });
    await College.deleteOne({ _id: college._id });
  }

  if (user) {
    await User.deleteOne({ _id: user._id });
  }

  return true;
};

router.get("/colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "verified"
    })
      .select("_id name departments")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({ colleges });
  } catch (error) {
    console.error("Fetch colleges error:", error);

    return res.status(500).json({
      message: "Failed to fetch colleges."
    });
  }
});

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, email, password, collegeId, department } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !collegeId) {
      return res.status(400).json({
        message: "Name, email, password, and college are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    if (!mongoose.isValidObjectId(collegeId)) {
      return res.status(400).json({
        message: "Please select a valid college."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const college = await College.findOne({
      _id: collegeId,
      status: "verified"
    });

    if (!college) {
      return res.status(400).json({
        message: "Selected college is not verified."
      });
    }

    // Students must pick a department from their college's list so the
    // approval request reaches that department's TPO.
    let studentDepartment = normalizeDepartment(department);

    if (college.departments?.length) {
      studentDepartment = findDepartment(college, department);

      if (!studentDepartment) {
        return res.status(400).json({
          message: "Please select your department from the list."
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "student",
      collegeId: college._id,
      college: college.name,
      department: studentDepartment,
      isVerified: true,
      isActive: true,
      approvalStatus: "pending",
      approvedBy: null,
      approvedAt: null
    });

    return res.status(201).json({
      message: "Registration successful. Wait for your college TPO's approval.",
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        collegeId: student.collegeId,
        college: student.college,
        department: student.department,
        isVerified: student.isVerified,
        approvalStatus: student.approvalStatus
      }
    });
  } catch (error) {
    console.error("Student registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    return res.status(500).json({
      message: "Student registration failed."
    });
  }
});

router.post("/register-college", emailLimiter, async (req, res) => {
  let createdCollege = null;
  let createdAdmin = null;

  try {
    const {
      name,
      email,
      password,
      collegeName,
      officialEmail,
      address,
      principalName
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !collegeName?.trim() ||
      !officialEmail?.trim() ||
      !address?.trim() ||
      !principalName?.trim()
    ) {
      return res.status(400).json({
        message: "All college and administrator fields are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOfficialEmail = officialEmail.trim().toLowerCase();

    // A registration whose email was never verified must not block a retry,
    // otherwise an expired or lost link leaves the college stuck forever.
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (!(await removeUnverifiedRegistration(existingUser.collegeId, existingUser))) {
        return res.status(409).json({
          message: "An account with this administrator email already exists."
        });
      }
    }

    const existingCollege = await College.findOne({
      officialEmail: normalizedOfficialEmail
    });

    if (existingCollege) {
      if (!(await removeUnverifiedRegistration(existingCollege._id))) {
        return res.status(409).json({
          message: "A college with this official email is already registered."
        });
      }
    }

    createdCollege = await College.create({
      name: collegeName.trim(),
      officialEmail: normalizedOfficialEmail,
      address: address.trim(),
      principalName: principalName.trim(),
      status: "pending"
    });

    const passwordHash = await bcrypt.hash(password, 10);

    createdAdmin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      collegeId: createdCollege._id,
      college: createdCollege.name,
      isVerified: false,
      isActive: true
    });

    try {
      await sendVerificationEmail(createdAdmin);
    } catch (emailError) {
      await User.deleteOne({ _id: createdAdmin._id });
      await College.deleteOne({ _id: createdCollege._id });

      console.error("College verification email error:", emailError);

      return res.status(500).json({
        message: "Could not send the verification email. Check your email and backend URL configuration."
      });
    }

    return res.status(201).json({
      message: "College registration successful. Check your email and click the verification link.",
      college: {
        id: createdCollege._id,
        name: createdCollege.name,
        status: createdCollege.status
      },
      user: {
        id: createdAdmin._id,
        name: createdAdmin.name,
        email: createdAdmin.email,
        role: createdAdmin.role,
        isVerified: createdAdmin.isVerified
      }
    });
  } catch (error) {
    console.error("College registration error:", error);

    if (createdAdmin?._id) {
      await User.deleteOne({ _id: createdAdmin._id }).catch(() => {});
    }

    if (createdCollege?._id) {
      await College.deleteOne({ _id: createdCollege._id }).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email or college is already registered."
      });
    }

    return res.status(500).json({
      message: "College registration failed."
    });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (typeof token !== "string" || !token) {
      return res.status(400).send(`
        <h2>Verification Failed</h2>
        <p>The verification token is missing or invalid.</p>
      `);
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: {
        $gt: new Date()
      }
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return res.status(400).send(`
        <h2>Verification Failed</h2>
        <p>This verification link is invalid or has expired.</p>
        <p>To get a new link, sign in to PlacementHub with your administrator email and password. A fresh verification email will be sent automatically.</p>
      `);
    }

    if (user.role !== "admin") {
      return res.status(400).send(`
        <h2>Verification Failed</h2>
        <p>This link is not valid for a college administrator account.</p>
      `);
    }

    const college = await College.findOne({
      _id: user.collegeId,
      status: "pending"
    });

    if (!college) {
      if (user.isVerified) {
        return res.status(200).send(`
          <h2>Email Already Verified</h2>
          <p>Your email has already been verified.</p>
        `);
      }

      return res.status(400).send(`
        <h2>College Verification Failed</h2>
        <p>The college record was not found or is not awaiting verification.</p>
      `);
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    college.status = "verified";
    college.verifiedAt = new Date();

    await Promise.all([
      user.save(),
      college.save()
    ]);

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PlacementHub Email Verification</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:50px 20px;background:#f5f7fc;color:#17213d">
          <div style="max-width:500px;margin:auto;background:white;padding:35px;border-radius:16px">
            <h1 style="color:#16a34a">Email Verified Successfully</h1>
            <p>Your college administrator email has been verified.</p>
            <p>Your college is now marked as verified.</p>
            <p>You can now sign in to PlacementHub.</p>
            <a href="${frontendUrl()}/?page=login" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1f4e8c;color:white;text-decoration:none;border-radius:8px">Go to sign in</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).send(`
      <h2>Verification Error</h2>
      <p>An unexpected error occurred while verifying your email.</p>
      <p>Please try again later.</p>
    `);
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is inactive. Contact your administrator."
      });
    }

    if (user.role === "admin" && user.isVerified !== true) {
      // The password is correct, so it is safe to send a fresh link here.
      // Skip it if the last link went out under 2 minutes ago.
      const pendingUser = await User.findById(user._id).select(
        "+emailVerificationToken +emailVerificationExpires"
      );
      const linkAgeMs = pendingUser.emailVerificationExpires
        ? 30 * 60 * 1000 - (pendingUser.emailVerificationExpires - Date.now())
        : Infinity;

      if (linkAgeMs < 2 * 60 * 1000) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          message: `A verification link was just sent to ${user.email}. Check your inbox and spam folder.`
        });
      }

      try {
        await sendVerificationEmail(pendingUser);
      } catch (emailError) {
        console.error("Resend verification email error:", emailError);

        return res.status(500).json({
          message: "Your email is not verified, and a new verification email could not be sent. Please try again later."
        });
      }

      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: `Your email is not verified yet. We sent a new verification link to ${user.email}. It expires in 30 minutes.`
      });
    }

    let college = null;

    if (["admin", "tpo", "student"].includes(user.role)) {
      if (!user.collegeId) {
        return res.status(403).json({
          message: "Your account is not associated with a college."
        });
      }

      college = await College.findOne({
        _id: user.collegeId,
        status: "verified"
      });

      if (!college) {
        return res.status(403).json({
          message: "Your college is not verified."
        });
      }
    }

    const approvalStatus =
      user.role === "student"
        ? user.approvalStatus || "pending"
        : null;

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        collegeId: user.collegeId
          ? user.collegeId.toString()
          : null
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        college: college?.name || user.college || "",
        department: user.department || "",
        isVerified: user.isVerified,
        approvalStatus
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed."
    });
  }
});

const RESET_LINK_MINUTES = 30;

// Always answers the same way, so the form cannot be used to discover
// which email addresses have accounts.
router.post("/forgot-password", emailLimiter, async (req, res) => {
  const genericMessage =
    "If an account exists for that email, a password reset link has been sent. It expires in 30 minutes.";

  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({ message: "Please enter your email address." });
    }

    const user = await User.findOne({ email }).select("+passwordResetExpires");

    if (!user || user.isActive === false) {
      return res.json({ message: genericMessage });
    }

    // Skip if a link went out in the last 2 minutes.
    const linkAgeMs = user.passwordResetExpires
      ? RESET_LINK_MINUTES * 60 * 1000 - (user.passwordResetExpires - Date.now())
      : Infinity;

    if (linkAgeMs < 2 * 60 * 1000) {
      return res.json({ message: genericMessage });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000);
    await user.save();

    const resetLink = `${frontendUrl()}/?reset=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from: `"PlacementHub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset your PlacementHub password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2>Reset your password</h2>
          <p>Hello ${escapeHtml(user.name)},</p>
          <p>We received a request to reset your PlacementHub password. Click below to choose a new one.</p>
          <a
            href="${resetLink}"
            style="display:inline-block;padding:12px 24px;background:#1f4e8c;color:white;text-decoration:none;border-radius:6px"
          >
            Reset password
          </a>
          <p>This link expires in ${RESET_LINK_MINUTES} minutes and can be used once.</p>
          <p>If you did not ask for this, ignore this email. Your password will not change.</p>
        </div>
      `
    });

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Could not send the reset email. Please try again later."
    });
  }
});

router.post("/reset-password", registerLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({ message: "This reset link is invalid." });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must contain at least 8 characters." });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() }
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Please request a new one."
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({ message: "Could not reset the password. Please try again." });
  }
});

router.post("/change-password", authenticate, loginLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must contain at least 8 characters." });
    }

    const user = await User.findById(req.user.id);

    if (!user || !(await bcrypt.compare(String(currentPassword || ""), user.passwordHash))) {
      return res.status(400).json({ message: "Your current password is incorrect." });
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ message: "Choose a password different from your current one." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({ message: "Could not change the password. Please try again." });
  }
});

export default router;