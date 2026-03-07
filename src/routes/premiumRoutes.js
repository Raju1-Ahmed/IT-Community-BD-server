import express from "express";
import {
  adminPremiumQueue,
  adminReviewPremiumProfile,
  adminVerifyPayment,
  getMyPremiumProfile,
  listExpertiesProfiles,
  submitPremiumProfile,
  uploadPremiumDocuments,
  upsertMyPremiumProfile
} from "../controllers/premiumController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { premiumUpload } from "../middleware/premiumUploadMiddleware.js";

const router = express.Router();

router.get("/experties", listExpertiesProfiles);
router.get("/me", protect, authorize("seeker"), getMyPremiumProfile);
router.post("/me", protect, authorize("seeker"), upsertMyPremiumProfile);
router.post(
  "/me/upload-docs",
  protect,
  authorize("seeker"),
  premiumUpload.any(),
  uploadPremiumDocuments
);
router.post("/me/submit", protect, authorize("seeker"), submitPremiumProfile);

router.get("/admin/queue", protect, authorize("admin"), adminPremiumQueue);
router.patch("/admin/payment/:paymentId", protect, authorize("admin"), adminVerifyPayment);
router.patch("/admin/review/:profileId", protect, authorize("admin"), adminReviewPremiumProfile);

export default router;
