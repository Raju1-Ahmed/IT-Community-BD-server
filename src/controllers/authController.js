import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import bcrypt from "bcryptjs";
import { sendRegistrationOtp } from "../utils/registrationMailer.js";
import { generateToken } from "../utils/generateToken.js";
import { firebaseAdminAuth } from "../config/firebaseAdmin.js";

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyName: user.companyName,
  location: user.location,
  jobCategory: user.jobCategory,
  jobRole: user.jobRole,
  jobSpecialization: user.jobSpecialization,
  skills: user.skills,
  phone: user.phone,
  bio: user.bio,
  github: user.github,
  linkedin: user.linkedin,
  portfolio: user.portfolio,
  profileImage: user.profileImage,
  education: user.education,
  currentPosition: user.currentPosition,
  experienceYears: user.experienceYears,
  expectedSalary: user.expectedSalary,
  dateOfBirth: user.dateOfBirth,
  experience: user.experience,
  projects: user.projects,
  educationEntries: user.educationEntries,
  languages: user.languages,
  certifications: user.certifications,
  volunteer: user.volunteer,
  categoryProfile: user.categoryProfile
});

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const createOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const registrationPayload = ({ normalizedName, normalizedEmail, password, role, companyName, location, skills, jobCategory, jobRole, jobSpecialization }) => ({
  name: normalizedName,
  email: normalizedEmail,
  passwordHash: bcrypt.hashSync(String(password), 12),
  role: ["seeker", "employer"].includes(role) ? role : "seeker",
  companyName: String(companyName || "").trim(),
  location: String(location || "").trim(),
  skills: Array.isArray(skills) ? skills.slice(0, 30).map((item) => String(item).trim()).filter(Boolean) : [],
  jobCategory: String(jobCategory || "").trim(),
  jobRole: String(jobRole || "").trim(),
  jobSpecialization: String(jobSpecialization || "").trim()
});

export const firebaseLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "Firebase ID token is required" });
    }

    const decoded = await firebaseAdminAuth().verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email || !decoded.email_verified) {
      return res.status(401).json({ success: false, message: "A verified Firebase email is required" });
    }

    const provider = decoded.firebase?.sign_in_provider;
    const authProvider = ["google.com", "github.com"].includes(provider) ? provider : "google.com";
    let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email }] });

    if (!user) {
      user = await User.create({
        name: decoded.name || email.split("@")[0],
        email,
        password: crypto.randomBytes(32).toString("hex"),
        role: role === "employer" ? "employer" : "seeker",
        firebaseUid: decoded.uid,
        authProvider,
        profileImage: decoded.picture || ""
      });
    } else {
      user.firebaseUid = decoded.uid;
      user.authProvider = authProvider;
      if (!user.profileImage && decoded.picture) user.profileImage = decoded.picture;
      if (!user.name && decoded.name) user.name = decoded.name;
      await user.save();
    }

    return res.json({ success: true, token: generateToken(user._id), user: serializeUser(user) });
  } catch (error) {
    if (error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error") {
      return res.status(401).json({ success: false, message: "Invalid or expired Firebase token" });
    }
    if (error?.message?.startsWith("Firebase Admin is not configured")) {
      return res.status(503).json({ success: false, message: error.message });
    }
    console.error("Firebase login error:", error.message);
    return res.status(500).json({ success: false, message: "Social login failed" });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, companyName, location, jobCategory, jobRole, jobSpecialization, skills } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Name, email, password are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const existingPending = await PendingRegistration.findOne({ email: normalizedEmail }).select("+passwordHash +otpHash");
    if (existingPending && Date.now() - existingPending.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "A verification code was recently sent. Please wait before trying again." });
    }

    const otp = createOtp();
    const pending = existingPending || new PendingRegistration({ email: normalizedEmail });
    Object.assign(pending, registrationPayload({ normalizedName, normalizedEmail, password, role, companyName, location, skills, jobCategory, jobRole, jobSpecialization }));
    pending.otpHash = hashOtp(otp);
    pending.otpAttempts = 0;
    pending.otpSentAt = new Date();
    pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await pending.save();
    try {
      await sendRegistrationOtp({ email: normalizedEmail, name: normalizedName, otp });
    } catch (mailError) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      console.error("Registration OTP email error:", mailError.message);
      return res.status(503).json({ success: false, message: "Verification email could not be sent. Please try again later." });
    }

    return res.status(202).json({ success: true, verificationRequired: true, email: normalizedEmail, message: "Verification code sent to your email" });
  } catch (error) {
    if (error?.message?.startsWith("Registration email is not configured")) {
      return res.status(503).json({ success: false, message: "Email verification is not configured on the server" });
    }
    console.error("Registration error:", error.message);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Valid email and 6-digit OTP are required" });
    }

    const pending = await PendingRegistration.findOne({ email }).select("+passwordHash +otpHash");
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "This verification code has expired" });
    }
    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new code." });
    }
    if (!crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(pending.otpHash))) {
      pending.otpAttempts += 1;
      await pending.save();
      return res.status(400).json({ success: false, message: "Incorrect verification code" });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
      role: pending.role,
      companyName: pending.companyName,
      location: pending.location,
      skills: pending.skills,
      jobCategory: pending.jobCategory,
      jobRole: pending.jobRole,
      jobSpecialization: pending.jobSpecialization
    });
    user.$locals.passwordIsHashed = true;
    await user.save();
    await PendingRegistration.deleteOne({ _id: pending._id });

    return res.status(201).json({ success: true, token: generateToken(user._id), user: serializeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(400).json({ success: false, message: "Email already in use" });
    console.error("Registration verification error:", error.message);
    return res.status(500).json({ success: false, message: "Registration verification failed" });
  }
};

