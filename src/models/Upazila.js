import mongoose from "mongoose";

const upazilaSchema = new mongoose.Schema(
  {
    upazilaId: { type: Number, required: true, unique: true, index: true },
    districtId: { type: Number, required: true, index: true },
    name: { type: String, trim: true, required: true },
    bnName: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { timestamps: true }
);

const Upazila = mongoose.model("Upazila", upazilaSchema);

export default Upazila;
