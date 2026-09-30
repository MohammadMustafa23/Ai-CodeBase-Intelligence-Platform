import fs from "fs/promises";
import path from "path";

import { pool } from "../../../../config/database.js";
import { sourceReaderToolSchema } from "./retrievalToolSchemas.js";

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

async function getRepositoryName(repositoryId) {
  const result = await pool.query(
    `
      SELECT repository_name
      FROM repositories
      WHERE repository_id = $1
      LIMIT 1;
    `,
    [repositoryId],
  );

  if (result.rows.length === 0) {
    throw new Error("Repository not found");
  }

  return result.rows[0].repository_name;
}

async function resolveRelativePath({ repositoryId, requestedPath }) {
  const normalizedPath = requestedPath.replaceAll("\\", "/").trim();

  const hasDirectory = normalizedPath.includes("/");

  if (hasDirectory) {
    const result = await pool.query(
      `
        SELECT relative_path
        FROM repository_files
        WHERE repository_id = $1
          AND relative_path = $2
        LIMIT 1;
      `,
      [repositoryId, normalizedPath],
    );

    if (result.rows.length === 0) {
      throw new Error(`Repository file not found: ${normalizedPath}`);
    }

    return result.rows[0].relative_path;
  }

  const result = await pool.query(
    `
      SELECT relative_path
      FROM repository_files
      WHERE repository_id = $1
        AND file_name = $2
      ORDER BY relative_path ASC
      LIMIT 2;
    `,
    [repositoryId, normalizedPath],
  );

  if (result.rows.length === 0) {
    throw new Error(`Repository file not found: ${normalizedPath}`);
  }

  if (result.rows.length > 1) {
    const matches = result.rows.map((row) => row.relative_path).join(", ");

    throw new Error(
      `Multiple repository files match "${normalizedPath}": ${matches}. Use the exact relative path.`,
    );
  }

  return result.rows[0].relative_path;
}

function buildSafeFilePath(repositoryName, relativePath) {
  const repositoryRoot = path.resolve(
    process.cwd(),
    "storage",
    "repositories",
    repositoryName,
  );

  const safeRelativePath = relativePath.replaceAll("\\", "/");

  const filePath = path.resolve(repositoryRoot, safeRelativePath);

  const normalizedRoot = `${repositoryRoot}${path.sep}`;

  if (filePath !== repositoryRoot && !filePath.startsWith(normalizedRoot)) {
    throw new Error("Invalid repository file path");
  }

  return filePath;
}

async function readSourceFile({
  repositoryId,
  relativePath,
  startLine,
  endLine,
  maxChars,
}) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  const validatedInput = sourceReaderToolSchema.parse({
    relativePath,
    startLine,
    endLine,
    maxChars,
  });

  console.log(`[SOURCE READER] Requested path: ${validatedInput.relativePath}`);

  const resolvedRelativePath = await resolveRelativePath({
    repositoryId: safeRepositoryId,
    requestedPath: validatedInput.relativePath,
  });

  console.log(`[SOURCE READER] Resolved path: ${resolvedRelativePath}`);

  const repositoryName = await getRepositoryName(safeRepositoryId);

  const filePath = buildSafeFilePath(repositoryName, resolvedRelativePath);

  const source = await fs.readFile(filePath, "utf8");

  const lines = source.split(/\r?\n/);

  const totalLines = lines.length;

  const start = validatedInput.startLine ?? 1;

  const end = validatedInput.endLine ?? totalLines;

  const safeStart = Math.max(1, start);

  const safeEnd = Math.min(totalLines, end);

  if (safeStart > safeEnd) {
    return {
      relativePath: resolvedRelativePath,
      totalLines,
      startLine: safeStart,
      endLine: safeEnd,
      source: "",
      truncated: false,
    };
  }

  const selectedLines = lines.slice(safeStart - 1, safeEnd);

  let resultSource = selectedLines.join("\n");

  let truncated = false;

  if (resultSource.length > validatedInput.maxChars) {
    resultSource = resultSource.slice(0, validatedInput.maxChars);

    truncated = true;
  }

  console.log(`[SOURCE READER] Range: ${safeStart}-${safeEnd}`);

  console.log(`[SOURCE READER] Read ${resultSource.length} characters`);

  console.log(`[SOURCE READER] Total lines: ${totalLines}`);

  return {
    relativePath: resolvedRelativePath,
    totalLines,
    startLine: safeStart,
    endLine: safeEnd,
    source: resultSource,
    truncated,
  };
}

export { readSourceFile };
