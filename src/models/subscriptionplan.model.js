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
      satelliteImagery: { type: Boolean, default: false },
      cropHealthAndYield: { type: Boolean, default: false },
      soilAnalysisAndHealth: { type: Boolean, default: false },
      weatherAnalytics: { type: Boolean, default: false },
      vegetationIndices: { type: Boolean, default: false },
      waterIndices: { type: Boolean, default: false },
      evapotranspirationMonitoring: { type: Boolean, default: false },
      agronomicInsights: { type: Boolean, default: false },
      weeklyAdvisoryReports: { type: Boolean, default: false },
      cropGrowthMonitoring: { type: Boolean, default: false },
      farmOperationsManagement: { type: Boolean, default: false },
      diseaseDetectionAlerts: { type: Boolean, default: false },
      smartAdvisorySystem: { type: Boolean, default: false },
      soilReportGeneration: { type: Boolean, default: false },
      other: { type: Boolean, default: false },
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Prevent OverwriteModelError
const SubscriptionPlan =
  mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);

export default SubscriptionPlan;
