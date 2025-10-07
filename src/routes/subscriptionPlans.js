// In your router file (e.g., routes/subscriptionPlans.js)
import express from "express";
import {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from "../controllers/subscriptionPlanController.js";

const router = express.Router();

router.post("/", createSubscriptionPlan); // Create (admin only)
router.get("/", getAllSubscriptionPlans); // Read all
router.get("/:id", getSubscriptionPlanById); // Read one
router.patch("/:id", updateSubscriptionPlan); // Update
router.delete("/:id", deleteSubscriptionPlan); // Delete

export default router;
