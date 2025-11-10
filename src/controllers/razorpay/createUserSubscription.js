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
const ACRES_TO_HECTARES = 0.40468564224; // 1 acre = ~0.40468564224 hectare
const currencyDecimals = { INR: 2, USD: 2 }; // extend if you support more currencies

// Minimums in minor units (e.g., paise, cents)
const MIN_AMOUNT_MINOR = {
  INR: 100, // ₹1.00
  USD: 100, // $1.00
};

// Base plan env mapping (ensure these are set in prod)
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
          "Missing fields: planId, fieldId, (hectares or polygon), billingCycle, currency are required",
      });
    }

    // Compute area in hectares. Prefer server-side polygon computation for trust.
    let hectaresFloat;
    if (polygon) {
      try {
        const areaSqMeters = turf.area(polygon); // m^2
        hectaresFloat = areaSqMeters / 10000; // to hectares
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid polygon GeoJSON" });
      }
    } else {
      hectaresFloat = parseFloat(hectares);
    }

    if (!Number.isFinite(hectaresFloat) || hectaresFloat <= 0) {
      return res
        .status(400)
        .json({
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

    // TRIAL handling
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
            computedAt: new Date(),
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: { subscriptionRecordId: sub._id, isTrial: true },
      });
    }

    // Pricing lookup (currency + billingCycle). We'll allow pricing.unit to be hectare or acre, converting to per-hectare.
    let pricing = plan.pricing.find(
      (p) => p.currency === currency && p.billingCycle === billingCycle
    );
    if (!pricing) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Pricing not configured for selected currency/billing cycle",
        });
    }

    const pricingUnit = pricing.unit || "hectare";
    // Convert pricing (price per pricingUnit) -> price per hectare (in minor units)
    let pricePerHectareMinor;
    if (pricingUnit === "hectare") {
      pricePerHectareMinor = pricing.amountMinor;
    } else if (pricingUnit === "acre") {
      const acresPerHectare = 1 / ACRES_TO_HECTARES; // ~2.47105
      pricePerHectareMinor = Math.round(pricing.amountMinor * acresPerHectare);
    } else {
      pricePerHectareMinor = pricing.amountMinor; // fallback
    }

    // Compute total in minor units
    const rawTotalMinor = pricePerHectareMinor * hectaresFloat;
    const realAmountMinor = Math.round(rawTotalMinor);

    // Debug log to help investigate production vs local differences.
    console.log("createUserSubscription debug:", {
      env: process.env.NODE_ENV || "unknown",
      planId,
      fieldId,
      currency,
      billingCycle,
      pricingUnit,
      pricingAmountMinor: pricing.amountMinor,
      pricePerHectareMinor,
      hectares: hectaresFloat,
      rawTotalMinor,
      realAmountMinor,
      basePlanIdEnv: BASE_PLANS[currency] || null,
    });

    // Enforce minimum allowed by Razorpay for the currency
    const minForCurrency = MIN_AMOUNT_MINOR[currency] ?? 100;
    if (realAmountMinor < minForCurrency) {
      return res.status(400).json({
        success: false,
        message: `Computed amount ${(
          realAmountMinor / Math.pow(10, currencyDecimals[currency] || 2)
        ).toFixed(2)} ${currency} is below the allowed minimum of ${(
          minForCurrency / Math.pow(10, currencyDecimals[currency] || 2)
        ).toFixed(2)} ${currency}. Increase area or plan price.`,
        debug: { realAmountMinor, minForCurrency },
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

    // Create local "pending" subscription record (snapshot pricing)
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

    // Ensure basePlanId for the chosen currency exists in env
    const basePlanId = BASE_PLANS[currency];
    if (!basePlanId) {
      // rollback localSub
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
      return res.status(500).json({
        success: false,
        message: `Server misconfiguration: base plan ID for currency ${currency} is not set in environment variables.`,
        hint: `Set RAZORPAY_BASE_PLAN_${currency} to the correct plan id for this environment.`,
      });
    }

    // Create Razorpay subscription
    let rpSub;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: basePlanId,
        total_count: 999,
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
      console.error(
        "Razorpay create subscription error:",
        JSON.stringify(err, null, 2)
      );
      // rollback local sub
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
        razorpayError: err.error?.description || err.message || err,
      });
    }

    // Save Razorpay metadata
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
    if (localSub?._id) {
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
    }
    console.error("createUserSubscription server error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
