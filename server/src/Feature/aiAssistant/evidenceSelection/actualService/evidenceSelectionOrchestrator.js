import { normalizeRetrievalResults } from "../service/normalizeRetrieval.js";

import { deduplicateRetrievalResults } from "../service/deduplicateRetrieval.js";

import { buildCandidateCards } from "../service/buildCandidateCards.js";

import { selectCandidates } from "../service/selectionService.js";

import { fetchEvidenceForCandidates } from "../service/evidenceFetchService.js";

function validateRetrievalResult(retrievalResult) {
  if (!retrievalResult || typeof retrievalResult !== "object") {
    throw new TypeError("retrievalResult is required");
  }

  if (!Array.isArray(retrievalResult.results)) {
    throw new TypeError("retrievalResult.results must be an array");
  }

  return retrievalResult;
}

function validateQuestion(question) {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new TypeError("question must be a non-empty string");
  }

  return question.trim();
}

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

function validateSelectionModel(selectionModel) {
  if (!selectionModel || typeof selectionModel.invoke !== "function") {
    throw new TypeError("A valid selectionModel with invoke() is required");
  }

  return selectionModel;
}

function buildSelectedCandidates({ selection, candidateCards }) {
  const candidateMap = new Map(
    candidateCards.map((candidate) => [candidate.candidateId, candidate]),
  );

  return selection.selectedCandidates
    .map((selected) => {
      const candidate = candidateMap.get(selected.candidateId);

      if (!candidate) {
        return null;
      }

      return {
        ...candidate,
        evidenceTypes: selected.evidenceTypes,
      };
    })
    .filter(Boolean);
}

function buildEvidencePackage({
  repositoryId,
  question,
  context,
  selectedCandidates,
  evidenceResults,
  retrievalErrors,
}) {
  const evidenceErrors = evidenceResults.flatMap((result) =>
    Array.isArray(result.errors)
      ? result.errors.map((error) => ({
          candidateId: result.candidateId,
          ...error,
        }))
      : [],
  );

  return {
    status: "READY",
    repositoryId,
    question,
    context,
    selectedCandidates,
    evidence: evidenceResults,
    errors: [
      ...retrievalErrors.map((error) => ({
        stage: "retrieval",
        ...error,
      })),
      ...evidenceErrors.map((error) => ({
        stage: "evidence",
        ...error,
      })),
    ],
  };
}

