import path from "node:path";

import { pool } from "../../../config/database.js";

import { buildCodeChunks } from "../builder/codeChunkBuilder.js";

import { createCodeChunks } from "../Db_query/codeChunks.js";

const DEFAULT_BATCH_SIZE = 100;

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

async function getRepository(repositoryId) {
  const query = `
    SELECT
      repository_id,
      repository_name
    FROM repositories
    WHERE repository_id = $1;
  `;

  const { rows } = await pool.query(query, [repositoryId]);

  return rows[0] || null;
}

async function getFileBatch(repositoryId, lastFileId, batchSize) {
  const query = `
    SELECT
      file_id,
      repository_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language,
      size_bytes,
      line_count
    FROM repository_files
    WHERE
      repository_id = $1
      AND file_id > $2
      AND file_type IN ('source', 'test')
      AND language IS NOT NULL
    ORDER BY file_id
    LIMIT $3;
  `;

  const { rows } = await pool.query(query, [
    repositoryId,
    lastFileId,
    batchSize,
  ]);

  return rows;
}

async function getSymbolsForFiles(fileIds) {
  if (!fileIds.length) {
    return [];
  }

  const query = `
    SELECT
      symbol_id,
      file_id,
      symbol_name,
      symbol_type,
      parent_symbol_id,
      signature,
      start_line,
      start_column,
      end_line,
      end_column
    FROM code_symbols
    WHERE file_id = ANY($1::uuid[])
    ORDER BY file_id, start_line, end_line;
  `;

  const { rows } = await pool.query(query, [fileIds]);

  return rows;
}

function groupSymbolsByFile(symbols) {
  const symbolMap = new Map();

  for (const symbol of symbols) {
    if (!symbolMap.has(symbol.file_id)) {
      symbolMap.set(symbol.file_id, []);
    }

    symbolMap.get(symbol.file_id).push({
      symbolId: symbol.symbol_id,
      fileId: symbol.file_id,
      symbolName: symbol.symbol_name,
      symbolType: symbol.symbol_type,
      parentSymbolId: symbol.parent_symbol_id,
      signature: symbol.signature,
      startLine: symbol.start_line,
      startColumn: symbol.start_column,
      endLine: symbol.end_line,
      endColumn: symbol.end_column,
    });
  }

  return symbolMap;
}

export async function buildRepositoryCodeChunks(
  repositoryId,
  { batchSize = DEFAULT_BATCH_SIZE } = {},
) {
  const repository = await getRepository(repositoryId);

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`);
  }

  const repositoryPath = path.resolve(
    process.cwd(),
    "storage",
    "repositories",
    repository.repository_name,
  );

  console.log(`Starting code chunking for ${repository.repository_name}`);

  let lastFileId = EMPTY_UUID;

  let totalFiles = 0;
  let totalSymbols = 0;
  let totalChunks = 0;

  while (true) {
    // -------------------------------
    // 1. Get a bounded batch of files
    // -------------------------------

    const files = await getFileBatch(repositoryId, lastFileId, batchSize);

    if (!files.length) {
      break;
    }

    // -------------------------------
    // 2. Get symbols for this batch
    // -------------------------------

    const fileIds = files.map((file) => file.file_id);

    const symbols = await getSymbolsForFiles(fileIds);

    const symbolsByFile = groupSymbolsByFile(symbols);

    totalSymbols += symbols.length;

    // -------------------------------
    // 3. Build chunks for each file
    // -------------------------------

    const batchChunks = [];

    for (const file of files) {
      const fileSymbols = symbolsByFile.get(file.file_id) || [];

      if (!fileSymbols.length) {
        continue;
      }

      const chunks = await buildCodeChunks({
        repositoryPath,
        file,
        symbols: fileSymbols,
      });

      batchChunks.push(...chunks);
    }

    // -------------------------------
    // 4. Persist this batch
    // -------------------------------

    if (batchChunks.length) {
      await createCodeChunks(batchChunks);

      totalChunks += batchChunks.length;
    }

    totalFiles += files.length;

    lastFileId = files[files.length - 1].file_id;

    console.log(
      `Code chunking progress: files=${totalFiles}, symbols=${totalSymbols}, chunks=${totalChunks}`,
    );
  }

  console.log(`Code chunking completed for ${repository.repository_name}`);

  return {
    repositoryId,

    fileCount: totalFiles,

    symbolCount: totalSymbols,

    chunkCount: totalChunks,
  };
}
