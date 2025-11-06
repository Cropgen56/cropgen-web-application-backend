import express from "express";
import {
  createUserSubscription,
  verifyCheckout,
  razorpayWebhookHandler,
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
} from "../controllers/razorpay/index.js";
import { checkFieldSubscription } from "../controllers/razorpay/checkFieldSubscription.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createUserSubscription);
router.post("/verify", isAuthenticated, verifyCheckout);
router.post("/webhook", razorpayWebhookHandler);

// Additional route for checking field subscription
router.get("/check/:fieldId", isAuthenticated, checkFieldSubscription);
router.get("/fields", getAllSubscriptions);
router.get("/:id", getSubscriptionById);
router.delete("/cancel/:id", cancelSubscription);

export default router;
