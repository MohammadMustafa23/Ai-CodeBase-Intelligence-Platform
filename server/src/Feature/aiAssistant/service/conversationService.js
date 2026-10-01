import { createConversation } from "../Db_query/conversations.js";

import { findRepositoryById } from "../../linkGeting/Db_query/repositoryInsert.js";

export async function createNewConversation({
  repositoryId = null,
  title = null,
}) {
  // General chat: no repository required
  if (!repositoryId) {
    return await createConversation({
      repositoryId: null,
      title,
    });
  }

  // Repository chat: make sure repository exists
  const repository = await findRepositoryById(repositoryId);

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found.`);
  }

  return await createConversation({
    repositoryId,
    title,
  });
}
