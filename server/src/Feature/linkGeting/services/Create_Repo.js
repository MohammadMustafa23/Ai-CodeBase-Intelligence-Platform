import {
  findRepositoryByUrl,
  createRepositoryRecord,
} from "../Db_query/repositoryInsert.js";

import { fetchQueue } from "../queues/fetchQueue.js";
export async function createRepository(url) {
  const parsedUrl = new URL(url);

  const [owner, repositoryName] = parsedUrl.pathname.split("/").filter(Boolean);

  const cleanRepositoryName = repositoryName.replace(/\.git$/, "");

  const githubUrl = `https://github.com/${owner}/${cleanRepositoryName}`;

  const existingRepository = await findRepositoryByUrl(githubUrl);

  if (existingRepository) {
    return {
      exists: true,
      message: "Repository already exists.",
      repository: existingRepository,
    };
  }

  const repository = await createRepositoryRecord({
    githubUrl,
    owner,
    repositoryName: cleanRepositoryName,
  });

  await fetchQueue.add("fetch-repository", {
    repositoryId: repository.repository_id,
  });

  return {
    exists: false,
    message: "Repository created and fetch queued.",
    repository,
  };
}
