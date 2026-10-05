import { readSourceFile } from "../../retrieval/tools/sourceReaderTool.js";

import { searchNeo4jTool } from "../../retrieval/tools/neo4jTool.js";

const MAX_SOURCE_CHARS = 12000;
const DEFAULT_GRAPH_DEPTH = 1;
const DEFAULT_GRAPH_LIMIT = 10;

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new TypeError("candidate is required");
  }

  if (
    typeof candidate.candidateId !== "string" ||
    candidate.candidateId.trim().length === 0
  ) {
    throw new TypeError("candidate.candidateId is required");
  }

  return candidate;
}

function validateEvidenceTypes(evidenceTypes) {
  if (!Array.isArray(evidenceTypes)) {
    throw new TypeError("evidenceTypes must be an array");
  }

  const allowedTypes = new Set(["code_source", "graph_context", "metadata"]);

  for (const evidenceType of evidenceTypes) {
    if (!allowedTypes.has(evidenceType)) {
      throw new Error(`Unsupported evidence type: ${evidenceType}`);
    }
  }

  return [...new Set(evidenceTypes)];
}

function buildMetadataEvidence(candidate) {
  return {
    candidateId: candidate.candidateId,
    candidateKey: candidate.candidateKey ?? null,
    entityType: candidate.entityType ?? null,
    fileId: candidate.fileId ?? null,
    filePath: candidate.filePath ?? null,
    fileName: candidate.fileName ?? null,
    extension: candidate.extension ?? null,
    fileType: candidate.fileType ?? null,
    language: candidate.language ?? null,
    symbolId: candidate.symbolId ?? null,
    symbolName: candidate.symbolName ?? null,
    symbolType: candidate.symbolType ?? null,
    parentSymbolId: candidate.parentSymbolId ?? null,
    signature: candidate.signature ?? null,
    chunkId: candidate.chunkId ?? null,
    chunkKey: candidate.chunkKey ?? null,
    chunkType: candidate.chunkType ?? null,
    chunkIndex: candidate.chunkIndex ?? null,
    startLine: candidate.startLine ?? null,
    endLine: candidate.endLine ?? null,
    score: candidate.score ?? null,
    retrievalSources: Array.isArray(candidate.retrievalSources)
      ? candidate.retrievalSources
      : [],
    retrievalCount: candidate.retrievalCount ?? 1,
  };
}

async function fetchCodeSource({ repositoryId, candidate }) {
  if (
    typeof candidate.filePath !== "string" ||
    candidate.filePath.trim().length === 0
  ) {
    throw new Error(
      `Source cannot be fetched for ${candidate.candidateId}: filePath is missing.`,
    );
  }

  const result = await readSourceFile({
    repositoryId,
    relativePath: candidate.filePath,
    startLine: candidate.startLine ?? undefined,
    endLine: candidate.endLine ?? undefined,
    maxChars: MAX_SOURCE_CHARS,
  });

  return {
    relativePath: result.relativePath ?? candidate.filePath,
    startLine: result.startLine ?? candidate.startLine ?? null,
    endLine: result.endLine ?? candidate.endLine ?? null,
    totalLines: result.totalLines ?? null,
    source: result.source ?? "",
    truncated: result.truncated ?? false,
  };
}

function resolveGraphOperation(candidate) {
  if (
    typeof candidate.filePath === "string" &&
    candidate.filePath.trim().length > 0
  ) {
    return {
      operation: "find_connections",
      name: candidate.filePath,
    };
  }

  if (
    typeof candidate.symbolName === "string" &&
    candidate.symbolName.trim().length > 0
  ) {
    return {
      operation: "find_symbol",
      name: candidate.symbolName,
    };
  }

  throw new Error(
    `Graph context cannot be fetched for ${candidate.candidateId}: filePath and symbolName are missing.`,
  );
}

async function fetchGraphContext({ repositoryId, candidate }) {
  const graphRequest = resolveGraphOperation(candidate);

  return searchNeo4jTool({
    repositoryId,
    operation: graphRequest.operation,
    name: graphRequest.name,
    depth: DEFAULT_GRAPH_DEPTH,
    limit: DEFAULT_GRAPH_LIMIT,
  });
}

async function fetchEvidenceForCandidate({
  repositoryId,
  candidate,
  evidenceTypes,
}) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  const safeCandidate = validateCandidate(candidate);

  const safeEvidenceTypes = validateEvidenceTypes(evidenceTypes);

  const evidence = {
    candidateId: safeCandidate.candidateId,
    candidateKey: safeCandidate.candidateKey ?? null,
    evidenceTypes: safeEvidenceTypes,
    codeSource: null,
    graphContext: null,
    metadata: null,
    errors: [],
  };

  const tasks = [];

  if (safeEvidenceTypes.includes("metadata")) {
    evidence.metadata = buildMetadataEvidence(safeCandidate);
  }

  if (safeEvidenceTypes.includes("code_source")) {
    tasks.push(
      fetchCodeSource({
        repositoryId: safeRepositoryId,
        candidate: safeCandidate,
      })
        .then((result) => {
          evidence.codeSource = result;
        })
        .catch((error) => {
          evidence.errors.push({
            type: "code_source",
            error: error.message,
          });
        }),
    );
  }

  if (safeEvidenceTypes.includes("graph_context")) {
    tasks.push(
      fetchGraphContext({
        repositoryId: safeRepositoryId,
        candidate: safeCandidate,
      })
        .then((result) => {
          evidence.graphContext = result;
        })
        .catch((error) => {
          evidence.errors.push({
            type: "graph_context",
            error: error.message,
          });
        }),
    );
  }

  await Promise.all(tasks);

  return evidence;
}

async function fetchEvidenceForCandidates({
  repositoryId,
  selectedCandidates = [],
}) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  if (!Array.isArray(selectedCandidates)) {
    throw new TypeError("selectedCandidates must be an array");
  }

  console.log(
    `[PHASE 9] Fetching evidence for ${selectedCandidates.length} selected candidate(s)`,
  );

  const results = await Promise.all(
    selectedCandidates.map(async (candidate) => {
      const evidenceTypes = Array.isArray(candidate.evidenceTypes)
        ? candidate.evidenceTypes
        : [];

      console.log(`[PHASE 9] Fetching evidence: ${candidate.candidateId}`);

      return fetchEvidenceForCandidate({
        repositoryId: safeRepositoryId,
        candidate,
        evidenceTypes,
      });
    }),
  );

  const errorCount = results.reduce(
    (count, result) => count + result.errors.length,
    0,
  );

  console.log(
    `[PHASE 9] Evidence fetch completed: ${results.length} candidate(s)`,
  );

  console.log(`[PHASE 9] Evidence fetch errors: ${errorCount}`);

  return results;
}

export { fetchEvidenceForCandidate, fetchEvidenceForCandidates };
