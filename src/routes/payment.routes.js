import express from "express";
import {
  createUserSubscription,
  verifyCheckout,
  razorpayWebhookHandler,
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  getUserFieldsWithSubscriptions,
} from "../controllers/paymentcontrollers/index.js";

import { checkFieldSubscription } from "../controllers/paymentcontrollers/checkFieldSubscription.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createUserSubscription);
router.post("/verify", isAuthenticated, verifyCheckout);
router.post("/webhook", razorpayWebhookHandler);

// Additional route for checking field subscription
router.get("/check/:fieldId", isAuthenticated, checkFieldSubscription);
router.get("/check/:userId/fields", getUserFieldsWithSubscriptions);
router.get("/fields", isAuthenticated, getAllSubscriptions);
router.get("/:id", isAuthenticated, getSubscriptionById);
router.delete("/cancel/:id", isAuthenticated, cancelSubscription);

export default router;
