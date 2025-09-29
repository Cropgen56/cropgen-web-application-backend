import EmailCampaing from "../models/emailCampaingModel.js";
import EmailStatus from "../models/emailStatusModel.js";
import User from "../models/usersModel.js";
import { enqueueBatchEmail } from "../utils/emailQueue.js";
import { buildSafeUserFilter } from "../utils/segments.js";
import { isDeliverableEmail } from "../utils/emailValidation.js";

const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "100", 10);

/**
 * Create a campaign (template + optional segment filter)
 * Body: { name, subject, html, from, segment? }
 */
export const createCampaign = async (req, res) => {
  try {
    const { name, subject, html, from, segment } = req.body || {};
    if (!name || !subject || !html || !from) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const campaign = await EmailCampaing.create({
      name,
      subject,
      html,
      from,
      segment: segment || null,
      status: "draft",
      createdBy: req.user?.id || null,
    });

    return res.status(201).json({ success: true, campaign });
  } catch (err) {
    console.error("[createCampaign] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * List campaigns (paginated + basic filters)
 * Query: ?page=1&limit=20&status=draft|queued|sending|completed&q=search
 */
export const listCampaigns = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const skip = (page - 1) * limit;

    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const [items, total] = await Promise.all([
      EmailCampaing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailCampaing.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      items,
    });
  } catch (err) {
    console.error("[listCampaigns] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Get campaign segment stats (preview audience size)
 * GET /v1/api/email/campaign/:campaignId/segment-stats
 */
export const getCampaignSegmentStats = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    const filter = buildSafeUserFilter(campaign.segment || {});
    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      segmentFilter: filter,
      totalRecipients: total,
    });
  } catch (err) {
    console.error("[getCampaignSegmentStats] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Start a campaign: validate emails and enqueue recipients in batches
 * POST /v1/api/email/campaign/:campaignId/start
 */
export const startCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    // Basic state guard: only allow starting once
    if (["queued", "sending", "completed"].includes(campaign.status)) {
      return res
        .status(400)
        .json({ error: `campaign already ${campaign.status}` });
    }

    const filter = buildSafeUserFilter(campaign.segment || {});
    const total = await User.countDocuments(filter);
    if (total === 0) return res.status(400).json({ error: "no recipients" });

    // Mark as queued
    campaign.totalRecipients = total;
    campaign.status = "queued";
    await campaign.save();

    // Stream recipients
    const cursor = User.find(filter, {
      email: 1,
      firstName: 1,
      name: 1,
    }).cursor();

    let batch = [];
    let enqueued = 0;
    let skippedInvalid = 0;
    let skippedMissingEmail = 0;

    for await (const user of cursor) {
      const email = (user.email || "").trim();
      const name = user.firstName || user.name || "";

      if (!email) {
        skippedMissingEmail++;
        continue;
      }

      const deliverable = await isDeliverableEmail(email);
      if (!deliverable) {
        skippedInvalid++;
        // record a pre-send failure
        try {
          await EmailStatus.create({
            campaign: campaign._id,
            recipient: email,
            status: "failed",
            error: { message: "Pre-validation failed (format/domain/MX)" },
            attempts: 0,
            lastAttemptAt: new Date(),
          });
        } catch (werr) {
          console.warn(
            "[EmailStatus pre-fail write error]",
            werr?.message || werr
          );
        }
        continue;
      }

      batch.push({ email, name, userId: user._id });

      if (batch.length >= BATCH_SIZE) {
        await enqueueBatchEmail({
          campaignId: campaign._id.toString(),
          subject: campaign.subject,
          html: campaign.html,
          from: campaign.from,
          recipients: batch,
        });
        enqueued++;
        batch = [];
      }
    }

    // flush tail
    if (batch.length) {
      await enqueueBatchEmail({
        campaignId: campaign._id.toString(),
        subject: campaign.subject,
        html: campaign.html,
        from: campaign.from,
        recipients: batch,
      });
      enqueued++;
    }

    // Move to "sending"
    campaign.enqueuedBatches = enqueued;
    campaign.status = "sending";
    await campaign.save();

    return res.status(200).json({
      success: true,
      totalRecipients: total,
      enqueuedBatches: enqueued,
      skippedInvalidEmails: skippedInvalid,
      skippedMissingEmail,
    });
  } catch (err) {
    console.error("[startCampaign] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Get campaign status / details
 * GET /v1/api/email/campaign/:campaignId
 */
export const getCampaignStatus = async (req, res) => {
  try {
    const campaign = await EmailCampaing.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    return res.status(200).json({
      success: true,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        enqueuedBatches: campaign.enqueuedBatches,
        segment: campaign.segment || null,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
  } catch (err) {
    console.error("[getCampaignStatus] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * List failed recipients (paginated)
 * GET /v1/api/email/campaign/:campaignId/failures?limit=50&page=1
 */
export const listCampaignFailures = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const skip = (page - 1) * limit;

    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    const [items, total] = await Promise.all([
      EmailStatus.find({ campaign: campaign._id, status: "failed" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailStatus.countDocuments({ campaign: campaign._id, status: "failed" }),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      items,
    });
  } catch (err) {
    console.error("[listCampaignFailures] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Retry all failed recipients (re-validate before enqueue)
 * POST /v1/api/email/campaign/:campaignId/retry-failures
 */
export const retryCampaignFailures = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    const failures = await EmailStatus.find({
      campaign: campaign._id,
      status: "failed",
    })
      .select({ recipient: 1 })
      .lean();

    if (!failures.length) {
      return res
        .status(200)
        .json({ success: true, retriedBatches: 0, retriedRecipients: 0 });
    }

    const validRecipients = [];
    let skippedInvalidFailures = 0;

    for (const f of failures) {
      const email = (f.recipient || "").trim();
      if (!email) {
        skippedInvalidFailures++;
        continue;
      }
      if (await isDeliverableEmail(email)) {
        validRecipients.push({ email, name: "", userId: null });
      } else {
        skippedInvalidFailures++;
      }
    }

    let retriedBatches = 0;
    for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
      const recipients = validRecipients.slice(i, i + BATCH_SIZE);
      await enqueueBatchEmail({
        campaignId: campaign._id.toString(),
        subject: campaign.subject,
        html: campaign.html,
        from: campaign.from,
        recipients,
      });
      retriedBatches++;
    }

    if (campaign.status === "completed" && validRecipients.length) {
      campaign.status = "sending";
      await campaign.save();
    }

    return res.status(200).json({
      success: true,
      retriedBatches,
      retriedRecipients: validRecipients.length,
      skippedInvalidFailures,
    });
  } catch (err) {
    console.error("[retryCampaignFailures] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Update a campaign (only editable in draft/queued)
 * PATCH /v1/api/email/campaign/:campaignId
 * Body: { name?, subject?, html?, from?, segment? }
 */
export const updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const allowed = ["name", "subject", "html", "from", "segment"];
    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    );

    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    if (!["draft", "queued"].includes(campaign.status)) {
      return res.status(400).json({
        error: `cannot update campaign in status: ${campaign.status}`,
      });
    }

    Object.assign(campaign, updates);
    await campaign.save();

    return res.status(200).json({ success: true, campaign });
  } catch (err) {
    console.error("[updateCampaign] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};

/**
 * Delete a campaign (+ its EmailStatus records)
 * DELETE /v1/api/email/campaign/:campaignId
 * Note: consider restricting deletion if status is "sending" to avoid confusion.
 */
export const deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    // Optional guard: block deletion while sending
    if (campaign.status === "sending") {
      return res.status(400).json({ error: "cannot delete while sending" });
    }

    await Promise.all([
      EmailCampaing.findByIdAndDelete(campaignId),
      EmailStatus.deleteMany({ campaign: campaignId }),
    ]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[deleteCampaign] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};
