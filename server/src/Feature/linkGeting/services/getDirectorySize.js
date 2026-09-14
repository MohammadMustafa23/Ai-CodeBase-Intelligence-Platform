import fs from "node:fs/promises";
import path from "node:path";

export async function getDirectorySize(directoryPath) {
  let totalSize = 0;

  async function calculate(currentPath) {
    const entries = await fs.readdir(currentPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await calculate(entryPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
  }

  await calculate(directoryPath);

  return totalSize;
}