export const resendRegistrationOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const pending = await PendingRegistration.findOne({ email }).select("+otpHash +passwordHash");
    if (!pending) return res.status(404).json({ success: false, message: "No pending registration found" });
    if (Date.now() - pending.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait before requesting another code" });
    }
    const otp = createOtp();
    pending.otpHash = hashOtp(otp);
    pending.otpAttempts = 0;
    pending.otpSentAt = new Date();
    pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await pending.save();
    try {
      await sendRegistrationOtp({ email: pending.email, name: pending.name, otp });
    } catch (mailError) {
      console.error("OTP resend email error:", mailError.message);
      return res.status(503).json({ success: false, message: "Verification email could not be sent. Please try again later." });
    }
    return res.json({ success: true, message: "A new verification code was sent" });
  } catch (error) {
    if (error?.message?.startsWith("Registration email is not configured")) {
      return res.status(503).json({ success: false, message: "Email verification is not configured on the server" });
    }
    console.error("OTP resend error:", error.message);
    return res.status(500).json({ success: false, message: "Could not resend verification code" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const matched = await user.comparePassword(password);
    if (!matched) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: serializeUser(req.user)
  });
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "companyName",
      "location",
      "jobCategory",
      "jobRole",
      "jobSpecialization",
      "skills",
      "phone",
      "bio",
      "github",
      "linkedin",
      "portfolio",
      "education",
      "currentPosition",
      "experienceYears",
      "expectedSalary",
      "dateOfBirth",
      "experience",
      "projects",
      "educationEntries",
      "languages",
      "certifications",
      "volunteer",
      "categoryProfile"
    ];

    const payload = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    if (req.file) {
      const imageBuffer = await readFile(req.file.path);
      payload.profileImage = `data:${req.file.mimetype};base64,${imageBuffer.toString("base64")}`;
    }

    if (typeof payload.skills === "string") {
      payload.skills = payload.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (payload.skills && !Array.isArray(payload.skills)) {
      return res.status(400).json({ success: false, message: "Skills must be array or comma-separated string" });
    }

    const jsonArrayFields = ["experience", "projects", "educationEntries", "languages", "certifications", "volunteer"];
    for (const field of jsonArrayFields) {
      if (typeof payload[field] === "string") {
        try {
          payload[field] = JSON.parse(payload[field]);
        } catch (_error) {
          return res.status(400).json({ success: false, message: `${field} must be valid JSON` });
        }
      }
      if (payload[field] !== undefined && !Array.isArray(payload[field])) {
        return res.status(400).json({ success: false, message: `${field} must be an array` });
      }
    }

    if (typeof payload.categoryProfile === "string") {
      try {
        payload.categoryProfile = JSON.parse(payload.categoryProfile);
      } catch (_error) {
        return res.status(400).json({ success: false, message: "categoryProfile must be valid JSON" });
      }
    }
    if (
      payload.categoryProfile !== undefined &&
      (typeof payload.categoryProfile !== "object" || payload.categoryProfile === null || Array.isArray(payload.categoryProfile))
    ) {
      return res.status(400).json({ success: false, message: "categoryProfile must be an object" });
    }

    if (payload.experienceYears !== undefined) {
      payload.experienceYears = Number(payload.experienceYears) || 0;
    }
    if (payload.expectedSalary !== undefined) {
      payload.expectedSalary = Number(payload.expectedSalary) || 0;
    }
    if (payload.dateOfBirth === "") {
      payload.dateOfBirth = null;
    }

    const user = await User.findByIdAndUpdate(req.user._id, payload, {
      new: true,
      runValidators: true
    });

    return res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error("Profile update error:", error.message);
    return res.status(500).json({ success: false, message: "Profile update failed" });
  }
};
