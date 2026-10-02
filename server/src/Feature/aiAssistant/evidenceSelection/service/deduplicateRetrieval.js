function normalizePath(filePath) {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return null;
  }

  return filePath
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "");
}

function getCandidateKey(item) {
  if (item?.chunkId) {
    return `chunk:${item.chunkId}`;
  }

  if (item?.symbolId) {
    return `symbol:${item.symbolId}`;
  }

  const fileId = item?.fileId ?? null;
  const filePath = normalizePath(item?.filePath);

  if (fileId) {
    return `file:${fileId}`;
  }

  if (filePath) {
    return `file-path:${filePath}`;
  }

  const relationshipType = item?.metadata?.relationshipType ?? null;

  const sourceFileId = item?.metadata?.sourceFileId ?? null;

  const targetFileId = item?.metadata?.targetFileId ?? null;

  if (relationshipType && sourceFileId && targetFileId) {
    return ["relationship", sourceFileId, targetFileId, relationshipType].join(
      ":",
    );
  }

  return item?.candidateKey ?? null;
}

function mergeValue(currentValue, newValue) {
  if (
    currentValue === null ||
    currentValue === undefined ||
    currentValue === ""
  ) {
    return newValue;
  }

  return currentValue;
}

function mergeMetadata(currentMetadata = {}, newMetadata = {}) {
  return {
    ...currentMetadata,
    ...Object.fromEntries(
      Object.entries(newMetadata).filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      ),
    ),
  };
}

function mergeCandidate(current, incoming) {
  const retrievalSources = [
    ...(current.retrievalSources ?? []),
    incoming.retrievalSource,
  ].filter(Boolean);

  const uniqueRetrievalSources = [...new Set(retrievalSources)];

  return {
    ...current,

    fileId: mergeValue(current.fileId, incoming.fileId),

    filePath: mergeValue(current.filePath, incoming.filePath),

    fileName: mergeValue(current.fileName, incoming.fileName),

    extension: mergeValue(current.extension, incoming.extension),

    fileType: mergeValue(current.fileType, incoming.fileType),

    language: mergeValue(current.language, incoming.language),

    symbolId: mergeValue(current.symbolId, incoming.symbolId),

    symbolName: mergeValue(current.symbolName, incoming.symbolName),

    symbolType: mergeValue(current.symbolType, incoming.symbolType),

    parentSymbolId: mergeValue(current.parentSymbolId, incoming.parentSymbolId),

    signature: mergeValue(current.signature, incoming.signature),

    chunkId: mergeValue(current.chunkId, incoming.chunkId),

    chunkKey: mergeValue(current.chunkKey, incoming.chunkKey),

    chunkType: mergeValue(current.chunkType, incoming.chunkType),

    chunkIndex: mergeValue(current.chunkIndex, incoming.chunkIndex),

    startLine: current.startLine ?? incoming.startLine ?? null,

    endLine: current.endLine ?? incoming.endLine ?? null,

    score: current.score ?? incoming.score ?? null,

    sourceCode: current.sourceCode ?? incoming.sourceCode ?? null,

    retrievalSources: uniqueRetrievalSources,

    metadata: mergeMetadata(current.metadata, incoming.metadata),
  };
}

function deduplicateRetrievalResults(normalizedItems) {
  if (!Array.isArray(normalizedItems)) {
    return [];
  }

  const candidateMap = new Map();

  for (const item of normalizedItems) {
    if (!item) {
      continue;
    }

    const candidateKey = getCandidateKey(item);

    if (!candidateKey) {
      continue;
    }

    const existing = candidateMap.get(candidateKey);

    if (!existing) {
      candidateMap.set(candidateKey, {
        ...item,

        candidateKey,

        retrievalSources: item.retrievalSource ? [item.retrievalSource] : [],

        retrievalCount: 1,
      });

      continue;
    }

    const merged = mergeCandidate(existing, item);

    candidateMap.set(candidateKey, {
      ...merged,

      candidateKey,

      retrievalCount: (existing.retrievalCount ?? 1) + 1,
    });
  }

  return [...candidateMap.values()];
}

export { deduplicateRetrievalResults };
