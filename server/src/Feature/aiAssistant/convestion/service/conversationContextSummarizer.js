/**
 * Conversation Context Summarizer
 *
 * Responsibility:
 * - Compress newly accumulated conversation information
 * - Preserve useful existing context
 * - Never answer the user
 * - Never perform repository retrieval
 *
 * The LLM instance is injected into the function.
 * This keeps the service independent from a specific
 * Gemini/LangChain setup already present in the project.
 */

function buildSummarizationPrompt({ previousContext, newMessages }) {
  return `
You are the Conversation Context Manager for a software engineering assistant.

Your job is to maintain a compact and accurate representation of a conversation.

You are NOT answering the user.

You MUST:
1. Preserve important information from the previous context.
2. Add genuinely useful information from the new messages.
3. Preserve the current investigation/topic.
4. Track important code symbols, files, concepts, and entities mentioned.
5. Preserve unresolved questions or things the user still wants to understand.
6. Remove information only when it is explicitly corrected or clearly no longer useful.
7. Never invent facts.
8. Ignore greetings, repetition, and low-value conversation.
9. Keep the result concise because it will be reused in future requests.

Return ONLY valid JSON.

Required JSON structure:

{
  "summary": "string",
  "importantFacts": ["string"],
  "currentTopic": "string or null",
  "referencedEntities": [
    {
      "type": "string",
      "name": "string"
    }
  ],
  "unresolvedItems": ["string"]
}

Previous context:
${JSON.stringify(previousContext ?? {}, null, 2)}

New messages:
${JSON.stringify(newMessages ?? [], null, 2)}
`;
}

function parseSummarizationResponse(rawResponse) {
  if (typeof rawResponse !== "string") {
    throw new TypeError("LLM response must be a string");
  }

  let parsed;

  try {
    parsed = JSON.parse(rawResponse);
  } catch (error) {
    throw new Error(`Invalid conversation context JSON: ${error.message}`);
  }

  validateContextShape(parsed);

  return parsed;
}

function validateContextShape(context) {
  if (typeof context.summary !== "string") {
    throw new Error("Context summary must be a string");
  }

  if (!Array.isArray(context.importantFacts)) {
    throw new Error("importantFacts must be an array");
  }

  if (
    context.currentTopic !== null &&
    typeof context.currentTopic !== "string"
  ) {
    throw new Error("currentTopic must be string or null");
  }

  if (!Array.isArray(context.referencedEntities)) {
    throw new Error("referencedEntities must be an array");
  }

  if (!Array.isArray(context.unresolvedItems)) {
    throw new Error("unresolvedItems must be an array");
  }

  for (const entity of context.referencedEntities) {
    if (
      !entity ||
      typeof entity !== "object" ||
      typeof entity.type !== "string" ||
      typeof entity.name !== "string"
    ) {
      throw new Error("Invalid referenced entity");
    }
  }
}

/**
 * model must expose an async invoke(prompt) method.
 *
 * We inject the model instead of creating one here.
 * That allows us to reuse your existing Gemini/LangChain
 * configuration.
 */
async function summarizeConversationContext({
  model,
  previousContext,
  newMessages,
}) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError("A valid LLM model with invoke() is required");
  }

  if (!Array.isArray(newMessages)) {
    throw new TypeError("newMessages must be an array");
  }

  if (newMessages.length === 0) {
    return (
      previousContext ?? {
        summary: "",
        importantFacts: [],
        currentTopic: null,
        referencedEntities: [],
        unresolvedItems: [],
      }
    );
  }

  const prompt = buildSummarizationPrompt({
    previousContext,
    newMessages,
  });

  const response = await model.invoke(prompt);

  /**
   * LangChain models can return either:
   *
   * string
   *
   * or an object containing content.
   */
  const rawContent =
    typeof response === "string" ? response : response?.content;

  const content = Array.isArray(rawContent)
    ? rawContent
        .map((part) => (typeof part === "string" ? part : (part?.text ?? "")))
        .join("")
    : rawContent;

  return parseSummarizationResponse(content);
}

export {
  buildSummarizationPrompt,
  parseSummarizationResponse,
  summarizeConversationContext,
};
