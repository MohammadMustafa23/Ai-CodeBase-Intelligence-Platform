import { api } from "./api";

export function submitLink(url) {
  return api.post("/repositories/repo-link", { url });
}