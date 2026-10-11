import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import College from "./src/models/College.js";

// Usage: node create-tpo.js <college-official-email> [tpo-email] [password]
const [collegeEmail, tpoEmail = "tpo@college.edu", tpoPassword = "TPOChangeMe123!"] =
  process.argv.slice(2);

const createTPO = async () => {
  try {
    if (!collegeEmail) {
      console.log("Usage: node create-tpo.js <college-official-email> [tpo-email] [password]");
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const college = await College.findOne({
      officialEmail: collegeEmail.trim().toLowerCase(),
      status: "verified"
    });

    if (!college) {
      console.log("No verified college found with that official email.");
      return;
    }

    const email = tpoEmail.trim().toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("An account with this email already exists.");
      return;
    }

    await User.create({
      name: "Placement Officer",
      email,
      passwordHash: await bcrypt.hash(tpoPassword, 12),
      role: "tpo",
      department: "Training and Placement",
      collegeId: college._id,
      college: college.name,
      isVerified: true
    });

    console.log("TPO account created successfully.");
    console.log("College:", college.name);
    console.log("Email:", email);
    console.log("Temporary password:", tpoPassword);
  } catch (error) {
    console.error("TPO setup failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createTPO();
