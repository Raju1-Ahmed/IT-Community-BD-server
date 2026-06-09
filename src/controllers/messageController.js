import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import PremiumProfile from "../models/PremiumProfile.js";
import User from "../models/User.js";
import { emitConversationMessage } from "../socket/socketServer.js";
import { isUserOnline } from "../socket/socketServer.js";

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
  location: user.location || "",
  isOnline: isUserOnline(user._id),
  lastSeen: user.lastSeen || null
});

const serializeMessage = (message, currentUserId) => ({
  id: String(message._id),
  conversationId: String(message.conversation),
  senderId: String(message.sender?._id || message.sender),
  senderName: message.sender?.name || "",
  text: message.text || "",
  type: message.type || "text",
  attachments: Array.isArray(message.attachments) ? message.attachments.map(toAbsoluteAttachment) : [],
  hireInvite: message.hireInvite || null,
  seen: Array.isArray(message.seenBy)
    ? message.seenBy.some((item) => String(item?._id || item) === String(currentUserId))
    : false,
  createdAt: message.createdAt
});

const serializeConversation = (conversation, currentUserId) => {
  const participant = resolveOtherParticipant(conversation, currentUserId) || conversation.participants[0];

  return {
    id: String(conversation._id),
    participant: serializeParticipant(participant),
    lastMessageText: conversation.lastMessageText || "",
    lastMessageType: conversation.lastMessageType || "text",
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: 0
  };
};

const findConversationForUsers = async (userId, participantId) =>
  Conversation.findOne({
    participants: { $all: [userId, participantId] }
  });

const resolveOtherParticipant = (conversation, currentUserId) =>
  conversation.participants.find((participant) => String(participant._id) !== String(currentUserId));

export const listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name email role profileImage currentPosition location lastSeen")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const items = conversations.map((conversation) => serializeConversation(conversation, req.user._id));

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

    const participant = await User.findById(participantId).select("name email role profileImage currentPosition location lastSeen");
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
    }).populate("participants", "_id name email role profileImage currentPosition location lastSeen");

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

export const sendHireInvite = async (req, res) => {
  try {
    if (!["employer", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only employers can send hire invites" });
    }

    const expertiseProfileId = req.body.expertiseProfileId || req.params.expertiseProfileId;
    if (!expertiseProfileId) {
      return res.status(400).json({ success: false, message: "expertiseProfileId is required" });
    }

    const profile = await PremiumProfile.findById(expertiseProfileId).populate(
      "seeker",
      "name email role profileImage currentPosition location lastSeen jobRole jobCategory"
    );

    if (!profile?.seeker) {
      return res.status(404).json({ success: false, message: "Expertise profile not found" });
    }

    const title = String(req.body.title || "").trim();
    if (!title) {
      return res.status(400).json({ success: false, message: "Hiring title is required" });
    }

    let conversation = await findConversationForUsers(req.user._id, profile.seeker._id);
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, profile.seeker._id]
      });
    }

    await conversation.populate("participants", "name email role profileImage currentPosition location lastSeen");

    const candidateRole =
      profile.preferredRole ||
      profile.seeker.currentPosition ||
      profile.seeker.jobRole ||
      profile.seeker.jobCategory ||
      "";

    const hireInvite = {
      title,
      budget: String(req.body.budget || "").trim(),
      startDate: String(req.body.startDate || "").trim(),
      timeline: String(req.body.timeline || "").trim(),
      note: String(req.body.note || "").trim(),
      candidateName: profile.seeker.name || "",
      candidateRole,
      expertiseProfileId: profile._id,
      status: "pending"
    };

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: `Hire invite: ${title}`,
      type: "hire_invite",
      hireInvite,
      seenBy: [req.user._id]
    });

    await message.populate("sender", "name");

    conversation.lastMessageText = `Hire invite: ${title}`;
    conversation.lastMessageType = "hire_invite";
    conversation.lastMessageSender = req.user._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const serialized = serializeMessage(message, req.user._id);

    emitConversationMessage({
      conversationId: String(conversation._id),
      message: serialized,
      participants: conversation.participants.map((participant) => String(participant._id))
    });

    return res.status(201).json({
      success: true,
      message: serialized,
      conversation: serializeConversation(conversation, req.user._id)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHireInviteStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid invite status" });
    }

    const message = await Message.findById(messageId).populate("sender", "name");
    if (!message || message.type !== "hire_invite") {
      return res.status(404).json({ success: false, message: "Hire invite not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: req.user._id
    }).populate("participants", "_id name email role profileImage currentPosition location lastSeen");

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (String(message.sender?._id || message.sender) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Invite sender cannot update invite status" });
    }

    message.hireInvite = {
      ...(message.hireInvite?.toObject ? message.hireInvite.toObject() : message.hireInvite || {}),
      status
    };
    await message.save();
    await message.populate("sender", "name");

    conversation.lastMessageText = `Hire invite ${status}: ${message.hireInvite?.title || "Hiring proposal"}`;
    conversation.lastMessageType = "hire_invite";
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const serialized = serializeMessage(message, req.user._id);

    emitConversationMessage({
      conversationId: String(conversation._id),
      message: serialized,
      participants: conversation.participants.map((participant) => String(participant._id))
    });

    return res.json({
      success: true,
      message: serialized,
      conversation: serializeConversation(conversation, req.user._id)
    });
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
