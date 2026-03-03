import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    role: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    responsibilities: { type: String, trim: true }
  },
  { _id: false }
);

const premiumProfileSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    headline: { type: String, trim: true },
    summary: { type: String, trim: true },
    totalExperienceYears: { type: Number, min: 0, default: 0 },
    preferredRole: { type: String, trim: true },
    expectedSalary: { type: Number, min: 0, default: 0 },
    location: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    experienceHistory: [experienceSchema],
    cvUrl: { type: String, trim: true },
    experienceLetterUrl: { type: String, trim: true },
    companyIdCardUrl: { type: String, trim: true },
    additionalDocUrl: { type: String, trim: true },
    packageAmount: { type: Number, default: 99 },
    packageDays: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ["draft", "pending_payment", "payment_submitted", "pending_review", "approved", "rejected", "expired"],
      default: "draft"
    },
    reviewNote: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    activeFrom: { type: Date },
    activeUntil: { type: Date }
  },
  { timestamps: true }
);

const PremiumProfile = mongoose.model("PremiumProfile", premiumProfileSchema);

export default PremiumProfile;
