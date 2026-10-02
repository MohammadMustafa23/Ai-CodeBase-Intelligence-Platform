function getFileName(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return null;
  }

  return filePath.split("/").pop() ?? null;
}

function getLogicalCandidateKey({
  fileId = null,
  filePath = null,
  symbolId = null,
  chunkId = null,
  startLine = null,
  endLine = null,
}) {
  if (chunkId) {
    return `chunk:${chunkId}`;
  }

  if (symbolId) {
    return `symbol:${symbolId}`;
  }

  if (fileId) {
    if (startLine !== null || endLine !== null) {
      return `file:${fileId}:${startLine ?? 1}:${endLine ?? ""}`;
    }

    return `file:${fileId}`;
  }

  if (filePath) {
    if (startLine !== null || endLine !== null) {
      return `path:${filePath}:${startLine ?? 1}:${endLine ?? ""}`;
    }

    return `path:${filePath}`;
  }

  return null;
}

function normalizePostgresItem(item) {
  const fileId = item?.file_id ?? null;

  const filePath = item?.relative_path ?? item?.file_path ?? null;

  const symbolId = item?.symbol_id ?? null;

  const chunkId = item?.chunk_id ?? null;

  const startLine = item?.start_line ?? null;

  const endLine = item?.end_line ?? null;

  return {
    candidateKey: getLogicalCandidateKey({
      fileId,
      filePath,
      symbolId,
      chunkId,
      startLine,
      endLine,
    }),

    retrievalSource: "POSTGRESQL",

    entityType: chunkId ? "chunk" : symbolId ? "symbol" : "file",

    fileId,

    filePath,

    fileName: item?.file_name ?? getFileName(filePath),

    extension: item?.extension ?? null,

    fileType: item?.file_type ?? null,

    language: item?.language ?? null,

    symbolId,

    symbolName: item?.symbol_name ?? null,

    symbolType: item?.symbol_type ?? null,

    parentSymbolId: item?.parent_symbol_id ?? null,

    signature: item?.signature ?? null,

    chunkId,

    chunkKey: item?.chunk_key ?? null,

    chunkType: item?.chunk_type ?? null,

    chunkIndex: item?.chunk_index ?? null,

    startLine,

    endLine,

    score: null,

    sourceCode: null,

    metadata: {
      sizeBytes: item?.size_bytes ?? null,

      lineCount: item?.line_count ?? null,

      analysisStatus: item?.analysis_status ?? null,

      analyzedAt: item?.analyzed_at ?? null,
    },
  };
}

function normalizePineconeItem(item) {
  const fileId = item?.fileId ?? null;

  const filePath = item?.filePath ?? null;

  const symbolId = item?.symbolId ?? null;

  const chunkId = item?.chunkId ?? null;

  const startLine = item?.startLine ?? null;

  const endLine = item?.endLine ?? null;

  return {
    candidateKey: getLogicalCandidateKey({
      fileId,
      filePath,
      symbolId,
      chunkId,
      startLine,
      endLine,
    }),

    retrievalSource: "PINECONE",

    entityType: chunkId ? "chunk" : symbolId ? "symbol" : "file",

    fileId,

    filePath,

    fileName: getFileName(filePath),

    extension: null,

    fileType: null,

    language: item?.language ?? null,

    symbolId,

    symbolName: item?.symbolName ?? null,

    symbolType: item?.symbolType ?? null,

    parentSymbolId: null,

    signature: null,

    chunkId,

    chunkKey: item?.chunkKey ?? null,

    chunkType: item?.chunkType ?? null,

    chunkIndex: null,

    startLine,

    endLine,

    score: item?.score ?? null,

    sourceCode: null,

    metadata: {},
  };
}

