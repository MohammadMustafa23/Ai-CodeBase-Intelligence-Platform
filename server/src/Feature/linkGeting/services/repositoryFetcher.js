import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getDirectorySize } from "./getDirectorySize.js";

const execFileAsync = promisify(execFile);

const MAX_REPOSITORY_SIZE = 100 * 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageRoot = path.resolve(__dirname, "../../../../storage/repositories");

export async function fetchRepository({
  repositoryId,
  repositoryName,
  githubUrl,
}) {
  const repositoryPath = path.join(storageRoot, repositoryName);

  await fs.mkdir(storageRoot, {
    recursive: true,
  });

  await fs.rm(repositoryPath, {
    recursive: true,
    force: true,
  });

  try {
    console.log(`Cloning: ${githubUrl}`);
    console.log(`Storage path: ${repositoryPath}`);

    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--no-tags", githubUrl, repositoryPath],
      {
        windowsHide: true,
        timeout: 10 * 60 * 1000,
      },
    );

    const size = await getDirectorySize(repositoryPath);

    console.log(`Repository size: ${(size / 1024 / 1024).toFixed(2)} MB`);

    if (size > MAX_REPOSITORY_SIZE) {
      throw new Error("Repository exceeds the maximum allowed size of 100 MB.");
    }

    console.log(`Repository stored at: ${repositoryPath}`);

    return repositoryPath;
  } catch (error) {
    await fs.rm(repositoryPath, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}
