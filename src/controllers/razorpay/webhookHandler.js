import crypto from "crypto";
import Razorpay from "razorpay";
import UserSubscription from "../../models/userSubscriptionModel.js";
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

    // signature verification
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
          if (inv?.subscription_id) {
            return UserSubscription.findOne({
              razorpaySubscriptionId: inv.subscription_id,
            });
          }
        } catch (err) {
          console.warn(
            `[Webhook] Invoice fetch failed (ID: ${invoiceId}):`,
            err?.message || err
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

    const generateInvoiceNumber = () => {
      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      return `CG/${year}/INV-${random}`;
    };

    // subscription lifecycle events (unchanged)
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

    // invoice paid
    if (ev === "invoice.paid" || ev === "invoice.payment_succeeded") {
      const inv = event.payload.invoice.entity;

      // try fetching full payment details for richer info
      let rpPayment = null;
      try {
        if (inv.payment_id) {
          rpPayment = await razorpay.payments.fetch(inv.payment_id);
        } else {
          // fallback: fetch invoice then payment id
          try {
            const fetchedInv = await razorpay.invoices.fetch(inv.id);
            if (fetchedInv?.payment_id) {
              rpPayment = await razorpay.payments.fetch(fetchedInv.payment_id);
            }
          } catch (err) {
            // no-op
          }
        }
      } catch (err) {
        console.warn(
          "[Webhook] Failed to fetch payment for invoice.paid:",
          err?.message || err
        );
      }

      // method & payment details
      const method = rpPayment?.method || null;
      const upiId = rpPayment?.vpa || rpPayment?.vpa_id || null;
      const cardLast4 = rpPayment?.card?.last4 || rpPayment?.card_last4 || null;

      // Bank detection: prefer netbanking bank, else card.network/issuer as best-effort
      const bank =
        rpPayment?.bank ||
        rpPayment?.card?.network ||
        rpPayment?.card?.issuer ||
        (rpPayment?.card?.bank ? rpPayment.card.bank : null) ||
        null;

      // billing period from invoice (Razorpay may send epoch seconds)
      const billingStartDate =
        inv.billing_start != null
          ? new Date(Number(inv.billing_start) * 1000)
          : inv.billing_start
          ? new Date(inv.billing_start)
          : null;
      const billingEndDate =
        inv.billing_end != null
          ? new Date(Number(inv.billing_end) * 1000)
          : inv.billing_end
          ? new Date(inv.billing_end)
          : null;

      // customer details fallback
      const customerEmail =
        (inv.customer_details &&
          (inv.customer_details.customer_email ||
            inv.customer_details.email)) ||
        rpPayment?.email ||
        null;
      const customerContact =
        (inv.customer_details &&
          (inv.customer_details.customer_contact ||
            inv.customer_details.contact)) ||
        rpPayment?.contact ||
        null;

      const invoiceNumber =
        inv.invoice_number || inv.invoice_number || generateInvoiceNumber();

      await savePayment({
        userId: local?.userId || null,
        subscriptionId: local?._id || null,
        fieldId: local?.fieldId || null,
        provider: "razorpay",
        providerPaymentId: inv.payment_id || null,
        providerInvoiceId: inv.id || null,
        providerOrderId: inv.order_id || null,
        amountMinor: inv.amount_paid ?? inv.amount ?? inv.gross_amount ?? 0,
        currency: inv.currency || null,
        status: "captured",
        method,
        upiId,
        cardLast4,
        bank,
        customerEmail,
        customerContact,
        invoiceNumber,
        billingStartDate,
        billingEndDate,
        raw: { invoice: inv, payment: rpPayment },
        note: "invoice.paid",
      });

      if (local) {
        local.status = "active";
        local.active = true;
        local.razorpayLastInvoiceId = inv.id;
        if (inv.end_at) local.nextBillingAt = new Date(inv.end_at * 1000);
        // if billingEndDate present, also set endDate optionally:
        if (
          billingEndDate &&
          (!local.endDate || new Date(local.endDate) < billingEndDate)
        ) {
          local.endDate = billingEndDate;
        }
        await local.save();
      }

      return res.status(200).send("OK");
    }

    // payment captured / failed
    if (ev === "payment.captured" || ev === "payment.failed") {
      const pay = event.payload.payment.entity;

      // ensure full payment fetch (payload often has required fields but fetch is safe)
      let rpPayment = null;
      try {
        if (pay?.id) {
          rpPayment = await razorpay.payments.fetch(pay.id);
        }
      } catch (err) {
        console.warn(
          "[Webhook] Failed to fetch payment details:",
          err?.message || err
        );
      }

      const method = rpPayment?.method || pay?.method || null;
      const upiId = rpPayment?.vpa || rpPayment?.vpa_id || pay?.vpa || null;
      const cardLast4 = rpPayment?.card?.last4 || pay?.card_last4 || null;
      const bank =
        rpPayment?.bank ||
        rpPayment?.card?.network ||
        rpPayment?.card?.issuer ||
        pay?.bank ||
        null;

      const customerEmail = rpPayment?.email || null;
      const customerContact = rpPayment?.contact || null;

      const providerInvoiceId = pay?.invoice_id || null;

      await savePayment({
        userId: local?.userId || null,
        subscriptionId: local?._id || null,
        fieldId: local?.fieldId || null,
        provider: "razorpay",
        providerPaymentId: pay?.id || null,
        providerInvoiceId,
        providerOrderId: pay?.order_id || null,
        amountMinor: pay?.amount ?? pay?.amount_paid ?? 0,
        currency: pay?.currency || null,
        status: ev === "payment.captured" ? "captured" : "failed",
        method,
        upiId,
        cardLast4,
        bank,
        customerEmail,
        customerContact,
        billingStartDate: pay?.billing_start
          ? new Date(Number(pay.billing_start) * 1000)
          : null,
        billingEndDate: pay?.billing_end
          ? new Date(Number(pay.billing_end) * 1000)
          : null,
        raw: { payment: pay, fetchedPayment: rpPayment },
        note: ev,
      });

      if (local && ev === "payment.captured") {
        local.status = "active";
        local.active = true;
        await local.save();
      }

      return res.status(200).send("OK");
    }

    // acknowledge everything else
    return res.status(200).send("OK");
  } catch (e) {
    console.error("[Webhook] error:", e);
    return res.status(500).send("Error");
  }
};
