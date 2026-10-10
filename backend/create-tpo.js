import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";

const createTPO = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "tpo@college.edu";
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("TPO account already exists.");
      return;
    }

    const password = "TPOChangeMe123!";

    await User.create({
      name: "Placement Officer",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "tpo",
      department: "Training and Placement",
      isVerified: true
    });

    console.log("TPO account created successfully.");
    console.log("Email:", email);
    console.log("Temporary password:", password);
  } catch (error) {
    console.error("TPO setup failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createTPO();