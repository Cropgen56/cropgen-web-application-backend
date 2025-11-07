import UserSubscription from "../../models/userSubscriptionModel.js";
import Payment from "../../models/PaymentModel.js";

export const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";
    const currency = req.query.currency || "";

    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (currency) filter.currency = currency;

    const subscriptions = await UserSubscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("planId", "name slug")
      .populate("fieldId", "name location")
      .populate("userId", "name email phone")
      .lean();

    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const latestPayment = await Payment.findOne({
          subscriptionId: sub._id,
          status: "captured",
        })
          .sort({ createdAt: -1 })
          .lean();

        const totalRevenue = await Payment.aggregate([
          { $match: { subscriptionId: sub._id, status: "captured" } },
          { $group: { _id: null, total: { $sum: "$amountMinor" } } },
        ]);

        const daysLeft = sub.nextBillingAt
          ? Math.max(
              0,
              Math.ceil((new Date(sub.nextBillingAt) - new Date()) / 86400000)
            )
          : null;

        return {
          ...sub,
          user: sub.userId,
          plan: sub.planId,
          field: sub.fieldId,
          latestInvoice: latestPayment?.invoiceNumber || "-",
          paymentMethod: latestPayment
            ? latestPayment.method === "card"
              ? `Card •••• ${latestPayment.cardLast4 || "0000"}`
              : latestPayment.method === "upi"
              ? `UPI ${latestPayment.upiId || ""}`
              : latestPayment.method || "Unknown"
            : "Pending",
          totalPaid: totalRevenue[0]?.total || 0,
          revenueFormatted: `${sub.currency} ${
            (totalRevenue[0]?.total || 0) / 100
          }`,
          daysLeft,
          isExpiringSoon: daysLeft !== null && daysLeft <= 7,
        };
      })
    );

    const total = await UserSubscription.countDocuments(filter);

    res.json({
      success: true,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: enriched,
    });
  } catch (e) {
    console.error("getAllSubscriptionsAdmin error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
