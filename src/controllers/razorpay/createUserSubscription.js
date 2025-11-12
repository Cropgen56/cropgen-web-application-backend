import Razorpay from "razorpay";
import SubscriptionPlan from "../../models/SubscriptionPlanModel.js";
import { mapStatus } from "./utils/mapStatus.js";
import UserSubscription from "../../models/userSubscriptionModel.js";
import * as turf from "@turf/turf";

import User from "../../models/usersModel.js";
import { sendBasicEmail } from "../../config/sesClient.js";
import { htmlSubscriptionSuccess } from "../../utils/emailTemplate.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// constants
const ACRES_TO_HECTARES = 0.40468564224;
const MIN_AMOUNT_MINOR = { INR: 100, USD: 100 };

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
  let createdPlan = null;
  try {
    const userId = req.user.id;
    const {
      planId,
      fieldId,
      hectares,
      polygon,
      billingCycle,
      currency,
      clientRequestId,
    } = req.body;

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

    // Compute area (server-side authoritative)
    let hectaresFloat;
    if (polygon) {
      try {
        const areaSqMeters = turf.area(polygon); // m^2
        hectaresFloat = areaSqMeters / 10000; // hectares
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

    // Fetch template plan
    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || !plan.active) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found or inactive" });
    }

    // Trial handling
    if (plan.isTrial) {
      const sub = await UserSubscription.create({
        userId,
        fieldId,
        planId,
        hectares: Number(hectaresFloat.toFixed(6)),
        currency,
        billingCycle,
        amountMinor: 0,
        totalAmountMinor: 0,
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

    // Pricing lookup (currency + billingCycle)
    const pricing = plan.pricing.find(
      (p) => p.currency === currency && p.billingCycle === billingCycle
    );
    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: "Pricing not configured for selected currency/billing cycle",
      });
    }

    // Convert pricing.unit -> price per hectare (minor units)
    const pricingUnit = pricing.unit || "hectare";
    let pricePerHectareMinor;
    if (pricingUnit === "hectare") {
      pricePerHectareMinor = pricing.amountMinor;
    } else if (pricingUnit === "acre") {
      const acresPerHectare = 1 / ACRES_TO_HECTARES;
      pricePerHectareMinor = Math.round(pricing.amountMinor * acresPerHectare);
    } else {
      pricePerHectareMinor = pricing.amountMinor;
    }

    // Compute total amount (minor units) for this subscription (price * hectares)
    const rawTotalMinor = pricePerHectareMinor * hectaresFloat;
    const originalAmountMinor = Math.round(rawTotalMinor);

    // Apply gateway minimum (auto-round-up to minimum if below)
    const minForCurrency = MIN_AMOUNT_MINOR[currency] ?? 100;
    let finalAmountMinor = originalAmountMinor;
    let appliedMinimum = false;

    if (originalAmountMinor < minForCurrency) {
      appliedMinimum = true;
      finalAmountMinor = minForCurrency;
      console.warn(
        `Computed amount ${originalAmountMinor} < min ${minForCurrency} for ${currency}. Applying minimum (${finalAmountMinor}).`
      );
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

    // Idempotency: optional client-provided key
    if (clientRequestId) {
      const dup = await UserSubscription.findOne({
        "notes.clientRequestId": clientRequestId,
      });
      if (dup) {
        return res.status(200).json({
          success: true,
          message: "Subscription already processed for this request id",
          data: { subscriptionRecordId: dup._id, status: dup.status },
        });
      }
    }

    // Create local pending subscription record (store pricing snapshot, include original + final amounts)
    localSub = await UserSubscription.create({
      userId,
      fieldId,
      planId,
      hectares: Number(hectaresFloat.toFixed(6)),
      currency,
      billingCycle,
      amountMinor: finalAmountMinor,
      totalAmountMinor: finalAmountMinor,
      status: "pending",
      active: false,
      notes: {
        clientRequestId: clientRequestId || null,
        pricingSnapshot: {
          planId: plan._id,
          planName: plan.name,
          billingCycle,
          currency,
          pricingUnit,
          pricePerUnitMinor: pricing.amountMinor,
          pricePerHectareMinor,
          hectares: Number(hectaresFloat.toFixed(6)),
          originalAmountMinor,
          finalAmountMinor,
          appliedMinimum,
          computedAt: new Date(),
        },
        polygonProvided: !!polygon,
      },
    });

    // Create a new Razorpay Plan for this exact final amount
    const planPayload = {
      period: billingCycle === "yearly" ? "yearly" : "monthly",
      interval: 1,
      item: {
        name: `${plan.name} - ${hectaresFloat.toFixed(4)} ha - user:${userId}`,
        amount: finalAmountMinor,
        currency,
        description: `${plan.name} for ${hectaresFloat.toFixed(
          4
        )} ha (${billingCycle})`,
      },
      notes: {
        userId: String(userId),
        fieldId: String(fieldId),
        userSubscriptionId: String(localSub._id),
        clientRequestId: clientRequestId || null,
        appliedMinimum,
        originalAmountMinor,
      },
    };

    try {
      createdPlan = await razorpay.plans.create(planPayload);
    } catch (err) {
      console.error("Razorpay create plan error:", err);
      // rollback local record
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create plan in Razorpay",
        razorpayError: err?.error?.description || err.message || err,
      });
    }

    // Create the subscription based on the created plan
    let rpSub;
    try {
      const subPayload = {
        plan_id: createdPlan.id,
        quantity: 1,
        total_count: 100,
        customer_notify: 0,
        notes: {
          userId: String(userId),
          fieldId: String(fieldId),
          userSubscriptionId: String(localSub._id),
        },
      };

      rpSub = await razorpay.subscriptions.create(subPayload);
    } catch (err) {
      console.error(
        "Razorpay create subscription error:",
        JSON.stringify(err, null, 2)
      );
      // mark local sub failed but keep plan for audit
      await UserSubscription.findByIdAndUpdate(localSub._id, {
        status: "failed",
        "notes.planId": createdPlan.id,
        "notes.gatewayError": String(err?.message || err),
      }).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
        razorpayError: err?.error?.description || err.message || err,
      });
    }

    // Update localSub with razorpay metadata and activate
    localSub.razorpayPlanId = createdPlan.id;
    localSub.razorpaySubscriptionId = rpSub.id;
    localSub.razorpayCustomerId = rpSub.customer_id || null;
    localSub.status = mapStatus(rpSub.status) || "pending";
    if (rpSub.charge_at)
      localSub.nextBillingAt = new Date(rpSub.charge_at * 1000);
    if (rpSub.current_end)
      localSub.endDate = new Date(rpSub.current_end * 1000);

    localSub.amountMinor = finalAmountMinor;
    localSub.totalAmountMinor = finalAmountMinor;
    localSub.active = true;
    localSub.notes = localSub.notes || {};
    localSub.notes.pricingSnapshot = {
      ...(localSub.notes.pricingSnapshot || {}),
      razorpayPlanId: createdPlan.id,
      razorpaySubscriptionId: rpSub.id,
      pricingComputedAt: new Date(),
    };

    await localSub.save();

    // --- send custom email to subscriber (instead of Razorpay email) ---
    (async () => {
      try {
        const user = await User.findById(userId).lean();
        if (user?.email) {
          const planName = plan.name || "Subscription";
          const amountDisplay = (finalAmountMinor / 100).toFixed(2);
          const billingStart = localSub.startDate || new Date();
          const billingEnd = localSub.nextBillingAt || localSub.endDate || null;
          const nextBilling = localSub.nextBillingAt || null;

          await sendBasicEmail({
            to: user.email,
            subject: `Your ${planName} subscription is active`,
            html: htmlSubscriptionSuccess(
              user.name || "Farmer",
              planName,
              localSub.hectares,
              amountDisplay,
              localSub.currency,
              billingStart,
              billingEnd,
              nextBilling,
              "Card/UPI/Online",
              `CG/${new Date().getFullYear()}/INV-${Math.floor(
                10000 + Math.random() * 90000
              )}`
            ),
            text: `Hi ${
              user.name || "Farmer"
            },\n\nYour ${planName} subscription for ${
              localSub.hectares
            } ha is now active.\nAmount: ${(finalAmountMinor / 100).toFixed(
              2
            )} ${localSub.currency}\n\nThanks,\nCropGen Team`,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send custom subscription email:", emailErr);
        // do not fail the request due to email issues
      }
    })();

    return res.status(201).json({
      success: true,
      data: {
        subscriptionRecordId: localSub._id,
        razorpayPlanId: createdPlan.id,
        razorpaySubscriptionId: rpSub.id,
        amountMinor: finalAmountMinor,
        originalAmountMinor,
        appliedMinimum,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (e) {
    if (localSub?._id) {
      await UserSubscription.deleteOne({ _id: localSub._id }).catch(() => {});
    }
    console.error("createUserSubscription server error:", e);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: e?.message || e,
    });
  }
};
