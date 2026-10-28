import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Division from "../models/Division.js";
import District from "../models/District.js";
import Upazila from "../models/Upazila.js";
import Union from "../models/Union.js";

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../data/bd.json");

const toNumber = (value) => Number.parseInt(String(value ?? "0"), 10) || 0;

const run = async () => {
  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const districts = data.flatMap((division) => division.districts || []);
  const upazilas = districts.flatMap((district) => district.upazilas || []);
  const unions = upazilas.flatMap((upazila) => upazila.unions || []);

  await mongoose.connect(process.env.MONGODB_URI);

  await Division.bulkWrite(data.map((row) => ({
    updateOne: {
      filter: { divisionId: toNumber(row.id) },
      update: { $set: { divisionId: toNumber(row.id), name: row.name || "", bnName: row.bn_name || "", url: row.url || "" } },
      upsert: true
    }
  })));

  await District.bulkWrite(districts.map((row) => ({
    updateOne: {
      filter: { districtId: toNumber(row.id) },
      update: { $set: { districtId: toNumber(row.id), divisionId: toNumber(row.division_id), name: row.name || "", bnName: row.bn_name || "", lat: row.lat || "", lon: row.lon || "", url: row.url || "" } },
      upsert: true
    }
  })));

  await Upazila.bulkWrite(upazilas.map((row) => ({
    updateOne: {
      filter: { upazilaId: toNumber(row.id) },
      update: { $set: { upazilaId: toNumber(row.id), districtId: toNumber(row.district_id), name: row.name || "", bnName: row.bn_name || "", url: row.url || "" } },
      upsert: true
    }
  })));

  await Union.bulkWrite(unions.map((row) => ({
    updateOne: {
      filter: { unionId: toNumber(row.id) },
      update: { $set: { unionId: toNumber(row.id), upazilaId: toNumber(row.upazilla_id || row.upazila_id), name: row.name || "", bnName: row.bn_name || "", url: row.url || "" } },
      upsert: true
    }
  })));

  console.log(`Imported divisions=${data.length}, districts=${districts.length}, upazilas=${upazilas.length}, unions=${unions.length}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
