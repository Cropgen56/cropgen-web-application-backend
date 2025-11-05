import crypto from "crypto";
import UserSubscription from "../../models/UserSubscriptionModel.js";
import Payment from "../../models/PaymentModel.js";

export const verifyCheckout = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (sign !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const sub = await UserSubscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    sub.status = "active";
    sub.active = true;
    await sub.save();

    await Payment.updateOne(
      { provider: "razorpay", providerPaymentId: razorpay_payment_id },
      {
        $setOnInsert: {
          userId: sub.userId,
          subscriptionId: sub._id,
          fieldId: sub.fieldId,
          providerPaymentId: razorpay_payment_id,
          amountMinor: sub.amountMinor,
          currency: sub.currency,
          status: "captured",
          raw: { verifiedBy: "verifyCheckout" },
        },
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (e) {
    console.error("verifyCheckout error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
