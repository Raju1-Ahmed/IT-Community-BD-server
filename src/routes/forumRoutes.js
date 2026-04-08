import express from "express";
import {
  addForumComment,
  createForumPost,
  deleteForumPost,
  getForumMeta,
  listForumPosts,
  reactToForumPost,
  shareForumPost,
  uploadForumAttachment
} from "../controllers/forumController.js";
import { authorize, optionalProtect, protect } from "../middleware/authMiddleware.js";
import { forumAttachmentUpload } from "../middleware/forumUploadMiddleware.js";

const router = express.Router();

router.get("/meta", getForumMeta);
router.get("/posts", optionalProtect, listForumPosts);
router.post("/posts", protect, authorize("seeker", "employer", "admin"), createForumPost);
router.post("/posts/:postId/comments", protect, authorize("seeker", "employer", "admin"), addForumComment);
router.post("/posts/:postId/reactions", protect, authorize("seeker", "employer", "admin"), reactToForumPost);
router.post("/posts/:postId/share", optionalProtect, shareForumPost);
router.delete("/posts/:postId", protect, authorize("seeker", "employer", "admin"), deleteForumPost);
router.post(
  "/attachments",
  protect,
  authorize("seeker", "employer", "admin"),
  forumAttachmentUpload.single("attachment"),
  uploadForumAttachment
);

export default router;
