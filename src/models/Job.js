import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    jobType: { type: String, enum: ["full-time", "part-time", "contract", "internship", "remote"], required: true },
    experienceLevel: { type: String, enum: ["fresher", "junior", "mid", "senior"], required: true },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    vacancy: { type: Number, default: 1 },
    minAge: { type: Number, default: 18 },
    maxAge: { type: Number, default: 60 },
    applicationDeadline: { type: Date, required: true },
    educationRequirements: { type: String, trim: true },
    additionalRequirements: { type: String, trim: true },
    responsibilities: { type: String, trim: true },
    benefits: { type: String, trim: true },
    workplace: { type: String, enum: ["office", "remote", "hybrid"], default: "office" },
    businessArea: { type: String, trim: true },
    employmentStatusText: { type: String, trim: true, default: "Full Time" },
    encourageVideoCv: { type: Boolean, default: false },
    skills: [{ type: String, trim: true }],
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
