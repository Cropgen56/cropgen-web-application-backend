import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
      index: true,
    },
    fieldId: { type: Schema.Types.ObjectId, ref: "FarmField", index: true },

    provider: { type: String, default: "razorpay" },

    providerPaymentId: { type: String, default: null, index: true },
    providerOrderId: { type: String, default: null, index: true },
    providerInvoiceId: { type: String, default: null, index: true },

    amountMinor: { type: Number },
    currency: { type: String },

    status: { type: String },

    raw: { type: Schema.Types.Mixed },

    note: { type: String, default: null },
  },
  { timestamps: true }
);

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

export default Payment;
