import Application from "../models/Application.js";
import Job from "../models/Job.js";

export const applyToJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { coverLetter, resumeUrl } = req.body;

    const job = await Job.findById(jobId);
    if (!job || job.status !== "active") {
      return res.status(404).json({ success: false, message: "Active job not found" });
    }

    const exists = await Application.findOne({ job: jobId, candidate: req.user._id });
    if (exists) {
      return res.status(400).json({ success: false, message: "You already applied to this job" });
    }

    const application = await Application.create({
      job: jobId,
      candidate: req.user._id,
      coverLetter,
      resumeUrl
    });

    return res.status(201).json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate("job")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployerApplications = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).select("_id");
    const jobIds = jobs.map((item) => item._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("job", "title companyName location jobType experienceLevel")
      .populate("candidate", "name email phone location skills currentPosition experienceYears")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    const { status } = req.body;

    const allowed = ["applied", "shortlisted", "interview", "rejected", "hired"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const application = await Application.findById(applicationId).populate("job");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (
      String(application.job.postedBy) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    application.status = status;
    await application.save();

    return res.json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
