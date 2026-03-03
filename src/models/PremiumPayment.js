import mongoose from "mongoose";

const premiumPaymentSchema = new mongoose.Schema(
  {
    premiumProfile: { type: mongoose.Schema.Types.ObjectId, ref: "PremiumProfile", required: true },
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, default: 99 },
    currency: { type: String, default: "BDT" },
    method: { type: String, enum: ["manual", "bkash", "nagad", "sslcommerz"], default: "manual" },
    status: { type: String, enum: ["initiated", "submitted", "verified", "rejected"], default: "initiated" },
    transactionRef: { type: String, trim: true },
    note: { type: String, trim: true },
    paymentProofUrl: { type: String, trim: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date }
  },
  { timestamps: true }
);

const PremiumPayment = mongoose.model("PremiumPayment", premiumPaymentSchema);

export default PremiumPayment;
