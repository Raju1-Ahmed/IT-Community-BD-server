import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true }
  },
  { timestamps: true }
);

savedJobSchema.index({ seeker: 1, job: 1 }, { unique: true });

const SavedJob = mongoose.model("SavedJob", savedJobSchema);

export default SavedJob;
