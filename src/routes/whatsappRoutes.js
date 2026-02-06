import express from "express";

import User from "../models/usersModel.js";
import FarmAdvisory from "../models/farmadvisory.model.js";
import WhatsAppMessage from "../models/whatsappmessage.model.js";

import { sendFarmAdvisoryMessage } from "../controllers/whatsappcontroller/index.js";
import { sendWhatsAppReply } from "../services/whatsappService.js";

import {
  getAllWhatsAppMessages,
  getWhatsAppMessageById,
  deleteWhatsAppMessage,
  updateWhatsAppMessage,
  replyToWhatsAppMessage,
} from "../controllers/whatsappcontroller/index.js";

const router = express.Router();

router.post("/send-farm-advisory", sendFarmAdvisoryMessage);

// Admin routes
router.get("/chats/", getAllWhatsAppMessages);
router.get("/chat/:id", getWhatsAppMessageById);
router.delete("/chat/:id", deleteWhatsAppMessage);
router.patch("/chat/:id", updateWhatsAppMessage);
router.post("/chat/reply", replyToWhatsAppMessage);

/* ================= WEBHOOK VERIFICATION ================= */

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* ================= RECEIVE FARMER MESSAGE ================= */

router.post("/webhook", async (req, res) => {
  try {
    // 🔥 WhatsApp sends array structure
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Log the full payload for debugging
    console.log("📩 Full incoming webhook:", JSON.stringify(req.body, null, 2));
    if (!message) {
      return res.sendStatus(200);
    }

    /* ================= 1️⃣ EXTRACT DATA ================= */

    const phone = message.from; // 919322396236
    const text = message.text?.body || "";
    const timestamp = new Date(Number(message.timestamp) * 1000);

    /* ================= 2️⃣ FIND FARMER ================= */

    const farmer = await User.findOne({
      phone: `+${phone}`,
    });

    if (!farmer) {
      console.warn("⚠️ Farmer not found for phone:", phone);
      return res.sendStatus(200);
    }

    /* ================= 3️⃣ FIND LATEST SENT ADVISORY ================= */

    // Find last OUT message sent to this farmer
    const lastSentMessage = await WhatsAppMessage.findOne({
      farmerId: farmer._id,
      direction: "OUT",
    }).sort({ createdAt: -1 });

    if (!lastSentMessage) {
      console.warn("⚠️ No sent advisory found for farmer:", farmer._id);
      return res.sendStatus(200);
    }

    const advisoryId = lastSentMessage.advisoryId;

    /* ================= 4️⃣ SAVE INCOMING MESSAGE ================= */

    await WhatsAppMessage.create({
      advisoryId,
      farmerId: farmer._id,
      phone,
      direction: "IN",
      messageType: message.type || "text",
      text,
      timestamp,
      rawPayload: message,
    });

    /* ================= 5️⃣ OPTIONAL: UPDATE ADVISORY STATUS ================= */

    await FarmAdvisory.findByIdAndUpdate(advisoryId, {
      $set: { updatedAt: new Date() },
    });

    /* ================= 6️⃣ AUTO REPLY ================= */

    const autoReply =
      "🙏 We received your message. Our agronomist will get back to you shortly.";

    await sendWhatsAppReply(phone, autoReply);

    /* ================= 7️⃣ SAVE AUTO REPLY ================= */

    await WhatsAppMessage.create({
      advisoryId,
      farmerId: farmer._id,
      phone,
      direction: "OUT",
      messageType: "text",
      text: autoReply,
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ WhatsApp webhook error:", error);
    return res.sendStatus(500);
  }
});

export default router;
