import mongoose from "mongoose";

const whatsappMessageSchema = new mongoose.Schema(
  {
    advisoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmAdvisory",
      required: false,
    },

    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    messageType: {
      type: String,
      enum: ["text"],
      default: "text",
    },

    text: {
      type: String,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    rawPayload: {
      type: Object, 
    },
  },
  { timestamps: true }
);

export default mongoose.model("WhatsAppMessage", whatsappMessageSchema);

