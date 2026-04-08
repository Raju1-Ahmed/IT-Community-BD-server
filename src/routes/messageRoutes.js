import express from "express";
import {
  getConversationMessages,
  listConversations,
  sendConversationMessage,
  startConversation,
  uploadMessageAttachment
} from "../controllers/messageController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { chatAttachmentUpload } from "../middleware/chatUploadMiddleware.js";

const router = express.Router();

router.use(protect, authorize("seeker", "employer", "admin"));

router.get("/conversations", listConversations);
router.post("/conversations/start", startConversation);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendConversationMessage);
router.post("/attachments", chatAttachmentUpload.single("attachment"), uploadMessageAttachment);

export default router;
