import express from "express";
import {
  createSubscription,
  verifyCheckout,
  razorpayWebhookHandler,
} from "../controllers/razorpayController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createSubscription);
router.post("/verify", isAuthenticated, verifyCheckout);
router.post("/webhook", razorpayWebhookHandler);
export default router;
