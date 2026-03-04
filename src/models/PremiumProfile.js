import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    companyBusiness: { type: String, trim: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    employmentPeriod: { type: String, trim: true },
    role: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    responsibilities: { type: String, trim: true },
    areaOfExpertise: { type: String, trim: true },
    companyLocation: { type: String, trim: true }
  },
  { _id: false }
);

const academicSchema = new mongoose.Schema(
  {
    levelOfEducation: { type: String, trim: true },
    examDegreeTitle: { type: String, trim: true },
    concentrationMajorGroup: { type: String, trim: true },
    instituteName: { type: String, trim: true },
    isForeignInstitute: { type: Boolean, default: false },
    result: { type: String, trim: true },
    yearOfPassing: { type: String, trim: true },
    durationYears: { type: String, trim: true },
    achievementNote: { type: String, trim: true }
  },
  { _id: false }
);

const skillDetailSchema = new mongoose.Schema(
  {
    skill: { type: String, trim: true },
    learnedBy: { type: String, trim: true }
  },
  { _id: false }
);

const premiumProfileSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    headline: { type: String, trim: true },
    summary: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
    gender: { type: String, trim: true },
    religion: { type: String, trim: true },
    maritalStatus: { type: String, trim: true },
    nationality: { type: String, trim: true },
    divisionId: { type: Number },
    divisionName: { type: String, trim: true },
    districtId: { type: Number },
    districtName: { type: String, trim: true },
    upazilaId: { type: Number },
    upazilaName: { type: String, trim: true },
    unionId: { type: Number },
    unionName: { type: String, trim: true },
    nationalId: { type: String, trim: true },
    primaryMobile: { type: String, trim: true },
    secondaryMobile: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    primaryEmail: { type: String, trim: true },
    alternateEmail: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    heightMeters: { type: String, trim: true },
    weightKg: { type: String, trim: true },
    totalExperienceYears: { type: Number, min: 0, default: 0 },
    preferredRole: { type: String, trim: true },
    expectedSalary: { type: Number, min: 0, default: 0 },
    location: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    skillDetails: [skillDetailSchema],
    academics: [academicSchema],
    otherInfo: { type: String, trim: true },
    accomplishment: { type: String, trim: true },
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
