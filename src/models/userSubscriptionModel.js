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
    },
    hectares: { type: Number, min: 0, required: true },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      required: true,
    },
    amountMinor: { type: Number, min: 0, required: true },

    razorpaySubscriptionId: { type: String, default: null },
    razorpayLastInvoiceId: { type: String, default: null },

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

    notes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Optional: One active subscription per field (non-unique)
UserSubscriptionSchema.index({ fieldId: 1, active: 1 }, { unique: false });

const UserSubscription =
  mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", UserSubscriptionSchema);

export default UserSubscription;
