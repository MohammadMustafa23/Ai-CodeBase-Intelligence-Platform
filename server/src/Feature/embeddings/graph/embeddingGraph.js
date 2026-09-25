import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";

import * as z from "zod";

import { buildPineconeRecords } from "../actualserviceBuillder/pineconeRecordBuilder.js";

import {
  claimEmbeddingChunks,
  markEmbeddingChunksCompleted,
  markEmbeddingChunksFailed,
} from "../Db_query/embeddingChunks.js";

import { upsertEmbeddingVectors } from "../service/pineconeUpsertService.js";

const EmbeddingState = new StateSchema({
  repositoryId: z.string(),

  // Normal processing batch
  batchSize: z.number().default(50),

  // Current 50 chunks
  currentChunks: z.array(z.any()).default([]),

  // Statistics
  processedCount: z.number().default(0),
  failedCount: z.number().default(0),

  lastError: z.string().nullable().default(null),

  status: z.enum(["idle", "processing", "completed"]).default("idle"),
});

async function getBatchNode(state) {
  const chunks = await claimEmbeddingChunks({
    repositoryId: state.repositoryId,
    limit: state.batchSize,
  });

  console.log(`[Embedding] Claimed ${chunks.length} chunks`);

  if (!chunks.length) {
    return {
      currentChunks: [],
      status: "completed",
    };
  }

  return {
    currentChunks: chunks,
    lastError: null,
    status: "processing",
  };
}

async function processBatchNode(state) {
  const chunks = state.currentChunks;

  if (!chunks.length) {
    return {
      status: "completed",
    };
  }

  const chunkIds = chunks.map((chunk) => chunk.chunk_id);

  try {
    console.log(`[Embedding] Processing ${chunks.length} chunks`);

    // Generate embeddings
    const records = await buildPineconeRecords(chunks);

    // Store vectors
    await upsertEmbeddingVectors(records);

    // Only after Pinecone succeeds
    await markEmbeddingChunksCompleted({
      chunkIds,
      embeddingModel:
        process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
      embeddingVersion: process.env.GEMINI_EMBEDDING_VERSION || "1",
    });

    console.log(`[Embedding] Completed ${chunks.length} chunks`);

    return {
      currentChunks: [],

      processedCount: state.processedCount + chunks.length,

      lastError: null,

      status: "processing",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[Embedding] Batch failed: ${message}`);

    // Entire 50-chunk batch becomes failed.
    // It will be handled by the retry flow later.
    await markEmbeddingChunksFailed({
      chunkIds,
      error: message,
    });

    return {
      currentChunks: [],

      failedCount: state.failedCount + chunks.length,

      lastError: message,

      status: "processing",
    };
  }
}

function routeAfterGetBatch(state) {
  if (!state.currentChunks.length) {
    return "done";
  }

  return "processBatch";
}

const graph = new StateGraph(EmbeddingState)
  .addNode("getBatch", getBatchNode)
  .addNode("processBatch", processBatchNode)
  .addEdge(START, "getBatch")

  .addConditionalEdges("getBatch", routeAfterGetBatch, {
    processBatch: "processBatch",
    done: END,
  })
  .addEdge("processBatch", "getBatch")
  .compile();

export { graph };
