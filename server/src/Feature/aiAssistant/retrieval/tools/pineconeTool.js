import { pineconeIndex } from "../../../embeddings/db/pinecone.js";
import { geminiEmbeddings } from "../../../embeddings/service/geminiEmbeddings.js";
import { pineconeToolSchema } from "./retrievalToolSchemas.js";

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

function normalizeMatch(match) {
  const metadata = match?.metadata ?? {};

  return {
    chunkId: metadata.chunkId ?? null,
    fileId: metadata.fileId ?? null,
    chunkKey: metadata.chunkKey ?? null,
    chunkType: metadata.chunkType ?? null,
    filePath: metadata.filePath ?? null,
    startLine: metadata.startLine ?? null,
    endLine: metadata.endLine ?? null,
    symbolId: metadata.symbolId ?? null,
    symbolName: metadata.symbolName ?? null,
    symbolType: metadata.symbolType ?? null,
    language: metadata.language ?? null,
    score: match?.score ?? null,
  };
}

async function searchPineconeTool({ repositoryId, ...input }) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  const validatedInput = pineconeToolSchema.parse(input);

  console.log(
    `[PINECONE TOOL] query="${validatedInput.query}" topK=${validatedInput.topK}`,
  );

  const queryEmbedding = await geminiEmbeddings.embedQuery(
    validatedInput.query,
  );

  const result = await pineconeIndex.query({
    vector: queryEmbedding,
    topK: validatedInput.topK,

    filter: {
      repositoryId: {
        $eq: safeRepositoryId,
      },
    },

    includeMetadata: true,
    includeValues: false,
  });

  const matches = (result.matches ?? [])
    .map(normalizeMatch)
    .filter((match) => match.chunkId);

  console.log(`[PINECONE TOOL] result count: ${matches.length}`);

  return matches;
}

export { searchPineconeTool };
