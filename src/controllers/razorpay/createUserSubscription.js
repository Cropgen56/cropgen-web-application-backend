import Razorpay from "razorpay";
import UserSubscription from "../../models/UserSubscriptionModel.js";
import SubscriptionPlan from "../../models/SubscriptionPlanModel.js";
import { mapStatus } from "./utils/mapStatus.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createUserSubscription = async (req, res) => {
  let localSub = null;
  try {
    const userId = req.user.id;
    const { planId, fieldId, hectares, billingCycle, currency } = req.body;

    // Validation
    if (!planId || !fieldId || hectares == null || !billingCycle || !currency) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }
    if (hectares <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Area must be > 0" });
    }

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan?.active) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not active" });
    }

    const pricing = plan.pricing.find(
      (p) =>
        p.currency === currency &&
        p.billingCycle === billingCycle &&
        p.unit === "hectare"
    );
    if (!pricing) {
      return res
        .status(400)
        .json({ success: false, message: "Pricing not ready" });
    }

    // Trial
    if (plan.isTrial) {
      const sub = await UserSubscription.create({
        userId,
        fieldId,
        planId,
        hectares,
        currency,
        billingCycle,
        amountMinor: 0,
        status: "active",
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.trialDays * 86400000),
        notes: { isTrial: true },
      });
      return res.status(201).json({
        success: true,
        data: { subscriptionRecordId: sub._id, isTrial: true },
      });
    }

    // Paid: Calculate real amount
    const hectaresFloat = parseFloat(hectares);
    const realAmountMinor = Math.round(pricing.amountMinor * hectaresFloat);

    localSub = await UserSubscription.create({
      userId,
      fieldId,
      planId,
      hectares: hectaresFloat,
      currency,
      billingCycle,
      amountMinor: realAmountMinor,
      status: "pending",
      active: false,
    });

    // ₹1 Base Plan
    const BASE_PLANS = {
      INR: process.env.RAZORPAY_BASE_PLAN_INR,
      USD: process.env.RAZORPAY_BASE_PLAN_USD,
    };
    const basePlanId = BASE_PLANS[currency];
    if (!basePlanId) {
      await UserSubscription.deleteOne({ _id: localSub._id });
      return res.status(400).json({
        success: false,
        message: `Base plan not configured for currency: ${currency}`,
      });
    }

    // Create Razorpay subscription
    let rpSub;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: basePlanId,
        total_count: billingCycle === "yearly" ? 12 : 30,
        quantity: 1,
        customer_notify: 0,
        addons: [
          {
            item: {
              name: `${plan.name} - ${hectaresFloat} ha`,
              amount: realAmountMinor,
              currency,
              description: `Rate: ₹${
                pricing.amountMinor / 100
              }/ha × ${hectaresFloat} ha`,
            },
            quantity: 1,
          },
        ],
        notes: {
          userId: String(userId),
          fieldId: String(fieldId),
          userSubscriptionId: String(localSub._id),
          hectares: String(hectaresFloat),
          realAmountMinor: String(realAmountMinor),
          baseAmountMinor: "100",
          note: "₹1 is base fee, real charge is in addon",
        },
      });
    } catch (err) {
      console.error("Razorpay subscription creation failed:", err);
      await UserSubscription.deleteOne({ _id: localSub._id });
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
      });
    }

    // Update local
    localSub.razorpaySubscriptionId = rpSub.id;
    localSub.razorpayCustomerId = rpSub.customer_id || null;
    localSub.status = mapStatus(rpSub.status);
    if (rpSub.charge_at) {
      localSub.nextBillingAt = new Date(rpSub.charge_at * 1000);
    }
    await localSub.save();

    res.status(201).json({
      success: true,
      data: {
        subscriptionRecordId: localSub._id,
        razorpaySubscriptionId: rpSub.id,
        amountMinor: realAmountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (e) {
    if (localSub?._id) {
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
    }
    console.error("createUserSubscription error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
