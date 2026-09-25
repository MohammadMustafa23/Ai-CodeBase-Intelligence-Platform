import { buildEmbeddingText } from "../service/embeddingInputBuilder.js";
import { generateBatchEmbeddings } from "../service/batchEmbeddingService.js";
import { buildVectorId } from "../service/vectorIdBuilder.js";
import { buildVectorMetadata } from "../service/vectorMetadataBuilder.js";

export async function buildPineconeRecords(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const embeddingTexts = chunks.map((chunk) =>
    buildEmbeddingText({
      symbolName: chunk.symbol_name,
      symbolType: chunk.symbol_type,
      chunkType: chunk.chunk_type,
      parentSymbolName: chunk.parent_symbol_name,
      filePath: chunk.file_path,
      language: chunk.language,
      signature: chunk.signature,
    }),
  );

  const embeddings = await generateBatchEmbeddings(embeddingTexts);

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Embedding count mismatch. ` +
        `Chunks: ${chunks.length}, Embeddings: ${embeddings.length}`,
    );
  }

  return chunks.map((chunk, index) => ({
    id: buildVectorId({
      repositoryId: chunk.repository_id,
      filePath: chunk.file_path,
      parentSymbolName: chunk.parent_symbol_name,
      symbolName: chunk.symbol_name,
      chunkType: chunk.chunk_type,
      chunkIndex: chunk.chunk_index,
    }),

    values: embeddings[index],

    metadata: buildVectorMetadata(chunk),
  }));
}
