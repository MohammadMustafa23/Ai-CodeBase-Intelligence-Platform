import { createRepositoryRecord } from "../repositories/repositoryRepository.js";

export async function createRepository(url) {
  const parsedUrl = new URL(url);
  const [owner, repositoryName] = parsedUrl.pathname.split("/").filter(Boolean);
  const cleanRepositoryName = repositoryName.replace(/\.git$/, "");
  return createRepositoryRecord({ 
    githubUrl: `https://github.com/${owner}/${cleanRepositoryName}`,
    owner,
    repositoryName: cleanRepositoryName,
  });
}
