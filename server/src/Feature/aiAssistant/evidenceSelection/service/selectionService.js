import { invokeSelectionModel } from "../model/selectionModel.js";

import { buildSelectionPrompt } from "../prompt/selectionPrompt.js";

import { selectionSchema } from "../model/selectionSchema.js";

function getResponseContent(response) {
  if (!response) {
    return "";
  }

  if (typeof response.content === "string") {
    return response.content;
  }

  if (Array.isArray(response.content)) {
    return response.content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.text) {
          return item.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractJsonObject(content) {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Selection LLM returned empty content.");
  }

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Selection LLM did not return valid JSON.");
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("Selection LLM returned malformed JSON.");
    }
  }
}

function normalizeSelectionOutput(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }

  const selectedCandidates =
    parsed.selectedCandidates ??
    parsed.selected_candidates ??
    parsed.selections;

  if (!Array.isArray(selectedCandidates)) {
    return parsed;
  }

  return {
    selectedCandidates: selectedCandidates.map((candidate) => ({
      candidateId: candidate?.candidateId ?? candidate?.candidate_id,

      evidenceTypes: candidate?.evidenceTypes ?? candidate?.evidence_types,
    })),
  };
}

function validateSelectedCandidateIds({ selection, candidateCards }) {
  const candidateIds = new Set(candidateCards.map((card) => card.candidateId));

  for (const selected of selection.selectedCandidates) {
    if (!candidateIds.has(selected.candidateId)) {
      throw new Error(
        `Selection LLM returned unknown candidate ID: ${selected.candidateId}`,
      );
    }
  }

  return selection;
}

async function selectCandidates({
  model,
  question,
  context = null,
  candidateCards = [],
}) {
  if (!model) {
    throw new TypeError("model is required");
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    throw new TypeError("question must be a non-empty string");
  }

  if (!Array.isArray(candidateCards)) {
    throw new TypeError("candidateCards must be an array");
  }

  if (candidateCards.length === 0) {
    throw new Error(
      "Cannot perform candidate selection without candidate cards.",
    );
  }

  console.log("[PHASE 9] Selection LLM started");

  console.log(`[PHASE 9] Candidate cards received: ${candidateCards.length}`);

  const prompt = buildSelectionPrompt({
    question: question.trim(),
    context,
    candidateCards,
  });

  console.log("[PHASE 9] Selection prompt created");

  console.log("[PHASE 9] Calling Selection LLM");

  const startedAt = Date.now();

  const response = await invokeSelectionModel({
    model,
    input: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const duration = Date.now() - startedAt;

  console.log(`[PHASE 9] Selection LLM responded in ${duration}ms`);

  const content = getResponseContent(response);

  console.log(`[PHASE 9] Selection response length: ${content.length}`);

  console.log(`[PHASE 9] Selection raw response: ${content}`);

  const parsed = extractJsonObject(content);

  console.log(`[PHASE 9] Selection parsed JSON: ${JSON.stringify(parsed)}`);

  const normalizedSelection = normalizeSelectionOutput(parsed);

  console.log(
    `[PHASE 9] Normalized selection: ${JSON.stringify(normalizedSelection)}`,
  );

  const selection = selectionSchema.parse(normalizedSelection);

  validateSelectedCandidateIds({
    selection,
    candidateCards,
  });

  console.log(
    `[PHASE 9] Selected candidates: ${selection.selectedCandidates.length}`,
  );

  console.log(
    `[PHASE 9] Selected candidate IDs: ${selection.selectedCandidates
      .map((item) => item.candidateId)
      .join(", ")}`,
  );

  console.log("[PHASE 9] Selection completed");

  return selection;
}

export { selectCandidates };
