// controllers/subscriptionPlanController.js
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import Razorpay from "razorpay";
import {
  subscriptionPlanSchema,
  idSchema,
} from "../validation/subscriptionValidationSchema.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper to create Razorpay Plan (Updated for 2025 API + Test Mode Handling)
async function createRazorpayPlan(pricing, planName, planSlug) {
  if (pricing.billingCycle === "trial") return null;

  // Detect test mode
  const isTestMode = process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_");

  // In test mode, only INR supported for plans/subscriptions
  if (isTestMode && pricing.currency !== "INR") {
    return null;
  }

  // Map to new API: period (string), interval (number)
  let period = pricing.billingCycle; // "monthly" or "yearly"
  let intervalNum = 1; // Standard; adjust if multi-cycle (e.g., 2 for bi-monthly)

  // Validate period (Razorpay options: daily, weekly, monthly, quarterly, yearly)
  const validPeriods = ["daily", "weekly", "monthly", "quarterly", "yearly"];
  if (!validPeriods.includes(period)) {
    throw new Error(
      `Invalid billingCycle '${period}': Must be one of ${validPeriods.join(
        ", "
      )}`
    );
  }

  try {
    const razorpayPlan = await razorpay.plans.create({
      period, // e.g., "monthly"
      interval: intervalNum, // Number, e.g., 1
      item: {
        // New: Nest amount, currency, etc.
        name: `${planName} - ${pricing.unit} Plan`, // Required: Item name
        amount: pricing.amountMinor, // Paise per unit
        currency: pricing.currency, // e.g., "INR" or "USD" (validated by Razorpay)
        description: `${planName} - ${pricing.unit} per ${pricing.billingCycle} (${planSlug})`, // Optional
      },
      notes: {
        // Optional: For internal tracking
        planSlug: planSlug,
        unit: pricing.unit,
      },
    });
    console.log(`Created Razorpay Plan: ${razorpayPlan.id}`);
    return razorpayPlan.id;
  } catch (err) {
    console.error(
      "Razorpay Plan creation error:",
      JSON.stringify(err, null, 2)
    );
    const errorMsg =
      err.error?.description ||
      err.error?.message ||
      err.message ||
      "Unknown Razorpay error";
    throw new Error(`Failed to create Razorpay Plan: ${errorMsg}`);
  }
}

// Create a new subscription plan
export const createSubscriptionPlan = async (req, res) => {
  let newPlan = null; // Declare outside to fix scoping
  try {
    const { error } = subscriptionPlanSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details.map((err) => err.message),
      });
    }

    // Check for duplicate slug
    const existingPlan = await SubscriptionPlan.findOne({
      slug: req.body.slug,
    });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: "A subscription plan with this slug already exists",
        error: `Slug "${req.body.slug}" is already in use`,
      });
    }

    // Temp save without razorpay ids
    const newPlanData = { ...req.body };
    newPlan = await SubscriptionPlan.create(newPlanData); // Assign here

    // Create Razorpay Plans for each pricing
    const updatedPricing = await Promise.all(
      req.body.pricing.map(async (pricing) => {
        const razorpayPlanId = await createRazorpayPlan(
          pricing,
          req.body.name,
          req.body.slug
        );
        return { ...pricing, razorpayPlanId };
      })
    );

    // Update DB with razorpay ids (null for skipped ones)
    const finalPlan = await SubscriptionPlan.findByIdAndUpdate(
      newPlan._id,
      { $set: { pricing: updatedPricing } },
      { new: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message:
        "Subscription plan created successfully with Razorpay Plans (some may be skipped in test mode)",
      data: finalPlan,
    });
  } catch (error) {
    console.error("createSubscriptionPlan full error:", error); // Log for debugging
    // Rollback: Delete DB plan if created
    if (newPlan?._id) {
      try {
        await SubscriptionPlan.findByIdAndDelete(newPlan._id);
        console.log(`Rolled back DB plan: ${newPlan._id}`);
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
    }
    res.status(400).json({
      success: false,
      message: "Error creating subscription plan",
      error: error.message,
    });
  }
};

