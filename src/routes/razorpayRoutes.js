import express from "express";
import {
  createSubscription,
  verifyCheckout,
  razorpayWebhookHandler,
} from "../controllers/razorpayController.js";
import bodyParser from "body-parser";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createSubscription);
router.post("/:id/verify", isAuthenticated, verifyCheckout);
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  razorpayWebhookHandler
);
export default router;
