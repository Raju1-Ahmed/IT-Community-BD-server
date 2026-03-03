import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import ContactMessage from "../models/ContactMessage.js";
import PremiumProfile from "../models/PremiumProfile.js";

export const getAdminStats = async (_req, res) => {
  try {
    const [users, employers, seekers, jobs, activeJobs, applications, contactMessages, premiumPendingReview, premiumApproved] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "employer" }),
      User.countDocuments({ role: "seeker" }),
      Job.countDocuments(),
      Job.countDocuments({ status: "active" }),
      Application.countDocuments(),
      ContactMessage.countDocuments(),
      PremiumProfile.countDocuments({ status: "pending_review" }),
      PremiumProfile.countDocuments({ status: "approved" })
    ]);

    return res.json({
      success: true,
      stats: {
        users,
        employers,
        seekers,
        jobs,
        activeJobs,
        applications,
        contactMessages,
        premiumPendingReview,
        premiumApproved
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter).sort({ createdAt: -1 }).select("-password");
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ["seeker", "employer", "admin"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllJobsAdmin = async (_req, res) => {
  try {
    const jobs = await Job.find().populate("postedBy", "name email role").sort({ createdAt: -1 });
    return res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJobStatusAdmin = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["active", "closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const job = await Job.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllApplicationsAdmin = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};

    const applications = await Application.find(filter)
      .populate("job", "title companyName")
      .populate("candidate", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getContactMessagesAdmin = async (_req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin") {
        return res.status(400).json({ success: false, message: "Admin already exists with this email." });
      }
      return res.status(400).json({
        success: false,
        message: `This email is already registered as ${existing.role}. Change role from user management or use another email.`
      });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: "admin"
    });

    return res.status(201).json({
      success: true,
      message: "New admin created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const adminUser = await User.findById(req.params.id);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (adminUser.role !== "admin") {
      return res.status(400).json({ success: false, message: "Selected user is not an admin account." });
    }

    if (String(adminUser._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
    }

    const totalAdmins = await User.countDocuments({ role: "admin" });
    if (totalAdmins <= 1) {
      return res.status(400).json({ success: false, message: "At least one admin must remain in the system." });
    }

    await adminUser.deleteOne();
    return res.json({ success: true, message: "Admin deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
