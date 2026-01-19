import Otp from "../../models/Otp.js";
import crypto from "crypto";
import { generateOTP ,hashOTP} from "../../utils/otp.js";
import { sendOtpWhatsApp,sendCustomWhatsAppMessage } from "../../services/whatsappService.js"

export const sendWhatsappOtp = async (req, res) => {
  const { phone } = req.body;

  const otp = generateOTP();

  await Otp.deleteMany({ phone });

  await Otp.create({
    phone,
    otpHash: hashOTP(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  await sendOtpWhatsApp(phone, otp);

  res.json({
    success: true,
    message: "OTP sent via WhatsApp"
  });
};


export const verifyWhatsappOtp = async (req, res) => {
  const { phone, otp } = req.body;

  const record = await Otp.findOne({ phone });
  if (!record) {
    return res.status(400).json({ message: "OTP not found" });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  const otpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  if (otpHash !== record.otpHash) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  await Otp.deleteMany({ phone });

  res.json({
    success: true,
    message: "Login successful"
  });
};


export const sendCustomMessage = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "phone and message are required" });
    }

    const result = await sendCustomWhatsAppMessage(phone, message);

    if (result.success) {
      // Log sent message
      console.log("📤 WhatsApp message sent:", {
        to: phone,
        messageId: result.messageId,
      });

      // 🔴 HARD-CODED CALLBACK SIMULATION
      const simulatedCallback = {
        from: phone,
        text: "Ok",
        timestamp: new Date().toISOString(),
        messageId: result.messageId,
      };

      console.log("📩 Simulated WhatsApp callback received:");
      console.log(simulatedCallback);

      if (simulatedCallback.text === "OK") {
        console.log("✅ User confirmed with OK:", simulatedCallback.from);
      }

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
