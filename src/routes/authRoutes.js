import express from "express";
import { firebaseLogin, getMe, login, register, resendRegistrationOtp, updateProfile, verifyRegistrationOtp } from "../controllers/authController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { profileImageUpload } from "../middleware/uploadMiddleware.js";
import { authRateLimit } from "../middleware/securityMiddleware.js";

const router = express.Router();

router.post("/register", authRateLimit, register);
router.post("/register/verify", authRateLimit, verifyRegistrationOtp);
router.post("/register/resend", authRateLimit, resendRegistrationOtp);
router.post("/login", authRateLimit, login);
router.post("/firebase", authRateLimit, firebaseLogin);
router.get("/me", protect, getMe);
router.patch(
  "/profile",
  protect,
  authorize("seeker", "employer", "admin"),
  profileImageUpload.single("profileImage"),
  updateProfile
);

export default router;
