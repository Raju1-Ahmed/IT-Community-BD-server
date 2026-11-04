import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import crypto from "node:crypto";

const uploadDir = path.join(process.cwd(), "uploads", "premium");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

export const premiumUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only PDF, JPG, PNG, or WebP files are allowed"));
  },
  limits: { fileSize: 1 * 1024 * 1024, files: 20, fields: 30, parts: 50 }
});
