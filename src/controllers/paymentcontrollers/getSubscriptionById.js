import UserSubscription from "../../models/subscription.model.js";
import Payment from "../../models/payment.model.js";

export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const sub = await UserSubscription.findById(id)
      .populate("userId", "name email phone")
      .populate("planId", "name slug features")
      .populate("fieldId", "name location cropType")
      .lean();

    if (!sub)
      return res.status(404).json({ success: false, message: "Not found" });

    const payments = await Payment.find({ subscriptionId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...sub,
        user: sub.userId,
        plan: sub.planId,
        field: sub.fieldId,
        payments,
        totalRevenue: payments
          .filter((p) => p.status === "captured")
          .reduce((sum, p) => sum + p.amountMinor, 0),
      },
    });
  } catch (e) {
    console.error("getSubscriptionByIdAdmin error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
