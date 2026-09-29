import { postgresToolSchema } from "./retrievalToolSchemas.js";
import { pool } from "../../../../config/database.js";

const FILE_FIELDS = {
  file_id: "rf.file_id",
  relative_path: "rf.relative_path",
  file_name: "rf.file_name",
  extension: "rf.extension",
  file_type: "rf.file_type",
  language: "rf.language",
  size_bytes: "rf.size_bytes",
  line_count: "rf.line_count",
  analysis_status: "rf.analysis_status",
  analysis_error: "rf.analysis_error",
  analyzed_at: "rf.analyzed_at",
};

const FILE_SEARCH_COLUMNS = {
  relative_path: "rf.relative_path",
  file_name: "rf.file_name",
  extension: "rf.extension",
  file_type: "rf.file_type",
  language: "rf.language",
};

const SYMBOL_FIELDS = {
  symbol_id: "cs.symbol_id",
  file_id: "cs.file_id",
  symbol_name: "cs.symbol_name",
  symbol_type: "cs.symbol_type",
  parent_symbol_id: "cs.parent_symbol_id",
  signature: "cs.signature",
  start_line: "cs.start_line",
  start_column: "cs.start_column",
  end_line: "cs.end_line",
  end_column: "cs.end_column",

  // Joined retrieval fields from repository_files
  relative_path: "rf.relative_path",
  file_name: "rf.file_name",
  extension: "rf.extension",
  file_type: "rf.file_type",
  language: "rf.language",
};

const SYMBOL_SEARCH_COLUMNS = {
  symbol_name: "cs.symbol_name",
  symbol_type: "cs.symbol_type",
  signature: "cs.signature",
  file_id: "cs.file_id",
  file_path: "rf.relative_path",
  relative_path: "rf.relative_path",
};

const CHUNK_FIELDS = {
  chunk_id: "cc.chunk_id",
  repository_id: "cc.repository_id",
  file_id: "cc.file_id",
  symbol_id: "cc.symbol_id",
  chunk_key: "cc.chunk_key",
  chunk_type: "cc.chunk_type",
  chunk_index: "cc.chunk_index",
  start_line: "cc.start_line",
  end_line: "cc.end_line",
  start_byte: "cc.start_byte",
  end_byte: "cc.end_byte",
  chunk_hash: "cc.chunk_hash",
};

const CHUNK_SEARCH_COLUMNS = {
  chunk_key: "cc.chunk_key",
  chunk_type: "cc.chunk_type",
  file_id: "cc.file_id",
  symbol_id: "cc.symbol_id",
  file_path: "rf.relative_path",
  symbol_name: "cs.symbol_name",
};

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== "string" || repositoryId.trim().length === 0) {
    throw new TypeError("repositoryId is required");
  }

  return repositoryId.trim();
}

function escapeLikePattern(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function buildFieldList(fields, fieldMap) {
  return fields.map((field) => {
    const column = fieldMap[field];

    if (!column) {
      throw new Error(`Unsupported PostgreSQL field: ${field}`);
    }

    return `${column} AS "${field}"`;
  });
}

function buildSearchCondition({ searchBy, searchValue, searchMap, values }) {
  const column = searchMap[searchBy];

  if (!column) {
    throw new Error(`Unsupported PostgreSQL search field: ${searchBy}`);
  }

  const exactSearch = searchBy === "file_id" || searchBy === "symbol_id";

  if (exactSearch) {
    values.push(searchValue);

    return `${column} = $${values.length}`;
  }

  values.push(`%${escapeLikePattern(searchValue)}%`);

  return `${column} ILIKE $${values.length} ESCAPE '\\'`;
}

async function searchFiles({
  repositoryId,
  searchBy,
  searchValue,
  fields,
  limit,
}) {
  const values = [repositoryId];

  const selectedFields = buildFieldList(fields, FILE_FIELDS);

  const searchCondition = buildSearchCondition({
    searchBy,
    searchValue,
    searchMap: FILE_SEARCH_COLUMNS,
    values,
  });

  values.push(limit);

  const query = `
    SELECT
      ${selectedFields.join(",\n      ")}
    FROM repository_files rf
    WHERE rf.repository_id = $1
      AND ${searchCondition}
    ORDER BY rf.relative_path ASC
    LIMIT $${values.length};
  `;

  console.log(
    `[POSTGRES TOOL] files search: ${searchBy}="${searchValue}" limit=${limit}`,
  );

  const result = await pool.query(query, values);

  console.log(`[POSTGRES TOOL] files result count: ${result.rows.length}`);

  return result.rows;
}

async function searchSymbols({
  repositoryId,
  searchBy,
  searchValue,
  fields,
  limit,
}) {
  const values = [repositoryId];

  const selectedFields = buildFieldList(fields, SYMBOL_FIELDS);

  const searchCondition = buildSearchCondition({
    searchBy,
    searchValue,
    searchMap: SYMBOL_SEARCH_COLUMNS,
    values,
  });

  values.push(limit);

  const query = `
    SELECT
      ${selectedFields.join(",\n      ")}
    FROM code_symbols cs
    INNER JOIN repository_files rf
      ON rf.file_id = cs.file_id
    WHERE rf.repository_id = $1
      AND ${searchCondition}
    ORDER BY
      cs.start_line ASC,
      cs.start_column ASC
    LIMIT $${values.length};
  `;

  console.log(
    `[POSTGRES TOOL] symbols search: ${searchBy}="${searchValue}" limit=${limit}`,
  );

  const result = await pool.query(query, values);

  console.log(`[POSTGRES TOOL] symbols result count: ${result.rows.length}`);

  return result.rows;
}

async function searchChunks({
  repositoryId,
  searchBy,
  searchValue,
  fields,
  limit,
}) {
  const values = [repositoryId];

  const selectedFields = buildFieldList(fields, CHUNK_FIELDS);

  const searchCondition = buildSearchCondition({
    searchBy,
    searchValue,
    searchMap: CHUNK_SEARCH_COLUMNS,
    values,
  });

  values.push(limit);

  const query = `
    SELECT
      ${selectedFields.join(",\n      ")}
    FROM code_chunks cc
    INNER JOIN repository_files rf
      ON rf.file_id = cc.file_id
    LEFT JOIN code_symbols cs
      ON cs.symbol_id = cc.symbol_id
    WHERE cc.repository_id = $1
      AND ${searchCondition}
    ORDER BY
      cc.start_line ASC,
      cc.chunk_index ASC
    LIMIT $${values.length};
  `;

  console.log(
    `[POSTGRES TOOL] chunks search: ${searchBy}="${searchValue}" limit=${limit}`,
  );

  const result = await pool.query(query, values);

  console.log(`[POSTGRES TOOL] chunks result count: ${result.rows.length}`);

  return result.rows;
}

async function searchPostgresTool({ repositoryId, ...input }) {
  const safeRepositoryId = validateRepositoryId(repositoryId);

  const validatedInput = postgresToolSchema.parse(input);

  console.log(`[POSTGRES TOOL] resource=${validatedInput.resource}`);

  if (validatedInput.resource === "files") {
    return searchFiles({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });
  }

  if (validatedInput.resource === "symbols") {
    return searchSymbols({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });
  }

  if (validatedInput.resource === "chunks") {
    return searchChunks({
      repositoryId: safeRepositoryId,
      ...validatedInput,
    });
  }

  throw new Error(
    `Unsupported PostgreSQL resource: ${validatedInput.resource}`,
  );
}

export { searchPostgresTool };
