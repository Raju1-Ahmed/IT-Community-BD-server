import express from "express";
import { healthCheck } from "../controllers/healthController.js";
import authRoutes from "./authRoutes.js";
import jobRoutes from "./jobRoutes.js";
import applicationRoutes from "./applicationRoutes.js";
import adminRoutes from "./adminRoutes.js";
import contactRoutes from "./contactRoutes.js";
import userRoutes from "./userRoutes.js";
import savedJobRoutes from "./savedJobRoutes.js";
import premiumRoutes from "./premiumRoutes.js";

const router = express.Router();

router.get("/health", healthCheck);
router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/applications", applicationRoutes);
router.use("/admin", adminRoutes);
router.use("/contact", contactRoutes);
router.use("/users", userRoutes);
router.use("/saved-jobs", savedJobRoutes);
router.use("/premium", premiumRoutes);

export default router;
