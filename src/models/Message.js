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

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["text", "file", "mixed"], default: "text" },
    attachments: { type: [attachmentSchema], default: [] },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
