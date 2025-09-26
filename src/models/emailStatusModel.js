import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    recipient: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
    },
    messageId: { type: String },
    error: { type: Object },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.EmailStatus ||
  mongoose.model("EmailStatus", schema);
