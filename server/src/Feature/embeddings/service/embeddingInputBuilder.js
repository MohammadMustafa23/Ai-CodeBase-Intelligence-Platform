export function buildEmbeddingText({
  symbolName,
  symbolType,
  chunkType,
  parentSymbolName,
  filePath,
  language,
  signature,
}) {
  const parts = [];

  if (symbolName) {
    parts.push(`Symbol: ${symbolName}`);
  }

  if (symbolType) {
    parts.push(`Symbol Type: ${symbolType}`);
  }

  if (chunkType) {
    parts.push(`Chunk Type: ${chunkType}`);
  }

  if (parentSymbolName) {
    parts.push(`Parent: ${parentSymbolName}`);
  }

  if (filePath) {
    parts.push(`File: ${filePath}`);
  }

  if (language) {
    parts.push(`Language: ${language}`);
  }

  if (signature) {
    parts.push(`Signature: ${signature}`);
  }

  if (parts.length === 0) {
    throw new Error(
      "Cannot build embedding text without semantic information.",
    );
  }

  return parts.join("\n");
}
