import { z } from "zod";

const postgresToolSchema = z.object({
  resource: z
    .enum(["files", "symbols", "chunks"])
    .describe(
      "Repository resource to retrieve. Use files for file metadata, symbols for code symbols, and chunks for code chunk metadata.",
    ),

  searchBy: z
    .enum([
      "relative_path",
      "file_name",
      "extension",
      "file_type",
      "language",
      "symbol_name",
      "symbol_type",
      "signature",
      "file_id",
      "chunk_key",
      "chunk_type",
      "symbol_id",
    ])
    .describe("Field used to search the selected repository resource."),

  searchValue: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .describe("Value used for the selected search field."),

  fields: z
    .array(
      z.enum([
        "file_id",
        "relative_path",
        "file_name",
        "extension",
        "file_type",
        "language",
        "size_bytes",
        "line_count",
        "analysis_status",
        "analysis_error",
        "analyzed_at",
        "symbol_id",
        "symbol_name",
        "symbol_type",
        "parent_symbol_id",
        "signature",
        "start_line",
        "start_column",
        "end_line",
        "end_column",
        "repository_id",
        "chunk_id",
        "chunk_key",
        "chunk_type",
        "chunk_index",
        "start_byte",
        "end_byte",
        "chunk_hash",
      ]),
    )
    .min(1)
    .max(10)
    .describe(
      "Fields to return. Request only the fields required to answer the question.",
    ),

  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Maximum number of results. Prefer a small limit."),
});

const pineconeToolSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .describe("Semantic description of the code or concept to search for."),

  topK: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Maximum number of semantic matches. Prefer a small value."),
});

const neo4jToolSchema = z.object({
  operation: z
    .enum([
      "find_file",
      "find_symbol",
      "find_imports",
      "find_importers",
      "find_connections",
    ])
    .describe("Graph operation to perform."),

  name: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .describe("File name, file path, symbol name, or graph entity name."),

  relatedTo: z
    .string()
    .trim()
    .max(150)
    .optional()
    .describe(
      "Optional related entity name. Omit or leave empty when not required.",
    ),

  depth: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe(
      "Graph traversal depth. Use 1 unless deeper relationships are required.",
    ),

  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Maximum number of graph results. Prefer a small limit."),
});

const sourceReaderToolSchema = z.object({
  relativePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe(
      "Repository relative path or file name. A file name such as server.js is allowed and the backend resolves it to the repository path.",
    ),

  startLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Optional first source line to read."),

  endLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Optional last source line to read."),

  maxChars: z
    .number()
    .int()
    .min(500)
    .max(12000)
    .default(12000)
    .describe("Maximum number of source characters to return."),
});

export {
  postgresToolSchema,
  pineconeToolSchema,
  neo4jToolSchema,
  sourceReaderToolSchema,
};
