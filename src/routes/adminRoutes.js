import express from "express";
import {
  createAdminUser,
  deleteAdminUser,
  getContactMessagesAdmin,
  getAdminStats,
  getAllApplicationsAdmin,
  getAllJobsAdmin,
  getAllUsers,
  updateJobStatusAdmin,
  updateUserRole
} from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.get("/jobs", getAllJobsAdmin);
router.patch("/jobs/:id/status", updateJobStatusAdmin);
router.get("/applications", getAllApplicationsAdmin);
router.get("/contact-messages", getContactMessagesAdmin);
router.post("/create-admin", createAdminUser);
router.delete("/users/:id", deleteAdminUser);

export default router;
