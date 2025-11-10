import Razorpay from "razorpay";
import SubscriptionPlan from "../../models/SubscriptionPlanModel.js";
import { mapStatus } from "./utils/mapStatus.js";
import UserSubscription from "../../models/userSubscriptionModel.js";
import * as turf from "@turf/turf";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// constants
const ACRES_TO_HECTARES = 0.40468564224;
const currencyDecimals = { INR: 2, USD: 2 };
const BASE_PLANS = {
  INR: process.env.RAZORPAY_BASE_PLAN_INR,
  USD: process.env.RAZORPAY_BASE_PLAN_USD,
};

function convertArea(value, fromUnit, toUnit) {
  if (!value) return 0;
  if (fromUnit === toUnit) return value;
  if (fromUnit === "acre" && toUnit === "hectare")
    return value * ACRES_TO_HECTARES;
  if (fromUnit === "hectare" && toUnit === "acre")
    return value / ACRES_TO_HECTARES;
  return value;
}

export const createUserSubscription = async (req, res) => {
  let localSub = null;
  try {
    const userId = req.user.id;
    const { planId, fieldId, hectares, polygon, billingCycle, currency } =
      req.body;

    // Basic validation
    if (
      !planId ||
      !fieldId ||
      (!hectares && !polygon) ||
      !billingCycle ||
      !currency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing fields: planId, fieldId, (hectares or polygon), billingCycle, currency required",
      });
    }

    // compute area (hectares) -- polygon preferred for trust, otherwise use provided hectares
    let hectaresFloat;
    if (polygon) {
      try {
        // polygon should be valid GeoJSON (Polygon or MultiPolygon)
        const geo = polygon;
        const areaSqMeters = turf.area(geo); // m^2
        hectaresFloat = areaSqMeters / 10000;
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid polygon GeoJSON" });
      }
    } else {
      hectaresFloat = parseFloat(hectares);
    }

    if (!Number.isFinite(hectaresFloat) || hectaresFloat <= 0) {
      return res.status(400).json({
        success: false,
        message: "Area must be a positive number (> 0)",
      });
    }

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || !plan.active) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found or inactive" });
    }

    // TRIAL PLAN
    if (plan.isTrial) {
      const sub = await UserSubscription.create({
        userId,
        fieldId,
        planId,
        hectares: Number(hectaresFloat.toFixed(6)),
        currency,
        billingCycle,
        amountMinor: 0,
        status: "active",
        active: true,
        startDate: new Date(),
        endDate: new Date(
          Date.now() + (plan.trialDays || 0) * 24 * 60 * 60 * 1000
        ),
        notes: {
          isTrial: true,
          pricingSnapshot: {
            planId: plan._id,
            planName: plan.name,
            billingCycle,
            currency,
            amountMinorPerUnit: 0,
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: { subscriptionRecordId: sub._id, isTrial: true },
      });
    }

    // find pricing for the requested currency & billingCycle (flexible on unit)
    let pricing = plan.pricing.find(
      (p) => p.currency === currency && p.billingCycle === billingCycle
    );

    if (!pricing) {
      return res.status(400).json({
        success: false,
        message:
          "Pricing not configured for selected currency and billing cycle",
      });
    }

    // Convert pricing to price-per-hectare in minor units
    // pricing.amountMinor is stored per pricing.unit (e.g. paise/cents per hectare or per acre)
    const pricingUnit = pricing.unit || "hectare";
    let pricePerHectareMinor;
    if (pricingUnit === "hectare") {
      pricePerHectareMinor = pricing.amountMinor;
    } else if (pricingUnit === "acre") {
      // convert price per acre -> price per hectare
      const acresPerHectare = 1 / ACRES_TO_HECTARES; // ~2.47105
      pricePerHectareMinor = Math.round(pricing.amountMinor * acresPerHectare);
    } else {
      // fallback (treat as per-hectare)
      pricePerHectareMinor = pricing.amountMinor;
    }

    // compute raw total minor units = pricePerHectareMinor * hectaresFloat
    const rawTotalMinor = pricePerHectareMinor * hectaresFloat;
    const realAmountMinor = Math.round(rawTotalMinor); // round to nearest minor unit (integer)

    if (realAmountMinor <= 0) {
      return res.status(400).json({
        success: false,
        message: "Computed charge is zero. Check pricing or area.",
      });
    }

    // Prevent duplicate active subscription for same field and user
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

    // Prevent concurrent pending subscription with razorpay id
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

    // Create local record in "processing/pending" state (so retries don't create duplicates)
    localSub = await UserSubscription.create({
      userId,
      fieldId,
      planId,
      hectares: Number(hectaresFloat.toFixed(6)),
      currency,
      billingCycle,
      amountMinor: realAmountMinor,
      status: "pending",
      active: false,
      notes: {
        pricingSnapshot: {
          planId: plan._id,
          planName: plan.name,
          billingCycle,
          currency,
          pricingUnit,
          pricePerUnitMinor: pricing.amountMinor,
          pricePerHectareMinor,
          hectares: Number(hectaresFloat.toFixed(6)),
          computedAt: new Date(),
        },
        polygonProvided: !!polygon,
      },
    });

    // get basePlanId for currency
    const basePlanId = BASE_PLANS[currency];
    if (!basePlanId) {
      await UserSubscription.deleteOne({ _id: localSub._id });
      return res.status(400).json({
        success: false,
        message: `Base plan not configured for ${currency}`,
      });
    }

    // Create Razorpay subscription
    let rpSub;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: basePlanId,
        total_count: 999, // recurring count
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
      // rollback local record
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
        razorpayError: err.error?.description || err.message,
      });
    }

    // Save Razorpay-related fields and update status based on returned status
    localSub.razorpaySubscriptionId = rpSub.id;
    localSub.razorpayCustomerId = rpSub.customer_id || null;
    localSub.status = mapStatus(rpSub.status) || "pending";
    if (rpSub.charge_at)
      localSub.nextBillingAt = new Date(rpSub.charge_at * 1000);
    if (rpSub.current_end)
      localSub.endDate = new Date(rpSub.current_end * 1000);
    await localSub.save();

    return res.status(201).json({
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
    // ensure rollback on uncaught errors
    if (localSub?._id) {
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
    }
    console.error("Server error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