async function processEvidenceSelection({
  repositoryId,
  question,
  context = null,
  retrievalResult,
  selectionModel,
}) {
  console.log("\n========================================");

  console.log("[PHASE 9] Evidence selection started");

  console.log("========================================");

  const safeRepositoryId = validateRepositoryId(repositoryId);

  const safeQuestion = validateQuestion(question);

  const safeRetrievalResult = validateRetrievalResult(retrievalResult);

  const safeSelectionModel = validateSelectionModel(selectionModel);

  console.log(`[PHASE 9] Repository ID: ${safeRepositoryId}`);

  console.log(`[PHASE 9] Question: ${safeQuestion}`);

  console.log(
    `[PHASE 9] Raw tool results: ${safeRetrievalResult.results.length}`,
  );

  console.log("[PHASE 9] Step 1: Normalizing retrieval results");

  const normalizedRetrieval = normalizeRetrievalResults(safeRetrievalResult);

  console.log(
    `[PHASE 9] Normalized items: ${normalizedRetrieval.items.length}`,
  );

  console.log(
    `[PHASE 9] Normalization errors: ${normalizedRetrieval.errors.length}`,
  );

  console.log("[PHASE 9] Step 2: Deduplicating retrieval results");

  const deduplicatedCandidates = deduplicateRetrievalResults(
    normalizedRetrieval.items,
  );

  console.log(
    `[PHASE 9] Deduplicated candidates: ${deduplicatedCandidates.length}`,
  );

  console.log("[PHASE 9] Step 3: Building candidate cards");

  const candidateCards = buildCandidateCards(deduplicatedCandidates);

  console.log(`[PHASE 9] Candidate cards: ${candidateCards.length}`);

  if (candidateCards.length === 0) {
    console.log("[PHASE 9] No candidates available for selection");

    console.log("[PHASE 9] Evidence selection completed with no evidence");

    console.log("========================================\n");

    return {
      status: "NO_EVIDENCE",
      repositoryId: safeRepositoryId,
      question: safeQuestion,
      context,
      rawRetrieval: safeRetrievalResult,
      normalized: normalizedRetrieval,
      deduplicated: deduplicatedCandidates,
      candidateCards,
      selection: {
        selectedCandidates: [],
      },
      selectedCandidates: [],
      evidencePackage: {
        status: "NO_EVIDENCE",
        repositoryId: safeRepositoryId,
        question: safeQuestion,
        context,
        selectedCandidates: [],
        evidence: [],
        errors: normalizedRetrieval.errors.map((error) => ({
          stage: "retrieval",
          ...error,
        })),
      },
    };
  }

  console.log("[PHASE 9] Step 4: Running Selection LLM");

  const selection = await selectCandidates({
    model: safeSelectionModel,
    question: safeQuestion,
    context,
    candidateCards,
  });

  console.log(
    `[PHASE 9] Selected candidates: ${selection.selectedCandidates.length}`,
  );

  console.log("[PHASE 9] Step 5: Resolving selected candidates");

  const selectedCandidates = buildSelectedCandidates({
    selection,
    candidateCards,
  });

  console.log(
    `[PHASE 9] Selected candidates resolved: ${selectedCandidates.length}`,
  );

  if (selectedCandidates.length === 0) {
    console.log("[PHASE 9] Selection returned no usable candidates");

    console.log("[PHASE 9] Evidence selection completed with no evidence");

    console.log("========================================\n");

    return {
      status: "NO_EVIDENCE",
      repositoryId: safeRepositoryId,
      question: safeQuestion,
      context,
      rawRetrieval: safeRetrievalResult,
      normalized: normalizedRetrieval,
      deduplicated: deduplicatedCandidates,
      candidateCards,
      selection,
      selectedCandidates: [],
      evidencePackage: {
        status: "NO_EVIDENCE",
        repositoryId: safeRepositoryId,
        question: safeQuestion,
        context,
        selectedCandidates: [],
        evidence: [],
        errors: normalizedRetrieval.errors.map((error) => ({
          stage: "retrieval",
          ...error,
        })),
      },
    };
  }

  console.log("[PHASE 9] Step 6: Fetching actual evidence");

  const evidenceResults = await fetchEvidenceForCandidates({
    repositoryId: safeRepositoryId,
    selectedCandidates,
  });

  console.log(`[PHASE 9] Evidence records: ${evidenceResults.length}`);

  console.log("[PHASE 9] Step 7: Building evidence package");

  const evidencePackage = buildEvidencePackage({
    repositoryId: safeRepositoryId,
    question: safeQuestion,
    context,
    selectedCandidates,
    evidenceResults,
    retrievalErrors: normalizedRetrieval.errors,
  });

  console.log(
    `[PHASE 9] Evidence package ready: ${evidencePackage.evidence.length} evidence record(s)`,
  );

  console.log(
    `[PHASE 9] Evidence package errors: ${evidencePackage.errors.length}`,
  );

  console.log("[PHASE 9] Evidence selection completed");

  console.log("========================================\n");

  return {
    status: "READY_FOR_ANSWER",
    repositoryId: safeRepositoryId,
    question: safeQuestion,
    context,
    rawRetrieval: safeRetrievalResult,
    normalized: normalizedRetrieval,
    deduplicated: deduplicatedCandidates,
    candidateCards,
    selection,
    selectedCandidates,
    evidencePackage,
  };
}

export { processEvidenceSelection };
