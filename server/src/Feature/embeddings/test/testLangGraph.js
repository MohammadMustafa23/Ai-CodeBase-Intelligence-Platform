import { graph } from "../graph/embeddingGraph.js";
import { pineconeIndex } from "../db/pinecone.js";

const repositoryId = "23e93f48-f5cb-4d0d-a9fc-4c53562a5638";

if (!repositoryId) {
  throw new Error("Missing TEST_REPOSITORY_ID in .env");
}

async function main() {
  console.log("========================================");
  console.log("      PHASE 7 LANGGRAPH TEST");
  console.log("========================================");

  console.log("\nRepository ID:");
  console.log(repositoryId);

  console.log("\nStarting embedding workflow...\n");

  const result = await graph.invoke({
    repositoryId,

    // PostgreSQL fetch batch
    batchSize: 100,

    // Gemini embedding API batch
    embeddingBatchSize: 25,

    lastProcessedChunkId: null,

    currentChunks: [],
    currentRecords: [],
    pendingBatches: [],

    processedCount: 0,
    failedCount: 0,

    lastError: null,
    status: "idle",
  });

  console.log("\n========================================");
  console.log("         LANGGRAPH FINISHED");
  console.log("========================================");

  console.log("Status:", result.status);
  console.log("Processed:", result.processedCount);
  console.log("Failed:", result.failedCount);
  console.log("Last Error:", result.lastError);

  console.log("\n========================================");
  console.log("         PINECONE CHECK");
  console.log("========================================");

  const stats = await pineconeIndex.describeIndexStats();

  console.log("Pinecone vector count:");
  console.log(stats.totalRecordCount);

  console.log("\n========================================");
  console.log("             TEST DONE");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\nPhase 7 test failed:");
  console.error(error);
  process.exit(1);
});
