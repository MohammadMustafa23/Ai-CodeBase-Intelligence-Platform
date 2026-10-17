import {findRepositoryByIdAndUser, deleteRepositoryByIdAndUser} from "../Db_query/repositoryInsert.js";
import fs from "fs/promises";
import path from "path";

export async function deleteRepository(repositoryId, userId) {
  const repository = await findRepositoryByIdAndUser(repositoryId, userId);

  if (!repository) {
    return {
      notFound: true,
    };
  }

  // Prevent deletion while the main pipeline is actively
  // processing the repository.
  const activeStatuses = ["scanning", "analyzing", "chunking", "embedding"];

  if (activeStatuses.includes(repository.status)) {
    return {
      conflict: true,
      message:
        "Repository is currently being processed. Please wait until processing finishes before deleting it.",
    };
  }

  const deletedRepository = await deleteRepositoryByIdAndUser(
    repositoryId,
    userId,
  );

  if (!deletedRepository) {
    return {
      notFound: true,
    };
  }

  const repositoryPath = path.resolve(
    process.cwd(),
    "storage",
    "repositories",
    repository.repository_name,
  );

  let storageCleanup = "completed";

  try {
    await fs.rm(repositoryPath, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    storageCleanup = "failed";

    console.error(
      `Repository storage cleanup failed for ${repositoryId}:`,
      error.message,
    );
  }

  return {
    notFound: false,
    conflict: false,
    repository: deletedRepository,
    storageCleanup,
  };
}
