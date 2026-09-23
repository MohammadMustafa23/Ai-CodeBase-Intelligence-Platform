import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY.");
}

const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

const dimension = Number(process.env.GEMINI_EMBEDDING_DIMENSION || 768);

if (!Number.isInteger(dimension) || dimension <= 0) {
  throw new Error("GEMINI_EMBEDDING_DIMENSION must be a positive integer.");
}

export const geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey,
  model,
  outputDimensionality: dimension,
  maxRetries: 3,
  maxConcurrency: 5,
});
