import express from "express";
import { getDistricts, getDivisions, getUnions, getUpazilas } from "../controllers/geoController.js";

const router = express.Router();

router.get("/divisions", getDivisions);
router.get("/districts", getDistricts);
router.get("/upazilas", getUpazilas);
router.get("/unions", getUnions);

export default router;
