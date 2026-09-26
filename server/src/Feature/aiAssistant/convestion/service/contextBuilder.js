function buildConversationContext({
  storedContext = null,
  recentMessages = [],
}) {
  return {
    summary: storedContext?.summary ?? null,

    importantFacts: Array.isArray(storedContext?.important_facts)
      ? storedContext.important_facts
      : [],

    currentTopic: storedContext?.current_topic ?? null,

    referencedEntities: Array.isArray(storedContext?.last_referenced_entities)
      ? storedContext.last_referenced_entities
      : [],

    unresolvedItems: Array.isArray(storedContext?.unresolved_items)
      ? storedContext.unresolved_items
      : [],

    recentMessages: recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    })),
  };
}

export { buildConversationContext };
