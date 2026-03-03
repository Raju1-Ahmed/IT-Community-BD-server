import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import User from "./src/models/User.js";

dotenv.config({ path: "./.env" });

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const EMAIL = "admin@itcommunitybd.com";
const PASSWORD = "Admin@123456";

await mongoose.connect(process.env.MONGODB_URI);

let user = await User.findOne({ email: EMAIL });
if (!user) {
  user = await User.create({
    name: "Super Admin",
    email: EMAIL,
    password: PASSWORD,
    role: "admin"
  });
  console.log("CREATED", user.email);
} else {
  user.name = "Super Admin";
  user.role = "admin";
  user.password = PASSWORD;
  await user.save();
  console.log("UPDATED", user.email);
}

await mongoose.disconnect();
