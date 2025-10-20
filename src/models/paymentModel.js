// models/PaymentModel.js
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

    // provider identifiers
    providerPaymentId: { type: String, default: null, index: true }, // e.g. pay_...
    providerOrderId: { type: String, default: null, index: true }, // e.g. order_...
    providerInvoiceId: { type: String, default: null, index: true }, // e.g. invoice_...

    amountMinor: { type: Number },
    currency: { type: String },

    // status from provider: captured/failed/authorized...
    status: { type: String },

    // raw provider payload for debugging/audit
    raw: { type: Schema.Types.Mixed },

    // any message/notes
    note: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// unique index to avoid double-inserting same providerPaymentId
PaymentSchema.index(
  { provider: 1, providerPaymentId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("Payment", PaymentSchema);
