import express from "express";

import { sendCustomMessage } from "../controllers/whatsappcontroller/index.js";
import { sendWhatsAppReply } from "../services/whatsappService.js";

const router = express.Router();


router.post("/send-weather-alert",sendCustomMessage)

router.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (value?.messages) {
    const message = value.messages[0];
    const from = message.from;
    const text = message.text?.body || "";

    console.log("User:", from);
    console.log("Message:", text);

    // Simple advisory reply
    const replyMessage =
      "Thank you for contacting CropGen 🌱\n\n" +
      "We have received your request for crop advisory. " +
      "Our system is analyzing your field data and satellite insights. " +
      "You will receive recommendations shortly.";

    await sendWhatsAppReply(from, replyMessage);
  }

  res.sendStatus(200);
});



export default router;