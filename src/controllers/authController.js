import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

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

export const register = async (req, res) => {
  try {
    const { name, email, password, role, companyName, location, jobCategory, jobRole, jobSpecialization, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "seeker",
      companyName,
      location,
      jobCategory,
      jobRole,
      jobSpecialization,
      skills: Array.isArray(skills) ? skills : []
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
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
    return res.status(500).json({ success: false, message: error.message });
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
      payload.profileImage = `/uploads/profiles/${req.file.filename}`;
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
    return res.status(500).json({ success: false, message: error.message });
  }
};
