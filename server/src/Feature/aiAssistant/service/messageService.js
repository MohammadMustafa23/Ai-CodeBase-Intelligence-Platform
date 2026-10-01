import { findConversationById } from "../Db_query/conversations.js";
import { createConversationMessage } from "../Db_query/conversationMessages.js";
import { processGuardRequest } from "../guard/actualService/guardOrchestrator.js";
import { guardModel } from "../guard/service/guardModel.js";
import { runRetrieval } from "../retrieval/service/retrievalService.js";
import { processEvidenceSelection } from "../evidenceSelection/actualService/evidenceSelectionOrchestrator.js";
import { generateAnswer } from "../answerGeneration/service/answerService.js";
import { answerModel } from "../answerGeneration/model/answerLLM.js";
import { pool } from "../../../config/database.js";

export async function sendMessage({ conversationId, content }) {
  if (!conversationId) {
    throw new Error("conversationId is required.");
  }

  if (!content || !content.trim()) {
    throw new Error("Message content is required.");
  }

  const conversation = await findConversationById(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const userContent = content.trim();

  console.log(
    `[MESSAGE] Processing message for conversation: ${conversationId}`,
  );

  console.log(`[MESSAGE] User question: ${userContent}`);

  // Store user message first.
  const userMessage = await createConversationMessage({
    conversationId,
    role: "user",
    content: userContent,
  });

  console.log("[MESSAGE] User message stored");

  // Run Guard and prepare conversation context.
  const guardResult = await processGuardRequest({
    pool,
    conversationId,
    userMessage: userContent,
    model: guardModel,
  });

  console.log("[MESSAGE] Guard completed");

  console.log(`[MESSAGE] Guard type: ${guardResult?.type}`);

  let assistantContent;
  let retrievalResult = null;
  let evidenceResult = null;
  let answerResult = null;

  // Repository question.
  if (guardResult?.type === "REPOSITORY") {
    if (!conversation.repository_id) {
      throw new Error(
        "Conversation repository_id is missing for repository question.",
      );
    }

    console.log(
      `[MESSAGE] Repository question detected: ${conversation.repository_id}`,
    );

    const conversationContext = guardResult.conversationContext;

    if (!conversationContext) {
      throw new Error("Conversation context is missing from Guard result.");
    }

    console.log("[MESSAGE] Using conversation context prepared by Guard");

    // Run Phase 8 retrieval.
    retrievalResult = await runRetrieval({
      model: guardModel,
      repositoryId: conversation.repository_id,
      question: userContent,
      context: conversationContext,
    });

    console.log("[MESSAGE] Phase 8 retrieval completed");

    console.log(
      `[MESSAGE] Raw retrieval results: ${
        retrievalResult?.results?.length ?? 0
      }`,
    );

    // Run Phase 9 evidence selection.
    evidenceResult = await processEvidenceSelection({
      repositoryId: conversation.repository_id,
      question: userContent,
      context: conversationContext,
      retrievalResult,
      selectionModel: guardModel,
    });

    console.log("[MESSAGE] Phase 9 evidence selection completed");

    console.log(
      `[MESSAGE] Candidate cards: ${
        evidenceResult?.candidateCards?.length ?? 0
      }`,
    );

    if (!evidenceResult?.evidencePackage) {
      throw new Error("Phase 9 did not return an evidence package.");
    }

    // Run Phase 10 answer generation.
    answerResult = await generateAnswer({
      model: answerModel,
      question: userContent,
      context: conversationContext,
      evidencePackage: evidenceResult.evidencePackage,
    });

    console.log("[MESSAGE] Phase 10 answer generation completed");

    console.log(
      `[MESSAGE] Answer length: ${answerResult?.answer?.length ?? 0}`,
    );

    console.log(
      `[MESSAGE] Source references: ${answerResult?.references?.length ?? 0}`,
    );

    assistantContent = answerResult.answer;
  }

  // Conversation-only question.
  else if (guardResult?.type === "CONVERSATION") {
    assistantContent =
      "Your question is related to the current conversation. Conversation response generation will be connected next.";
  }

  // General/out-of-scope question.
  else if (guardResult?.type === "GENERAL") {
    assistantContent = guardResult.message;
  }

  // Clarification required.
  else if (guardResult?.type === "CLARIFICATION") {
    assistantContent = guardResult.clarification;
  }

  // Unsupported Guard result.
  else {
    throw new Error(`Unsupported Guard result type: ${guardResult?.type}`);
  }

  // Store assistant response.
  const assistantMessage = await createConversationMessage({
    conversationId,
    role: "assistant",
    content: assistantContent,
  });

  console.log("[MESSAGE] Assistant message stored");

  return {
    userMessage,
    assistantMessage,

    guard: {
      type: guardResult.type,
      action: guardResult.action,
      resolvedReferences: guardResult.resolvedReferences ?? [],
    },

    retrieval: retrievalResult,

    evidence: evidenceResult,

    answer: answerResult,
  };
}
