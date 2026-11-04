import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 300 : 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later." }
});
