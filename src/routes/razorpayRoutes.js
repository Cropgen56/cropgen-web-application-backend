import express from "express";
import {
  createUserSubscription,
  verifyCheckout,
  razorpayWebhookHandler,
} from "../controllers/razorpay/index.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createUserSubscription);
router.post("/verify", isAuthenticated, verifyCheckout);
router.post("/webhook", razorpayWebhookHandler);
export default router;
