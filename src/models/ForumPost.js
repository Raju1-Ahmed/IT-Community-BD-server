import mongoose from "mongoose";

const forumAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const forumReactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "insightful", "support", "celebrate"],
      default: "like"
    }
  },
  { timestamps: true }
);

const forumCommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1200 }
  },
  { timestamps: true }
);

const forumPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    tags: [{ type: String, trim: true }],
    attachments: [forumAttachmentSchema],
    comments: [forumCommentSchema],
    reactions: [forumReactionSchema],
    shareCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

forumPostSchema.index({ createdAt: -1 });

const ForumPost = mongoose.model("ForumPost", forumPostSchema);

export default ForumPost;
