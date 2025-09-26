import pkg from "bullmq";
const { Queue } = pkg;

import { createRedisConnection } from "../config/redisConnection.js";

const connection = createRedisConnection();
export const EMAIL_QUEUE_NAME = process.env.EMAIL_QUEUE_NAME || "emailQueue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 10000,
  },
});

export async function enqueueBatchEmail(payload) {
  const jobId = `campaign-${
    payload.campaignId
  }-batch-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return emailQueue.add("send-batch", payload, { jobId });
}
