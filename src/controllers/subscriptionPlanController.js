// controllers/subscriptionPlanController.js
import SubscriptionPlan from "../models/SubscriptionPlanModel.js";
import Razorpay from "razorpay";
import {
  subscriptionPlanSchema,
  idSchema,
} from "../validation/subscriptionValidationSchema.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ---------- Helper ---------- */
async function createRazorpayPlan(pricing, planName, planSlug) {
  if (pricing.billingCycle === "trial") return null;

  const isTest = process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_");
  if (isTest && pricing.currency !== "INR") return null;

  const period = pricing.billingCycle; // monthly | yearly
  const interval = 1;

  const valid = ["daily", "weekly", "monthly", "quarterly", "yearly"];
  if (!valid.includes(period)) throw new Error(`Invalid period: ${period}`);

  const payload = {
    period,
    interval,
    item: {
      name: `${planName} - ${pricing.unit}`,
      amount: pricing.amountMinor,
      currency: pricing.currency,
      description: `${planName} per ${pricing.unit} ${period}`,
    },
    notes: { planSlug, unit: pricing.unit },
  };

  const rpPlan = await razorpay.plans.create(payload);
  return rpPlan.id;
}

/* ---------- CRUD ---------- */
export const createSubscriptionPlan = async (req, res) => {
  let tempPlan = null;
  try {
    const { error } = subscriptionPlanSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details.map((e) => e.message),
      });

    if (await SubscriptionPlan.exists({ slug: req.body.slug }))
      return res.status(400).json({
        success: false,
        message: `Slug "${req.body.slug}" already used`,
      });

    // 1. Save without Razorpay IDs
    tempPlan = await SubscriptionPlan.create(req.body);

    // 2. Create Razorpay plans for each pricing entry
    const pricingWithIds = await Promise.all(
      req.body.pricing.map(async (p) => ({
        ...p,
        razorpayPlanId: await createRazorpayPlan(
          p,
          req.body.name,
          req.body.slug
        ),
      }))
    );

    const finalPlan = await SubscriptionPlan.findByIdAndUpdate(
      tempPlan._id,
      { $set: { pricing: pricingWithIds } },
      { new: true, runValidators: true }
    );

    res.status(201).json({ success: true, data: finalPlan });
  } catch (e) {
    if (tempPlan?._id)
      await SubscriptionPlan.findByIdAndDelete(tempPlan._id).catch(() => {});
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getAllSubscriptionPlans = async (req, res) => {
  const plans = await SubscriptionPlan.find({}).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: plans });
};

export const getSubscriptionPlanById = async (req, res) => {
  const { error } = idSchema.validate(req.params.id);
  if (error)
    return res.status(400).json({ success: false, message: "Invalid ID" });

  const plan = await SubscriptionPlan.findById(req.params.id).lean();
  if (!plan)
    return res.status(404).json({ success: false, message: "Not found" });

  res.json({ success: true, data: plan });
};

export const updateSubscriptionPlan = async (req, res) => {
  const { error: idErr } = idSchema.validate(req.params.id);
  if (idErr)
    return res.status(400).json({ success: false, message: "Invalid ID" });

  const { error } = subscriptionPlanSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: error.details.map((e) => e.message),
    });

  if (req.body.slug) {
    const dup = await SubscriptionPlan.findOne({
      slug: req.body.slug,
      _id: { $ne: req.params.id },
    });
    if (dup)
      return res.status(400).json({
        success: false,
        message: `Slug "${req.body.slug}" already taken`,
      });
  }

  const current = await SubscriptionPlan.findById(req.params.id);
  if (!current)
    return res.status(404).json({ success: false, message: "Plan not found" });

  // Merge pricing (keep existing razorpayPlanId)
  const mergedPricing = (req.body.pricing || current.pricing).map((p, i) => ({
    ...current.pricing[i],
    ...p,
    razorpayPlanId: current.pricing[i]?.razorpayPlanId || null,
  }));

  let updated = await SubscriptionPlan.findByIdAndUpdate(
    req.params.id,
    { $set: { ...req.body, pricing: mergedPricing } },
    { new: true, runValidators: true }
  );

  // Recreate Razorpay plan only for entries that are missing an ID
  const needRecreate = mergedPricing.some(
    (p) => !p.razorpayPlanId && p.billingCycle !== "trial"
  );
  if (needRecreate) {
    const newPricing = await Promise.all(
      mergedPricing.map(async (p) => {
        if (p.razorpayPlanId || p.billingCycle === "trial") return p;
        const id = await createRazorpayPlan(p, updated.name, updated.slug);
        return { ...p, razorpayPlanId: id };
      })
    );
    updated = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { pricing: newPricing } },
      { new: true }
    );
  }

  res.json({ success: true, data: updated });
};

export const deleteSubscriptionPlan = async (req, res) => {
  const { error } = idSchema.validate(req.params.id);
  if (error)
    return res.status(400).json({ success: false, message: "Invalid ID" });

  const plan = await SubscriptionPlan.findById(req.params.id).lean();
  if (!plan)
    return res.status(404).json({ success: false, message: "Not found" });

  for (const p of plan.pricing) {
    if (p.razorpayPlanId) {
      try {
        await razorpay.plans.delete(p.razorpayPlanId);
      } catch (_) {}
    }
  }

  await SubscriptionPlan.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Plan deleted" });
};
