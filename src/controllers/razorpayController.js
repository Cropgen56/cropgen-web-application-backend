import Razorpay from "razorpay";
import crypto from "crypto";
import subscriptionModel from "../models/subscriptionModel.js";
import Payment from "../models/paymentModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Map Razorpay status → internal status
const mapRazorpayStatus = (status) => {
  const map = {
    created: "pending",
    activated: "active",
    processed: "active",
    completed: "completed",
    cancelled: "cancelled",
  };
  return map[status] || status;
};

/**
 * Create subscription (or trial)
 * Returns: { razorpaySubscriptionId, subscriptionRecordId }
 */
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, fieldId, hectares, billingCycle, currency } = req.body;

    if (!planId || !fieldId || !hectares || !billingCycle || !currency) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || !plan.active) {
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

    // Handle trial
    if (plan.isTrial) {
      const sub = await subscriptionModel.create({
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

    const amountMinor = pricing.amountMinor * hectares;
    const totalCount = billingCycle === "yearly" ? 100 : 1200;

    const userSub = await subscriptionModel.create({
      userId,
      fieldId,
      planId,
      hectares,
      currency,
      billingCycle,
      amountMinor,
      status: "pending",
      active: false,
      notes: { migratedFromOrder: false },
    });

    const razorpayPlanId = pricing.razorpayPlanId;
    if (!razorpayPlanId) {
      return res
        .status(400)
        .json({ success: false, message: "Razorpay plan not configured" });
    }

    const payload = {
      plan_id: razorpayPlanId,
      quantity: hectares,
      total_count: totalCount,
      customer_notify: 1,
      notes: {
        userId: String(userId),
        fieldId: String(fieldId),
        userSubscriptionId: String(userSub._id),
      },
    };

    const razorpaySub = await razorpay.subscriptions.create(payload);

    userSub.razorpaySubscriptionId = razorpaySub.id;
    userSub.razorpayPlanId = razorpayPlanId;
    userSub.razorpayCustomerId = razorpaySub.customer_id || null;
    userSub.status = mapRazorpayStatus(razorpaySub.status);
    await userSub.save();

    return res.status(201).json({
      success: true,
      data: {
        subscriptionRecordId: userSub._id,
        razorpaySubscriptionId: razorpaySub.id,
        amountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("createSubscription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Verify frontend checkout (non-authoritative)
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

    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (sign !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const sub = await subscriptionModel.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    sub.status = "active";
    sub.active = true;
    await sub.save();

    // Idempotent payment record
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
    console.error("verifyCheckout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Idempotent payment creator
 */
const createPayment = async (data) => {
  if (!data.providerPaymentId) return;
  await Payment.updateOne(
    { provider: "razorpay", providerPaymentId: data.providerPaymentId },
    { $setOnInsert: data },
    { upsert: true }
  );
};

/**
 * Razorpay Webhook Handler
 * Must use raw body parser
 */
export const razorpayWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).send("Invalid");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");
    if (expected !== signature)
      return res.status(400).send("Invalid signature");

    const event = JSON.parse(req.body.toString());
    const { event: eventName } = event;

    // Subscription lifecycle
    if (
      [
        "subscription.activated",
        "subscription.charged",
        "subscription.updated",
        "subscription.authenticated",
      ].includes(eventName)
    ) {
      const sub = event.payload.subscription.entity;
      const record = await subscriptionModel.findOne({
        razorpaySubscriptionId: sub.id,
      });
      if (record) {
        const newStatus = mapRazorpayStatus(sub.status);
        const needsSave =
          record.status !== newStatus ||
          (sub.charge_at && !record.nextBillingAt);
        if (needsSave) {
          record.status = newStatus;
          if (sub.charge_at)
            record.nextBillingAt = new Date(sub.charge_at * 1000);
          await record.save();
        }
      }
    }

    // Invoice paid
    if (
      eventName === "invoice.paid" ||
      eventName === "invoice.payment_succeeded"
    ) {
      const inv = event.payload.invoice.entity;
      const sub = event.payload.subscription?.entity;
      const record = await subscriptionModel.findOne({
        razorpaySubscriptionId: inv.subscription_id,
      });

      await createPayment({
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
      });

      if (record) {
        record.status = "active";
        record.active = true;
        record.razorpayLastInvoiceId = inv.id;
        if (sub?.charge_at)
          record.nextBillingAt = new Date(sub.charge_at * 1000);
        else if (inv.end_at) record.nextBillingAt = new Date(inv.end_at * 1000);
        await record.save();
      }
    }

    // Payment captured/failed
    if (eventName === "payment.captured" || eventName === "payment.failed") {
      const pay = event.payload.payment.entity;
      let record = null;

      if (pay.invoice_id) {
        try {
          const inv = await razorpay.invoices.fetch(pay.invoice_id);
          if (inv.subscription_id) {
            record = await subscriptionModel.findOne({
              razorpaySubscriptionId: inv.subscription_id,
            });
          }
        } catch {}
      }

      if (!record && pay.subscription_id) {
        record = await subscriptionModel.findOne({
          razorpaySubscriptionId: pay.subscription_id,
        });
      }

      await createPayment({
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
      });

      if (record && eventName === "payment.captured") {
        record.status = "active";
        record.active = true;
        await record.save();
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Error");
  }
};
