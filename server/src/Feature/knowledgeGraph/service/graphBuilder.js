import { pool } from "../../../config/database.js";

import {
  upsertRepositoryNode,
  upsertFileNodes,
  upsertSymbolNodes,
} from "../builder/graphNodeBuilder.js";

import {
  createRepositoryFileEdges,
  createFileSymbolEdges,
  createFileImportEdges,
} from "../builder/graphEdgeBuilder.js";

const DEFAULT_BATCH_SIZE = 500;

async function getRepository(repositoryId) {
  const query = `
    SELECT
      repository_id,
      github_url,
      owner,
      repository_name,
      status
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

async function getSymbolBatch(repositoryId, lastSymbolId, batchSize) {
  const query = `
    SELECT
      cs.symbol_id,
      cs.file_id,
      cs.symbol_name,
      cs.symbol_type,
      cs.signature,
      cs.start_line,
      cs.start_column,
      cs.end_line,
      cs.end_column
    FROM code_symbols cs
    INNER JOIN repository_files rf
      ON rf.file_id = cs.file_id
    WHERE
      rf.repository_id = $1
      AND cs.symbol_id > $2
    ORDER BY cs.symbol_id
    LIMIT $3;
  `;

  const { rows } = await pool.query(query, [
    repositoryId,
    lastSymbolId,
    batchSize,
  ]);

  return rows;
}

async function getRelationshipBatch(
  repositoryId,
  lastRelationshipId,
  batchSize,
) {
  const query = `
    SELECT
      cr.relationship_id,
      cr.source_file_id,
      cr.target_file_id,
      cr.relationship_type,
      cr.resolution_status,
      cr.reference_id
    FROM code_relationships cr
    INNER JOIN repository_files source_file
      ON source_file.file_id = cr.source_file_id
    WHERE
      source_file.repository_id = $1
      AND cr.relationship_id > $2
    ORDER BY cr.relationship_id
    LIMIT $3;
  `;

  const { rows } = await pool.query(query, [
    repositoryId,
    lastRelationshipId,
    batchSize,
  ]);

  return rows;
}

export async function buildKnowledgeGraph(
  repositoryId,
  { batchSize = DEFAULT_BATCH_SIZE } = {},
) {
  const repository = await getRepository(repositoryId);

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`);
  }

  console.log(
    `Starting knowledge graph build for ${repository.repository_name}`,
  );

  // ==========================================
  // 1. Repository node
  // ==========================================

  await upsertRepositoryNode(repository);

  // ==========================================
  // 2. File nodes + Repository -> File edges
  // ==========================================

  let lastFileId = "00000000-0000-0000-0000-000000000000";

  let totalFiles = 0;

  while (true) {
    const files = await getFileBatch(repositoryId, lastFileId, batchSize);

    if (!files.length) {
      break;
    }

    await upsertFileNodes(files);

    await createRepositoryFileEdges(files);

    totalFiles += files.length;

    lastFileId = files[files.length - 1].file_id;

    console.log(`Graph files processed: ${totalFiles}`);
  }

  // ==========================================
  // 3. Symbol nodes + File -> Symbol edges
  // ==========================================

  let lastSymbolId = "00000000-0000-0000-0000-000000000000";

  let totalSymbols = 0;

  while (true) {
    const symbols = await getSymbolBatch(repositoryId, lastSymbolId, batchSize);

    if (!symbols.length) {
      break;
    }

    await upsertSymbolNodes(symbols);

    await createFileSymbolEdges(symbols);

    totalSymbols += symbols.length;

    lastSymbolId = symbols[symbols.length - 1].symbol_id;

    console.log(`Graph symbols processed: ${totalSymbols}`);
  }

  // ==========================================
  // 4. File -> File import edges
  // ==========================================

  let lastRelationshipId = "00000000-0000-0000-0000-000000000000";

  let totalRelationships = 0;

  while (true) {
    const relationships = await getRelationshipBatch(
      repositoryId,
      lastRelationshipId,
      batchSize,
    );

    if (!relationships.length) {
      break;
    }

    const importRelationships = relationships.filter(
      (relationship) =>
        relationship.relationship_type === "imports" &&
        relationship.resolution_status === "resolved",
    );

    if (importRelationships.length) {
      await createFileImportEdges(importRelationships);
    }

    totalRelationships += importRelationships.length;

    lastRelationshipId =
      relationships[relationships.length - 1].relationship_id;

    console.log(`Graph relationships processed: ${totalRelationships}`);
  }

  console.log(
    `Knowledge graph build completed for ${repository.repository_name}`,
  );

  return {
    repositoryId,
    fileCount: totalFiles,
    symbolCount: totalSymbols,
    relationshipCount: totalRelationships,
  };
}
