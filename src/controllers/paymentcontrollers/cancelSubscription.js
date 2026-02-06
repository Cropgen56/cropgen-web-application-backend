import UserSubscription from "../../models/subscription.model.js";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const cancelSubscription = async (req, res) => {
  let localSub = null;
  try {
    const { id } = req.params;

    localSub = await UserSubscription.findById(id);
    if (!localSub)
      return res.status(404).json({ success: false, message: "Not found" });

    if (localSub.razorpaySubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(localSub.razorpaySubscriptionId, {
          cancel_at_cycle_end: 0,
        });
      } catch (rpErr) {
        console.warn("Razorpay cancel failed:", rpErr);
      }
    }

    localSub.status = "cancelled";
    localSub.active = false;
    localSub.endDate = new Date();
    localSub.notes = {
      ...localSub.notes,
      cancelledBy: "admin",
      cancelledAt: new Date(),
    };
    await localSub.save();

    res.json({
      success: true,
      message: "Cancelled by admin",
      data: localSub,
    });
  } catch (e) {
    console.error("cancelSubscriptionAdmin error:", e);
    if (localSub) {
      localSub.status = "active";
      await localSub.save().catch(() => {});
    }
    res.status(500).json({ success: false, message: "Failed to cancel" });
  }
};
