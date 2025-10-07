import Joi from "joi";

export const userSubscriptionSchema = Joi.object({
  planId: Joi.string().hex().length(24).required(),
  hectares: Joi.number().min(0).required(),
  currency: Joi.string().valid("INR", "USD").required(),
  billingCycle: Joi.string().valid("monthly", "yearly", "trial").required(),
});

export const idSchema = Joi.string().hex().length(24).required();
