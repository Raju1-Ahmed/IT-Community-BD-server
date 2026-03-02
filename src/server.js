import dotenv from "dotenv";
import dns from "node:dns";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const DNS_SERVERS =
  process.env.MONGODB_DNS_SERVERS?.split(",").map((item) => item.trim()).filter(Boolean) || [];

const startServer = async () => {
  if (DNS_SERVERS.length > 0) {
    dns.setServers(DNS_SERVERS);
    console.log("Custom DNS servers set for MongoDB:", DNS_SERVERS.join(", "));
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