function normalizeNeo4jItem(item) {
  const fileId =
    item?.fileId ?? item?.sourceFileId ?? item?.targetFileId ?? null;

  const filePath =
    item?.filePath ?? item?.sourceFile ?? item?.targetFile ?? null;

  const symbolId = item?.symbolId ?? null;

  const startLine = item?.startLine ?? null;

  const endLine = item?.endLine ?? null;

  return {
    candidateKey: getLogicalCandidateKey({
      fileId,
      filePath,
      symbolId,
      startLine,
      endLine,
    }),

    retrievalSource: "NEO4J",

    entityType: symbolId ? "symbol" : "file",

    fileId,

    filePath,

    fileName: getFileName(filePath),

    extension: null,

    fileType: null,

    language: null,

    symbolId,

    symbolName: item?.symbolName ?? null,

    symbolType: item?.symbolType ?? null,

    parentSymbolId: null,

    signature: item?.signature ?? null,

    chunkId: null,

    chunkKey: null,

    chunkType: null,

    chunkIndex: null,

    startLine,

    endLine,

    score: null,

    sourceCode: null,

    metadata: {
      relationshipType: item?.relationshipType ?? null,

      resolutionStatus: item?.resolutionStatus ?? null,

      sourceFileId: item?.sourceFileId ?? null,

      sourceFile: item?.sourceFile ?? null,

      targetFileId: item?.targetFileId ?? null,

      targetFile: item?.targetFile ?? null,
    },
  };
}

function normalizeSourceReaderItem(item) {
  const filePath = item?.relativePath ?? null;

  const startLine = item?.startLine ?? null;

  const endLine = item?.endLine ?? null;

  return {
    candidateKey: getLogicalCandidateKey({
      filePath,
      startLine,
      endLine,
    }),

    retrievalSource: "SOURCE_READER",

    entityType: "source",

    fileId: null,

    filePath,

    fileName: getFileName(filePath),

    extension: null,

    fileType: null,

    language: null,

    symbolId: null,

    symbolName: null,

    symbolType: null,

    parentSymbolId: null,

    signature: null,

    chunkId: null,

    chunkKey: null,

    chunkType: null,

    chunkIndex: null,

    startLine,

    endLine,

    score: null,

    sourceCode: item?.source ?? null,

    metadata: {
      totalLines: item?.totalLines ?? null,

      truncated: item?.truncated ?? false,
    },
  };
}

function normalizeToolResult(toolResult) {
  const toolName = toolResult?.tool;

  if (!toolResult?.success) {
    return {
      items: [],

      error: {
        tool: toolName ?? null,
        toolCallId: toolResult?.toolCallId ?? null,
        error: toolResult?.error ?? "Unknown retrieval error.",
      },
    };
  }

  const rawResult = toolResult.result;

  if (!rawResult) {
    return {
      items: [],
      error: null,
    };
  }

  const items = Array.isArray(rawResult) ? rawResult : [rawResult];

  if (items.length === 0) {
    return {
      items: [],
      error: null,
    };
  }

  let normalizedItems = [];

  switch (toolName) {
    case "POSTGRESQL":
      normalizedItems = items.map(normalizePostgresItem);
      break;

    case "PINECONE":
      normalizedItems = items.map(normalizePineconeItem);
      break;

    case "NEO4J":
      normalizedItems = items.map(normalizeNeo4jItem);
      break;

    case "SOURCE_READER":
      normalizedItems = items.map(normalizeSourceReaderItem);
      break;

    default:
      return {
        items: [],
        error: {
          tool: toolName,
          toolCallId: toolResult?.toolCallId ?? null,
          error: `Unsupported retrieval tool: ${toolName}`,
        },
      };
  }

  return {
    items: normalizedItems.filter((item) => item.candidateKey),

    error: null,
  };
}

function normalizeRetrievalResults(retrievalResult) {
  if (!retrievalResult) {
    return {
      items: [],
      errors: [],
    };
  }

  const toolResults = Array.isArray(retrievalResult.results)
    ? retrievalResult.results
    : [];

  const normalizedItems = [];
  const errors = [];

  for (const toolResult of toolResults) {
    const normalized = normalizeToolResult(toolResult);

    normalizedItems.push(...normalized.items);

    if (normalized.error) {
      errors.push(normalized.error);
    }
  }

  return {
    items: normalizedItems,
    errors,
  };
}

export { normalizeRetrievalResults };
