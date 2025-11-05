import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
      index: true,
      required: true,
    },
    fieldId: { type: Schema.Types.ObjectId, ref: "FarmField", index: true },

    provider: { type: String, default: "razorpay", enum: ["razorpay"] },

    providerPaymentId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    providerOrderId: { type: String, index: true },
    providerInvoiceId: { type: String, index: true },

    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },

    // NEW: Payment Method Details
    method: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet"],
      default: null,
    },
    cardLast4: { type: String, default: null }, // e.g., "8684"
    upiId: { type: String, default: null }, // e.g., "user@ybl"
    bank: { type: String, default: null }, // for netbanking

    // NEW: Invoice & Status
    invoiceNumber: { type: String, index: true }, // e.g., CG/2025/INV-12345
    invoiceDate: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "captured",
    },

    // Billing Period (for recurring)
    billingStartDate: { type: Date },
    billingEndDate: { type: Date },

    raw: { type: Schema.Types.Mixed }, // Full Razorpay payload
    note: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate model
const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

export default Payment;
