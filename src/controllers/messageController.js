import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { emitConversationMessage } from "../socket/socketServer.js";

const toAbsoluteAttachment = (attachment) => ({
  name: attachment?.name || "",
  url: attachment?.url || "",
  mimeType: attachment?.mimeType || "",
  size: attachment?.size || 0
});

const serializeParticipant = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
  currentPosition: user.currentPosition || "",
  location: user.location || ""
});

const serializeMessage = (message, currentUserId) => ({
  id: String(message._id),
  conversationId: String(message.conversation),
  senderId: String(message.sender?._id || message.sender),
  senderName: message.sender?.name || "",
  text: message.text || "",
  type: message.type || "text",
  attachments: Array.isArray(message.attachments) ? message.attachments.map(toAbsoluteAttachment) : [],
  seen: Array.isArray(message.seenBy)
    ? message.seenBy.some((item) => String(item?._id || item) === String(currentUserId))
    : false,
  createdAt: message.createdAt
});

const findConversationForUsers = async (userId, participantId) =>
  Conversation.findOne({
    participants: { $all: [userId, participantId] }
  });

const resolveOtherParticipant = (conversation, currentUserId) =>
  conversation.participants.find((participant) => String(participant._id) !== String(currentUserId));

export const listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name email role profileImage currentPosition location")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const items = conversations.map((conversation) => {
      const participant = resolveOtherParticipant(conversation, req.user._id) || req.user;
      return {
        id: String(conversation._id),
        participant: serializeParticipant(participant),
        lastMessageText: conversation.lastMessageText || "",
        lastMessageType: conversation.lastMessageType || "text",
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: 0
      };
    });

    return res.json({ success: true, conversations: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const startConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ success: false, message: "participantId is required" });
    }

    if (String(participantId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot start a conversation with yourself" });
    }

    const participant = await User.findById(participantId).select("name email role profileImage currentPosition location");
    if (!participant) {
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    let conversation = await findConversationForUsers(req.user._id, participantId);
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId]
      });
    }

    return res.json({
      success: true,
      conversation: {
        id: String(conversation._id),
        participant: serializeParticipant(participant)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .populate("sender", "name")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages: messages.map((message) => serializeMessage(message, req.user._id))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendConversationMessage = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id
    }).populate("participants", "_id name email role profileImage currentPosition location");

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const text = String(req.body.text || "").trim();
    let attachments = [];

    if (req.body.attachments) {
      try {
        const parsed = typeof req.body.attachments === "string" ? JSON.parse(req.body.attachments) : req.body.attachments;
        attachments = Array.isArray(parsed) ? parsed.map(toAbsoluteAttachment) : [];
      } catch (_error) {
        attachments = [];
      }
    }

    if (!text && attachments.length === 0) {
      return res.status(400).json({ success: false, message: "Message text or attachment is required" });
    }

    const type = text && attachments.length ? "mixed" : attachments.length ? "file" : "text";

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text,
      type,
      attachments,
      seenBy: [req.user._id]
    });

    await message.populate("sender", "name");

    conversation.lastMessageText = text || attachments[0]?.name || "Attachment";
    conversation.lastMessageType = type;
    conversation.lastMessageSender = req.user._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const serialized = serializeMessage(message, req.user._id);

    emitConversationMessage({
      conversationId: String(conversation._id),
      message: serialized,
      participants: conversation.participants.map((participant) => String(participant._id))
    });

    return res.status(201).json({ success: true, message: serialized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadMessageAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Attachment file is required" });
    }

    return res.status(201).json({
      success: true,
      attachment: {
        name: req.file.originalname,
        url: `/uploads/chat/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
