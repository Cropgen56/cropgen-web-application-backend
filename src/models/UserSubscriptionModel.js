import mongoose from "mongoose";

const UserSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan",
    required: true,
  },
  hectares: {
    type: Number,
    min: [0, "Hectares cannot be negative"],
    required: [true, "Hectares is required"],
  },
  currency: {
    type: String,
    enum: ["INR", "USD"],
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly", "trial"],
    required: true,
  },
  amountMinor: {
    type: Number,
    min: [0, "Amount cannot be negative"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  paymentId: {
    type: String,
    default: null,
  },
  orderId: {
    type: String,
    default: null,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("UserSubscription", UserSubscriptionSchema);
