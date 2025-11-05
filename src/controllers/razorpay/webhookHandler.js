import crypto from "crypto";
import Razorpay from "razorpay";
import UserSubscription from "../../models/UserSubscriptionModel.js";
import { mapStatus } from "./utils/mapStatus.js";
import { savePayment } from "./utils/savePayment.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const razorpayWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).send("Bad request");

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.rawBody);
    if (shasum.digest("hex") !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    const ev = event.event;

    const findLocalSub = async () => {
      if (event.payload.subscription?.entity?.id) {
        return UserSubscription.findOne({
          razorpaySubscriptionId: event.payload.subscription.entity.id,
        });
      }

      const invoiceId =
        event.payload.invoice?.entity?.id ||
        event.payload.payment?.entity?.invoice_id;

      if (invoiceId) {
        if (event.payload.invoice?.entity?.subscription_id) {
          return UserSubscription.findOne({
            razorpaySubscriptionId:
              event.payload.invoice.entity.subscription_id,
          });
        }

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

      if (event.payload.payment?.entity?.subscription_id) {
        return UserSubscription.findOne({
          razorpaySubscriptionId: event.payload.payment.entity.subscription_id,
        });
      }

      return null;
    };

    const local = await findLocalSub();

    // Subscription lifecycle
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

    // Invoice paid
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
        if (inv.end_at) local.nextBillingAt = new Date(inv.end_at * 1000);
        await local.save();
      }
      return res.status(200).send("OK");
    }

    // Payment captured / failed
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

    res.status(200).send("OK");
  } catch (e) {
    console.error("[Webhook] error:", e);
    res.status(500).send("Error");
  }
};
