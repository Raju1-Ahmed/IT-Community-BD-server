import User from "../models/User.js";

export const getCandidateProfile = async (req, res) => {
  try {
    const candidate = await User.findById(req.params.id).select(
      "name email role location phone skills currentPosition experienceYears education bio github linkedin portfolio profileImage dateOfBirth expectedSalary experience projects educationEntries languages certifications volunteer jobCategory jobRole jobSpecialization categoryProfile"
    );

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    if (candidate.role !== "seeker") {
      return res.status(400).json({ success: false, message: "Requested user is not a job seeker" });
    }

    return res.json({ success: true, candidate });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
