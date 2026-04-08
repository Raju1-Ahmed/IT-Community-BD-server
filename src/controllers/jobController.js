import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import JobView from "../models/JobView.js";

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

const trackJobView = async ({ job, viewer }) => {
  if (!job?._id || !viewer?._id) return;
  if (String(job.postedBy) === String(viewer._id)) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const existing = await JobView.findOne({
    job: job._id,
    "viewer.viewerId": viewer._id,
    lastViewedAt: { $gte: dayStart, $lt: dayEnd }
  });

  if (existing) {
    existing.lastViewedAt = now;
    existing.viewCount += 1;
    existing.viewedDates = [...(existing.viewedDates || []), now];
    existing.viewer = {
      viewerId: viewer._id,
      viewerName: viewer.name || "",
      viewerEmail: viewer.email || "",
      currentPosition: viewer.currentPosition || ""
    };
    await existing.save();
    return;
  }

  await JobView.create({
    job: job._id,
    viewer: {
      viewerId: viewer._id,
      viewerName: viewer.name || "",
      viewerEmail: viewer.email || "",
      currentPosition: viewer.currentPosition || ""
    },
    firstViewedAt: now,
    lastViewedAt: now,
    viewCount: 1,
    viewedDates: [now]
  });
};

const expandJobViewEvents = (logs, limit = 12) =>
  logs
    .flatMap((item) => {
      const dates =
        Array.isArray(item.viewedDates) && item.viewedDates.length > 0
          ? item.viewedDates
          : Array.from({ length: Number(item.viewCount || 0) || 1 }, () => item.lastViewedAt || item.createdAt);

      return dates.map((viewedAt, index) => ({
        id: `${String(item._id)}-${index}`,
        viewerName: item?.viewer?.viewerName || "Viewer",
        viewerEmail: item?.viewer?.viewerEmail || "",
        currentPosition: item?.viewer?.currentPosition || "",
        viewedAt
      }));
    })
    .sort((a, b) => new Date(b.viewedAt || 0).getTime() - new Date(a.viewedAt || 0).getTime())
    .slice(0, limit);

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

    if (req.user?._id) {
      await trackJobView({ job, viewer: req.user });
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
      JobView.deleteMany({ job: job._id }),
      job.deleteOne()
    ]);

    return res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobCandidateApplicationsAnalytics = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (String(job.postedBy) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const [applications, savedJobs, viewLogs] = await Promise.all([
      Application.find({ job: job._id })
        .populate(
          "candidate",
          "name email phone location skills currentPosition experienceYears jobCategory jobRole profileImage"
        )
        .sort({ createdAt: -1 }),
      SavedJob.find({ job: job._id })
        .populate("seeker", "name email currentPosition location profileImage")
        .sort({ createdAt: -1 }),
      JobView.find({ job: job._id }).sort({ lastViewedAt: -1 }).lean()
    ]);

    const totalViews = viewLogs.reduce((sum, item) => {
      if (Array.isArray(item.viewedDates) && item.viewedDates.length > 0) {
        return sum + item.viewedDates.length;
      }
      return sum + Number(item.viewCount || 0);
    }, 0);

    const uniqueViewers = new Set(
      viewLogs.map((item) => String(item?.viewer?.viewerId || "")).filter(Boolean)
    ).size;

    const savedBy = savedJobs.map((item) => ({
      id: String(item._id),
      seekerId: String(item?.seeker?._id || ""),
      name: item?.seeker?.name || "Candidate",
      email: item?.seeker?.email || "",
      currentPosition: item?.seeker?.currentPosition || "",
      location: item?.seeker?.location || "",
      savedAt: item.createdAt,
      profileImage: item?.seeker?.profileImage || ""
    }));

    return res.json({
      success: true,
      job,
      analytics: {
        totalApplications: applications.length,
        totalViews,
        uniqueViewers,
        savedCount: savedJobs.length,
        recentViewEvents: expandJobViewEvents(viewLogs, 12),
        savedBy
      },
      applications
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
