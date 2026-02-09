import express from "express";
import User from "../../models/usersModel.js"
import FarmAdvisory from "../../models/farmadvisory.model.js"
import WhatsAppMessage from "../../models/whatsappmessage.model.js"
import { sendWhatsAppReply } from "../services/whatsappService.js";

const router = express.Router();

/* ================= WEBHOOK VERIFICATION ================= */

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* ================= RECEIVE FARMER MESSAGE ================= */

router.post("/", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const phone = message.from;
    const text = message.text?.body || "";

    // 1️⃣ Find farmer
    const farmer = await User.findOne({
      phone: `+${phone}`,
    });

    if (!farmer) return res.sendStatus(200);

    // 2️⃣ Find latest advisory for this farmer
    const advisory = await FarmAdvisory.findOne({
      farmerId: farmer._id,
    }).sort({ createdAt: -1 });

    if (!advisory) return res.sendStatus(200);

    // 3️⃣ Save incoming message linked to advisoryId
    await WhatsAppMessage.create({
      advisoryId: advisory._id,
      farmerId: farmer._id,
      phone,
      direction: "IN",
      text,
      rawPayload: message,
    });

    // 4️⃣ Mark advisory as responded
    advisory.status = "RESPONDED";
    await advisory.save();

    // 5️⃣ Auto reply (backend reply)
    await sendWhatsAppReply(
      phone,
      "🙏 We received your question. Our agronomist will reply shortly."
    );

    // 6️⃣ Save auto reply
    await WhatsAppMessage.create({
      advisoryId: advisory._id,
      farmerId: farmer._id,
      phone,
      direction: "OUT",
      text: "We received your question. Our agronomist will reply shortly.",
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
});

export default router;
