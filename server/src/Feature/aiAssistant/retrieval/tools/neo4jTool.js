import neo4j from "neo4j-driver";

import {
  neo4jDriver,
  neo4jDatabase,
} from "../../../knowledgeGraph/db/neo4j.js";

import { neo4jToolSchema } from "./retrievalToolSchemas.js";

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

function normalizeRecord(record) {
  const result = {};

  for (const key of Object.keys(record)) {
    result[key] = record[key];
  }

  return result;
}

async function executeQuery(query, params) {
  const session = neo4jDriver.session({
    database: neo4jDatabase,
  });

  try {
    const result = await session.run(query, params);

    return result.records.map((record) => normalizeRecord(record.toObject()));
  } finally {
    await session.close();
  }
}

async function findFile({ repositoryId, name, limit }) {
  const query = `
    MATCH (f:File)
    WHERE f.repositoryId = $repositoryId
      AND (
        toLower(f.relativePath) CONTAINS toLower($name)
        OR toLower(f.fileName) CONTAINS toLower($name)
      )
    RETURN
      f.id AS fileId,
      f.relativePath AS filePath,
      f.fileName AS fileName,
      f.language AS language,
      f.fileType AS fileType
    ORDER BY f.relativePath
    LIMIT $limit
  `;

  return executeQuery(query, {
    repositoryId,
    name,
    limit: neo4j.int(limit),
  });
}

async function findSymbol({ repositoryId, name, limit }) {
  const query = `
    MATCH (f:File)-[:CONTAINS]->(s:Symbol)
    WHERE f.repositoryId = $repositoryId
      AND (
        toLower(s.name) CONTAINS toLower($name)
        OR toLower(s.type) CONTAINS toLower($name)
      )
    RETURN
      s.id AS symbolId,
      s.name AS symbolName,
      s.type AS symbolType,
      s.signature AS signature,
      s.startLine AS startLine,
      s.endLine AS endLine,
      f.id AS fileId,
      f.relativePath AS filePath
    ORDER BY
      f.relativePath,
      s.startLine
    LIMIT $limit
  `;

  return executeQuery(query, {
    repositoryId,
    name,
    limit: neo4j.int(limit),
  });
}

async function findImports({ repositoryId, name, limit }) {
  const query = `
    MATCH (source:File)-[r:IMPORTS]->(target:File)
    WHERE source.repositoryId = $repositoryId
      AND target.repositoryId = $repositoryId
      AND (
        toLower(source.relativePath) CONTAINS toLower($name)
        OR toLower(source.fileName) CONTAINS toLower($name)
      )
    RETURN
      source.id AS sourceFileId,
      source.relativePath AS sourceFile,
      target.id AS targetFileId,
      target.relativePath AS targetFile,
      r.relationshipType AS relationshipType,
      r.resolutionStatus AS resolutionStatus
    ORDER BY
      source.relativePath,
      target.relativePath
    LIMIT $limit
  `;

  return executeQuery(query, {
    repositoryId,
    name,
    limit: neo4j.int(limit),
  });
}

async function findImporters({ repositoryId, name, limit }) {
  const query = `
    MATCH (source:File)-[r:IMPORTS]->(target:File)
    WHERE source.repositoryId = $repositoryId
      AND target.repositoryId = $repositoryId
      AND (
        toLower(target.relativePath) CONTAINS toLower($name)
        OR toLower(target.fileName) CONTAINS toLower($name)
      )
    RETURN
      source.id AS sourceFileId,
      source.relativePath AS sourceFile,
      target.id AS targetFileId,
      target.relativePath AS targetFile,
      r.relationshipType AS relationshipType,
      r.resolutionStatus AS resolutionStatus
    ORDER BY
      source.relativePath,
      target.relativePath
    LIMIT $limit
  `;

  return executeQuery(query, {
    repositoryId,
    name,
    limit: neo4j.int(limit),
  });
}

async function findConnections({ repositoryId, name, depth, limit }) {
  const query = `
    MATCH (start:File)
    WHERE start.repositoryId = $repositoryId
      AND (
        toLower(start.relativePath) CONTAINS toLower($name)
        OR toLower(start.fileName) CONTAINS toLower($name)
      )

    MATCH path = (start)-[:IMPORTS*1..${depth}]->(connected:File)

    WHERE connected.repositoryId = $repositoryId

    RETURN
      start.relativePath AS startFile,
      connected.relativePath AS connectedFile,
      length(path) AS depth
    ORDER BY
      depth ASC,
      connected.relativePath
    LIMIT $limit
  `;

  return executeQuery(query, {
    repositoryId,
    name,
    limit: neo4j.int(limit),
  });
}

async function searchNeo4jTool({ repositoryId, ...input }) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  const validatedInput = neo4jToolSchema.parse(input);

  console.log(
    `[NEO4J TOOL] operation=${validatedInput.operation} name="${validatedInput.name}"`,
  );

  if (validatedInput.operation === "find_file") {
    const result = await findFile({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });

    console.log(`[NEO4J TOOL] file result count: ${result.length}`);

    return result;
  }

  if (validatedInput.operation === "find_symbol") {
    const result = await findSymbol({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });

    console.log(`[NEO4J TOOL] symbol result count: ${result.length}`);

    return result;
  }

  if (validatedInput.operation === "find_imports") {
    const result = await findImports({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });

    console.log(`[NEO4J TOOL] import result count: ${result.length}`);

    return result;
  }

  if (validatedInput.operation === "find_importers") {
    const result = await findImporters({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });

    console.log(`[NEO4J TOOL] importer result count: ${result.length}`);

    return result;
  }

  if (validatedInput.operation === "find_connections") {
    const result = await findConnections({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });

    console.log(`[NEO4J TOOL] connection result count: ${result.length}`);

    return result;
  }

  throw new Error(`Unsupported Neo4j operation: ${validatedInput.operation}`);
}

export { searchNeo4jTool };
