import { sendCustomWhatsAppMessage } from "../../services/whatsappService.js"



export const sendCustomMessage = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "phone and message are required" });
    }

    const result = await sendCustomWhatsAppMessage(phone, message);

    if (result.success) {

      return res.json({
        success: true,
        message: "Custom message sent",
        messageId: result.messageId,
      });
    }

    return res.status(result.status || 500).json({
      success: false,
      error: result.error,
    });
  } catch (err) {
    console.error("❌ sendCustomMessage error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
