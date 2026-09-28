import { buildGuardInput } from "./guardInputBuilder.js";

import { buildGuardPrompt } from "./guardPromptBuilder.js";

// Extract text from different LangChain response formats.
function extractModelContent(response) {
  if (typeof response === "string") {
    return response;
  }

  const content = response?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        return part?.text ?? "";
      })
      .join("");
  }

  throw new Error("Guard LLM returned an unsupported response format");
}

// Remove markdown code fences when the model wraps JSON in them.
function cleanJsonResponse(content) {
  const text = content.trim();

  if (text.startsWith("```")) {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  return text;
}

// Convert the Guard LLM response into a JavaScript object.
function parseGuardResponse(response) {
  const content = extractModelContent(response);
  const cleanContent = cleanJsonResponse(content);

  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    throw new Error(`Guard LLM returned invalid JSON: ${error.message}`);
  }
}

// Run the lightweight Guard LLM.
async function runGuard({ model, userMessage, conversationContext = null }) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError("A valid Guard LLM model with invoke() is required");
  }

  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    throw new TypeError("userMessage must be a non-empty string");
  }

  const guardInput = buildGuardInput({
    userMessage,
    conversationContext,
  });

  const prompt = buildGuardPrompt(guardInput);

  const response = await model.invoke(prompt);

  return parseGuardResponse(response);
}

export { runGuard, extractModelContent, cleanJsonResponse, parseGuardResponse };
