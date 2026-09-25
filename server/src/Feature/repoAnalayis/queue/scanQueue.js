import { Queue } from "bullmq";
import { redis } from "../../../config/redis.js";

export const scanQueue = new Queue("repository-scan", {
  connection: redis,
});

export async function scheduleEmbeddingRetry({ repositoryId, retryAt }) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  if (!retryAt) {
    throw new Error("retryAt is required.");
  }

  const retryTime = new Date(retryAt).getTime();

  if (Number.isNaN(retryTime)) {
    throw new Error("Invalid retryAt value.");
  }

  const delay = Math.max(0, retryTime - Date.now());

  await scanQueue.add(
    "embedding-retry",
    {
      repositoryId,
      type: "embedding-retry",
    },
    {
      delay,

      // Prevent duplicate jobs for the same repository
      // and retry time.
      jobId: `embedding-retry-${repositoryId}-${retryTime}`,

      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}
