import mongoose from "mongoose";

const unionSchema = new mongoose.Schema(
  {
    unionId: { type: Number, required: true, unique: true, index: true },
    upazilaId: { type: Number, required: true, index: true },
    name: { type: String, trim: true, required: true },
    bnName: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { timestamps: true }
);

const Union = mongoose.model("Union", unionSchema);

export default Union;
