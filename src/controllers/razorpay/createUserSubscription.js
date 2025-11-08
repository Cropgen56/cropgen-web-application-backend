import Razorpay from "razorpay";
import SubscriptionPlan from "../../models/SubscriptionPlanModel.js";
import { mapStatus } from "./utils/mapStatus.js";
import UserSubscription from "../../models/userSubscriptionModel.js";

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

    // === TRIAL PLAN ===
    if (plan.isTrial) {
      const sub = await UserSubscription.create({
        userId,
        fieldId,
        planId,
        hectares: parseFloat(hectares),
        currency,
        billingCycle,
        amountMinor: 0,
        status: "active",
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000),
        notes: { isTrial: true },
      });

      return res.status(201).json({
        success: true,
        data: { subscriptionRecordId: sub._id, isTrial: true },
      });
    }

    // === PAID PLAN PRICING ===
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

    // Existing checks
    const existingActive = await UserSubscription.findOne({
      fieldId,
      userId,
      active: true,
      status: { $in: ["active", "authenticated"] },
    });
    if (existingActive) {
      const activePlan = await SubscriptionPlan.findById(
        existingActive.planId
      ).lean();
      return res.status(400).json({
        success: false,
        message: "This field already has an active subscription!",
        existingSubscription: {
          planName: activePlan?.name || "Unknown Plan",
          endDate: existingActive.endDate,
          nextBillingAt: existingActive.nextBillingAt,
          subscriptionId: existingActive._id,
        },
      });
    }

    const pendingSub = await UserSubscription.findOne({
      fieldId,
      userId,
      status: "pending",
      razorpaySubscriptionId: { $ne: null },
    });
    if (pendingSub) {
      return res.status(400).json({
        success: false,
        message: "A subscription is already being processed.",
        pendingSubscription: {
          subscriptionRecordId: pendingSub._id,
          razorpaySubscriptionId: pendingSub.razorpaySubscriptionId,
        },
      });
    }

    // Amount
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

    // Base plans
    const BASE_PLANS = {
      INR: process.env.RAZORPAY_BASE_PLAN_INR,
      USD: process.env.RAZORPAY_BASE_PLAN_USD,
    };
    const basePlanId = BASE_PLANS[currency];
    if (!basePlanId) {
      await UserSubscription.deleteOne({ _id: localSub._id });
      return res.status(400).json({
        success: false,
        message: `Base plan not configured for ${currency}`,
      });
    }

    // FINAL RAZORPAY CALL - LIVE MODE SAFE
    let rpSub;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: basePlanId,
        total_count: 999, // ← WORKS IN LIVE MODE (infinite)
        quantity: 1,
        customer_notify: 1,
        addons: [
          {
            item: {
              name: `${plan.name} - ${hectaresFloat.toFixed(4)} ha`,
              amount: realAmountMinor,
              currency,
              description: `${billingCycle} recurring`,
            },
          },
        ],
        notes: {
          userId: String(userId),
          fieldId: String(fieldId),
          userSubscriptionId: String(localSub._id),
          hectares: hectaresFloat.toFixed(4),
          realAmountMinor: String(realAmountMinor),
          billingCycle,
        },
      });
    } catch (err) {
      console.error("Razorpay error:", JSON.stringify(err, null, 2));
      await UserSubscription.deleteOne({ _id: localSub._id });
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
        razorpayError: err.error?.description || err.message,
      });
    }

    // Save Razorpay data
    localSub.razorpaySubscriptionId = rpSub.id;
    localSub.razorpayCustomerId = rpSub.customer_id || null;
    localSub.status = mapStatus(rpSub.status);
    if (rpSub.charge_at)
      localSub.nextBillingAt = new Date(rpSub.charge_at * 1000);
    if (rpSub.current_end)
      localSub.endDate = new Date(rpSub.current_end * 1000);
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
    console.error("Server error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
