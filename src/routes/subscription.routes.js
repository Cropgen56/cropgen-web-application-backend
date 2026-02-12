import express from "express";
import {
  createSubscriptionOrder,
  verifySubscriptionOrder,
} from "../controllers/subscriptioncontroller/index.js";

import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", isAuthenticated, createSubscriptionOrder);
router.post("/verify-order", isAuthenticated, verifySubscriptionOrder);

export default router;
