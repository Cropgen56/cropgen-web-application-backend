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

    providerPaymentId: { type: String, default: null, index: true }, // pay_…
    providerOrderId: { type: String, default: null, index: true }, // order_…
    providerInvoiceId: { type: String, default: null, index: true }, // invoice_…

    amountMinor: { type: Number },
    currency: { type: String },

    status: { type: String },

    raw: { type: Schema.Types.Mixed },

    note: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index(
  { provider: 1, providerPaymentId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("Payment", PaymentSchema);
