import PremiumProfile from "../models/PremiumProfile.js";
import PremiumPayment from "../models/PremiumPayment.js";
import ResumeView from "../models/ResumeView.js";

const MIN_EXPERIENCE_YEARS = Number(process.env.PREMIUM_MIN_EXPERIENCE_YEARS || 3);

const expirePremiumProfiles = async () => {
  await PremiumProfile.updateMany(
    { status: "approved", activeUntil: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
};

const getOrCreatePremiumProfile = async (userId) => {
  let profile = await PremiumProfile.findOne({ seeker: userId });
  if (!profile) {
    profile = await PremiumProfile.create({ seeker: userId, totalExperienceYears: 0 });
  }
  return profile;
};

const trackExpertiseResumeView = async ({ seekerId, viewer, sourceId }) => {
  if (!seekerId || !viewer?._id) return;
  if (String(seekerId) === String(viewer._id)) return;
  if (!["employer", "admin"].includes(viewer.role)) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const existing = await ResumeView.findOne({
    seeker: seekerId,
    "employer.employerId": viewer._id,
    sourceType: "expertise_profile",
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
    sourceType: "expertise_profile",
    sourceId,
    firstViewedAt: now,
    lastViewedAt: now,
    viewCount: 1,
    viewedDates: [now]
  });
};

const expandExpertViewEvents = (logs, limit = 10) =>
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
        viewedAt
      }));
    })
    .sort((a, b) => new Date(b.viewedAt || 0).getTime() - new Date(a.viewedAt || 0).getTime())
    .slice(0, limit);

const buildExpertProfileInsights = async (seekerId) => {
  const logs = await ResumeView.find({
    seeker: seekerId,
    sourceType: "expertise_profile"
  })
    .sort({ lastViewedAt: -1 })
    .lean();

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

  return {
    totalViews,
    uniqueEmployers,
    viewsThisWeek,
    lastViewedAt: logs[0]?.lastViewedAt || null,
    recentViews: expandExpertViewEvents(logs, 10)
  };
};

