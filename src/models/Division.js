import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    divisionId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, trim: true, required: true },
    bnName: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { timestamps: true }
);

const Division = mongoose.model("Division", divisionSchema);

export default Division;
