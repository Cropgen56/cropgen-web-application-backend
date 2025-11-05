// src/models/SubscriptionPlanModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PricingSchema = new Schema({
  currency: { type: String, required: true },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly", "trial"],
    required: true,
  },
  amountMinor: { type: Number, required: true },
  unit: { type: String, enum: ["hectare", "acre"], default: "hectare" },
});

const SubscriptionPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },

    maxUsers: { type: Number, default: 1 },
    isTrial: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0 },

    pricing: [PricingSchema],

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
  },
  { timestamps: true }
);

// Prevent OverwriteModelError
const SubscriptionPlan =
  mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);

export default SubscriptionPlan;
