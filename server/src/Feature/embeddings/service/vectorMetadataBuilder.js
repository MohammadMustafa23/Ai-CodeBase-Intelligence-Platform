export function buildVectorMetadata(chunk) {
  if (!chunk?.repository_id) {
    throw new Error("repository_id is required.");
  }

  if (!chunk?.chunk_id) {
    throw new Error("chunk_id is required.");
  }

  const metadata = {
    repositoryId: chunk.repository_id,
    chunkId: chunk.chunk_id,
    fileId: chunk.file_id,
    chunkKey: chunk.chunk_key,
    chunkType: chunk.chunk_type,
    filePath: chunk.file_path,
    startLine: chunk.start_line,
    endLine: chunk.end_line,
    chunkHash: chunk.chunk_hash,
  };

  if (chunk.symbol_id) {
    metadata.symbolId = chunk.symbol_id;
  }

  if (chunk.symbol_name) {
    metadata.symbolName = chunk.symbol_name;
  }

  if (chunk.symbol_type) {
    metadata.symbolType = chunk.symbol_type;
  }

  if (chunk.parent_symbol_name) {
    metadata.parentSymbolName = chunk.parent_symbol_name;
  }

  if (chunk.language) {
    metadata.language = chunk.language;
  }

  return metadata;
}
