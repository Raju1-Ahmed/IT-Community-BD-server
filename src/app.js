import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import "dotenv/config";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import swaggerSpec from "./docs/swagger.js";
import { apiRateLimit } from "./middleware/securityMiddleware.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  "https://it-community-bd-frontend.netlify.app",
  "https://it-community-bd-admin.netlify.app",
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"])
].filter(Boolean));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  dotfiles: "deny",
  index: false,
  maxAge: "1h"
}));
app.use("/api", apiRateLimit, routes);
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_API_DOCS === "true") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large" || error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "Uploaded data exceeds the allowed size" });
  }
  if (error?.message?.includes("allowed") || error?.message?.includes("Only JPG")) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "Origin is not allowed" });
  }
  console.error("Unhandled request error:", error?.message || error);
  return res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
