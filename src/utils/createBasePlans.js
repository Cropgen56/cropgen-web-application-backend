// utils/createBasePlans.js
import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createBasePlans = async () => {
  try {
    // INR: ₹1 plan (TEST MODE)
    const inr = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: { name: "Base Unit (₹1)", amount: 100, currency: "INR" },
    });
    console.log("INR BASE PLAN →", inr.id);

    // USD: $0.1 plan (LIVE MODE - COMMENTED)
    /*
    const usd = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: { name: "Base Unit ($0.1)", amount: 10, currency: "USD" },
    });
    console.log("USD BASE PLAN →", usd.id);
    */

    return { inr: inr.id };
  } catch (error) {
    console.error("Error:", error.error?.description || error.message);
    throw error;
  }
};

export default createBasePlans;
