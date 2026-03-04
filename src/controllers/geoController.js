import Division from "../models/Division.js";
import District from "../models/District.js";
import Upazila from "../models/Upazila.js";
import Union from "../models/Union.js";

export const getDivisions = async (_req, res) => {
  try {
    const divisions = await Division.find().sort({ name: 1 }).select("-_id divisionId name bnName");
    return res.json({ success: true, count: divisions.length, divisions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const divisionId = Number(req.query.divisionId);
    if (!divisionId) {
      return res.status(400).json({ success: false, message: "divisionId is required" });
    }
    const districts = await District.find({ divisionId }).sort({ name: 1 }).select("-_id districtId divisionId name bnName");
    return res.json({ success: true, count: districts.length, districts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUpazilas = async (req, res) => {
  try {
    const districtId = Number(req.query.districtId);
    if (!districtId) {
      return res.status(400).json({ success: false, message: "districtId is required" });
    }
    const upazilas = await Upazila.find({ districtId }).sort({ name: 1 }).select("-_id upazilaId districtId name bnName");
    return res.json({ success: true, count: upazilas.length, upazilas });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnions = async (req, res) => {
  try {
    const upazilaId = Number(req.query.upazilaId);
    if (!upazilaId) {
      return res.status(400).json({ success: false, message: "upazilaId is required" });
    }
    const unions = await Union.find({ upazilaId }).sort({ name: 1 }).select("-_id unionId upazilaId name bnName");
    return res.json({ success: true, count: unions.length, unions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
