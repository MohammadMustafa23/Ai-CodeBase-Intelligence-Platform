import { prepareConversationContext } from "../../convestion/actualService/conversationContextService.js";
import { runGuard } from "../service/guardService.js";
import { routeGuardResult } from "../service/scopeRouter.js";
import { generateClarification } from "../service/clarificationService.js";

const OUT_OF_SCOPE_MESSAGE =
  "This assistant only answers questions about the selected repository.";

// Run the complete Phase 11 → Phase 12 flow.
async function processGuardRequest({
  pool,
  model,
  conversationId,
  userMessage,
}) {
  if (!pool) {
    throw new TypeError("pool is required");
  }

  if (!model) {
    throw new TypeError("model is required");
  }

  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    throw new TypeError("userMessage must be a non-empty string");
  }

  // Get compact conversation context from Phase 11.
  const conversationContext = await prepareConversationContext({
    pool,
    model,
    conversationId,
  });
  

  const guardResult = await runGuard({
    model,
    userMessage,
    conversationContext,
  });

  console.log("GUARD: after runGuard");
  console.log("GUARD RESULT:", guardResult);

  // Convert Guard decision into an application route.
  const route = routeGuardResult(guardResult);

  // Repository questions continue to retrieval.
  if (route.route === "REPOSITORY") {
    return {
      type: "REPOSITORY",
      action: "RETRIEVE",
      userMessage: userMessage.trim(),
      conversationId,
      resolvedReferences: guardResult.resolvedReferences,
      conversationContext,
      guardResult,
    };
  }

  // Conversation-only questions stay within conversation context.
  if (route.route === "CONVERSATION") {
    return {
      type: "CONVERSATION",
      action: "DIRECT_RESPONSE",
      userMessage: userMessage.trim(),
      conversationId,
      conversationContext,
      guardResult,
    };
  }

  // General questions are rejected without another answer LLM.
  if (route.route === "GENERAL") {
    return {
      type: "GENERAL",
      action: "OUT_OF_SCOPE",
      userMessage: userMessage.trim(),
      message: OUT_OF_SCOPE_MESSAGE,
      conversationId,
      guardResult,
    };
  }

  // Ambiguous requests get one clarification question.
  if (route.route === "CLARIFICATION") {
    const clarification = await generateClarification({
      model,
      userMessage,
      conversationContext,
    });

    return {
      type: "CLARIFICATION",
      action: "ASK_CLARIFICATION",
      userMessage: userMessage.trim(),
      clarification,
      conversationId,
      guardResult,
    };
  }

  throw new Error(`Unsupported guard route: ${route.route}`);
}

export { processGuardRequest, OUT_OF_SCOPE_MESSAGE };
