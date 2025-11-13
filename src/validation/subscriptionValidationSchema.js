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

  // Professional feature naming
  features: Joi.object({
    satelliteImagery: Joi.boolean().default(false),
    cropHealthAndYield: Joi.boolean().default(false),
    soilAnalysisAndHealth: Joi.boolean().default(false),
    weatherAnalytics: Joi.boolean().default(false),
    vegetationIndices: Joi.boolean().default(false),
    waterIndices: Joi.boolean().default(false),
    evapotranspirationMonitoring: Joi.boolean().default(false),
    agronomicInsights: Joi.boolean().default(false),
    weeklyAdvisoryReports: Joi.boolean().default(false),
    cropGrowthMonitoring: Joi.boolean().default(false),
    farmOperationsManagement: Joi.boolean().default(false),
    diseaseDetectionAlerts: Joi.boolean().default(false),
    smartAdvisorySystem: Joi.boolean().default(false),
    soilReportGeneration: Joi.boolean().default(false),
    other: Joi.boolean().default(false),
  }).default(),

  active: Joi.boolean().default(true),
});

// Validate MongoDB ObjectId
export const idSchema = Joi.string().hex().length(24).required();
