import express from "express";
import {
  checkSavedJob,
  getMySavedJobs,
  toggleSaveJob
} from "../controllers/savedJobController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/mine", protect, authorize("seeker", "admin"), getMySavedJobs);
router.get("/check/:id", protect, authorize("seeker", "admin"), checkSavedJob);
router.post("/:id", protect, authorize("seeker", "admin"), toggleSaveJob);

export default router;
