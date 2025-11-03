// controllers/razorpayController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import UserSubscription from "../models/UserSubscriptionModel.js";
import Payment from "../models/PaymentModel.js";
import SubscriptionPlan from "../models/SubscriptionPlanModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const mapStatus = (s) =>
  ({
    created: "pending",
    activated: "active",
    processed: "active",
    completed: "completed",
    cancelled: "cancelled",
  }[s] || s);

/* ---------- CREATE USER SUBSCRIPTION (PERFECT BILLING) ---------- */
export const createUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, fieldId, hectares, billingCycle, currency } = req.body;

    // ───── VALIDATION ─────
    if (!planId || !fieldId || hectares == null || !billingCycle || !currency)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    if (hectares <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Area must be > 0" });

    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan?.active)
      return res
        .status(404)
        .json({ success: false, message: "Plan not active" });

    const pricing = plan.pricing.find(
      (p) =>
        p.currency === currency &&
        p.billingCycle === billingCycle &&
        p.unit === "hectare"
    );
    if (!pricing)
      return res
        .status(400)
        .json({ success: false, message: "Pricing not ready" });

    // ───── TRIAL ─────
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

    // ───── PAID ─────
    const hectaresFloat = parseFloat(hectares);
    const totalAmountMinor = Math.round(pricing.amountMinor * hectaresFloat);

    // Save local record first
    const localSub = await UserSubscription.create({
      userId,
      fieldId,
      planId,
      hectares: hectaresFloat,
      currency,
      billingCycle,
      amountMinor: totalAmountMinor,
      status: "pending",
      active: false,
    });

    // ───── ZERO‑PLAN (₹1) LOGIC ─────
    const ZERO_PLANS = {
      INR: process.env.RAZORPAY_ZERO_PLAN_INR, // <-- ₹1 plan ID
      USD: process.env.RAZORPAY_ZERO_PLAN_USD, // optional
    };

    const zeroPlanId = ZERO_PLANS[currency];
    if (!zeroPlanId) {
      await localSub.remove();
      return res.status(400).json({
        success: false,
        message: `Zero plan not configured for currency: ${currency}`,
      });
    }

    // Razorpay subscription: ₹1 base + dynamic addon
    let rpSub;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: zeroPlanId, // ₹1 plan
        total_count: billingCycle === "yearly" ? 12 : 30,
        quantity: 1,
        customer_notify: 1,
        addons: [
          {
            item: {
              name: `${plan.name} - Area Charge (${hectaresFloat} ha)`,
              amount: totalAmountMinor, // exact amount per hectare
              currency,
            },
            quantity: 1,
          },
        ],
        notes: {
          userId: String(userId),
          fieldId: String(fieldId),
          userSubscriptionId: String(localSub._id),
          hectares: String(hectaresFloat),
          totalAmountMinor: String(totalAmountMinor),
        },
      });
    } catch (err) {
      console.error("Razorpay subscription error:", err);
      await localSub.remove();
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription with Razorpay",
      });
    }

    // ───── UPDATE LOCAL RECORD ─────
    localSub.razorpaySubscriptionId = rpSub.id;
    localSub.razorpayCustomerId = rpSub.customer_id || null;
    localSub.status = mapStatus(rpSub.status);
    if (rpSub.charge_at)
      localSub.nextBillingAt = new Date(rpSub.charge_at * 1000);
    await localSub.save();

    // ───── RESPONSE ─────
    res.status(201).json({
      success: true,
      data: {
        subscriptionRecordId: localSub._id,
        razorpaySubscriptionId: rpSub.id,
        amountMinor: totalAmountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (e) {
    console.error("createUserSubscription error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- VERIFY CHECKOUT (frontend) ---------- */
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
    )
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (sign !== razorpay_signature)
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });

    const sub = await UserSubscription.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

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

    res.json({ success: true });
  } catch (e) {
    console.error("verifyCheckout error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- IDEMPOTENT PAYMENT SAVER ---------- */
const savePayment = async (data) => {
  if (!data.providerPaymentId) return;
  await Payment.updateOne(
    { provider: "razorpay", providerPaymentId: data.providerPaymentId },
    { $setOnInsert: data },
    { upsert: true }
  );
};

/* ---------- WEBHOOK HANDLER ---------- */
export const razorpayWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).send("Bad request");

    // Use raw body (not parsed JSON) for signature
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.rawBody);
    if (shasum.digest("hex") !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body; // already parsed in middleware
    const ev = event.event;

    // -------------------------------------------------
    // Find local subscription (works for first payment & renewals)
    // -------------------------------------------------
    const findLocalSub = async () => {
      // 1. Direct subscription object
      if (event.payload.subscription?.entity?.id) {
        return UserSubscription.findOne({
          razorpaySubscriptionId: event.payload.subscription.entity.id,
        });
      }

      // 2. From invoice (invoice.paid or payment.captured with invoice_id)
      const invoiceId =
        event.payload.invoice?.entity?.id ||
        event.payload.payment?.entity?.invoice_id;

      if (invoiceId) {
        // Try direct subscription_id from payload first
        if (event.payload.invoice?.entity?.subscription_id) {
          return UserSubscription.findOne({
            razorpaySubscriptionId:
              event.payload.invoice.entity.subscription_id,
          });
        }

        // Fallback: fetch invoice from Razorpay
        try {
          const inv = await razorpay.invoices.fetch(invoiceId);
          if (inv.subscription_id) {
            return UserSubscription.findOne({
              razorpaySubscriptionId: inv.subscription_id,
            });
          }
        } catch (err) {
          console.warn(
            `[Webhook] Invoice fetch failed (ID: ${invoiceId}):`,
            err.message
          );
        }
      }

      // 3. Direct from payment (rare, only on renewals)
      if (event.payload.payment?.entity?.subscription_id) {
        return UserSubscription.findOne({
          razorpaySubscriptionId: event.payload.payment.entity.subscription_id,
        });
      }

      return null;
    };

    const local = await findLocalSub();
    console.log(`[Webhook] ${ev} | Sub: ${local?._id ?? "NOT_FOUND"}`);

    // -------------------------------------------------
    // 1. Subscription lifecycle
    // -------------------------------------------------
    if (
      [
        "subscription.activated",
        "subscription.charged",
        "subscription.updated",
        "subscription.authenticated",
      ].includes(ev)
    ) {
      const rpSub = event.payload.subscription?.entity;
      if (local && rpSub) {
        const newStatus = mapStatus(rpSub.status);
        const needSave =
          local.status !== newStatus ||
          (rpSub.charge_at && !local.nextBillingAt);

        if (needSave) {
          local.status = newStatus;
          if (rpSub.charge_at)
            local.nextBillingAt = new Date(rpSub.charge_at * 1000);
          await local.save();
        }
      }
      return res.status(200).send("OK");
    }

    // -------------------------------------------------
    // 2. Invoice paid
    // -------------------------------------------------
    if (ev === "invoice.paid" || ev === "invoice.payment_succeeded") {
      const inv = event.payload.invoice.entity;

      await savePayment({
        userId: local?.userId,
        subscriptionId: local?._id,
        fieldId: local?.fieldId,
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

      if (local) {
        local.status = "active";
        local.active = true;
        local.razorpayLastInvoiceId = inv.id;
        if (inv.end_at) {
          local.nextBillingAt = new Date(inv.end_at * 1000);
        }
        await local.save();
      }
      return res.status(200).send("OK");
    }

    // -------------------------------------------------
    // 3. Payment captured / failed
    // -------------------------------------------------
    if (ev === "payment.captured" || ev === "payment.failed") {
      const pay = event.payload.payment.entity;

      await savePayment({
        userId: local?.userId,
        subscriptionId: local?._id,
        fieldId: local?.fieldId,
        provider: "razorpay",
        providerPaymentId: pay.id,
        providerInvoiceId: pay.invoice_id,
        providerOrderId: pay.order_id,
        amountMinor: pay.amount,
        currency: pay.currency,
        status: ev === "payment.captured" ? "captured" : "failed",
        raw: pay,
        note: ev,
      });

      if (local && ev === "payment.captured") {
        local.status = "active";
        local.active = true;
        await local.save();
      }
      return res.status(200).send("OK");
    }

    // Unknown event
    res.status(200).send("OK");
  } catch (e) {
    console.error("[Webhook] error:", e);
    res.status(500).send("Error");
  }
};
