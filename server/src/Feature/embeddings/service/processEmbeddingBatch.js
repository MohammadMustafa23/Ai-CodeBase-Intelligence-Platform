import { graph } from "../graph/embeddingGraph.js";

export async function processEmbeddingBatch({ repositoryId, batchSize = 50 }) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  const result = await graph.invoke(
    {
      repositoryId,
      batchSize,

      currentChunks: [],

      processedCount: 0,
      failedCount: 0,

      lastError: null,
      status: "idle",
    },
    {
      recursionLimit: 500,
    },
  );

  return {
    success: true,
    status: result.status,
    processedCount: result.processedCount,
    failedCount: result.failedCount,
    lastError: result.lastError,
  };
}
