import { neo4jDriver, neo4jDatabase } from "../db/neo4j.js";

/**
 * Create or update one repository node.
 */
export async function upsertRepositoryNode(repository) {
  const query = `
    MERGE (r:Repository {id: $id})
    SET
      r.name = $name,
      r.owner = $owner,
      r.githubUrl = $githubUrl,
      r.status = $status,
      r.updatedAt = datetime()
    RETURN r.id AS id;
  `;

  const { records } = await neo4jDriver.executeQuery(
    query,
    {
      id: repository.repository_id,
      name: repository.repository_name,
      owner: repository.owner,
      githubUrl: repository.github_url,
      status: repository.status,
    },
    {
      database: neo4jDatabase,
    },
  );

  return records.map((record) => ({
    id: record.get("id"),
  }));
}

/**
 * Create or update file nodes in one batch.
 */
export async function upsertFileNodes(files) {
  if (!files.length) {
    return [];
  }

  const query = `
    UNWIND $files AS file

    MERGE (f:File {id: file.id})

    SET
      f.repositoryId = file.repositoryId,
      f.relativePath = file.relativePath,
      f.fileName = file.fileName,
      f.extension = file.extension,
      f.fileType = file.fileType,
      f.language = file.language,
      f.sizeBytes = file.sizeBytes,
      f.lineCount = file.lineCount,
      f.updatedAt = datetime()

    RETURN count(f) AS total;
  `;

  await neo4jDriver.executeQuery(
    query,
    {
      files: files.map((file) => ({
        id: file.file_id,
        repositoryId: file.repository_id,
        relativePath: file.relative_path,
        fileName: file.file_name,
        extension: file.extension,
        fileType: file.file_type,
        language: file.language,
        sizeBytes: Number(file.size_bytes || 0),
        lineCount: file.line_count,
      })),
    },
    {
      database: neo4jDatabase,
    },
  );

  return files;
}

/**
 * Create or update symbol nodes in one batch.
 */
export async function upsertSymbolNodes(symbols) {
  if (!symbols.length) {
    return [];
  }

  const query = `
    UNWIND $symbols AS symbol

    MERGE (s:Symbol {id: symbol.id})

    SET
      s.fileId = symbol.fileId,
      s.name = symbol.name,
      s.type = symbol.type,
      s.signature = symbol.signature,
      s.startLine = symbol.startLine,
      s.startColumn = symbol.startColumn,
      s.endLine = symbol.endLine,
      s.endColumn = symbol.endColumn,
      s.updatedAt = datetime()

    RETURN count(s) AS total;
  `;

  await neo4jDriver.executeQuery(
    query,
    {
      symbols: symbols.map((symbol) => ({
        id: symbol.symbol_id,
        fileId: symbol.file_id,
        name: symbol.symbol_name,
        type: symbol.symbol_type,
        signature: symbol.signature,
        startLine: symbol.start_line,
        startColumn: symbol.start_column,
        endLine: symbol.end_line,
        endColumn: symbol.end_column,
      })),
    },
    {
      database: neo4jDatabase,
    },
  );

  return symbols;
}
