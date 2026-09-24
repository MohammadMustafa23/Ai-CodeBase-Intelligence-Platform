import { pineconeIndex } from "../db/pinecone.js";

const EMBEDDING_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_DIMENSION || 768,
);

const MAX_BATCH_SIZE = 100;

export async function upsertEmbeddingVectors(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  if (records.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Too many vectors in one upsert. Maximum is ${MAX_BATCH_SIZE}.`,
    );
  }

  for (const record of records) {
    if (!record?.id) {
      throw new Error("Every Pinecone record must have an id.");
    }

    if (!Array.isArray(record.values)) {
      throw new Error(`Missing vector values for record: ${record.id}`);
    }

    if (record.values.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid vector dimension for ${record.id}. ` +
          `Expected ${EMBEDDING_DIMENSION}, received ${record.values.length}.`,
      );
    }

    if (!record.metadata?.repositoryId) {
      throw new Error(`Missing repositoryId metadata for ${record.id}.`);
    }
  }

  await pineconeIndex.upsert(records);
}
