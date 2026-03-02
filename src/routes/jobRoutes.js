import express from "express";
import {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  getMyPostedJobs,
  updateJob
} from "../controllers/jobController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getJobs);
router.get("/mine", protect, authorize("employer", "admin"), getMyPostedJobs);
router.get("/:id", getJobById);
router.post("/", protect, authorize("employer", "admin"), createJob);
router.put("/:id", protect, authorize("employer", "admin"), updateJob);
router.delete("/:id", protect, authorize("employer", "admin"), deleteJob);

export default router;
