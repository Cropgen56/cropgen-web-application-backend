import Razorpay from "razorpay";
import crypto from "crypto";
import SubscriptionPlan from "../models/SubscriptionPlanModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import {
  userSubscriptionSchema,
  idSchema,
} from "../validation/userSubscriptionValidationSchema.js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Choose a subscription plan and initiate payment
export const createUserSubscription = async (req, res) => {
  try {
    const { error } = userSubscriptionSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details.map((err) => err.message),
      });
    }

    const { planId, hectares, currency, billingCycle } = req.body;
    const userId = req.user.id; // Assumes authenticated user (JWT middleware)

    // Fetch the subscription plan
    const plan = await SubscriptionPlan.findById(planId).lean();
    if (!plan || !plan.active) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found or inactive",
      });
    }

    // Find matching pricing
    const pricing = plan.pricing.find(
      (p) =>
        p.currency === currency &&
        p.billingCycle === billingCycle &&
        p.unit === "hectare"
    );
    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency or billing cycle for this plan",
      });
    }

    // Calculate total amount
    const totalAmountMinor = pricing.amountMinor * hectares;

    // Calculate end date based on billing cycle
    const startDate = new Date();
    let endDate;
    if (billingCycle === "monthly") {
      endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
    } else if (billingCycle === "yearly") {
      endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
    } else if (billingCycle === "trial") {
      endDate = new Date(
        startDate.setDate(startDate.getDate() + plan.trialDays)
      );
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: totalAmountMinor, // In paise/cents
      currency,
      receipt: `sub_${userId}_${planId}_${Date.now()}`,
      notes: { userId, planId, hectares },
    });

    // Create user subscription (pending)
    const userSubscription = new UserSubscription({
      userId,
      planId,
      hectares,
      currency,
      billingCycle,
      amountMinor: totalAmountMinor,
      orderId: order.id,
      startDate: new Date(),
      endDate,
      paymentStatus: "pending",
    });
    await userSubscription.save();

    res.status(201).json({
      success: true,
      message: "Subscription created, proceed to payment",
      data: {
        orderId: order.id,
        amountMinor: totalAmountMinor,
        currency,
        key: process.env.RAZORPAY_KEY_ID,
        subscriptionId: userSubscription._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error: error.message,
    });
  }
};

// Verify payment and activate subscription
export const verifyUserSubscriptionPayment = async (req, res) => {
  try {
    const { error } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID format",
        error: error.details.map((err) => err.message),
      });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Update subscription
    const subscription = await UserSubscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    subscription.paymentStatus = "completed";
    subscription.paymentId = razorpay_payment_id;
    subscription.updatedAt = Date.now();
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

// import axios from "axios";

// const initiatePayment = async (planId, hectares, currency, billingCycle) => {
//   try {
//     // Step 1: Create subscription and get order details
//     const response = await axios.post(
//       "http://localhost:3000/api/user-subscriptions",
//       {
//         planId,
//         hectares,
//         currency,
//         billingCycle,
//       },
//       { headers: { Authorization: `Bearer ${userToken}` } }
//     );

//     const {
//       orderId,
//       amountMinor,
//       currency: orderCurrency,
//       key,
//       subscriptionId,
//     } = response.data.data;

//     // Step 2: Open Razorpay checkout
//     const options = {
//       key,
//       amount: amountMinor,
//       currency: orderCurrency,
//       order_id: orderId,
//       handler: async (paymentResponse) => {
//         // Step 3: Verify payment
//         await axios.post(
//           `http://localhost:3000/api/user-subscriptions/${subscriptionId}/verify`,
//           {
//             razorpay_payment_id: paymentResponse.razorpay_payment_id,
//             razorpay_order_id: paymentResponse.razorpay_order_id,
//             razorpay_signature: paymentResponse.razorpay_signature,
//           },
//           { headers: { Authorization: `Bearer ${userToken}` } }
//         );
//         alert("Subscription activated successfully!");
//       },
//       prefill: {
//         name: "User Name",
//         email: "user@example.com",
//       },
//     };

//     const rzp = new window.Razorpay(options);
//     rzp.open();
//   } catch (error) {
//     console.error("Payment initiation failed:", error);
//   }
// };
