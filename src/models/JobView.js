import mongoose from "mongoose";

const viewerSnapshotSchema = new mongoose.Schema(
  {
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewerName: { type: String, trim: true, default: "" },
    viewerEmail: { type: String, trim: true, default: "" },
    currentPosition: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const jobViewSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    viewer: viewerSnapshotSchema,
    firstViewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 1, min: 1 },
    viewedDates: { type: [Date], default: [] }
  },
  { timestamps: true }
);

jobViewSchema.index({ job: 1, "viewer.viewerId": 1 });
jobViewSchema.index({ job: 1, lastViewedAt: -1 });

const JobView = mongoose.model("JobView", jobViewSchema);

export default JobView;
