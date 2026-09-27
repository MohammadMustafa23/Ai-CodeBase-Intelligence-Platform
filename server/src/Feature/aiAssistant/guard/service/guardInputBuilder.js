function buildGuardInput({ userMessage, conversationContext = null }) {
  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    throw new TypeError("userMessage must be a non-empty string");
  }

  const context = conversationContext ?? {};

  const recentMessages = Array.isArray(context.recentMessages)
    ? context.recentMessages.slice(-3).map((message) => ({
        role: message.role,
        content: message.content,
      }))
    : [];

  const referencedEntities = Array.isArray(context.referencedEntities)
    ? context.referencedEntities.slice(0, 10).map((entity) => ({
        type: entity.type,
        name: entity.name,
      }))
    : [];

  return {
    message: userMessage.trim(),
    summary: typeof context.summary === "string" ? context.summary : null,
    currentTopic:
      typeof context.currentTopic === "string" ? context.currentTopic : null,
    referencedEntities,
    recentMessages,
  };
}

export { buildGuardInput };
