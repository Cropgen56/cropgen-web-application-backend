import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSubscriptionSchema = new Schema(
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
      index: true,
    },
    hectares: { type: Number, min: 0, required: true },
    currency: {
      type: String,
      enum: ["INR", "USD"],
      required: true,
      uppercase: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      required: true,
    },

    // amount charged per billing cycle (in minor units: paise/cents)
    amountMinor: { type: Number, min: 0, required: true },

    // Razorpay identifiers (optional until created)
    razorpaySubscriptionId: { type: String, default: null, sparse: true },
    razorpayLastInvoiceId: { type: String, default: null },

    // lifecycle
    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "cancelled",
        "paused",
        "completed",
        "expired",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    active: { type: Boolean, default: false, index: true },

    startDate: { type: Date, default: Date.now },
    nextBillingAt: { type: Date, default: null },

    // free-form metadata (pricing snapshot, clientRequestId, polygon info etc.)
    notes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Optional: One active subscription per field (non-unique)
UserSubscriptionSchema.index({ fieldId: 1, active: 1 }, { unique: false });

// Ensure razorpaySubscriptionId uniqueness only when it's non-null
UserSubscriptionSchema.index(
  { razorpaySubscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpaySubscriptionId: { $exists: true, $ne: null },
    },
  },
);

// Helpful lookups
UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ status: 1 });

const UserSubscription =
  mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", UserSubscriptionSchema);

export default UserSubscription;
