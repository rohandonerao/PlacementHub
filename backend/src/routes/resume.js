
import express from "express";
import multer from "multer";
import axios from "axios";
import {
  authenticate,
  authorize,
  requireApprovedStudent
} from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(pdf|docx)$/i;
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (
      allowedExtensions.test(file.originalname) &&
      allowedMimeTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX resumes are allowed."));
    }
  }
});

router.post(
  "/analyze",
  authenticate,
  authorize("student"),
  requireApprovedStudent,
  upload.single("resume"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a PDF or DOCX resume."
        });
      }

      const jobDescription = req.body.job_description;

      if (
        typeof jobDescription !== "string" ||
        !jobDescription.trim()
      ) {
        return res.status(400).json({
          message: "Job description is required."
        });
      }

      if (!process.env.ML_SERVICE_URL) {
        return res.status(503).json({
          message: "Resume analysis service is not configured."
        });
      }

      const formData = new FormData();

      formData.append(
        "resume",
        new Blob([req.file.buffer], {
          type: req.file.mimetype
        }),
        req.file.originalname
      );

      formData.append("job_description", jobDescription);

      const response = await axios.post(
        `${process.env.ML_SERVICE_URL}/analyze`,
        formData,
        { timeout: 60000 }
      );

      return res.json(response.data);
    } catch (error) {
      if (error.response) {
        return res.status(502).json({
          message: "The AI service could not analyze the resume."
        });
      }

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          message: "Resume analysis timed out. Please try again."
        });
      }

      return res.status(502).json({
        message: "Could not connect to the AI service."
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Resume must be 5 MB or smaller."
          : error.message
    });
  }

  if (error.message === "Only PDF and DOCX resumes are allowed.") {
    return res.status(400).json({
      message: error.message
    });
  }

  next(error);
});

export default router;
