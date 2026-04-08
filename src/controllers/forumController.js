import mongoose from "mongoose";
import ForumPost from "../models/ForumPost.js";

const TAG_OPTIONS = [
  "Web Development",
  "Networking",
  "Cyber Security",
  "Graphics & Video",
  "ERP",
  "Freelancing",
  "Career Advice",
  "Interview",
  "Tools & Updates"
];

const toAbsoluteAttachment = (attachment) => ({
  name: attachment?.name || "",
  url: attachment?.url || "",
  mimeType: attachment?.mimeType || "",
  size: attachment?.size || 0
});

const serializeAuthor = (user) => ({
  id: String(user?._id || ""),
  name: user?.name || "Community Member",
  role: user?.role || "member",
  companyName: user?.companyName || "",
  currentPosition: user?.currentPosition || "",
  profileImage: user?.profileImage || ""
});

const buildReactionSummary = (reactions = []) =>
  reactions.reduce(
    (acc, reaction) => {
      const key = reaction?.type || "like";
      acc[key] = (acc[key] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { like: 0, insightful: 0, support: 0, celebrate: 0, total: 0 }
  );

const serializeComment = (comment) => ({
  id: String(comment?._id || ""),
  author: serializeAuthor(comment?.author),
  content: comment?.content || "",
  createdAt: comment?.createdAt || null
});

const serializePost = (post, currentUserId = null, currentUserRole = null) => {
  const reactions = Array.isArray(post?.reactions) ? post.reactions : [];
  const comments = Array.isArray(post?.comments) ? post.comments : [];

  return {
    id: String(post?._id || ""),
    author: serializeAuthor(post?.author),
    content: post?.content || "",
    tags: Array.isArray(post?.tags) ? post.tags : [],
    attachments: Array.isArray(post?.attachments) ? post.attachments.map(toAbsoluteAttachment) : [],
    comments: comments.map(serializeComment),
    commentCount: comments.length,
    reactionSummary: buildReactionSummary(reactions),
    currentUserReaction:
      currentUserId && reactions.find((reaction) => String(reaction?.user?._id || reaction?.user) === String(currentUserId))?.type
        ? reactions.find((reaction) => String(reaction?.user?._id || reaction?.user) === String(currentUserId)).type
        : null,
    shareCount: Number(post?.shareCount || 0),
    canEdit:
      currentUserId &&
      (String(post?.author?._id || post?.author) === String(currentUserId) || currentUserRole === "admin"),
    createdAt: post?.createdAt || null,
    updatedAt: post?.updatedAt || null
  };
};

const populatePostQuery = (query) =>
  query.populate("author", "name role companyName currentPosition profileImage").populate(
    "comments.author",
    "name role companyName currentPosition profileImage"
  );

export const getForumMeta = async (_req, res) => {
  return res.json({ success: true, tags: TAG_OPTIONS });
};

export const listForumPosts = async (req, res) => {
  try {
    const posts = await populatePostQuery(ForumPost.find().sort({ createdAt: -1 }).limit(50));
    return res.json({
      success: true,
      posts: posts.map((post) => serializePost(post, req.user?._id || null, req.user?.role || null))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createForumPost = async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) {
      return res.status(400).json({ success: false, message: "Post content is required" });
    }

    let tags = [];
    if (req.body.tags) {
      try {
        const parsed = typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags;
        tags = Array.isArray(parsed)
          ? parsed.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 4)
          : [];
      } catch (_error) {
        tags = [];
      }
    }

    let attachments = [];
    if (req.body.attachments) {
      try {
        const parsed = typeof req.body.attachments === "string" ? JSON.parse(req.body.attachments) : req.body.attachments;
        attachments = Array.isArray(parsed) ? parsed.map(toAbsoluteAttachment) : [];
      } catch (_error) {
        attachments = [];
      }
    }

    const post = await ForumPost.create({
      author: req.user._id,
      content,
      tags,
      attachments
    });

    const populatedPost = await populatePostQuery(ForumPost.findById(post._id));

    return res.status(201).json({
      success: true,
      post: serializePost(populatedPost, req.user._id, req.user.role)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addForumComment = async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const post = await ForumPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    post.comments.push({
      author: req.user._id,
      content
    });

    await post.save();
    const populatedPost = await populatePostQuery(ForumPost.findById(post._id));

    return res.status(201).json({
      success: true,
      post: serializePost(populatedPost, req.user._id, req.user.role)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reactToForumPost = async (req, res) => {
  try {
    const type = ["like", "insightful", "support", "celebrate"].includes(req.body.type)
      ? req.body.type
      : "like";

    const post = await ForumPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const existingReaction = post.reactions.find((reaction) => String(reaction.user) === String(req.user._id));
    if (existingReaction) {
      if (existingReaction.type === type) {
        post.reactions = post.reactions.filter((reaction) => String(reaction.user) !== String(req.user._id));
      } else {
        existingReaction.type = type;
      }
    } else {
      post.reactions.push({
        user: req.user._id,
        type
      });
    }

    await post.save();
    const populatedPost = await populatePostQuery(ForumPost.findById(post._id));

    return res.json({
      success: true,
      post: serializePost(populatedPost, req.user._id, req.user.role)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const shareForumPost = async (req, res) => {
  try {
    const post = await ForumPost.findByIdAndUpdate(
      req.params.postId,
      { $inc: { shareCount: 1 } },
      { new: true }
    );
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const populatedPost = await populatePostQuery(ForumPost.findById(post._id));

    return res.json({
      success: true,
      post: serializePost(populatedPost, req.user?._id || null, req.user?.role || null)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteForumPost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const post = await ForumPost.findById(req.params.postId).populate("author", "role");
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isOwner = String(post.author?._id || post.author) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await post.deleteOne();
    return res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadForumAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Attachment file is required" });
    }

    return res.status(201).json({
      success: true,
      attachment: {
        name: req.file.originalname,
        url: `/uploads/forum/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
