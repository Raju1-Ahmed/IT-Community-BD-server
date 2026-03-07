import express from "express";
import {
  applyToJob,
  getEmployerApplications,
  getMyApplications,
  updateApplicationStatus
} from "../controllers/applicationController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/mine", protect, authorize("seeker", "admin"), getMyApplications);
router.get("/employer/mine", protect, authorize("employer", "admin"), getEmployerApplications);
router.post("/job/:id", protect, authorize("seeker", "admin"), applyToJob);
router.patch("/:id/status", protect, authorize("employer", "admin"), updateApplicationStatus);

export default router;
