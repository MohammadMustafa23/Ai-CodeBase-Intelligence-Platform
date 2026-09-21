import { neo4jDriver, neo4jDatabase } from "../db/neo4j.js";

/**
 * Repository -> File
 *
 * Creates:
 * (:Repository)-[:CONTAINS]->(:File)
 */
export async function createRepositoryFileEdges(files) {
  if (!files.length) {
    return 0;
  }

  const query = `
    UNWIND $files AS file

    MATCH (r:Repository {id: file.repositoryId})
    MATCH (f:File {id: file.fileId})

    MERGE (r)-[:CONTAINS]->(f)

    RETURN count(*) AS total;
  `;

  const { records } = await neo4jDriver.executeQuery(
    query,
    {
      files: files.map((file) => ({
        repositoryId: file.repository_id,
        fileId: file.file_id,
      })),
    },
    {
      database: neo4jDatabase,
    },
  );

  return records[0]?.get("total")?.toNumber() || 0;
}

/**
 * File -> Symbol
 *
 * Creates:
 * (:File)-[:CONTAINS]->(:Symbol)
 */
export async function createFileSymbolEdges(symbols) {
  if (!symbols.length) {
    return 0;
  }

  const query = `
    UNWIND $symbols AS symbol

    MATCH (f:File {id: symbol.fileId})
    MATCH (s:Symbol {id: symbol.symbolId})

    MERGE (f)-[:CONTAINS]->(s)

    RETURN count(*) AS total;
  `;

  const { records } = await neo4jDriver.executeQuery(
    query,
    {
      symbols: symbols.map((symbol) => ({
        fileId: symbol.file_id,
        symbolId: symbol.symbol_id,
      })),
    },
    {
      database: neo4jDatabase,
    },
  );

  return records[0]?.get("total")?.toNumber() || 0;
}

/**
 * File -> File
 *
 * Phase 4 currently gives us file import relationships.
 *
 * Creates:
 * (:File)-[:IMPORTS]->(:File)
 */
export async function createFileImportEdges(relationships) {
  const resolvedRelationships = relationships.filter(
    (relationship) =>
      relationship.target_file_id &&
      relationship.resolution_status === "resolved",
  );

  if (!resolvedRelationships.length) {
    return 0;
  }

  const query = `
    UNWIND $relationships AS relationship

    MATCH (source:File {
      id: relationship.sourceFileId
    })

    MATCH (target:File {
      id: relationship.targetFileId
    })

    MERGE (source)-[r:IMPORTS]->(target)

    SET
      r.relationshipId =
        relationship.relationshipId,
      r.referenceId =
        relationship.referenceId,
      r.resolutionStatus =
        relationship.resolutionStatus,
      r.updatedAt = datetime()

    RETURN count(*) AS total;
  `;

  const { records } = await neo4jDriver.executeQuery(
    query,
    {
      relationships: resolvedRelationships.map((relationship) => ({
        relationshipId: relationship.relationship_id,

        sourceFileId: relationship.source_file_id,

        targetFileId: relationship.target_file_id,

        referenceId: relationship.reference_id,

        resolutionStatus: relationship.resolution_status,
      })),
    },
    {
      database: neo4jDatabase,
    },
  );

  return records[0]?.get("total")?.toNumber() || 0;
}
