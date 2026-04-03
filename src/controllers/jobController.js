import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";

const mapEmploymentStatus = (jobType) => {
  const map = {
    "full-time": "Full Time",
    "part-time": "Part Time",
    contract: "Contract",
    internship: "Internship",
    remote: "Remote"
  };
  return map[jobType] || "Full Time";
};

export const createJob = async (req, res) => {
  try {
    const {
      title,
      companyName,
      location,
      jobType,
      experienceLevel,
      salaryMin,
      salaryMax,
      vacancy,
      minAge,
      maxAge,
      applicationDeadline,
      educationRequirements,
      additionalRequirements,
      responsibilities,
      benefits,
      workplace,
      businessArea,
      genderPreference,
      encourageVideoCv,
      skills,
      description
    } = req.body;

    const parsedDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
    const finalDeadline =
      parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : null;

    if (!title || !companyName || !location || !jobType || !experienceLevel || !description) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (!applicationDeadline || !finalDeadline) {
      return res.status(400).json({ success: false, message: "Application deadline is required" });
    }

    const job = await Job.create({
      title,
      companyName,
      location,
      jobType,
      experienceLevel,
      salaryMin: salaryMin || 0,
      salaryMax: salaryMax || 0,
      vacancy: vacancy || 1,
      minAge: minAge || 18,
      maxAge: maxAge || 60,
      applicationDeadline: finalDeadline,
      educationRequirements,
      additionalRequirements,
      responsibilities,
      benefits,
      workplace: workplace || "office",
      businessArea,
      genderPreference: genderPreference || "any",
      employmentStatusText: mapEmploymentStatus(jobType),
      encourageVideoCv: Boolean(encourageVideoCv),
      skills: Array.isArray(skills) ? skills : [],
      description,
      postedBy: req.user._id
    });

    return res.status(201).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const { q, location, jobType, experienceLevel, genderPreference } = req.query;

    const filter = { status: "active" };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { companyName: { $regex: q, $options: "i" } },
        { skills: { $regex: q, $options: "i" } }
      ];
    }
    if (location) filter.location = { $regex: location, $options: "i" };
    if (jobType) filter.jobType = jobType;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (genderPreference) filter.genderPreference = genderPreference;

    const jobs = await Job.find(filter)
      .populate("postedBy", "name email role companyName")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("postedBy", "name email role companyName");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPostedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (String(job.postedBy) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const allowedFields = [
      "title",
      "companyName",
      "location",
      "jobType",
      "experienceLevel",
      "salaryMin",
      "salaryMax",
      "vacancy",
      "minAge",
      "maxAge",
      "applicationDeadline",
      "educationRequirements",
      "additionalRequirements",
      "responsibilities",
      "benefits",
      "workplace",
      "genderPreference",
      "businessArea",
      "encourageVideoCv",
      "skills",
      "description",
      "status"
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        job[key] = req.body[key];
      }
    }

    if (req.body.applicationDeadline !== undefined) {
      const parsedUpdateDeadline = req.body.applicationDeadline
        ? new Date(req.body.applicationDeadline)
        : null;
      if (!parsedUpdateDeadline || Number.isNaN(parsedUpdateDeadline.getTime())) {
        return res.status(400).json({ success: false, message: "Application deadline is required" });
      }
      job.applicationDeadline = parsedUpdateDeadline;
    }

    if (typeof job.skills === "string") {
      job.skills = job.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (!Array.isArray(job.skills)) job.skills = [];

    job.salaryMin = Number(job.salaryMin) || 0;
    job.salaryMax = Number(job.salaryMax) || 0;
    job.vacancy = Number(job.vacancy) || 1;
    job.minAge = Number(job.minAge) || 18;
    job.maxAge = Number(job.maxAge) || 60;
    job.encourageVideoCv = Boolean(job.encourageVideoCv);
    job.employmentStatusText = mapEmploymentStatus(job.jobType);

    await job.save();

    return res.json({ success: true, message: "Job updated successfully", job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (String(job.postedBy) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await Promise.all([
      Application.deleteMany({ job: job._id }),
      SavedJob.deleteMany({ job: job._id }),
      job.deleteOne()
    ]);

    return res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
