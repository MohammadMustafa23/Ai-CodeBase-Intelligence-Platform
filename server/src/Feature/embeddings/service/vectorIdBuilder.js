import crypto from "node:crypto";

export function buildVectorId({
  repositoryId,
  filePath,
  parentSymbolName,
  symbolName,
  chunkType,
  chunkIndex = 0,
}) {
  if (!repositoryId) {
    throw new Error("repositoryId is required.");
  }

  if (!filePath) {
    throw new Error("filePath is required.");
  }

  if (!symbolName && !filePath) {
    throw new Error("symbolName or filePath is required.");
  }

  const identity = [
    repositoryId,
    filePath,
    parentSymbolName || "",
    symbolName || "",
    chunkType || "",
    chunkIndex,
  ].join("|");

  const hash = crypto.createHash("sha256").update(identity).digest("hex");
  return `code-${hash}`;
}
