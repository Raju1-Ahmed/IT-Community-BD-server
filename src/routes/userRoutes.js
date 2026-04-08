import express from "express";
import { getCandidateProfile, getMyResumeInsights } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me/resume-insights", protect, authorize("seeker"), getMyResumeInsights);
router.get("/candidate/:id", protect, authorize("employer", "admin"), getCandidateProfile);

export default router;
