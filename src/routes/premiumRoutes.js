import express from "express";
import {
  adminPremiumQueue,
  adminReviewPremiumProfile,
  adminVerifyPayment,
  getMyPremiumProfile,
  getPremiumProfilePublicById,
  initiatePremiumPayment,
  listPremiumProfilesForEmployer,
  reActivatePremiumProfile,
  submitPremiumPayment,
  submitPremiumProfile,
  uploadPremiumDocuments,
  upsertMyPremiumProfile
} from "../controllers/premiumController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { premiumUpload } from "../middleware/premiumUploadMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorize("seeker", "admin"), getMyPremiumProfile);
router.post("/me", protect, authorize("seeker", "admin"), upsertMyPremiumProfile);
router.post(
  "/me/upload-docs",
  protect,
  authorize("seeker", "admin"),
  premiumUpload.fields([
    { name: "cv", maxCount: 1 },
    { name: "experienceLetter", maxCount: 1 },
    { name: "companyIdCard", maxCount: 1 },
    { name: "additionalDoc", maxCount: 1 }
  ]),
  uploadPremiumDocuments
);
router.post("/me/submit", protect, authorize("seeker", "admin"), submitPremiumProfile);
router.post("/me/payment/initiate", protect, authorize("seeker", "admin"), initiatePremiumPayment);
router.post(
  "/me/payment/submit",
  protect,
  authorize("seeker", "admin"),
  premiumUpload.single("paymentProof"),
  submitPremiumPayment
);
router.post("/me/reactivate", protect, authorize("seeker", "admin"), reActivatePremiumProfile);

router.get("/public", protect, authorize("employer", "admin"), listPremiumProfilesForEmployer);
router.get("/public/:id", protect, authorize("employer", "admin"), getPremiumProfilePublicById);

router.get("/admin/queue", protect, authorize("admin"), adminPremiumQueue);
router.patch("/admin/payment/:paymentId", protect, authorize("admin"), adminVerifyPayment);
router.patch("/admin/review/:profileId", protect, authorize("admin"), adminReviewPremiumProfile);

export default router;
