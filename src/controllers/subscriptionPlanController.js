import SubscriptionPlan from "../models/SubscriptionPlanModel.js";
import {
  subscriptionPlanSchema,
  idSchema,
} from "../validation/subscriptionValidationSchema.js";

// Create a new subscription plan
export const createSubscriptionPlan = async (req, res) => {
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

    const newPlan = new SubscriptionPlan(req.body);
    await newPlan.save();
    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: newPlan,
    });
  } catch (error) {
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

    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: Date.now() } },
      { new: true, runValidators: true }
    );
    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating subscription plan",
      error: error.message,
    });
  }
};
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

    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Subscription plan permanently deleted successfully",
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error permanently deleting subscription plan",
      error: error.message,
    });
  }
};
