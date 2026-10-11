
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import College from "../models/College.js";
import {
  departmentQuery,
  findDepartment,
  normalizeDepartment
} from "../utils/departments.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate, authorize("admin"));

const publicTpoFields =
  "name email role department phone college collegeId isVerified isActive createdAt updatedAt";

const getCollegeId = (req) => req.user.collegeId;

router.get("/departments", async (req, res) => {
  try {
    const college = await College.findById(getCollegeId(req)).lean();

    return res.json({ departments: college?.departments || [] });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load departments."
    });
  }
});

router.post("/departments", async (req, res) => {
  try {
    const name = normalizeDepartment(req.body.name);

    if (!name || name.length > 80) {
      return res.status(400).json({
        message: "Department name is required (up to 80 characters)."
      });
    }

    const college = await College.findById(getCollegeId(req));

    if (findDepartment(college, name)) {
      return res.status(409).json({
        message: `${name} is already in your department list.`
      });
    }

    college.departments.push(name);
    college.departments.sort((a, b) => a.localeCompare(b));
    await college.save();

    return res.status(201).json({
      message: `Department ${name} added.`,
      departments: college.departments
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to add department."
    });
  }
});

router.delete("/departments/:name", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const college = await College.findById(collegeId);
    const name = findDepartment(college, req.params.name);

    if (!name) {
      return res.status(404).json({
        message: "Department not found."
      });
    }

    const assignedTpos = await User.countDocuments({
      role: "tpo",
      collegeId,
      department: departmentQuery(name)
    });

    if (assignedTpos > 0) {
      return res.status(409).json({
        message: `Move the ${assignedTpos} TPO account(s) in ${name} to another department before removing it.`
      });
    }

    college.departments = college.departments.filter((department) => department !== name);
    await college.save();

    return res.json({
      message: `Department ${name} removed.`,
      departments: college.departments
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to remove department."
    });
  }
});

// TPOs must belong to a department on the college's list so student
// approval requests can be routed to them.
const resolveTpoDepartment = async (req, res, value) => {
  const college = await College.findById(getCollegeId(req)).lean();
  const department = findDepartment(college, value);

  if (!department) {
    res.status(400).json({
      message: college?.departments?.length
        ? "Please choose a department from your college's department list."
        : "Add your college's departments first, then assign one to this TPO."
    });
    return null;
  }

  return department;
};

router.get("/tpos", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    const tpos = await User.find({
      role: "tpo",
      collegeId
    })
      .select(publicTpoFields)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ tpos });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load TPO accounts."
    });
  }
});

router.post("/tpos", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    const {
      name,
      email,
      password,
      department = "",
      phone = ""
    } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const tpoDepartment = await resolveTpoDepartment(req, res, department);
    if (!tpoDepartment) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const collegeName = req.college?.name || "";

    const tpo = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: "tpo",
      collegeId,
      department: tpoDepartment,
      phone,
      college: collegeName,
      isVerified: true,
      isActive: true
    });

    return res.status(201).json({
      message: "TPO account created successfully.",
      tpo: await User.findOne({
        _id: tpo._id,
        collegeId,
        role: "tpo"
      })
        .select(publicTpoFields)
        .lean()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    return res.status(500).json({
      message: "Unable to create TPO account."
    });
  }
});

router.patch("/tpos/:id", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const { id } = req.params;

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid TPO account ID."
      });
    }

    const { name, email, department = "", phone = "" } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required."
      });
    }

    const tpoDepartment = await resolveTpoDepartment(req, res, department);
    if (!tpoDepartment) return;

    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: id }
    });

    if (duplicate) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const tpo = await User.findOneAndUpdate(
      {
        _id: id,
        role: "tpo",
        collegeId
      },
      {
        $set: {
          name: name.trim(),
          email: normalizedEmail,
          department: tpoDepartment,
          phone
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
      .select(publicTpoFields)
      .lean();

    if (!tpo) {
      return res.status(404).json({
        message: "TPO account not found in your college."
      });
    }

    return res.json({
      message: "TPO account updated successfully.",
      tpo
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    return res.status(500).json({
      message: "Unable to update TPO account."
    });
  }
});

router.patch("/tpos/:id/status", async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const { id } = req.params;
    const { isActive } = req.body;

    if (!collegeId) {
      return res.status(403).json({
        message: "Your account is not associated with a college."
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid TPO account ID."
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false."
      });
    }

    const tpo = await User.findOneAndUpdate(
      {
        _id: id,
        role: "tpo",
        collegeId
      },
      {
        $set: { isActive }
      },
      {
        new: true
      }
    )
      .select(publicTpoFields)
      .lean();

    if (!tpo) {
      return res.status(404).json({
        message: "TPO account not found in your college."
      });
    }

    return res.json({
      message: `TPO account ${isActive ? "activated" : "deactivated"} successfully.`,
      tpo
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update TPO account status."
    });
  }
});

export default router;
