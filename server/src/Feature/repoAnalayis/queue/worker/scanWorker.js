import { Worker } from "bullmq";
import path from "node:path";

import { workerRedis } from "../../../../config/redis.js";

import { scanRepository } from "../../service/repositoryScanner.js";

import {
  findRepositoryById,
  updateRepositoryStatus,
} from "../../../linkGeting/Db_query/repositoryInsert.js";

import {
  createRepositoryFiles,
  findAnalyzableFiles,
  updateFileAnalysisStatus,
} from "../../Db_query/repositoryFiles.js";

import { analyzeFile } from "../../../codeAnalysis/service/codeAnalyzer.js";

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

    try {
      // 1. Resolve local repository path
      const repositoryPath = path.resolve(
        process.cwd(),
        "storage",
        "repositories",
        repository.repository_name,
      );

      console.log(`Repository path: ${repositoryPath}`);

      // 2. Scan repository
      const files = await scanRepository(repositoryPath);

      console.log(`Files found: ${files.length}`);

      // 3. Store Phase 2 file inventory
      const storedFiles = await createRepositoryFiles(repositoryId, files);

      console.log(
        `Stored ${storedFiles.length} files for ${repository.repository_name}`,
      );

      // 4. Start Phase 3
      await updateRepositoryStatus(repositoryId, "analyzing");

      console.log(
        `Repository ${repository.repository_name} status changed to analyzing`,
      );

      // 5. Get files that can be analyzed
      const analyzableFiles = await findAnalyzableFiles(repositoryId);

      console.log(
        `Files selected for code analysis: ${analyzableFiles.length}`,
      );

      // 6. Analyze files one by one
      let completedCount = 0;
      let failedCount = 0;
      let unsupportedCount = 0;

      for (const file of analyzableFiles) {
        console.log(`Analyzing: ${file.relative_path}`);
        await updateFileAnalysisStatus(file.file_id, "processing");
        try {
          const result = await analyzeFile({
            repositoryPath,
            file,
          });
          if (!result.success) {
            await updateFileAnalysisStatus(
              file.file_id,
              result.status,
              result.error,
            );

            if (result.status === "unsupported") {
              unsupportedCount++;
            } else {
              failedCount++;
            }

            console.log(
              `Analysis not completed: ${file.relative_path} → ${result.status}`,
            );

            continue;
          }

          await updateFileAnalysisStatus(file.file_id, "completed");

          completedCount++;

          console.log(`Analysis completed: ${file.relative_path}`);
        } catch (error) {
          failedCount++;

          await updateFileAnalysisStatus(file.file_id, "failed", error.message);

          console.error(
            `Analysis failed: ${file.relative_path}`,
            error.message,
          );
        }
      }

      // 7. Repository analysis finished
      await updateRepositoryStatus(repositoryId, "analyzed");

      console.log(
        `Repository ${repository.repository_name} status changed to analyzed`,
      );

      console.log("Analysis summary:", {
        total: analyzableFiles.length,
        completed: completedCount,
        failed: failedCount,
        unsupported: unsupportedCount,
      });

      return {
        repositoryId,
        fileCount: files.length,
        analyzableFiles: analyzableFiles.length,
        analyzedFiles: completedCount,
        failedFiles: failedCount,
        unsupportedFiles: unsupportedCount,
      };
    } catch (error) {
      await updateRepositoryStatus(repositoryId, "failed");
      console.error(
        `Repository processing failed for ${repository.repository_name}:`,
        error.message,
      );

      throw error;
    }
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
