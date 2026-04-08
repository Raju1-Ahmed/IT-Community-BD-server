import mongoose from "mongoose";

const employerSnapshotSchema = new mongoose.Schema(
  {
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employerName: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    employerEmail: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const resumeViewSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employer: employerSnapshotSchema,
    sourceType: {
      type: String,
      enum: ["candidate_profile", "expertise_profile"],
      required: true
    },
    sourceId: { type: String, trim: true, default: "" },
    firstViewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 1, min: 1 },
    viewedDates: { type: [Date], default: [] }
  },
  { timestamps: true }
);

resumeViewSchema.index({ seeker: 1, "employer.employerId": 1, sourceType: 1, sourceId: 1 });
resumeViewSchema.index({ seeker: 1, lastViewedAt: -1 });

const ResumeView = mongoose.model("ResumeView", resumeViewSchema);

export default ResumeView;
