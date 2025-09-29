import Pino from "pino";
import pkg from "bullmq";
const { Worker } = pkg;

// Handle different BullMQ export shapes safely
const QueueScheduler =
  pkg.QueueScheduler ??
  (pkg.default && pkg.default.QueueScheduler) ??
  (pkg.Queue && pkg.Queue.QueueScheduler) ??
  null;

import Handlebars from "handlebars";
import mongoose from "mongoose";

import { connectToDatabase } from "../config/db.js";
import { createRedisConnection } from "../config/redisConnection.js";
import { sendBasicEmail } from "../config/sesClient.js";

import EmailCampaing from "../models/emailCampaingModel.js";
import EmailStatus from "../models/emailStatusModel.js";

const logger = Pino({ level: process.env.LOG_LEVEL || "info" });

/**
 * 1) Connect infrastructure (MongoDB, Redis)
 */
await connectToDatabase(process.env.MONGODB_URI);

const connection = createRedisConnection();
const queueName = process.env.EMAIL_QUEUE_NAME || "emailQueue";

/**
 * 2) (Optional) Start a QueueScheduler for delayed/repeatable jobs.
 *    Safe to run even if you never schedule jobs; it just won’t be used.
 */
async function initQueueScheduler() {
  if (!QueueScheduler) {
    logger.warn(
      "QueueScheduler not found in bullmq import — continuing without a scheduler"
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

/**
 * 3) Throughput controls:
 *    - limiter: max SES sends per second (global per worker)
 *    - concurrency: parallel jobs processed by this worker
 */
const maxSendsPerSecond = parseInt(
  process.env.SES_MAX_SENDS_PER_SECOND || "14",
  10
);
const concurrency = parseInt(process.env.SES_SEND_CONCURRENCY || "4", 10);

/**
 * 4) Worker: consumes "send-batch" jobs from Redis and sends emails.
 */
const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== "send-batch") {
      throw new Error(`Unexpected job type: ${job.name}`);
    }

    const { campaignId, subject, html, from, recipients } = job.data ?? {};

    // Basic validation to prevent silent no-ops
    if (!campaignId) throw new Error("campaignId is required");
    if (!subject) throw new Error("subject is required");
    if (!from) throw new Error("from is required");
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("recipients[] is required and must be non-empty");
    }

    const template = Handlebars.compile(html || "");
    const campaign = await EmailCampaing.findById(campaignId);

    let sent = 0;
    let failed = 0;

    // 4.a) Send personalized email to each recipient
    for (const r of recipients) {
      const to = r?.email;
      if (!to) {
        failed++;
        logger.warn({ r }, "Skipping recipient with missing email");
        continue;
      }

      // Personalize HTML using Handlebars (no unsubscribe footer)
      const personalizedHtml = template({
        name: r?.name,
        email: r?.email,
        userId: r?.userId,
      });

      try {
        const res = await sendBasicEmail({
          to,
          subject,
          html: personalizedHtml,
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
        logger.error({ err, to, campaignId }, "Email send failed");
        await EmailStatus.create({
          campaign: new mongoose.Types.ObjectId(campaignId),
          recipient: to,
          status: "failed",
          error: { message: err?.message, stack: err?.stack },
          attempts: 1,
          lastAttemptAt: new Date(),
        });
      }
    }

    // 4.b) Update campaign summary and completion flag
    if (campaign) {
      campaign.sentCount = (campaign.sentCount || 0) + sent;
      campaign.failedCount = (campaign.failedCount || 0) + failed;

      const processed = (campaign.sentCount || 0) + (campaign.failedCount || 0);
      if (campaign.totalRecipients && processed >= campaign.totalRecipients) {
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

/**
 * 5) Observability
 */
worker.on("completed", (job, result) => {
  logger.info({ jobId: job.id, result }, "send-batch completed");
});
worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "send-batch failed");
});

/**
 * 6) Graceful shutdown: close BullMQ, Redis, and Mongo cleanly.
 */
async function shutdown(signal) {
  try {
    logger.info({ signal }, "Shutting down worker...");
    await worker.close();
    try {
      await connection.quit();
    } catch {}
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
