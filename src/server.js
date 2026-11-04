import dotenv from "dotenv";
import dns from "node:dns";
import http from "node:http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocketServer } from "./socket/socketServer.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const DNS_SERVERS =
  process.env.MONGODB_DNS_SERVERS?.split(",").map((item) => item.trim()).filter(Boolean) || [];

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes("change_this"))
) {
  throw new Error("A strong production JWT_SECRET (at least 32 characters) is required");
}

const startServer = async () => {
  if (DNS_SERVERS.length > 0) {
    dns.setServers(DNS_SERVERS);
    console.log("Custom DNS servers set for MongoDB:", DNS_SERVERS.join(", "));
  }

  await connectDB();

  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
