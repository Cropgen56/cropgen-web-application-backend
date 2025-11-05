import Payment from "../../../models/PaymentModel.js";

export const savePayment = async (data) => {
  if (!data.providerPaymentId) return;

  await Payment.updateOne(
    { provider: "razorpay", providerPaymentId: data.providerPaymentId },
    { $setOnInsert: data },
    { upsert: true }
  );
};
