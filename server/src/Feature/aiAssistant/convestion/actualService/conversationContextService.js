import { getRecentMessages } from "../Db_query/recentMessages.js";

import { searchHistoricalMessages } from "../Db_query/historicalMessages.js";

import {
  getStoredContextFromDb,
  saveConversationContext,
  claimConversationContextUpdate,
  releaseConversationContextClaim,
} from "../Db_query/conversationContext.js";

import { buildConversationContext } from "../service/contextBuilder.js";

import { shouldUpdateConversationContext } from "../service/contextUpdatePolicy.js";

import { summarizeConversationContext } from "../service/conversationContextSummarizer.js";

// Maximum number of messages sent to the context summarizer in one update.
const CONTEXT_UPDATE_BATCH_SIZE = Math.min(
  Math.max(Number(process.env.CONTEXT_UPDATE_BATCH_SIZE ?? 50), 1),
  50,
);

// Maximum recent messages included in the request context.
const RECENT_MESSAGE_LIMIT = Math.min(
  Math.max(Number(process.env.RECENT_MESSAGE_LIMIT ?? 10), 1),
  50,
);

// Get the current compact conversation context.
async function getStoredContext({ pool, conversationId }) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  return getStoredContextFromDb({
    pool,
    conversationId,
  });
}

// Get the total number of messages from the conversation counter.
async function getTotalMessageCount({ pool, conversationId }) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  const query = `
    SELECT message_count
    FROM conversations
    WHERE conversation_id = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [conversationId]);

  if (result.rowCount === 0) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  return result.rows[0].message_count;
}

// Get messages after the last context checkpoint.
async function getMessagesAfterCheckpoint({
  pool,
  conversationId,
  lastMessageCreatedAt = null,
  lastMessageId = null,
  limit = CONTEXT_UPDATE_BATCH_SIZE,
}) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
    throw new TypeError("limit must be between 1 and 50");
  }

  if ((lastMessageCreatedAt === null) !== (lastMessageId === null)) {
    throw new Error(
      "Invalid conversation checkpoint: timestamp and message ID must both be set or both be null",
    );
  }

  const query = `
    SELECT
      message_id,
      conversation_id,
      role,
      content,
      created_at
    FROM conversation_messages
    WHERE conversation_id = $1
      AND (
        $2::timestamptz IS NULL
        OR created_at > $2::timestamptz
        OR (
          created_at = $2::timestamptz
          AND message_id > $3::uuid
        )
      )
    ORDER BY
      created_at ASC,
      message_id ASC
    LIMIT $4;
  `;

  const result = await pool.query(query, [
    conversationId,
    lastMessageCreatedAt,
    lastMessageId,
    limit,
  ]);

  return result.rows;
}

// Build the context used by the current request.
async function getConversationContext({
  pool,
  conversationId,
  historicalQuery = null,
  historicalLimit = 10,
}) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  if (
    !Number.isInteger(historicalLimit) ||
    historicalLimit <= 0 ||
    historicalLimit > 50
  ) {
    throw new TypeError("historicalLimit must be between 1 and 50");
  }

 console.log("A");

let storedContext;

try {
  console.log("B - before storedContext");

  storedContext = await getStoredContext({
    pool,
    conversationId,
  });

  console.log("C - storedContext success:", storedContext);
} catch (error) {
  console.error("❌ STORED CONTEXT ERROR:", error);
  throw error;
}

let recentMessages;

try {
  console.log("D - before recentMessages");

  recentMessages = await getRecentMessages(
    conversationId,
    RECENT_MESSAGE_LIMIT,
  );

  console.log("E - recentMessages success:", recentMessages);
} catch (error) {
  console.error("❌ RECENT MESSAGES ERROR:", error);
  throw error;
}

console.log("Done 👍");
  
  let historicalMessages = [];

  if (
    typeof historicalQuery === "string" &&
    historicalQuery.trim().length > 0
  ) {
    historicalMessages = await searchHistoricalMessages({
      pool,
      conversationId,
      query: historicalQuery.trim(),
      limit: historicalLimit,
    });
  }

  return buildConversationContext({
    storedContext,
    recentMessages,
    historicalMessages,
  });
}

// Update compact context only when the configured threshold is reached.
async function updateConversationContextIfNeeded({
  pool,
  model,
  conversationId,
}) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  // Read the current context checkpoint.
  const initialContext = await getStoredContext({
    pool,
    conversationId,
  });

  // Read the maintained message counter instead of COUNT(*).
  const totalMessageCount = await getTotalMessageCount({
    pool,
    conversationId,
  });

  // Read how many messages are already represented in compact context.
  const contextMessageCount = initialContext?.message_count ?? 0;

  // Avoid an unnecessary LLM call.
  const shouldUpdate = shouldUpdateConversationContext({
    totalMessageCount,
    contextMessageCount,
  });

  if (!shouldUpdate) {
    return {
      updated: false,
      skipped: false,
      context: initialContext,
    };
  }

  // Atomically claim the context update.
  const claim = await claimConversationContextUpdate({
    pool,
    conversationId,
  });

  // Another request may already be updating the same conversation.
  if (!claim) {
    return {
      updated: false,
      skipped: true,
      reason: "context_update_already_claimed",
      context: initialContext,
    };
  }

  try {
    // Read the latest context after acquiring the claim.
    const currentContext = await getStoredContext({
      pool,
      conversationId,
    });

    // Fetch only messages after the checkpoint.
    const newMessages = await getMessagesAfterCheckpoint({
      pool,
      conversationId,
      lastMessageCreatedAt: claim.last_message_created_at,
      lastMessageId: claim.last_message_id,
      limit: CONTEXT_UPDATE_BATCH_SIZE,
    });

    // Release the claim when there is nothing left to process.
    if (newMessages.length === 0) {
      await releaseConversationContextClaim({
        pool,
        conversationId,
        updateClaimId: claim.update_claim_id,
      });

      return {
        updated: false,
        skipped: false,
        context: currentContext,
      };
    }

    // Generate the updated compact conversation context.
    const summarizedContext = await summarizeConversationContext({
      model,
      previousContext: currentContext,
      newMessages,
    });

    // The last fetched message becomes the new checkpoint.
    const lastProcessedMessage = newMessages[newMessages.length - 1];

    // Save only if this request still owns the claim.
    const savedContext = await saveConversationContext({
      pool,
      conversationId,
      context: summarizedContext,

      // Advance the compact context checkpoint.
      messageCount: (claim.message_count ?? 0) + newMessages.length,

      lastMessageCreatedAt: lastProcessedMessage.created_at,

      lastMessageId: lastProcessedMessage.message_id,

      updateClaimId: claim.update_claim_id,
    });

    // Null means another process owns the claim.
    if (!savedContext) {
      return {
        updated: false,
        skipped: true,
        reason: "context_claim_lost",
        context: currentContext,
      };
    }

    return {
      updated: true,
      skipped: false,
      context: savedContext,
    };
  } catch (error) {
    // Release the claim immediately when the update fails.
    await releaseConversationContextClaim({
      pool,
      conversationId,
      updateClaimId: claim.update_claim_id,
    });
    throw error;
  }
}

// Prepare the complete conversation context for the next phase.
async function prepareConversationContext({
  pool,
  model,
  conversationId,
  historicalQuery = null,
  historicalLimit = 10,
}) {
  if (!conversationId) {
    throw new TypeError("conversationId is required");
  }

  // Update compact memory only when necessary.
  await updateConversationContextIfNeeded({
    pool,
    model,
    conversationId,
  });

  // Build the final context for the current request.
  return getConversationContext({
    pool,
    conversationId,
    historicalQuery,
    historicalLimit,
  });
}

export {
  getStoredContext,
  getTotalMessageCount,
  getConversationContext,
  updateConversationContextIfNeeded,
  prepareConversationContext,
  getMessagesAfterCheckpoint,
};
