import Joi from "joi";

const pricingSchema = Joi.object({
  currency: Joi.string().valid("INR", "USD").required(),
  billingCycle: Joi.string().valid("monthly", "yearly", "trial").required(),
  amountMinor: Joi.number().integer().min(0).required(),
  unit: Joi.string().valid("hectare", "user", "flat").default("hectare"),
  razorpayPlanId: Joi.string().allow(null, ""),
});

export const subscriptionPlanSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(""),
  maxUsers: Joi.number().integer().min(1).default(1),
  isTrial: Joi.boolean().default(false),
  trialDays: Joi.number().integer().min(0).default(0),
  pricing: Joi.array().items(pricingSchema),
  features: Joi.object({
    graphHistoricalData: Joi.boolean().default(false),
    satelliteCropMonitoring: Joi.boolean().default(false),
    weatherForecast: Joi.boolean().default(false),
    soilMoistureTemp: Joi.boolean().default(false),
    growthStageTracking: Joi.boolean().default(false),
    advisory: Joi.boolean().default(false),
    irrigationUpdates: Joi.boolean().default(false),
    pestDiseaseAlerts: Joi.boolean().default(false),
    yieldPrediction: Joi.boolean().default(false),
    harvestWindow: Joi.boolean().default(false),
    insights: Joi.boolean().default(false),
    soilFertilityAnalysis: Joi.boolean().default(false),
    socCarbon: Joi.boolean().default(false),
    advisoryControl: Joi.boolean().default(false),
    advisoryDelivery: Joi.boolean().default(false),
    weeklyReports: Joi.boolean().default(false),
    operationsManagement: Joi.boolean().default(false),
    apiIntegration: Joi.boolean().default(false),
    enterpriseSupport: Joi.boolean().default(false),
  }).default(),
  active: Joi.boolean().default(true),
});

// Validate MongoDB ObjectId
export const idSchema = Joi.string().hex().length(24).required();
