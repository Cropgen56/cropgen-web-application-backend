import Pino from "pino";
import pkg from "bullmq";
const { Worker } = pkg;
const QueueScheduler =
  pkg.QueueScheduler ??
  (pkg.default && pkg.default.QueueScheduler) ??
  (pkg.Queue && pkg.Queue.QueueScheduler) ??
  null;

import Handlebars from "handlebars";
import { connectToDatabase } from "../config/db.js";
import { createRedisConnection } from "../config/redisConnection.js";
import { sendBasicEmail } from "../config/sesClient.js";
import EmailCampaing from "../models/emailCampaingModel.js";
import EmailStatus from "../models/emailStatusModel.js";
import mongoose from "mongoose";

const logger = Pino({ level: process.env.LOG_LEVEL || "info" });

// DB first
await connectToDatabase(process.env.MONGODB_URI);

// Redis
const connection = createRedisConnection();
const queueName = process.env.EMAIL_QUEUE_NAME || "emailQueue";

// Try scheduler (optional)
async function initQueueScheduler() {
  if (!QueueScheduler) {
    logger.warn(
      "QueueScheduler not found on bullmq import — continuing without a scheduler"
    );
    return null;
  }
  try {
    const sched = new QueueScheduler(queueName, { connection });
    logger.info("QueueScheduler initialized");
    return sched;
  } catch (err) {
    logger.warn({ err }, "QueueScheduler init failed — continuing without it");
    return null;
  }
}
await initQueueScheduler();

const maxSendsPerSecond = parseInt(
  process.env.SES_MAX_SENDS_PER_SECOND || "14",
  10
);
const concurrency = parseInt(process.env.SES_SEND_CONCURRENCY || "4", 10);

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== "send-batch")
      throw new Error("Unexpected job type: " + job.name);

    const { campaignId, subject, html, from, recipients } = job.data;
    const template = Handlebars.compile(html || "");
    const campaign = await EmailCampaing.findById(campaignId);

    let sent = 0,
      failed = 0;

    for (const r of recipients) {
      const to = r.email;
      const personalHtml = template({
        name: r.name,
        email: r.email,
        userId: r.userId,
      });

      const unsubscribeToken = Buffer.from(`${campaignId}:${to}`).toString(
        "base64"
      );
      const unsubscribeUrl = `${
        process.env.APP_URL
      }/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const finalHtml = `${personalHtml}<hr/><p>If you don't want these emails, <a href="${unsubscribeUrl}">unsubscribe</a>.</p>`;

      try {
        const res = await sendBasicEmail({
          to,
          subject,
          html: finalHtml,
          from,
        });
        sent++;

        await EmailStatus.create({
          campaign: new mongoose.Types.ObjectId(campaignId),
          recipient: to,
          status: "sent",
          messageId: res?.MessageId,
          attempts: 1,
          lastAttemptAt: new Date(),
        });
      } catch (err) {
        failed++;
        logger.error({ err, to, campaignId }, "failed to send");
        await EmailStatus.create({
          campaign: new mongoose.Types.ObjectId(campaignId),
          recipient: to,
          status: "failed",
          error: { message: err.message, stack: err.stack },
          attempts: 1,
          lastAttemptAt: new Date(),
        });
      }
    }

    if (campaign) {
      campaign.sentCount = (campaign.sentCount || 0) + sent;
      campaign.failedCount = (campaign.failedCount || 0) + failed;

      if (
        campaign.sentCount + campaign.failedCount >=
        campaign.totalRecipients
      ) {
        campaign.status = "completed";
      }
      await campaign.save();
    }

    return { sent, failed };
  },
  {
    connection,
    concurrency,
    limiter: { max: maxSendsPerSecond, duration: 1000 },
  }
);

worker.on("completed", (job, result) =>
  logger.info({ jobId: job.id, result }, "batch completed")
);
worker.on("failed", (job, err) =>
  logger.error({ jobId: job.id, err }, "batch failed")
);

async function shutdown(signal) {
  try {
    logger.info({ signal }, "shutting down worker...");
    await worker.close();
    try {
      await connection.quit();
    } catch {}
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "error during shutdown");
    process.exit(1);
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
