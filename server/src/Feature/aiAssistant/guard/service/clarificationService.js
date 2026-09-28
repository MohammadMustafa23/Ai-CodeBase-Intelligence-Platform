import { buildGuardInput } from "./guardInputBuilder.js";

// Build a small clarification prompt from the current request context.
function buildClarificationPrompt({ guardInput }) {
  if (!guardInput || typeof guardInput !== "object") {
    throw new TypeError("guardInput must be an object");
  }

  return `
You are a clarification assistant for a repository-focused AI codebase assistant.

The user asked a question that cannot be understood safely from the available context.

Your job is ONLY to ask one short clarification question.

Rules:
- Do not answer the user's question.
- Do not explain general concepts.
- Do not invent repository facts.
- Use the conversation context when useful.
- Ask only for the missing information.
- Keep the clarification short and natural.
- The user may speak any language.
- Respond in the same language as the user's message when reasonably possible.
- Return plain text only.
- Ask exactly one question.

User message:
${JSON.stringify(guardInput.message)}

Conversation summary:
${JSON.stringify(guardInput.summary)}

Current topic:
${JSON.stringify(guardInput.currentTopic)}

Referenced entities:
${JSON.stringify(guardInput.referencedEntities)}

Recent messages:
${JSON.stringify(guardInput.recentMessages)}
`;
}

// Generate one clarification question.
async function generateClarification({
  model,
  userMessage,
  conversationContext = null,
}) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError(
      "A valid clarification LLM model with invoke() is required",
    );
  }

  const guardInput = buildGuardInput({
    userMessage,
    conversationContext,
  });

  const prompt = buildClarificationPrompt({
    guardInput,
  });

  const response = await model.invoke(prompt);

  if (typeof response === "string") {
    return response.trim();
  }

  const content = response?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        return part?.text ?? "";
      })
      .join("")
      .trim();
  }

  throw new Error("Clarification LLM returned an unsupported response format");
}

export { buildClarificationPrompt, generateClarification };
