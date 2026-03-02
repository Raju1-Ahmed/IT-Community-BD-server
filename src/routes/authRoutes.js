import express from "express";
import { getMe, login, register, updateProfile } from "../controllers/authController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { profileImageUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch(
  "/profile",
  protect,
  authorize("seeker", "employer", "admin"),
  profileImageUpload.single("profileImage"),
  updateProfile
);

export default router;
