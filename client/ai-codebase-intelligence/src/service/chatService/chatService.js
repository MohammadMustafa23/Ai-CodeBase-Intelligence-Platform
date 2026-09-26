import { api } from "../api";

export function createConversation({ repositoryId, title = null }) {
  const response = api.post("/conversations", {
    repositoryId,
    title,
  });

  return response;
}

export function getConversationMessages(conversationId) {
  const response = api.get(`/conversations/${conversationId}/messages`);

  return response;
}

export function sendMessage({ conversationId, content }) {
  const response = api.post(`/conversations/${conversationId}/messages`, {
    content,
  });

  return response;
}
