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

export async function fetchRepository({ repositoryId, githubUrl, jobId }) {
  const finalPath = path.join(storageRoot, repositoryId);

  const tempPath = path.join(storageRoot, `${repositoryId}.tmp-${jobId}`);

  await fs.mkdir(storageRoot, {
    recursive: true,
  });

  await fs.rm(tempPath, {
    recursive: true,
    force: true,
  });

  try {
    console.log(`Cloning: ${githubUrl}`);

    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--no-tags", githubUrl, tempPath],
      {
        windowsHide: true,
        timeout: 10 * 60 * 1000,
      },
    );

    const size = await getDirectorySize(tempPath);

    console.log(`Repository size: ${(size / 1024 / 1024).toFixed(2)} MB`);

    if (size > MAX_REPOSITORY_SIZE) {
      throw new Error("Repository exceeds the maximum allowed size of 100 MB.");
    }

    await fs.rm(finalPath, {
      recursive: true,
      force: true,
    });

    await fs.rename(tempPath, finalPath);

    return finalPath;
  } catch (error) {
    await fs.rm(tempPath, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}
