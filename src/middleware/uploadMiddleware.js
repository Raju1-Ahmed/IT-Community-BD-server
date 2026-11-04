import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import crypto from "node:crypto";

const uploadDir = path.join(process.cwd(), "uploads", "profiles");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("Only JPG, PNG, or WebP images are allowed"));
};

export const profileImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 }
});
