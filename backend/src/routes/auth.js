import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import College from "../models/College.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s/g, "")
  }
});

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
        <p>Hello ${user.name},</p>
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

router.get("/colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "verified"
    })
      .select("_id name")
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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, collegeId } = req.body;

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

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "student",
      collegeId: college._id,
      college: college.name,
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

router.post("/register-college", async (req, res) => {
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

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this administrator email already exists."
      });
    }

    if (
      await College.findOne({
        officialEmail: normalizedOfficialEmail
      })
    ) {
      return res.status(409).json({
        message: "A college with this official email is already registered."
      });
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
        <p>Please register again or request a new verification email.</p>
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
            <p>You can return to PlacementHub and sign in.</p>
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

router.post("/login", async (req, res) => {
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
      return res.status(403).json({
        message: "Please verify your college administrator email using the link sent to your inbox."
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

export default router;