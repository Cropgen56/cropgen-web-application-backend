import mongoose from "mongoose";
const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    // Canonical relation: every payment belongs to a subscription (required)
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "UserSubscription",
      index: true,
      required: true,
    },

    // Optional denormalized fields to speed queries (populate when saving)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: false,
      default: null,
    },
    fieldId: {
      type: Schema.Types.ObjectId,
      ref: "FarmField",
      index: true,
      required: false,
      default: null,
    },

    provider: { type: String, default: "razorpay", enum: ["razorpay"] },

    // Provider identifiers
    providerPaymentId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      default: null,
    },
    providerOrderId: { type: String, index: true, default: null },
    providerInvoiceId: { type: String, index: true, default: null },

    // amount & currency (required)
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },

    // Payment method info (optional)
    method: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet", "other"],
      default: null,
    },
    cardLast4: { type: String, default: null },
    upiId: { type: String, default: null },
    bank: { type: String, default: null },

    // Invoice metadata
    invoiceNumber: { type: String, index: true, default: null },
    invoiceDate: { type: Date, default: Date.now },

    // Payment lifecycle status: keep canonical states and default to "created"
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
      index: true,
    },

    // billing period covered by this payment (optional for recurring)
    billingStartDate: { type: Date, default: null },
    billingEndDate: { type: Date, default: null },

    // Full provider payload for audit (optional but recommended)
    raw: { type: Schema.Types.Mixed },
    note: { type: String, default: null },
  },
  { timestamps: true },
);

// Indexes: providerPaymentId unique (sparse) prevents duplicates when present
PaymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

// If you generate invoice numbers, ensure uniqueness (sparse)
PaymentSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

// Common lookups
PaymentSchema.index({ subscriptionId: 1 });
PaymentSchema.index({ userId: 1 });

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

export default Payment;