export const getMyPremiumProfile = async (req, res) => {
  try {
    await expirePremiumProfiles();
    const profile = await getOrCreatePremiumProfile(req.user._id);
    const payments = await PremiumPayment.find({ premiumProfile: profile._id }).sort({ createdAt: -1 }).limit(10);
    const insights = await buildExpertProfileInsights(req.user._id);
    return res.json({ success: true, profile, payments, insights, minimumExperienceYears: MIN_EXPERIENCE_YEARS });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertMyPremiumProfile = async (req, res) => {
  try {
    await expirePremiumProfiles();

    const payload = {
      headline: req.body.headline,
      summary: req.body.summary,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      religion: req.body.religion,
      maritalStatus: req.body.maritalStatus,
      nationality: req.body.nationality,
      divisionId: Number(req.body.divisionId) || 0,
      divisionName: req.body.divisionName,
      districtId: Number(req.body.districtId) || 0,
      districtName: req.body.districtName,
      upazilaId: Number(req.body.upazilaId) || 0,
      upazilaName: req.body.upazilaName,
      unionId: Number(req.body.unionId) || 0,
      unionName: req.body.unionName,
      nationalId: req.body.nationalId,
      primaryMobile: req.body.primaryMobile,
      secondaryMobile: req.body.secondaryMobile,
      emergencyContact: req.body.emergencyContact,
      primaryEmail: req.body.primaryEmail,
      alternateEmail: req.body.alternateEmail,
      bloodGroup: req.body.bloodGroup,
      heightMeters: req.body.heightMeters,
      weightKg: req.body.weightKg,
      preferredRole: req.body.preferredRole,
      expectedSalary: Number(req.body.expectedSalary) || 0,
      location: req.body.location,
      totalExperienceYears: Number(req.body.totalExperienceYears) || 0,
      otherInfo: req.body.otherInfo,
      accomplishment: req.body.accomplishment,
      skills: Array.isArray(req.body.skills)
        ? req.body.skills
        : String(req.body.skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
    };

    if (req.body.skillDetails) {
      try {
        const parsed = typeof req.body.skillDetails === "string" ? JSON.parse(req.body.skillDetails) : req.body.skillDetails;
        payload.skillDetails = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        payload.skillDetails = [];
      }
    }

    if (req.body.academics) {
      try {
        const parsed = typeof req.body.academics === "string" ? JSON.parse(req.body.academics) : req.body.academics;
        payload.academics = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        payload.academics = [];
      }
    }

    if (req.body.experienceHistory) {
      try {
        const parsed = typeof req.body.experienceHistory === "string"
          ? JSON.parse(req.body.experienceHistory)
          : req.body.experienceHistory;
        payload.experienceHistory = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        payload.experienceHistory = [];
      }
    }

    if (req.body.coursesOrInternships) {
      try {
        const parsed = typeof req.body.coursesOrInternships === "string"
          ? JSON.parse(req.body.coursesOrInternships)
          : req.body.coursesOrInternships;
        payload.coursesOrInternships = Array.isArray(parsed)
          ? parsed.map((item) => ({
              type: String(item?.type || "Course").trim() || "Course",
              name: String(item?.name || "").trim(),
              duration: String(item?.duration || "").trim(),
              certificate: String(item?.certificate || "").trim()
            }))
          : [];
      } catch (_error) {
        payload.coursesOrInternships = [];
      }
    }

    const profile = await PremiumProfile.findOneAndUpdate(
      { seeker: req.user._id },
      { $set: payload, $setOnInsert: { seeker: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (["rejected", "expired"].includes(profile.status)) {
      profile.status = "draft";
      await profile.save();
    }

    return res.json({ success: true, message: "Premium profile draft saved", profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadPremiumDocuments = async (req, res) => {
  try {
    const profile = await getOrCreatePremiumProfile(req.user._id);

    const filePath = (file) => (file ? `/uploads/premium/${file.filename}` : null);

    const filesArray = Array.isArray(req.files) ? req.files : [];
    const getByField = (fieldName) => {
      const fromArray = filesArray.find((file) => file.fieldname === fieldName);
      if (fromArray) return fromArray;
      if (req.files?.[fieldName]?.[0]) return req.files[fieldName][0];
      return null;
    };

    const cv = getByField("cv");
    const experienceLetter = getByField("experienceLetter");
    const companyIdCard = getByField("companyIdCard");
    const additionalDoc = getByField("additionalDoc");

    if (cv) profile.cvUrl = filePath(cv);
    if (experienceLetter) profile.experienceLetterUrl = filePath(experienceLetter);
    if (companyIdCard) profile.companyIdCardUrl = filePath(companyIdCard);
    if (additionalDoc) profile.additionalDocUrl = filePath(additionalDoc);

    const certFiles = filesArray.filter((file) => file.fieldname.startsWith("courseInternCertificate_"));
    if (certFiles.length > 0) {
      const items = Array.isArray(profile.coursesOrInternships)
        ? profile.coursesOrInternships.map((item) =>
            typeof item?.toObject === "function" ? item.toObject() : { ...item }
          )
        : [];

      for (const certFile of certFiles) {
        const idxText = certFile.fieldname.replace("courseInternCertificate_", "");
        const idx = Number.parseInt(idxText, 10);
        if (Number.isNaN(idx) || idx < 0) continue;

        if (!items[idx]) {
          items[idx] = { type: "Course", name: "", duration: "", certificate: "" };
        }
        items[idx].certificate = filePath(certFile);
      }

      profile.coursesOrInternships = items;
    }

    await profile.save();

    return res.json({ success: true, message: "Documents uploaded", profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitPremiumProfile = async (req, res) => {
  try {
    const profile = await getOrCreatePremiumProfile(req.user._id);

    if ((profile.totalExperienceYears || 0) < MIN_EXPERIENCE_YEARS) {
      return res.status(400).json({
        success: false,
        message: `Minimum ${MIN_EXPERIENCE_YEARS} years of experience required`
      });
    }

    if (!profile.cvUrl || !profile.experienceLetterUrl || !profile.companyIdCardUrl) {
      return res.status(400).json({
        success: false,
        message: "CV, experience letter, and company ID card are required"
      });
    }

    profile.status = "pending_payment";
    profile.reviewNote = "";
    await profile.save();

    return res.json({ success: true, message: "Profile submitted. Complete payment to continue.", profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adminPremiumQueue = async (req, res) => {
  try {
    await expirePremiumProfiles();

    const profileStatus = req.query.status || "payment_submitted";
    const profiles = await PremiumProfile.find({ status: profileStatus })
      .populate("seeker", "name email location profileImage")
      .sort({ updatedAt: -1 });

    const payments = await PremiumPayment.find({ status: "submitted" })
      .populate("seeker", "name email")
      .populate("premiumProfile", "headline status")
      .sort({ updatedAt: -1 });

    return res.json({ success: true, profiles, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adminVerifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, note } = req.body;

    if (!["verified", "rejected"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const payment = await PremiumPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    payment.status = action;
    payment.note = note || "";
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    const profile = await PremiumProfile.findById(payment.premiumProfile);
    if (action === "verified") {
      profile.status = "pending_review";
    } else {
      profile.status = "pending_payment";
      profile.reviewNote = note || "Payment rejected";
    }
    await profile.save();

    return res.json({ success: true, message: `Payment ${action}`, payment, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adminReviewPremiumProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { action, note } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const profile = await PremiumProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (action === "approve") {
      const now = new Date();
      const activeUntil = new Date(now);
      activeUntil.setDate(activeUntil.getDate() + (profile.packageDays || 30));

      profile.status = "approved";
      profile.approvedBy = req.user._id;
      profile.approvedAt = now;
      profile.activeFrom = now;
      profile.activeUntil = activeUntil;
      profile.reviewNote = note || "Approved";
    } else {
      profile.status = "rejected";
      profile.reviewNote = note || "Rejected";
    }

    await profile.save();

    return res.json({ success: true, message: `Profile ${action}d`, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const hasAnyExpertData = (profile) => {
  const textFields = [
    profile.headline,
    profile.summary,
    profile.firstName,
    profile.lastName,
    profile.preferredRole,
    profile.location
  ];

  if (textFields.some((value) => String(value || "").trim().length > 0)) return true;
  if ((profile.totalExperienceYears || 0) > 0) return true;
  if (Array.isArray(profile.skills) && profile.skills.length > 0) return true;
  if (Array.isArray(profile.academics) && profile.academics.length > 0) return true;
  if (Array.isArray(profile.experienceHistory) && profile.experienceHistory.length > 0) return true;
  if (Array.isArray(profile.coursesOrInternships) && profile.coursesOrInternships.length > 0) return true;
  if (profile.cvUrl || profile.experienceLetterUrl || profile.companyIdCardUrl || profile.additionalDocUrl) return true;

  return false;
};

export const listExpertiseProfiles = async (_req, res) => {
  try {
    const profiles = await PremiumProfile.find()
      .populate(
        "seeker",
        "name email profileImage location currentPosition role skills bio experienceYears expectedSalary phone jobCategory jobRole jobSpecialization projects"
      )
      .sort({ updatedAt: -1 });

    const filtered = profiles.filter(
      (profile) => profile?.seeker?.role === "seeker" && hasAnyExpertData(profile)
    );

    return res.json({ success: true, count: filtered.length, profiles: filtered });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Backward-compatible alias for older imports/usages.
export const listExpertiesProfiles = listExpertiseProfiles;

export const getExpertiseProfileById = async (req, res) => {
  try {
    const profile = await PremiumProfile.findById(req.params.id).populate(
      "seeker",
      "name email profileImage location currentPosition role skills bio experienceYears expectedSalary phone jobCategory jobRole jobSpecialization projects"
    );

    if (!profile || profile?.seeker?.role !== "seeker" || !hasAnyExpertData(profile)) {
      return res.status(404).json({ success: false, message: "Expertise profile not found" });
    }

    if (req.user?._id) {
      await trackExpertiseResumeView({
        seekerId: profile.seeker._id,
        viewer: req.user,
        sourceId: String(profile._id)
      });
    }

    return res.json({ success: true, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};







