import { pool } from "../../../config/database.js";

import { resolveFileRelationship } from "../resolver/fileRelationshipResolver.js";
import { createCodeRelationships } from "../Db_query/codeRelationships.js";

export async function analyzeRepositoryRelationships(repositoryId) {
  // 1. Get all files belonging to the repository
  const filesQuery = `
    SELECT
      file_id,
      relative_path,
      file_name,
      extension,
      file_type,
      language
    FROM repository_files
    WHERE repository_id = $1
    ORDER BY relative_path;
  `;

  const { rows: repositoryFiles } = await pool.query(filesQuery, [
    repositoryId,
  ]);

  if (!repositoryFiles.length) {
    return {
      totalReferences: 0,
      processed: 0,
      resolved: 0,
      unresolved: 0,
      external: 0,
      relationships: [],
    };
  }

  // 2. Get only import references
  const referencesQuery = `
    SELECT
      cr.reference_id,
      cr.file_id,
      cr.reference_type,
      cr.name,
      cr.source_path,
      cr.reference_kind
    FROM code_references cr
    INNER JOIN repository_files rf
      ON rf.file_id = cr.file_id
    WHERE
      rf.repository_id = $1
      AND cr.reference_type = 'import'
      AND cr.source_path IS NOT NULL
    ORDER BY cr.created_at;
  `;

  const { rows: references } = await pool.query(referencesQuery, [
    repositoryId,
  ]);

  if (!references.length) {
    return {
      totalReferences: 0,
      processed: 0,
      resolved: 0,
      unresolved: 0,
      external: 0,
      relationships: [],
    };
  }

  // 3. Create quick lookup for source files
  const fileMap = new Map(repositoryFiles.map((file) => [file.file_id, file]));

  const relationships = [];

  let resolved = 0;
  let unresolved = 0;
  let external = 0;

  // 4. Resolve every import
  for (const reference of references) {
    const sourceFile = fileMap.get(reference.file_id);

    if (!sourceFile) {
      continue;
    }

    const result = resolveFileRelationship({
      currentFile: sourceFile,
      sourcePath: reference.source_path,
      repositoryFiles,
    });

    // External packages are not repository relationships.
    if (result.status === "external") {
      external += 1;
      continue;
    }

    if (result.status === "resolved") {
      resolved += 1;
    } else {
      unresolved += 1;
    }

    relationships.push({
      sourceFileId: sourceFile.file_id,
      targetFileId: result.targetFile?.file_id || null,
      relationshipType: "imports",
      resolutionStatus: result.status,
      referenceId: reference.reference_id,
    });
  }

  // 5. Store relationships
  const storedRelationships = await createCodeRelationships(relationships);

  return {
    totalReferences: references.length,
    processed: relationships.length,
    resolved,
    unresolved,
    external,
    relationships: storedRelationships,
  };
}
