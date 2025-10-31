// controllers/razorpayController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import userSubscription from "../models/userSubscriptionModel.js";
import Payment from "../models/paymentModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Map Razorpay → internal status
const mapStatus = (s) =>
  ({
    created: "pending",
    activated: "active",
    processed: "active",
    completed: "completed",
    cancelled: "cancelled",
  }[s] || s);

/**
 * CREATE SUBSCRIPTION (or trial)
 */
// controllers/razorpayController.js

export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, fieldId, hectares, billingCycle, currency } = req.body;

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
        .json({ success: false, message: "Plan not found" });
    }

    const pricing = (plan.pricing || []).find(
      (p) =>
        p.currency === currency &&
        p.billingCycle === billingCycle &&
        p.unit === "hectare"
    );
    if (!pricing) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid pricing" });
    }

    // === TRIAL ===
    if (plan.isTrial) {
      const sub = await userSubscription.create({
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

    // === PAID: Calculate total minor amount ===
    const totalAmountMinor = Math.round(pricing.amountMinor * hectares); // e.g., 2900 * 0.5 = 1450

    const userSub = await userSubscription.create({
      userId,
      fieldId,
      planId,
      hectares,
      currency,
      billingCycle,
      amountMinor: totalAmountMinor,
      status: "pending",
      active: false,
      notes: { dynamicPlan: true },
    });

    // === CREATE DYNAMIC PLAN IN RAZORPAY ===
    const period = billingCycle === "yearly" ? "yearly" : "monthly";
    const interval = billingCycle === "yearly" ? 12 : 1;

    const planItem = {
      name: `${plan.name} - ${hectares.toFixed(2)} ha`,
      amount: totalAmountMinor, // total in paise/cents
      currency: currency,
    };

    let razorpayPlan;
    try {
      razorpayPlan = await razorpay.plans.create({
        period,
        interval,
        item: planItem,
        notes: {
          subscriptionPlanId: planId,
          hectares: hectares.toString(),
          unit: "hectare",
        },
      });
    } catch (err) {
      console.error("Failed to create Razorpay plan:", err);
      await userSubscription.deleteOne({ _id: userSub._id });
      return res
        .status(500)
        .json({ success: false, message: "Failed to create plan" });
    }

    // === CREATE SUBSCRIPTION WITH quantity = 1 ===
    const totalCount = 1100;

    const subPayload = {
      plan_id: razorpayPlan.id,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: String(userId),
        fieldId: String(fieldId),
        userSubscriptionId: String(userSub._id),
        hectares: hectares.toString(),
      },
    };

    let rSub;
    try {
      rSub = await razorpay.subscriptions.create(subPayload);
    } catch (err) {
      console.error("Failed to create subscription:", err);
      await userSubscription.deleteOne({ _id: userSub._id });
      return res
        .status(500)
        .json({ success: false, message: "Failed to create subscription" });
    }

    // Update DB
    userSub.razorpaySubscriptionId = rSub.id;
    userSub.razorpayPlanId = razorpayPlan.id;
    userSub.razorpayCustomerId = rSub.customer_id || null;
    userSub.status = mapStatus(rSub.status);
    await userSub.save();

    return res.status(201).json({
      success: true,
      data: {
        subscriptionRecordId: userSub._id,
        razorpaySubscriptionId: rSub.id,
        amountMinor: totalAmountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("createSubscription:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * VERIFY CHECKOUT (frontend)
 */
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

    // FIXED: Now crypto is imported
    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (sign !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const sub = await userSubscription.findOne({
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

    return res.json({ success: true });
  } catch (err) {
    console.error("verifyCheckout:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * IDEMPOTENT PAYMENT SAVER
 */
const savePayment = async (data) => {
  if (!data.providerPaymentId) return;

  const { providerPaymentId } = data;
  await Payment.updateOne(
    { provider: "razorpay", providerPaymentId },
    { $setOnInsert: data },
    { upsert: true }
  );
};

/**
 * RAZORPAY WEBHOOK HANDLER
 * Must use: express.raw({ type: 'application/json' })
 */
export const razorpayWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) {
      return res.status(400).send("Invalid");
    }

    // FIXED: Now crypto is imported
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");
    if (expected !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());
    const eventName = event.event;

    // LOG SUB ID SAFELY
    let subId = "N/A";
    if (event.payload.subscription?.entity?.id) {
      subId = event.payload.subscription.entity.id;
    } else if (event.payload.payment?.entity?.subscription_id) {
      subId = event.payload.payment.entity.subscription_id;
    }
    console.log(`[Webhook] ${eventName} | Sub: ${subId}`);

    // 1. SUBSCRIPTION LIFECYCLE
    if (
      [
        "subscription.activated",
        "subscription.charged",
        "subscription.updated",
        "subscription.authenticated",
      ].includes(eventName)
    ) {
      const sub = event.payload.subscription.entity;
      const record = await userSubscription.findOne({
        razorpaySubscriptionId: sub.id,
      });
      if (record) {
        const newStatus = mapStatus(sub.status);
        const needsSave =
          record.status !== newStatus ||
          (sub.charge_at && !record.nextBillingAt);
        if (needsSave) {
          record.status = newStatus;
          if (sub.charge_at) {
            record.nextBillingAt = new Date(sub.charge_at * 1000);
            console.log(`[Webhook] nextBillingAt → ${record.nextBillingAt}`);
          }
          await record.save();
        }
      }
    }

    // 2. INVOICE PAID
    if (
      eventName === "invoice.paid" ||
      eventName === "invoice.payment_succeeded"
    ) {
      const inv = event.payload.invoice.entity;
      const sub = event.payload.subscription?.entity;
      const record = await userSubscription.findOne({
        razorpaySubscriptionId: inv.subscription_id,
      });

      await savePayment({
        userId: record?.userId,
        subscriptionId: record?._id,
        fieldId: record?.fieldId,
        provider: "razorpay",
        providerPaymentId: inv.payment_id,
        providerInvoiceId: inv.id,
        providerOrderId: inv.order_id,
        amountMinor: inv.amount_paid,
        currency: inv.currency,
        status: "captured",
        raw: inv,
        note: "invoice.paid",
      });

      if (record) {
        record.status = "active";
        record.active = true;
        record.razorpayLastInvoiceId = inv.id;
        if (sub?.charge_at) {
          record.nextBillingAt = new Date(sub.charge_at * 1000);
        } else if (inv.end_at) {
          record.nextBillingAt = new Date(inv.end_at * 1000);
        }
        await record.save();
        console.log(
          `[Webhook] invoice.paid → sub ${inv.subscription_id} activated`
        );
      }
    }

    // 3. PAYMENT CAPTURED / FAILED
    if (eventName === "payment.captured" || eventName === "payment.failed") {
      const pay = event.payload.payment.entity;
      let record = null;

      // ALWAYS GET SUBSCRIPTION VIA INVOICE
      if (pay.invoice_id) {
        try {
          const inv = await razorpay.invoices.fetch(pay.invoice_id);
          if (inv.subscription_id) {
            record = await userSubscription.findOne({
              razorpaySubscriptionId: inv.subscription_id,
            });
            console.log(
              `[Webhook] payment.captured → sub ${inv.subscription_id} (via invoice)`
            );
          }
        } catch (e) {
          console.warn("[Webhook] Failed to fetch invoice:", e.message);
        }
      }

      // RARE: fallback if payment has subscription_id directly
      if (!record && pay.subscription_id) {
        record = await userSubscription.findOne({
          razorpaySubscriptionId: pay.subscription_id,
        });
      }

      // SAVE PAYMENT
      await savePayment({
        userId: record?.userId,
        subscriptionId: record?._id,
        fieldId: record?.fieldId,
        provider: "razorpay",
        providerPaymentId: pay.id,
        providerInvoiceId: pay.invoice_id,
        providerOrderId: pay.order_id,
        amountMinor: pay.amount,
        currency: pay.currency,
        status: eventName === "payment.captured" ? "captured" : "failed",
        raw: pay,
        note: eventName,
      });

      if (record && eventName === "payment.captured") {
        record.status = "active";
        record.active = true;
        await record.save();
        console.log(
          `[Webhook] payment.captured → sub ${record.razorpaySubscriptionId} ACTIVE`
        );
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return res.status(500).send("Error");
  }
};
