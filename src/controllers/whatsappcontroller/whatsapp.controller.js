import FarmAdviosryModel from "../../models/farmadvisory.model.js";
import WhatsAppMessage from "../../models/whatsappmessage.model.js"
import { sendCustomWhatsAppMessage } from "../../services/whatsappService.js"
import { formatFarmAdvisoryMessage } from "../../utils/whatsapp.utils.js";
import User from "../../models/usersModel.js"

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

export const sendFarmAdvisoryMessage = async (req, res) => {
  try {
    const { phone, farmAdvisoryId } = req.body;

    if (!phone || !farmAdvisoryId) {
      return res.status(400).json({
        success: false,
        error: "phone and farmAdvisoryId are required",
      });
    }

    /* ================= 1️⃣ NORMALIZE PHONE ================= */

    // phone coming as 919322396236
    const normalizedPhone = `+${phone}`;

    /* ================= 2️⃣ FIND FARMER ================= */

    const farmer = await User.findOne({ phone: normalizedPhone });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: "Farmer not found for this phone number",
      });
    }

    /* ================= 3️⃣ GET FARM ADVISORY ================= */

    const advisory = await FarmAdviosryModel.findById(farmAdvisoryId);

    if (!advisory) {
      return res.status(404).json({
        success: false,
        error: "Farm advisory not found",
      });
    }

    /* ================= 4️⃣ FORMAT MESSAGE ================= */

    const formattedMessage = formatFarmAdvisoryMessage(
      advisory.activitiesToDo
    );

    /* ================= 5️⃣ SEND WHATSAPP ================= */

    const result = await sendCustomWhatsAppMessage(phone, formattedMessage);

    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error,
      });
    }

    /* ================= 6️⃣ SAVE WHATSAPP MESSAGE ================= */

    await WhatsAppMessage.create({
      advisoryId: advisory._id,
      farmFieldId: advisory.farmFieldId,
      farmerId: farmer._id, // ✅ FIXED
      phone,
      direction: "OUT",
      messageType: "text",
      text: formattedMessage,
      rawPayload: result.data,
    });

    /* ================= SUCCESS ================= */

    return res.json({
      success: true,
      message: "Farm advisory sent successfully",
      advisoryId: advisory._id,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("sendFarmAdvisoryMessage error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
