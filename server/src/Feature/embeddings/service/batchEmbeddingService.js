import { geminiEmbeddings } from "./geminiEmbeddings.js";

const EMBEDDING_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_DIMENSION || 768,
);

export async function generateBatchEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  if (texts.some((text) => typeof text !== "string" || !text.trim())) {
    throw new Error("Every embedding input must be a non-empty string.");
  }

  const vectors = await geminiEmbeddings.embedDocuments(texts);

  if (vectors.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch. Expected ${texts.length}, received ${vectors.length}.`,
    );
  }

  for (const [index, vector] of vectors.entries()) {
    if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid embedding at index ${index}. Expected dimension ${EMBEDDING_DIMENSION}.`,
      );
    }
  }

  return vectors;
}
