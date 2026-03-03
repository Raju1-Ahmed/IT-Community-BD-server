import PremiumProfile from "../models/PremiumProfile.js";
import PremiumPayment from "../models/PremiumPayment.js";

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

export const getMyPremiumProfile = async (req, res) => {
  try {
    await expirePremiumProfiles();
    const profile = await getOrCreatePremiumProfile(req.user._id);
    const payments = await PremiumPayment.find({ premiumProfile: profile._id }).sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, profile, payments, minimumExperienceYears: MIN_EXPERIENCE_YEARS });
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
      preferredRole: req.body.preferredRole,
      expectedSalary: Number(req.body.expectedSalary) || 0,
      location: req.body.location,
      totalExperienceYears: Number(req.body.totalExperienceYears) || 0,
      skills: Array.isArray(req.body.skills)
        ? req.body.skills
        : String(req.body.skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
    };

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

    const profile = await PremiumProfile.findOneAndUpdate(
      { seeker: req.user._id },
      { $set: payload, $setOnInsert: { seeker: req.user._id } },
      { new: true, upsert: true }
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

    if (req.files?.cv?.[0]) profile.cvUrl = filePath(req.files.cv[0]);
    if (req.files?.experienceLetter?.[0]) profile.experienceLetterUrl = filePath(req.files.experienceLetter[0]);
    if (req.files?.companyIdCard?.[0]) profile.companyIdCardUrl = filePath(req.files.companyIdCard[0]);
    if (req.files?.additionalDoc?.[0]) profile.additionalDocUrl = filePath(req.files.additionalDoc[0]);

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

export const initiatePremiumPayment = async (req, res) => {
  try {
    const { method } = req.body;
    const profile = await getOrCreatePremiumProfile(req.user._id);

    if (profile.status !== "pending_payment" && profile.status !== "expired") {
      return res.status(400).json({ success: false, message: "Profile is not ready for payment" });
    }

    const payment = await PremiumPayment.create({
      premiumProfile: profile._id,
      seeker: req.user._id,
      amount: profile.packageAmount || 99,
      currency: "BDT",
      method: method || "manual",
      status: "initiated"
    });

    return res.json({
      success: true,
      message: "Payment initiated. Complete payment and submit transaction reference.",
      payment
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitPremiumPayment = async (req, res) => {
  try {
    const { paymentId, transactionRef, note } = req.body;

    if (!paymentId || !transactionRef) {
      return res.status(400).json({ success: false, message: "paymentId and transactionRef are required" });
    }

    const payment = await PremiumPayment.findById(paymentId);
    if (!payment || String(payment.seeker) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (req.file) {
      payment.paymentProofUrl = `/uploads/premium/${req.file.filename}`;
    }

    payment.transactionRef = transactionRef;
    payment.note = note || "";
    payment.status = "submitted";
    await payment.save();

    const profile = await PremiumProfile.findById(payment.premiumProfile);
    profile.status = "payment_submitted";
    await profile.save();

    return res.json({ success: true, message: "Payment submitted. Awaiting admin verification.", payment, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reActivatePremiumProfile = async (req, res) => {
  try {
    const profile = await getOrCreatePremiumProfile(req.user._id);
    if (!profile.cvUrl || !profile.experienceLetterUrl || !profile.companyIdCardUrl) {
      return res.status(400).json({
        success: false,
        message: "Required documents missing. Please upload before reactivation."
      });
    }

    profile.status = "pending_payment";
    profile.reviewNote = "";
    await profile.save();

    return res.json({ success: true, message: "Reactivation started. Please complete payment.", profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const listPremiumProfilesForEmployer = async (_req, res) => {
  try {
    await expirePremiumProfiles();

    const profiles = await PremiumProfile.find({ status: "approved" })
      .populate("seeker", "name email profileImage location currentPosition skills experienceYears")
      .sort({ approvedAt: -1 });

    return res.json({ success: true, count: profiles.length, profiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPremiumProfilePublicById = async (req, res) => {
  try {
    await expirePremiumProfiles();
    const profile = await PremiumProfile.findById(req.params.id)
      .populate("seeker", "name email profileImage location currentPosition skills experienceYears bio education linkedin github portfolio");

    if (!profile || profile.status !== "approved") {
      return res.status(404).json({ success: false, message: "Premium profile not found" });
    }

    return res.json({ success: true, profile });
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
