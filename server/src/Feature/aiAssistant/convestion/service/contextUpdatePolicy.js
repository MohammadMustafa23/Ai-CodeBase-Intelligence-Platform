const CONTEXT_SUMMARY_MESSAGE_INTERVAL = Number(
  process.env.CONTEXT_SUMMARY_MESSAGE_INTERVAL ?? 20,
);

function shouldUpdateConversationContext({
  totalMessageCount,
  contextMessageCount = 0,
}) {
  if (!Number.isInteger(totalMessageCount) || totalMessageCount < 0) {
    throw new TypeError("totalMessageCount must be a non-negative integer");
  }

  if (!Number.isInteger(contextMessageCount) || contextMessageCount < 0) {
    throw new TypeError("contextMessageCount must be a non-negative integer");
  }

  if (contextMessageCount > totalMessageCount) {
    return true;
  }

  const newMessages = totalMessageCount - contextMessageCount;

  return newMessages >= CONTEXT_SUMMARY_MESSAGE_INTERVAL;
}

export { shouldUpdateConversationContext };
