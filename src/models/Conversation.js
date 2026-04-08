import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageText: { type: String, trim: true, default: "" },
    lastMessageType: { type: String, enum: ["text", "file", "mixed"], default: "text" },
    lastMessageSender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastMessageAt: { type: Date, default: null }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
