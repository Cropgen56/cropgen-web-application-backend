// controllers/subscriptionController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import subscriptionModel from "../models/subscriptionModel.js";
import Payment from "../models/paymentModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import FarmField from "../models/fieldModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper to map Razorpay subscription statuses to your enum
function mapRazorpayStatus(razorpayStatus) {
  const statusMap = {
    created: "pending",
    activated: "active",
    processed: "active",
    completed: "completed",
    cancelled: "cancelled",
  };
  return statusMap[razorpayStatus] || razorpayStatus;
}

/**
 * POST /api/subscriptions/create
 * body: { planId, fieldId, hectares, billingCycle, currency }
 * returns: { razorpaySubscriptionId, subscriptionRecordId } (frontend uses razorpaySubscriptionId in Checkout)
 */
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id; // ensure authentication middleware sets req.user

    const { planId, fieldId, hectares, billingCycle, currency } = req.body;

    // validations (light — you may reuse Joi schema)
    if (!planId || !fieldId || !hectares || !currency || !billingCycle) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || !plan.active) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found or inactive" });
    }

    // find pricing entry (assumes SubscriptionPlan.pricing as before)
    const pricing = (plan.pricing || []).find(
      (p) =>
        p.currency === currency &&
        p.billingCycle === billingCycle &&
        p.unit === "hectare"
    );

    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency/billingCycle for plan",
      });
    }

    // Handle free trial (skip Razorpay creation)
    if (plan.isTrial) {
      const userSubscription = await subscriptionModel.create({
        userId,
        fieldId,
        planId,
        hectares,
        currency,
        billingCycle,
        amountMinor: 0, // Free
        status: "active",
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000),
        notes: { isTrial: true },
      });
      return res.status(201).json({
        success: true,
        message: "Trial subscription activated",
        data: {
          subscriptionRecordId: userSubscription._id,
          isTrial: true,
        },
      });
    }

    const totalAmountMinor = pricing.amountMinor * hectares;

    // Create initial UserSubscription in DB (pending)
    const userSubscription = await subscriptionModel.create({
      userId,
      fieldId,
      planId,
      hectares,
      currency,
      billingCycle,
      amountMinor: totalAmountMinor,
      status: "pending",
      active: false,
      notes: { migratedFromOrder: false },
    });

    // Use specific pricing's razorpayPlanId
    const razorpayPlanId = pricing.razorpayPlanId;
    if (!razorpayPlanId) {
      // fallback: respond with clear error telling admin to create plan
      return res.status(400).json({
        success: false,
        message:
          "Razorpay Plan id not configured for this pricing. Create via admin panel.",
      });
    }

    // Calculate total_count for ~100 years (Razorpay max; acts as "infinite")
    const totalCount = billingCycle === "yearly" ? 100 : 1200; // 100 years yearly or monthly (12*100)

    // Optionally set start_at to now or future epoch (seconds). We'll set start_at = now so user pays immediately via Checkout.
    const payload = {
      plan_id: razorpayPlanId,
      quantity: hectares, // Per-unit scaling (e.g., hectares * per-hectare amount)
      total_count: totalCount, // Number of billing cycles (~100 years for "infinite")
      customer_notify: 1,
      // pass notes so webhook mapping is easy
      notes: {
        userId: String(userId),
        fieldId: String(fieldId),
        userSubscriptionId: String(userSubscription._id),
      },
    };

    const razorpaySubscription = await razorpay.subscriptions.create(payload);

    // Update subscription record with razorpay ids
    userSubscription.razorpaySubscriptionId = razorpaySubscription.id;
    userSubscription.razorpayPlanId = razorpayPlanId;
    userSubscription.razorpayCustomerId =
      razorpaySubscription.customer_id || null;
    userSubscription.status =
      mapRazorpayStatus(razorpaySubscription.status) || "pending";
    // Next billing time may be set by Razorpay invoice; leave nextBillingAt null until webhook provides invoice info
    await userSubscription.save();

    // Return subscription details to frontend: frontend should open Checkout with subscription_id
    return res.status(201).json({
      success: true,
      message:
        "Razorpay subscription created. Use subscription id on frontend checkout.",
      data: {
        subscriptionRecordId: userSubscription._id,
        razorpaySubscriptionId: razorpaySubscription.id,
        amountMinor: totalAmountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("createSubscription error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * Optional: verify checkout success from frontend after user completes subscription checkout.
 * Frontend receives razorpay_payment_id, razorpay_subscription_id, razorpay_signature.
 * You can verify signature and set subscription active here — but also rely on webhook as the ground truth.
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
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    // verify signature: signature is HMAC(razorpay_payment_id + "|" + razorpay_subscription_id)
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    // find user subscription by razorpaySubscriptionId
    const subscription = await subscriptionModel.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription record not found" });
    }

    // mark as active (but still rely on webhook invoice.paid for authoritative invoice/payment info)
    subscription.status = "active";
    subscription.active = true;
    await subscription.save();

    // Optionally create a Payment record linking razorpay_payment_id (if not already created by webhook)
    await Payment.updateOne(
      { provider: "razorpay", providerPaymentId: razorpay_payment_id },
      {
        $setOnInsert: {
          userId: subscription.userId,
          subscriptionId: subscription._id,
          fieldId: subscription.fieldId,
          providerPaymentId: razorpay_payment_id,
          providerInvoiceId: null,
          amountMinor: subscription.amountMinor,
          currency: subscription.currency,
          status: "captured",
          raw: { verifiedBy: "verifyCheckout endpoint" },
        },
      },
      { upsert: true }
    );

    return res.json({
      success: true,
      message:
        "Subscription verified (non-authoritative). Webhook events are source-of-truth.",
    });
  } catch (err) {
    console.error("verifyCheckout error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * Webhook handler for Razorpay events.
 * Must be mounted with raw body middleware (see notes).
 * Handles invoice.paid, invoice.payment_failed, subscription.activated, payment.captured, payment.failed
 */
export const razorpayWebhookHandler = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body; // raw buffer if using bodyParser.raw()

    // verify signature
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    if (expected !== signature) {
      console.warn("Invalid webhook signature");
      return res.status(400).send("invalid signature");
    }

    const event = JSON.parse(body.toString());
    const eventName = event.event;

    // Helper: idempotently create Payment
    async function createPaymentIfNotExist({
      providerPaymentId,
      providerInvoiceId,
      providerOrderId,
      subscriptionRecord,
      amountMinor,
      currency,
      status,
      raw,
      note,
    }) {
      try {
        const existing = await Payment.findOne({
          provider: "razorpay",
          providerPaymentId: providerPaymentId,
        });
        if (existing) {
          return existing;
        }
        const p = await Payment.create({
          userId: subscriptionRecord?.userId,
          subscriptionId: subscriptionRecord?._id,
          fieldId: subscriptionRecord?.fieldId,
          provider: "razorpay",
          providerPaymentId,
          providerInvoiceId,
          providerOrderId,
          amountMinor,
          currency,
          status,
          raw,
          note,
        });
        return p;
      } catch (err) {
        // possible duplicate insert due to race; ignore if duplicate key
        if (err.code === 11000) {
          return Payment.findOne({ provider: "razorpay", providerPaymentId });
        }
        throw err;
      }
    }

    // Handle relevant events
    if (
      eventName === "subscription.activated" ||
      eventName === "subscription.charged" ||
      eventName === "subscription.updated"
    ) {
      const sub = event.payload.subscription.entity;
      const razorpaySubscriptionId = sub.id;

      const subscriptionRecord = await subscriptionModel.findOne({
        razorpaySubscriptionId,
      });
      if (subscriptionRecord) {
        subscriptionRecord.status =
          mapRazorpayStatus(sub.status) || subscriptionRecord.status;
        // update nextBillingAt from sub.current_start or next_retry_at if available (check payload)
        if (sub.charge_at) {
          subscriptionRecord.nextBillingAt = new Date(sub.charge_at * 1000);
        }
        await subscriptionRecord.save();
      }
    }

    if (
      eventName === "invoice.paid" ||
      eventName === "invoice.payment_succeeded"
    ) {
      const invoice = event.payload.invoice.entity;
      const providerInvoiceId = invoice.id; // invoice_...
      const providerSubscriptionId = invoice.subscription_id;
      const providerPaymentId = invoice.payment_id || null;
      const amountMinor = invoice.amount_paid || invoice.amount;
      const currency = invoice.currency || null;

      const subscriptionRecord = await subscriptionModel.findOne({
        razorpaySubscriptionId: providerSubscriptionId,
      });
      // Create Payment record
      await createPaymentIfNotExist({
        providerPaymentId,
        providerInvoiceId,
        providerOrderId: invoice.order_id || null,
        subscriptionRecord,
        amountMinor,
        currency,
        status: "paid",
        raw: invoice,
        note: "invoice.paid webhook",
      });

      // Update subscription record: mark active, set next billing (if billing start/next period provided)
      if (subscriptionRecord) {
        subscriptionRecord.status = "active";
        subscriptionRecord.active = true;
        subscriptionRecord.razorpayLastInvoiceId = providerInvoiceId;
        // set nextBillingAt if invoice contains next retry or next charge date
        if (invoice.next_retry_at) {
          subscriptionRecord.nextBillingAt = new Date(
            invoice.next_retry_at * 1000
          );
        } else if (invoice.end_at) {
          subscriptionRecord.nextBillingAt = new Date(invoice.end_at * 1000);
        }
        await subscriptionRecord.save();
      }
    }

    if (eventName === "invoice.payment_failed") {
      // Fixed: Remove duplicate
      const invoice = event.payload.invoice.entity;
      const providerInvoiceId = invoice.id;
      const providerSubscriptionId = invoice.subscription_id;
      const providerPaymentId = invoice.payment_id || null;
      const subscriptionRecord = await subscriptionModel.findOne({
        razorpaySubscriptionId: providerSubscriptionId,
      });

      // record failed payment
      await createPaymentIfNotExist({
        providerPaymentId,
        providerInvoiceId,
        providerOrderId: invoice.order_id || null,
        subscriptionRecord,
        amountMinor: invoice.amount_due || null,
        currency: invoice.currency || null,
        status: "failed",
        raw: invoice,
        note: "invoice.payment_failed webhook",
      });

      // optionally mark subscription inactive or send notification
      if (subscriptionRecord) {
        subscriptionRecord.status = "pending"; // or "paused" depending on your policy
        subscriptionRecord.active = false;
        await subscriptionRecord.save();
      }
    }

    if (eventName === "subscription.cancelled") {
      // Added: Handle cancellation
      const sub = event.payload.subscription.entity;
      const subscriptionRecord = await subscriptionModel.findOne({
        razorpaySubscriptionId: sub.id,
      });
      if (subscriptionRecord) {
        subscriptionRecord.status = "cancelled";
        subscriptionRecord.active = false;
        subscriptionRecord.endDate = new Date();
        await subscriptionRecord.save();
      }
    }

    if (eventName === "payment.captured" || eventName === "payment.failed") {
      const payment = event.payload.payment.entity;
      const providerPaymentId = payment.id;
      const providerOrderId = payment.order_id || null;
      const providerInvoiceId = payment.invoice_id || null;
      const amountMinor = payment.amount;
      const currency = payment.currency;

      // find subscription by invoice or by notes mapping if possible
      let subscriptionRecord = null;
      if (providerInvoiceId) {
        const invoice = await razorpay.invoices
          .fetch(providerInvoiceId)
          .catch(() => null);
        const subId = invoice?.subscription_id || null;
        if (subId)
          subscriptionRecord = await subscriptionModel.findOne({
            razorpaySubscriptionId: subId,
          });
      }

      // fallback: try to find subscription via notes saved on subscription or earlier mapping
      if (!subscriptionRecord) {
        // Attempt to find by matching userSubscription notes (not guaranteed)
        subscriptionRecord = await subscriptionModel.findOne({
          "notes.razorpaySubscriptionId": payment.subscription_id,
        });
      }

      // create Payment record
      await createPaymentIfNotExist({
        providerPaymentId,
        providerInvoiceId,
        providerOrderId,
        subscriptionRecord,
        amountMinor,
        currency,
        status:
          payment.status ||
          (eventName === "payment.captured" ? "captured" : "failed"),
        raw: payment,
        note: `payment event: ${eventName}`,
      });

      // update subscription if payment captured
      if (subscriptionRecord && eventName === "payment.captured") {
        subscriptionRecord.status = "active";
        subscriptionRecord.active = true;
        await subscriptionRecord.save();
      }
    }

    // respond OK
    return res.status(200).send("ok");
  } catch (err) {
    console.error("webhook handler error:", err);
    return res.status(500).send("server error");
  }
};
