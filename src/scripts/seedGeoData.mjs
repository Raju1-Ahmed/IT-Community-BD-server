import fs from "node:fs/promises";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Division from "../models/Division.js";
import District from "../models/District.js";
import Upazila from "../models/Upazila.js";
import Union from "../models/Union.js";

dotenv.config({ path: "c:/Projects/server/.env" });

const findDataRows = (json) => {
  const tableEntry = Array.isArray(json) ? json.find((x) => x?.type === "table" && Array.isArray(x.data)) : null;
  return tableEntry?.data || [];
};

const toNumber = (value) => Number.parseInt(String(value || "0"), 10) || 0;

const run = async () => {
  const base = "c:/Users/GREENLAND/Downloads/Geo-code-data-bd";
  const divisionsRaw = JSON.parse(await fs.readFile(`${base}/divisions.json`, "utf8"));
  const districtsRaw = JSON.parse(await fs.readFile(`${base}/districts.json`, "utf8"));
  const upazilasRaw = JSON.parse(await fs.readFile(`${base}/upazilas.json`, "utf8"));
  const unionsRaw = JSON.parse(await fs.readFile(`${base}/unions.json`, "utf8"));

  const divisions = findDataRows(divisionsRaw).map((row) => ({
    divisionId: toNumber(row.id),
    name: row.name || "",
    bnName: row.bn_name || "",
    url: row.url || ""
  }));

  const districts = findDataRows(districtsRaw).map((row) => ({
    districtId: toNumber(row.id),
    divisionId: toNumber(row.division_id),
    name: row.name || "",
    bnName: row.bn_name || "",
    lat: row.lat || "",
    lon: row.lon || "",
    url: row.url || ""
  }));

  const upazilas = findDataRows(upazilasRaw).map((row) => ({
    upazilaId: toNumber(row.id),
    districtId: toNumber(row.district_id),
    name: row.name || "",
    bnName: row.bn_name || "",
    url: row.url || ""
  }));

  const unions = findDataRows(unionsRaw).map((row) => ({
    unionId: toNumber(row.id),
    upazilaId: toNumber(row.upazilla_id || row.upazila_id),
    name: row.name || "",
    bnName: row.bn_name || "",
    url: row.url || ""
  }));

  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    Division.deleteMany({}),
    District.deleteMany({}),
    Upazila.deleteMany({}),
    Union.deleteMany({})
  ]);

  await Division.insertMany(divisions, { ordered: false });
  await District.insertMany(districts, { ordered: false });
  await Upazila.insertMany(upazilas, { ordered: false });
  await Union.insertMany(unions, { ordered: false });

  console.log(`Inserted divisions=${divisions.length}, districts=${districts.length}, upazilas=${upazilas.length}, unions=${unions.length}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch (_error) {
    // ignore
  }
  process.exit(1);
});
