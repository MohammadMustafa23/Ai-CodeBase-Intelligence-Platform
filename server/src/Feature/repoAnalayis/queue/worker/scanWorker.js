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

import { analyzeRepositoryRelationships } from "../../../relationshipAnalysis/service/relationshipAnalyzer.js";

import { buildKnowledgeGraph } from "../../../knowledgeGraph/service/graphBuilder.js";

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
      // ==========================================
      // Repository Path
      // ==========================================

      const repositoryPath = path.resolve(
        process.cwd(),
        "storage",
        "repositories",
        repository.repository_name,
      );

      console.log(`Repository path: ${repositoryPath}`);

      // ==========================================
      // PHASE 2
      // Repository Scan
      // ==========================================

      await updateRepositoryStatus(repositoryId, "scanning");

      console.log(
        `Repository ${repository.repository_name} status changed to scanning`,
      );

      const files = await scanRepository(repositoryPath);

      console.log(`Files found: ${files.length}`);

      const storedFiles = await createRepositoryFiles(repositoryId, files);

      console.log(
        `Stored ${storedFiles.length} files for ${repository.repository_name}`,
      );

      // ==========================================
      // PHASE 3
      // Static Code Analysis
      // ==========================================

      await updateRepositoryStatus(repositoryId, "analyzing");

      console.log(
        `Repository ${repository.repository_name} status changed to analyzing`,
      );

      const analyzableFiles = await findAnalyzableFiles(repositoryId);

      console.log(
        `Files selected for code analysis: ${analyzableFiles.length}`,
      );

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

      console.log(`Phase 3 completed for ${repository.repository_name}`);

      console.log("Analysis summary:", {
        total: analyzableFiles.length,
        completed: completedCount,
        failed: failedCount,
        unsupported: unsupportedCount,
      });

      // ==========================================
      // PHASE 4
      // Relationship Analysis
      // ==========================================

      console.log(
        `Starting Phase 4 relationship analysis for ${repository.repository_name}`,
      );

      const relationshipResult =
        await analyzeRepositoryRelationships(repositoryId);

      console.log(`Phase 4 completed for ${repository.repository_name}`);

      console.log("Relationship summary:", {
        totalReferences: relationshipResult.totalReferences,

        processed: relationshipResult.processed,

        resolved: relationshipResult.resolved,

        unresolved: relationshipResult.unresolved,

        external: relationshipResult.external,
      });

      // ==========================================
      // PHASE 5
      // Knowledge Graph
      // ==========================================

      console.log(
        `Starting Phase 5 knowledge graph build for ${repository.repository_name}`,
      );

      const graphResult = await buildKnowledgeGraph(repositoryId);

      console.log(
        `Phase 5 knowledge graph completed for ${repository.repository_name}`,
      );

      console.log("Knowledge graph summary:", {
        files: graphResult.fileCount,
        symbols: graphResult.symbolCount,
        relationships: graphResult.relationshipCount,
      });

      // ==========================================
      // REPOSITORY READY
      // ==========================================

      await updateRepositoryStatus(repositoryId, "ready");

      console.log(
        `Repository ${repository.repository_name} status changed to ready`,
      );

      return {
        repositoryId,

        fileCount: files.length,

        analyzableFiles: analyzableFiles.length,

        analyzedFiles: completedCount,

        failedFiles: failedCount,

        unsupportedFiles: unsupportedCount,

        relationships: {
          totalReferences: relationshipResult.totalReferences,
          processed: relationshipResult.processed,
          resolved: relationshipResult.resolved,
          unresolved: relationshipResult.unresolved,
          external: relationshipResult.external,
        },

        graph: {
          files: graphResult.fileCount,
          symbols: graphResult.symbolCount,
          relationships: graphResult.relationshipCount,
        },
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

// ==========================================
// Worker Events
// ==========================================

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
