// src/controllers/emailCampaignController.js
import EmailCampaing from "../models/emailCampaingModel.js";
import EmailStatus from "../models/emailStatusModel.js";
import User from "../models/usersModel.js";
import { enqueueBatchEmail } from "../utils/emailQueue.js";
import { buildSafeUserFilter } from "../utils/segments.js";
import { isDeliverableEmail } from "../utils/emailValidation.js";

const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "100", 10);

/**
 * 1) Create campaign — defines template + audience (segment)
 * Body: { name, subject, html, from, segment? }
 */
export const createCampaign = async (req, res) => {
  try {
    const { name, subject, html, from, segment } = req.body;
    if (!name || !subject || !html || !from) {
      return res.status(400).json({ error: "Missing fields" });
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
 * 2) Preview audience size for a campaign's segment BEFORE sending
 * GET /v1/api/email/campaign/:campaignId/segment
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
 * 3) Start campaign — validate emails (regex + optional MX), record pre-failures,
 *    and enqueue valid recipients in batches.
 * POST /v1/api/email/campaign/:campaignId/start
 */
export const startCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    // Build SAFE filter that enforces non-empty email
    const filter = buildSafeUserFilter(campaign.segment || {});

    // Use the same filter for counting and streaming to avoid mismatches
    const total = await User.countDocuments(filter);
    if (total === 0) return res.status(400).json({ error: "no recipients" });

    // mark queued
    campaign.totalRecipients = total;
    campaign.status = "queued";
    await campaign.save();

    // stream recipients
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
      const raw = user.email;
      const email = typeof raw === "string" ? raw.trim() : "";
      const name = user.firstName || user.name || "";

      // Double-guard even though filter already requires non-empty email
      if (!email) {
        skippedMissingEmail++;
        continue;
      }

      const deliverable = await isDeliverableEmail(email);
      if (!deliverable) {
        skippedInvalid++;
        // record as failed (pre-send) WITH a real recipient value
        try {
          await EmailStatus.create({
            campaign: campaign._id, // mongoose casts ObjectId
            recipient: email,
            status: "failed",
            error: {
              message: "Pre-validation failed (invalid format/domain or MX)",
            },
            attempts: 0,
            lastAttemptAt: new Date(),
          });
        } catch (werr) {
          console.warn(
            "[EmailStatus pre-fail write error]",
            werr?.message || werr
          );
        }
        continue; // don't enqueue this one
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

    // flush the tail
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

    // move to sending
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
 * 4) Campaign status — counts
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
 * 5) List failed recipients (paginated)
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
 * 6) Retry all failed recipients (optional) — only re-enqueue valid emails
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

    const validFailures = [];
    let skippedInvalidFailures = 0;

    // Validate again before retrying
    for (const f of failures) {
      const email = (f.recipient || "").trim();
      if (!email) {
        skippedInvalidFailures++;
        continue;
      }
      if (await isDeliverableEmail(email)) {
        validFailures.push({ recipient: email });
      } else {
        skippedInvalidFailures++;
      }
    }

    let retriedBatches = 0;
    for (let i = 0; i < validFailures.length; i += BATCH_SIZE) {
      const chunk = validFailures.slice(i, i + BATCH_SIZE);
      const recipients = chunk.map((f) => ({
        email: f.recipient,
        name: "",
        userId: null,
      }));

      await enqueueBatchEmail({
        campaignId: campaign._id.toString(),
        subject: campaign.subject,
        html: campaign.html,
        from: campaign.from,
        recipients,
      });
      retriedBatches++;
    }

    if (campaign.status === "completed" && validFailures.length) {
      campaign.status = "sending";
      await campaign.save();
    }

    return res.status(200).json({
      success: true,
      retriedBatches,
      retriedRecipients: validFailures.length,
      skippedInvalidFailures,
    });
  } catch (err) {
    console.error("[retryCampaignFailures] error:", err);
    return res.status(500).json({ error: "server error" });
  }
};
