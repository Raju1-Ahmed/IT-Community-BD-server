import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    districtId: { type: Number, required: true, unique: true, index: true },
    divisionId: { type: Number, required: true, index: true },
    name: { type: String, trim: true, required: true },
    bnName: { type: String, trim: true },
    lat: { type: String, trim: true },
    lon: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { timestamps: true }
);

const District = mongoose.model("District", districtSchema);

export default District;
