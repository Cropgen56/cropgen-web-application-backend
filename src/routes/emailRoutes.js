import express from "express";
import {
  createCampaign,
  listCampaigns,
  startCampaign,
  getCampaignStatus,
  getCampaignSegmentStats,
  listCampaignFailures,
  retryCampaignFailures,
  updateCampaign,
  deleteCampaign,
} from "../controllers/emailCampaignController.js";

const router = express.Router();

// TODO: protect with admin/auth middleware
router.post("/campaign", createCampaign);
router.get("/campaigns", listCampaigns);

router.get("/campaign/:campaignId/segment-stats", getCampaignSegmentStats);
router.post("/campaign/:campaignId/start", startCampaign);
router.get("/campaign/:campaignId", getCampaignStatus);

router.get("/campaign/:campaignId/failures", listCampaignFailures);
router.post("/campaign/:campaignId/retry-failures", retryCampaignFailures);

router.patch("/campaign/:campaignId", updateCampaign);
router.delete("/campaign/:campaignId", deleteCampaign);

export default router;
