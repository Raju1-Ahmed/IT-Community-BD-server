import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import crypto from "node:crypto";

const uploadDir = path.join(process.cwd(), "uploads", "forum");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

export const forumAttachmentUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
    cb(allowed.includes(file.mimetype) ? null : new Error("This attachment type is not allowed"));
  },
  limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 20, parts: 22 }
});
