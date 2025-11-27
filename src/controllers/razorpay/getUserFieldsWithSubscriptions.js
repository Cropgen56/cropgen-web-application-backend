// controllers/subscriptionController.js
import mongoose from "mongoose";
import FarmField from "../../models/fieldModel.js";
import UserSubscription from "../../models/userSubscriptionModel.js";
// import SubscriptionPlan from "../models/SubscriptionPlan.js";
import User from "../../models/usersModel.js";

export const getUserFieldsWithSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // 1) Ensure user exists (optional but good)
    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2) Get all fields of the user
    const fields = await FarmField.find({ user: userId }).lean();

    if (!fields.length) {
      return res.status(200).json({
        userId,
        fields: [],
      });
    }

    const fieldIds = fields.map((f) => f._id);

    // 3) Get subscriptions for those fields for this user
    //    We only care about "active" ones (per our rule)
    const subscriptions = await UserSubscription.find({
      userId,
      fieldId: { $in: fieldIds },
      active: true,
      status: "active", // tweak if you also accept 'trial', 'pending', etc
    })
      .populate("planId") // attach SubscriptionPlan with features
      .lean();

    // Build a map: fieldId -> subscription
    const subByFieldId = new Map();

    // In case there are multiple active subs per field, keep the latest by startDate
    for (const sub of subscriptions) {
      const existing = subByFieldId.get(String(sub.fieldId));

      if (!existing) {
        subByFieldId.set(String(sub.fieldId), sub);
      } else {
        const existingStart =
          existing.startDate || existing.createdAt || new Date(0);
        const currentStart = sub.startDate || sub.createdAt || new Date(0);
        if (currentStart > existingStart) {
          subByFieldId.set(String(sub.fieldId), sub);
        }
      }
    }

    // 4) Build response per field
    const resultFields = fields.map((field) => {
      const sub = subByFieldId.get(String(field._id));

      if (!sub) {
        return {
          fieldId: field._id,
          fieldName: field.fieldName,
          cropName: field.cropName,
          variety: field.variety,
          sowingDate: field.sowingDate,
          acre: field.acre,
          typeOfIrrigation: field.typeOfIrrigation,
          typeOfFarming: field.typeOfFarming,
          subscription: {
            hasActiveSubscription: false,
          },
        };
      }

      const plan = sub.planId; // after populate

      return {
        fieldId: field._id,
        fieldName: field.fieldName,
        cropName: field.cropName,
        variety: field.variety,
        sowingDate: field.sowingDate,
        acre: field.acre,
        typeOfIrrigation: field.typeOfIrrigation,
        typeOfFarming: field.typeOfFarming,

        subscription: {
          hasActiveSubscription: true,
          subscriptionId: sub._id,
          status: sub.status,
          active: sub.active,
          hectares: sub.hectares,
          billingCycle: sub.billingCycle,
          currency: sub.currency,
          amountMinor: sub.amountMinor,
          startDate: sub.startDate,
          nextBillingAt: sub.nextBillingAt,
          razorpaySubscriptionId: sub.razorpaySubscriptionId,

          plan: plan
            ? {
                id: plan._id,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                isTrial: plan.isTrial,
                trialDays: plan.trialDays,
                features: plan.features,
                // you can add pricing if you want:
                pricing: plan.pricing,
              }
            : null,
        },
      };
    });

    return res.status(200).json({
      userId,
      fields: resultFields,
    });
  } catch (err) {
    console.error("Error in getUserFieldsWithSubscriptions:", err);
    return res.status(500).json({
      message: "Failed to fetch user fields with subscriptions",
      error: err.message,
    });
  }
};
