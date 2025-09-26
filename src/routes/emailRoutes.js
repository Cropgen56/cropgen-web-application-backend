import express from "express";
import {
  createCampaign,
  startCampaign,
  getCampaignStatus,
} from "../controllers/emailCampaignController.js";

const router = express.Router();

// protect these routes with your auth middleware (only admin)
router.post("/campaign", createCampaign);
router.post("/campaign/:campaignId/start", startCampaign);
router.get("/campaign/:campaignId", getCampaignStatus);

export default router;
