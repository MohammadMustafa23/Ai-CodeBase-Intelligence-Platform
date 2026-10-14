import { buildAnswerSystemPrompt } from "../prompt/answerPrompt.js";

function validateQuestion(question) {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new TypeError("question must be a non-empty string");
  }
}

function validateEvidencePackage(evidencePackage) {
  if (
    !evidencePackage ||
    typeof evidencePackage !== "object" ||
    Array.isArray(evidencePackage)
  ) {
    throw new TypeError("evidencePackage must be an object");
  }
}

function serializeContext(context) {
  if (context === null || context === undefined) {
    return "No relevant previous conversation context.";
  }

  if (typeof context === "string") {
    return context.trim() || "No relevant previous conversation context.";
  }

  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return "Previous conversation context could not be serialized.";
  }
}

function serializeEvidencePackage(evidencePackage) {
  const evidence = Array.isArray(evidencePackage.evidence)
    ? evidencePackage.evidence
    : [];

  const selectedCandidates = Array.isArray(evidencePackage.selectedCandidates)
    ? evidencePackage.selectedCandidates
    : [];

  return JSON.stringify(
    {
      status: evidencePackage.status ?? null,

      selectedCandidates,

      evidence,

      errors: Array.isArray(evidencePackage.errors)
        ? evidencePackage.errors
        : [],
    },
    null,
    2,
  );
}

function buildAnswerInput({ question, context = null, evidencePackage }) {
  validateQuestion(question);
  validateEvidencePackage(evidencePackage);

  const cleanQuestion = question.trim();

  const contextText = serializeContext(context);

  const evidenceText = serializeEvidencePackage(evidencePackage);

  const systemMessage = buildAnswerSystemPrompt();

  const userMessage = `
CURRENT QUESTION

${cleanQuestion}

RELEVANT PREVIOUS CONVERSATION CONTEXT

${contextText}

PHASE 9 EVIDENCE PACKAGE

${evidenceText}
`.trim();

  return {
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  };
}

export { buildAnswerInput };
