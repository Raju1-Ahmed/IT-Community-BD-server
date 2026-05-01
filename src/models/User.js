import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["seeker", "employer", "admin"], default: "seeker" },
    companyName: { type: String, trim: true },
    location: { type: String, trim: true },
    jobCategory: { type: String, trim: true },
    jobRole: { type: String, trim: true },
    jobSpecialization: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    phone: { type: String, trim: true },
    bio: { type: String, trim: true },
    github: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    profileImage: { type: String, trim: true },
    education: { type: String, trim: true },
    currentPosition: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    expectedSalary: { type: Number, min: 0, default: 0 },
    lastSeen: { type: Date },
    dateOfBirth: { type: Date },
    experience: [
      {
        company: { type: String, trim: true, default: "" },
        role: { type: String, trim: true, default: "" },
        duration: { type: String, trim: true, default: "" },
        desc: { type: String, trim: true, default: "" }
      }
    ],
    projects: [
      {
        title: { type: String, trim: true, default: "" },
        link: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" }
      }
    ],
    educationEntries: [
      {
        institute: { type: String, trim: true, default: "" },
        degree: { type: String, trim: true, default: "" },
        year: { type: String, trim: true, default: "" }
      }
    ],
    languages: [
      {
        lang: { type: String, trim: true, default: "" },
        level: { type: String, trim: true, default: "" }
      }
    ],
    certifications: [
      {
        title: { type: String, trim: true, default: "" },
        year: { type: String, trim: true, default: "" }
      }
    ],
    volunteer: [
      {
        role: { type: String, trim: true, default: "" },
        organization: { type: String, trim: true, default: "" },
        details: { type: String, trim: true, default: "" }
      }
    ],
    categoryProfile: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
