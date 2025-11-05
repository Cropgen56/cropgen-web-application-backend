import crypto from "crypto";
import Razorpay from "razorpay";
import UserSubscription from "../../models/UserSubscriptionModel.js";
import Payment from "../../models/PaymentModel.js";
import { sendBasicEmail } from "../../config/sesClient.js";
import { htmlSubscriptionSuccess } from "../../utils/emailTemplate.js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const verifyCheckout = async (req, res) => {
  let sub = null;
  let payment = null;

  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = req.body;

    // 1. Validate required fields
    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing webhook fields" });
    }

    // 2. Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    // 3. Find subscription
    sub = await UserSubscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    })
      .populate("userId", "name email")
      .populate("planId", "name");

    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    // 4. Prevent double activation
    if (sub.active) {
      return res.json({ success: true, message: "Already activated" });
    }

    // 5. Activate subscription
    sub.status = "active";
    sub.active = true;
    sub.startDate = sub.startDate || new Date();
    await sub.save();

    // 6. Fetch full payment details from Razorpay
    let rpPayment;
    try {
      rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (err) {
      console.error("Razorpay fetch payment failed:", err);
      rpPayment = { method: "unknown" };
    }

    // 7. Extract payment method
    let method = null;
    let cardLast4 = null;
    let upiId = null;

    if (rpPayment.method === "card") {
      method = "card";
      cardLast4 = rpPayment.card?.last4_digits || null;
    } else if (rpPayment.method === "upi") {
      method = "upi";
      upiId = rpPayment.vpa || null;
    } else {
      method = rpPayment.method || "online";
    }

    // 8. Generate Invoice Number
    const generateInvoiceNumber = () => {
      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      return `CG/${year}/INV-${random}`;
    };

    // 9. Save rich payment data
    await Payment.updateOne(
      { providerPaymentId: razorpay_payment_id },
      {
        $set: {
          userId: sub.userId._id,
          subscriptionId: sub._id,
          fieldId: sub.fieldId,
          amountMinor: sub.amountMinor,
          currency: sub.currency,
          status: "captured",
          method,
          cardLast4,
          upiId,
          invoiceNumber: generateInvoiceNumber(),
          invoiceDate: new Date(),
          billingStartDate: sub.startDate,
          billingEndDate:
            sub.nextBillingAt ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          raw: { ...rpPayment, verifiedBy: "verifyCheckout" },
        },
      },
      { upsert: true }
    );

    // 10. Fetch populated payment for email
    payment = await Payment.findOne({
      providerPaymentId: razorpay_payment_id,
    }).populate({
      path: "subscriptionId",
      populate: [
        { path: "planId", select: "name" },
        { path: "userId", select: "name email" },
      ],
    });

    if (!payment) {
      throw new Error("Payment record not created");
    }

    // 11. Build payment method string
    const paymentMethod =
      payment.method === "upi"
        ? `UPI ${payment.upiId || ""}`
        : payment.method === "card"
        ? `Card ****${payment.cardLast4 || "0000"}`
        : payment.method?.charAt(0).toUpperCase() + payment.method?.slice(1) ||
          "Online";

    // 12. Send Custom Email
    try {
      const user = payment.subscriptionId.userId;
      const plan = payment.subscriptionId.planId;

      await sendBasicEmail({
        to: user.email,
        subject: `CropGen Invoice: ${plan.name} Activated`,
        html: htmlSubscriptionSuccess(
          user.name || "Farmer",
          plan.name,
          payment.subscriptionId.hectares,
          (payment.amountMinor / 100).toFixed(2),
          payment.currency,
          payment.billingStartDate,
          payment.billingEndDate,
          payment.subscriptionId.nextBillingAt,
          paymentMethod,
          payment.invoiceNumber
        ),
        text: `
Hi ${user.name || "Farmer"},

Your ${plan.name} subscription for ${
          payment.subscriptionId.hectares
        } ha is now active!

Amount: ₹${(payment.amountMinor / 100).toFixed(2)}
Payment: ${paymentMethod}
Invoice: ${payment.invoiceNumber}

Login: https://app.cropgenapp.com/dashboard
        `.trim(),
      });

      console.log("Subscription email sent to:", user.email);
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr);
      // Don't fail webhook due to email
    }

    // 13. Success
    res.json({ success: true });
  } catch (e) {
    console.error("verifyCheckout error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
