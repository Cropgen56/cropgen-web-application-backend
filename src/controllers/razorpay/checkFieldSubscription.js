import UserSubscription from "../../models/userSubscriptionModel.js";

export const checkFieldSubscription = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user.id;

    if (!fieldId) {
      return res
        .status(400)
        .json({ success: false, message: "fieldId required" });
    }

    const activeSub = await UserSubscription.findOne({
      fieldId,
      userId,
      active: true,
      status: "active",
    }).populate("planId", "name slug");

    if (!activeSub) {
      return res.json({
        success: true,
        hasActiveSubscription: false,
        message: "No active subscription",
      });
    }

    const daysLeft = activeSub.endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(activeSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

    res.json({
      success: true,
      hasActiveSubscription: true,
      subscription: {
        id: activeSub._id,
        planName: activeSub.planId?.name || "Unknown",
        planSlug: activeSub.planId?.slug,
        hectares: activeSub.hectares,
        currency: activeSub.currency,
        billingCycle: activeSub.billingCycle,
        nextBillingAt: activeSub.nextBillingAt,
        endDate: activeSub.endDate,
        daysLeft,
        isTrial: activeSub.notes?.isTrial || false,
      },
    });
  } catch (e) {
    console.error("checkFieldSubscription error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
