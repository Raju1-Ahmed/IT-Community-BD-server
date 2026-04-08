import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

let ioInstance = null;

const getTokenFromHandshake = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return "";
};

export const initSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    }
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = getTokenFromHandshake(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);

    socket.on("conversation:join", async ({ conversationId }) => {
      if (!conversationId) return;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.user._id
      }).select("_id");
      if (!conversation) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("message:typing", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("message:typing", {
        conversationId,
        userId: String(socket.user._id),
        userName: socket.user.name
      });
    });

    socket.on("message:stopTyping", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("message:stopTyping", {
        conversationId,
        userId: String(socket.user._id)
      });
    });

    socket.on("message:seen", async ({ conversationId }) => {
      if (!conversationId) return;
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: socket.user._id },
          seenBy: { $ne: socket.user._id }
        },
        { $addToSet: { seenBy: socket.user._id } }
      );

      ioInstance.to(`conversation:${conversationId}`).emit("message:seen", {
        conversationId,
        userId: String(socket.user._id)
      });
    });
  });

  return ioInstance;
};

export const getSocketServer = () => ioInstance;

export const emitConversationMessage = ({ conversationId, message, participants }) => {
  if (!ioInstance) return;

  ioInstance.to(`conversation:${conversationId}`).emit("message:new", message);
  participants.forEach((participantId) => {
    ioInstance.to(`user:${participantId}`).emit("conversation:update", {
      conversationId,
      message
    });
  });
};
