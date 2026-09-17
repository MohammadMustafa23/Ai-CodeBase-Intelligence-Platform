import { api } from "../api";

export function getRepositoryFiles(repositoryId) {
  const response =  api.get(`/workspaces/repositories/${repositoryId}/files`);
  return response;
}