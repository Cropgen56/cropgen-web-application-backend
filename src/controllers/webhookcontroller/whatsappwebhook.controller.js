export const verifyWhatsappWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
};

export const receiveWhatsappWebhook = async (req, res) => {
  // Only log delivery / replies
  const message =
    req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message) {
    console.log("WhatsApp message received:", message);
  }

  res.sendStatus(200);
};
