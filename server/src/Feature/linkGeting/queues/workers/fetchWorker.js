import { Worker } from "bullmq";
import { workerRedis } from "../../../../config/redis.js";
import { scanQueue } from "../../../repoAnalayis/queue/scanQueue.js";
import {
  findRepositoryById,
  updateRepositoryStatus,
} from "../../Db_query/repositoryInsert.js";

import { fetchRepository } from "../../services/repositoryFetcher.js";

const fetchWorker = new Worker(
  "repository-fetch",

  async (job) => {
    const { repositoryId } = job.data;

    console.log("Job received:", job.id);
    console.log("Repository ID:", repositoryId);

    const repository = await findRepositoryById(repositoryId);

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    try {
      // 1. Mark as fetching
      await updateRepositoryStatus(repositoryId, "fetching");

      console.log(
        `Repository ${repository.repository_name} status changed to fetching`,
      );

      // 2. Clone repository
      const repositoryPath = await fetchRepository({
        repositoryId: repository.repository_id,
        repositoryName: repository.repository_name,
        githubUrl: repository.github_url,
      });

      console.log(`Repository fetched successfully: ${repositoryPath}`);

      // 3. Mark as fetched
      await updateRepositoryStatus(repositoryId, "fetched");

      await scanQueue.add("scan-repository", {
        repositoryId,
      });

      console.log(
        `Repository ${repository.repository_name} status changed to fetched`,
      );

      return {
        repositoryId,
        repositoryPath,
      };
    } catch (error) {
      // 4. Mark as failed
      await updateRepositoryStatus(repositoryId, "failed");

      console.error(
        `Failed to fetch ${repository.repository_name}:`,
        error.message,
      );

      throw error;
    }
  },

  {
    connection: workerRedis,

    // Keep a failed job available for retry
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
);

fetchWorker.on("ready", () => {
  console.log("Fetch worker is ready");
});

fetchWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

fetchWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Starting fetch worker...");
