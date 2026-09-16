import { Worker } from "bullmq";
import path from "node:path";

import { workerRedis } from "../../../../config/redis.js";

import { scanRepository } from "../../service/repositoryScanner.js";
import { findRepositoryById } from "../../../linkGeting/Db_query/repositoryInsert.js";
import { updateRepositoryStatus } from "../../../linkGeting/Db_query/repositoryInsert.js";
import { createRepositoryFiles } from "../../Db_query/repositoryFiles.js";

const scanWorker = new Worker(
  "repository-scan",

  async (job) => {
    const { repositoryId } = job.data;

    console.log("Scan job received:", job.id);
    console.log("Repository ID:", repositoryId);

    const repository = await findRepositoryById(repositoryId);

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    console.log(`Repository found: ${repository.repository_name}`);

    const repositoryPath = path.resolve(
      process.cwd(),
      "storage",
      "repositories",
      repository.repository_name,
    );

    console.log(`Repository path: ${repositoryPath}`);

    const files = await scanRepository(repositoryPath);

    console.log(`Files found: ${files.length}`);
    const storedFiles = await createRepositoryFiles(repositoryId, files);

    console.log(
      `Stored ${storedFiles.length} files for ${repository.repository_name}`,
    );

    await updateRepositoryStatus(repositoryId, "scanned");

    return {
      repositoryId,
      fileCount: files.length,
    };
  },

  {
    connection: workerRedis,

    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
);

scanWorker.on("ready", () => {
  console.log("Scan worker is ready");
});

scanWorker.on("completed", (job) => {
  console.log(`Scan job ${job.id} completed`);
});

scanWorker.on("failed", (job, error) => {
  console.error(`Scan job ${job?.id} failed:`, error.message);
});

console.log("Starting scan worker...");
