import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";

export const toggleSaveJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const existing = await SavedJob.findOne({ seeker: req.user._id, job: jobId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, saved: false, message: "Job removed from saved list" });
    }

    await SavedJob.create({ seeker: req.user._id, job: jobId });
    return res.json({ success: true, saved: true, message: "Job saved successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMySavedJobs = async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ seeker: req.user._id })
      .populate({
        path: "job",
        populate: { path: "postedBy", select: "name email companyName" }
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: savedJobs.length, savedJobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const checkSavedJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const saved = await SavedJob.exists({ seeker: req.user._id, job: jobId });
    return res.json({ success: true, saved: Boolean(saved) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
