import express from "express";
import {
  createCampaign,
  startCampaign,
  getCampaignStatus,
  getCampaignSegmentStats,
  listCampaignFailures,
  retryCampaignFailures,
} from "../controllers/emailCampaignController.js";

const router = express.Router();

// TODO: protect with admin auth middleware
router.post("/campaign", createCampaign);
router.get("/campaign/:campaignId/segment-stats", getCampaignSegmentStats);
router.post("/campaign/:campaignId/start", startCampaign);
router.get("/campaign/:campaignId", getCampaignStatus);
router.get("/campaign/:campaignId/failures", listCampaignFailures);
router.post("/campaign/:campaignId/retry-failures", retryCampaignFailures);

export default router;
