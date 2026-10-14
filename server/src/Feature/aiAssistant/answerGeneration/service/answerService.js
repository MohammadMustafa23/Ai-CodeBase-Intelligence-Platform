import { buildAnswerInput } from "./answerInputBuilder.js";
import { attachSourceReferences } from "./sourceReferenceService.js";
import { invokeAnswerModel } from "../model/answerModel.js";

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
    throw new Error("Answer LLM returned empty content.");
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
      throw new Error("Answer LLM did not return valid JSON.");
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("Answer LLM returned malformed JSON.");
    }
  }
}

function normalizeAnswerOutput(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Answer LLM returned an invalid response object.");
  }

  const answer = parsed.answer;

  const references =
    parsed.references ?? parsed.referenceIds ?? parsed.reference_ids ?? [];

  if (typeof answer !== "string" || answer.trim().length === 0) {
    throw new Error("Answer LLM did not return a valid answer.");
  }

  if (!Array.isArray(references)) {
    throw new Error("Answer LLM references must be an array.");
  }

  return {
    answer: answer.trim(),
    references: [
      ...new Set(
        references
          .filter(
            (reference) =>
              typeof reference === "string" && reference.trim().length > 0,
          )
          .map((reference) => reference.trim()),
      ),
    ],
  };
}

function validateReferenceIds({ references, evidencePackage }) {
  const evidence = Array.isArray(evidencePackage?.evidence)
    ? evidencePackage.evidence
    : [];

  const validIds = new Set();

  for (const item of evidence) {
    if (item?.candidateId) {
      validIds.add(item.candidateId);
    }
  }

  for (const reference of references) {
    if (!validIds.has(reference)) {
      throw new Error(
        `Answer LLM returned unknown evidence reference: ${reference}`,
      );
    }
  }
}

async function generateAnswer({
  model,
  question,
  context = null,
  evidencePackage,
}) {
  if (!model) {
    throw new TypeError("model is required");
  }

  console.log("\n========================================");
  console.log("[PHASE 10] Answer generation started");
  console.log("========================================");

  console.log(`[PHASE 10] Question: ${question}`);

  const input = buildAnswerInput({
    question,
    context,
    evidencePackage,
  });

  console.log("[PHASE 10] Answer LLM input prepared");

  console.log(`[PHASE 10] Input messages: ${input.messages.length}`);

  console.log("[PHASE 10] Calling Answering LLM");

  const startedAt = Date.now();

  const response = await invokeAnswerModel({
    model,
    input: input.messages,
  });

  const duration = Date.now() - startedAt;

  console.log(`[PHASE 10] Answering LLM responded in ${duration}ms`);

  const content = getResponseContent(response);

  console.log(`[PHASE 10] Response length: ${content.length}`);

  console.log(`[PHASE 10] Raw answer response: ${content}`);

  const parsed = extractJsonObject(content);

  const generatedAnswer = normalizeAnswerOutput(parsed);

  validateReferenceIds({
    references: generatedAnswer.references,
    evidencePackage,
  });

  console.log(
    `[PHASE 10] Answer references: ${generatedAnswer.references.length}`,
  );

  const answerWithReferences = attachSourceReferences({
    answer: generatedAnswer.answer,
    references: generatedAnswer.references,
    evidencePackage,
  });

  console.log(
    `[PHASE 10] Attached source references: ${answerWithReferences.references.length}`,
  );

  console.log("[PHASE 10] Answer generation completed");

  return {
    answer: answerWithReferences.answer,
    references: answerWithReferences.references,
    rawResponse: response,
  };
}

export { generateAnswer };
