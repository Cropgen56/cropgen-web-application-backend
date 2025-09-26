import Pino from "pino";
import pkg from "bullmq";
const { Worker } = pkg;
// try to get QueueScheduler from different possible shapes
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

// Connect to Mongo before starting worker
await connectToDatabase(process.env.MONGODB_URI);

// create redis connection (ioredis)
const connection = createRedisConnection();
const queueName = process.env.EMAIL_QUEUE_NAME || "emailQueue";

// Try to create QueueScheduler safely (some bundlers / CommonJS interop export it differently)
async function initQueueScheduler() {
  if (!QueueScheduler) {
    logger.warn(
      "QueueScheduler not found on bullmq import — continuing without a scheduler"
    );
    return null;
  }

  try {
    // first try as constructor (most common)
    const sched = new QueueScheduler(queueName, { connection });
    logger.info("QueueScheduler initialized (constructor)");
    return sched;
  } catch (e1) {
    logger.debug(
      { err: e1 },
      "QueueScheduler constructor failed, trying as function"
    );
    try {
      // try invoking as function (some builds export a function)
      const sched = QueueScheduler(queueName, { connection });
      logger.info("QueueScheduler initialized (function)");
      return sched;
    } catch (e2) {
      logger.warn(
        { e1, e2 },
        "QueueScheduler could not be initialized — continuing without a scheduler"
      );
      return null;
    }
  }
}

// initialize scheduler (no crash if it fails)
await initQueueScheduler();

const maxSendsPerSecond = parseInt(
  process.env.SES_MAX_SENDS_PER_SECOND || "14",
  10
);
const concurrency = parseInt(process.env.SES_SEND_CONCURRENCY || "4", 10);

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== "send-batch") {
      throw new Error("Unexpected job type: " + job.name);
    }

    const { campaignId, subject, html, from, recipients } = job.data;
    const template = Handlebars.compile(html || "");

    const campaign = await EmailCampaing.findById(campaignId);

    let sent = 0;
    let failed = 0;

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

        // record success (best-effort)
        try {
          await EmailStatus.create({
            campaign: mongoose.Types.ObjectId(campaignId),
            recipient: to,
            status: "sent",
            messageId: res?.MessageId,
            attempts: 1,
            lastAttemptAt: new Date(),
          });
        } catch (dbErr) {
          logger.warn(
            { err: dbErr, to, campaignId },
            "failed to write EmailStatus for sent message"
          );
        }
      } catch (err) {
        failed++;
        logger.error({ err, to, campaignId }, "failed to send");

        try {
          await EmailStatus.create({
            campaign: mongoose.Types.ObjectId(campaignId),
            recipient: to,
            status: "failed",
            error: { message: err.message, stack: err.stack },
            attempts: 1,
            lastAttemptAt: new Date(),
          });
        } catch (dbErr) {
          logger.warn(
            { err: dbErr, to, campaignId },
            "failed to write EmailStatus for failure"
          );
        }

        // continue with next recipient
      }
    }

    // update campaign counters
    if (campaign) {
      campaign.sentCount = (campaign.sentCount || 0) + sent;
      campaign.failedCount = (campaign.failedCount || 0) + failed;
      if (
        campaign.sentCount + campaign.failedCount >=
        campaign.totalRecipients
      ) {
        campaign.status = "completed";
      }
      try {
        await campaign.save();
      } catch (saveErr) {
        logger.error(
          { err: saveErr, campaignId },
          "failed to update campaign counts"
        );
      }
    }

    return { sent, failed };
  },
  {
    connection,
    concurrency,
    limiter: { max: maxSendsPerSecond, duration: 1000 },
  }
);

// events
worker.on("completed", (job, result) => {
  logger.info({ jobId: job.id, result }, "batch completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job.id, err }, "batch failed");
});

// graceful shutdown
async function shutdown(signal) {
  try {
    logger.info({ signal }, "shutting down worker...");
    await worker.close();
    try {
      await connection.quit();
    } catch (e) {
      logger.warn({ err: e }, "error while quitting redis connection");
    }
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "error during shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException - exiting");
  shutdown("uncaughtException");
});
