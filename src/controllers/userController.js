import User from "../models/User.js";
import ResumeView from "../models/ResumeView.js";

const trackResumeView = async ({ seekerId, viewer, sourceType, sourceId }) => {
  if (!seekerId || !viewer?._id) return;
  if (String(seekerId) === String(viewer._id)) return;
  if (!["employer", "admin"].includes(viewer.role)) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const existing = await ResumeView.findOne({
    seeker: seekerId,
    "employer.employerId": viewer._id,
    sourceType,
    sourceId,
    lastViewedAt: { $gte: dayStart, $lt: dayEnd }
  });

  if (existing) {
    existing.lastViewedAt = now;
    existing.viewCount += 1;
    existing.viewedDates = [...(existing.viewedDates || []), now];
    existing.employer = {
      employerId: viewer._id,
      employerName: viewer.name || "",
      companyName: viewer.companyName || "",
      employerEmail: viewer.email || ""
    };
    await existing.save();
    return;
  }

  await ResumeView.create({
    seeker: seekerId,
    employer: {
      employerId: viewer._id,
      employerName: viewer.name || "",
      companyName: viewer.companyName || "",
      employerEmail: viewer.email || ""
    },
    sourceType,
    sourceId,
    firstViewedAt: now,
    lastViewedAt: now,
    viewCount: 1,
    viewedDates: [now]
  });
};

const expandViewEvents = (logs, limit = 12) =>
  logs
    .flatMap((item) => {
      const dates =
        Array.isArray(item.viewedDates) && item.viewedDates.length > 0
          ? item.viewedDates
          : Array.from({ length: Number(item.viewCount || 0) || 1 }, () => item.lastViewedAt || item.createdAt);

      return dates.map((viewedAt, index) => ({
        id: `${String(item._id)}-${index}`,
        employerName: item?.employer?.companyName || item?.employer?.employerName || "Employer",
        employerContact: item?.employer?.employerEmail || "",
        viewedAt,
        sourceType: item.sourceType
      }));
    })
    .sort((a, b) => new Date(b.viewedAt || 0).getTime() - new Date(a.viewedAt || 0).getTime())
    .slice(0, limit);

export const getCandidateProfile = async (req, res) => {
  try {
    const candidate = await User.findById(req.params.id).select(
      "name email role location phone skills currentPosition experienceYears education bio github linkedin portfolio profileImage dateOfBirth expectedSalary experience projects educationEntries languages certifications volunteer jobCategory jobRole jobSpecialization categoryProfile"
    );

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    if (candidate.role !== "seeker") {
      return res.status(400).json({ success: false, message: "Requested user is not a job seeker" });
    }

    await trackResumeView({
      seekerId: candidate._id,
      viewer: req.user,
      sourceType: "candidate_profile",
      sourceId: String(candidate._id)
    });

    return res.json({ success: true, candidate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyResumeInsights = async (req, res) => {
  try {
    const logs = await ResumeView.find({ seeker: req.user._id }).sort({ lastViewedAt: -1 }).lean();

    const totalViews = logs.reduce((sum, item) => {
      if (Array.isArray(item.viewedDates) && item.viewedDates.length > 0) {
        return sum + item.viewedDates.length;
      }
      return sum + Number(item.viewCount || 0);
    }, 0);
    const uniqueEmployers = new Set(
      logs.map((item) => String(item?.employer?.employerId || "")).filter(Boolean)
    ).size;

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const viewsThisWeek = logs.reduce((sum, item) => {
      const viewedAt = new Date(item.lastViewedAt || item.createdAt || 0);
      const entries =
        Array.isArray(item.viewedDates) && item.viewedDates.length > 0
          ? item.viewedDates.filter((date) => new Date(date) >= weekStart).length
          : viewedAt >= weekStart
            ? Number(item.viewCount || 0)
            : 0;
      if (entries > 0) {
        return sum + entries;
      }
      return sum;
    }, 0);
    const recentViews = expandViewEvents(logs, 12);

    return res.json({
      success: true,
      insights: {
        totalViews,
        uniqueEmployers,
        viewsThisWeek,
        lastViewedAt: logs[0]?.lastViewedAt || null,
        recentViews
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
