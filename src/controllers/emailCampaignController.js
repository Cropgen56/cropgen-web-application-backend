import EmailCampaing from "../models/emailCampaingModel.js";
import User from "../models/usersModel.js";
import { enqueueBatchEmail } from "../utils/emailQueue.js";

const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "100", 10);

export const createCampaign = async (req, res) => {
  try {
    const { name, subject, html, from, segment } = req.body;
    if (!name || !subject || !html || !from)
      return res.status(400).json({ error: "Missing fields" });

    // sanitize html if you want (recommend installing sanitize-html); here we assume admin trusted input
    const campaign = await EmailCampaing.create({
      name,
      subject,
      html,
      from,
      segment: segment || null,
      status: "draft",
    });
    return res.status(201).json({ success: true, campaign });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
};

export const startCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaing.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    const filter = campaign.segment || {};
    const total = await User.countDocuments(filter);
    if (total === 0) return res.status(400).json({ error: "no recipients" });

    campaign.totalRecipients = total;
    campaign.status = "queued";
    await campaign.save();  

    // stream recipients to avoid memory overload
    const cursor = User.find(filter).cursor();
    let batch = [],
      enqueued = 0;
    for await (const user of cursor) {
      batch.push({
        email: user.email,
        name: user.firstName || user.name || "",
        userId: user._id,
      });
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

    campaign.enqueuedBatches = enqueued;
    campaign.status = "sending";
    await campaign.save();

    return res.status(200).json({
      success: true,
      totalRecipients: total,
      enqueuedBatches: enqueued,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
};

export const getCampaignStatus = async (req, res) => {
  try {
    const campaign = await EmailCampaing.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign not found" });
    return res.status(200).json({ campaign });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
};
