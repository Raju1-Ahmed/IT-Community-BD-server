import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["seeker", "employer"], default: "seeker" },
    companyName: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },
    jobCategory: { type: String, trim: true, default: "" },
    jobRole: { type: String, trim: true, default: "" },
    jobSpecialization: { type: String, trim: true, default: "" },
    otpHash: { type: String, required: true, select: false },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);

export default PendingRegistration;
