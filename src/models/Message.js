import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const hireInviteSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    budget: { type: String, trim: true, default: "" },
    startDate: { type: String, trim: true, default: "" },
    timeline: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    candidateName: { type: String, trim: true, default: "" },
    candidateRole: { type: String, trim: true, default: "" },
    expertiseProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "PremiumProfile", default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending"
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["text", "file", "mixed", "hire_invite"], default: "text" },
    attachments: { type: [attachmentSchema], default: [] },
    hireInvite: { type: hireInviteSchema, default: null },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
