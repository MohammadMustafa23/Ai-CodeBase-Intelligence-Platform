import { findRepositoryFiles } from "../Db_query/repositoryFiles.js";

export async function getRepositoryFiles(repositoryId) {
  return await findRepositoryFiles(repositoryId);
}
