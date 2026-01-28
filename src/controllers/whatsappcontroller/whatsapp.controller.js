import FarmAdviosryModel from "../../models/farmadvisory.model.js";
import WhatsAppMessage from "../../models/whatsappmessage.model.js"
import { sendCustomWhatsAppMessage } from "../../services/whatsappService.js"
import { formatFarmAdvisoryMessage } from "../../utils/whatsapp.utils.js";
import FarmField from "../../models/fieldModel.js"
import User from "../../models/usersModel.js"


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

    /* ================= 4️⃣ GET FARM DETAILS (✅ FIXED) ================= */

    const farmDetails = await FarmField.findById(advisory.farmFieldId);

    if (!farmDetails) {
      return res.status(404).json({
        success: false,
        error: "Farm field not found",
      });
    }

    /* ================= 5️⃣ FORMAT MESSAGE (WITH FARM DETAILS + CROP AGE) ================= */

    const formattedMessage = formatFarmAdvisoryMessage(
      advisory.activitiesToDo,
      farmDetails // 👈 IMPORTANT
    );

    /* ================= 6️⃣ SEND WHATSAPP ================= */

    const result = await sendCustomWhatsAppMessage(phone, formattedMessage);

    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error,
      });
    }

    /* ================= 7️⃣ SAVE WHATSAPP MESSAGE ================= */

    await WhatsAppMessage.create({
      advisoryId: advisory._id,
      farmFieldId: advisory.farmFieldId,
      farmerId: farmer._id,
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

