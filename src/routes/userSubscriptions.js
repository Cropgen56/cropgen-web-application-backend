import express from "express";
import {
  createUserSubscription,
  verifyUserSubscriptionPayment,
} from "../controllers/userSubscriptionController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", isAuthenticated, createUserSubscription);
router.post("/:id/verify", isAuthenticated, verifyUserSubscriptionPayment);

export default router;
