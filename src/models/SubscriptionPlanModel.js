import mongoose from "mongoose";

const PricingSchema = new mongoose.Schema({
  currency: { type: String, required: true }, // "INR", "USD"
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly", "trial"],
    required: true,
  },
  amountMinor: { type: Number, required: true }, // in paise/cents (e.g., 2900 = ₹29.00) per unit
  unit: {
    type: String,
    enum: ["hectare", "acre"],
    default: "hectare",
  }, // Indicates what the amountMinor is charged per (e.g., per hectare for agriculture plans)
});

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Free Trial", "Basic", ...
  slug: {
    type: String,
    enum: ["basic", "free_trial"],
    required: true,
    unique: true,
  }, // "free_trial", "basic", etc.
  description: { type: String },

  maxUsers: { type: Number, default: 1 }, // allowed user seats (e.g., team size)
  isTrial: { type: Boolean, default: false }, // true for free trial
  trialDays: { type: Number, default: 0 }, // 30 days trial

  pricing: [PricingSchema], // multiple currency options with per-unit basis

  // Features as boolean flags
  features: {
    graphHistoricalData: { type: Boolean, default: false },
    satelliteCropMonitoring: { type: Boolean, default: false },
    weatherForecast: { type: Boolean, default: false },
    soilMoistureTemp: { type: Boolean, default: false },
    growthStageTracking: { type: Boolean, default: false },
    advisory: { type: Boolean, default: false },
    irrigationUpdates: { type: Boolean, default: false },
    pestDiseaseAlerts: { type: Boolean, default: false },
    yieldPrediction: { type: Boolean, default: false },
    harvestWindow: { type: Boolean, default: false },
    insights: { type: Boolean, default: false },
    soilFertilityAnalysis: { type: Boolean, default: false },
    socCarbon: { type: Boolean, default: false },
    advisoryControl: { type: Boolean, default: false },
    advisoryDelivery: { type: Boolean, default: false },
    weeklyReports: { type: Boolean, default: false },
    operationsManagement: { type: Boolean, default: false },
    apiIntegration: { type: Boolean, default: false },
    enterpriseSupport: { type: Boolean, default: false },
  },

  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
