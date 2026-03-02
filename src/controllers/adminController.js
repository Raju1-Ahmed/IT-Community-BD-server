import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

export const getAdminStats = async (_req, res) => {
  try {
    const [users, employers, seekers, jobs, activeJobs, applications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "employer" }),
      User.countDocuments({ role: "seeker" }),
      Job.countDocuments(),
      Job.countDocuments({ status: "active" }),
      Application.countDocuments()
    ]);

    return res.json({
      success: true,
      stats: { users, employers, seekers, jobs, activeJobs, applications }
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