// Get all subscription plans (optimized with lean)
export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      message: "Subscription plans retrieved successfully",
      data: plans,
    });
  } catch (error) {
    console.error("getAllSubscriptionPlans error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving subscription plans",
      error: error.message,
    });
  }
};

// Get a single subscription plan by ID
export const getSubscriptionPlanById = async (req, res) => {
  try {
    const { error } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.details.map((err) => err.message),
      });
    }

    const plan = await SubscriptionPlan.findById(req.params.id).lean();
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Subscription plan retrieved successfully",
      data: plan,
    });
  } catch (error) {
    console.error("getSubscriptionPlanById error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving subscription plan",
      error: error.message,
    });
  }
};

// Partially update a subscription plan (PATCH)
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { error: idError } = idSchema.validate(req.params.id);
    if (idError) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: idError.details.map((err) => err.message),
      });
    }

    const { error } = subscriptionPlanSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.details.map((err) => err.message),
      });
    }

    // Check for slug uniqueness if updated
    if (req.body.slug) {
      const existingPlan = await SubscriptionPlan.findOne({
        slug: req.body.slug,
        _id: { $ne: req.params.id },
      });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: "A subscription plan with this slug already exists",
          error: `Slug "${req.body.slug}" is already in use`,
        });
      }
    }

    // Fetch current plan to merge pricing
    const currentPlan = await SubscriptionPlan.findById(req.params.id);
    if (!currentPlan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Merge updated pricing (preserve existing razorpayPlanId if not changed)
    const mergedPricing = (req.body.pricing || currentPlan.pricing).map(
      (p, index) => {
        const existing = currentPlan.pricing[index] || {};
        return {
          ...existing,
          ...p,
          razorpayPlanId: existing.razorpayPlanId || null,
        }; // Keep if unchanged
      }
    );

    // Temp update without razorpay
    let updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, pricing: mergedPricing } },
      { new: true, runValidators: true }
    );

    // Recreate Razorpay Plans only if pricing changed (recreate for entries without id)
    const needsRecreate = mergedPricing.some(
      (p) =>
        !p.razorpayPlanId || (req.body.pricing && req.body.pricing.length > 0)
    );
    if (needsRecreate) {
      const updatedPricingWithIds = await Promise.all(
        mergedPricing.map(async (pricing) => {
          if (pricing.billingCycle === "trial" || pricing.razorpayPlanId) {
            return pricing; // Skip trials or existing
          }
          const razorpayPlanId = await createRazorpayPlan(
            pricing,
            updatedPlan.name,
            updatedPlan.slug
          );
          return { ...pricing, razorpayPlanId };
        })
      );
      updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        req.params.id,
        { $set: { pricing: updatedPricingWithIds } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    console.error("updateSubscriptionPlan error:", error);
    res.status(400).json({
      success: false,
      message: "Error updating subscription plan",
      error: error.message,
    });
  }
};

// Delete subscription plan
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { error } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.details.map((err) => err.message),
      });
    }

    const plan = await SubscriptionPlan.findById(req.params.id).lean();
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Optional: Delete linked Razorpay Plans
    for (const pricing of plan.pricing) {
      if (pricing.razorpayPlanId) {
        try {
          await razorpay.plans.delete(pricing.razorpayPlanId); // Razorpay API for delete
          console.log(`Deleted Razorpay Plan: ${pricing.razorpayPlanId}`);
        } catch (err) {
          console.warn(
            `Failed to delete Razorpay Plan ${pricing.razorpayPlanId}:`,
            err.message
          );
        }
      }
    }

    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Subscription plan permanently deleted successfully",
      data: plan,
    });
  } catch (error) {
    console.error("deleteSubscriptionPlan error:", error);
    res.status(500).json({
      success: false,
      message: "Error permanently deleting subscription plan",
      error: error.message,
    });
  }
};
