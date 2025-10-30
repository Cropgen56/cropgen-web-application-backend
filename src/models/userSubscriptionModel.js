import mongoose from "mongoose";

const { Schema } = mongoose;

const userSubscription = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fieldId: {
      type: Schema.Types.ObjectId,
      ref: "FarmField",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    // Business data
    hectares: { type: Number, min: 0, required: true },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      required: true,
    },
    amountMinor: { type: Number, min: 0, required: true },

    // Legacy order info (if you still use Orders for single payment)
    orderId: { type: String, default: null },

    // Razorpay subscription fields
    razorpayPlanId: { type: String, default: null },
    razorpaySubscriptionId: { type: String, default: null }, // sub_...
    razorpayCustomerId: { type: String, default: null }, // contact_...
    razorpayLastInvoiceId: { type: String, default: null }, // invoice_...

    // lifecycle and bookkeeping
    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "cancelled",
        "paused",
        "completed",
        "expired",
      ],
      default: "pending",
      index: true,
    },
    active: { type: Boolean, default: false, index: true },

    startDate: { type: Date, default: Date.now },
    nextBillingAt: { type: Date, default: null },
    endDate: { type: Date, default: null },

    // optional notes for auditing / mapping
    notes: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// ensure one active subscription per field (optional; remove if you allow multiple)
userSubscription.index({ fieldId: 1, active: 1 }, { unique: false });

export default mongoose.model("userSubscription", userSubscription);
