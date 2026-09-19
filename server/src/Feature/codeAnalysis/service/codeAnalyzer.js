import fs from "node:fs/promises";
import path from "node:path";

import { parseSource } from "../parser/codeParser.js";
import { getExtractor } from "../extractor/extractorRegistry.js";

import { createCodeSymbols } from "../Db_query/codeSymbols.js";
import { createCodeReferences } from "../Db_query/codeReferences.js";

export async function analyzeFile({ repositoryPath, file }) {
  const filePath = path.join(repositoryPath, file.relative_path);

  // 1. Read actual source file
  const sourceCode = await fs.readFile(filePath, "utf8");

  // 2. Parse source -> AST
  const parsed = parseSource({
    sourceCode,
    language: file.language,
    extension: file.extension,
  });

  if (!parsed.success) {
    return {
      success: false,
      status: parsed.status,
      error: parsed.error,
      symbols: [],
      references: [],
    };
  }

  // 3. Get language-specific extractor
  const extractor = getExtractor(file.language);

  if (!extractor) {
    return {
      success: false,
      status: "unsupported",
      error: `No extractor available for ${file.language}`,
      symbols: [],
      references: [],
    };
  }

  // 4. Extract useful information from AST
  const result = extractor(parsed.tree);
  
  console.log("Extracted symbols:", result.symbols.length);
  console.log("Extracted references:", result.references.length);

  console.log("Saving symbols...");
  const storedSymbols = await createCodeSymbols(file.file_id, result.symbols);
  console.log("Symbols saved:", storedSymbols.length);

  console.log("Saving references...");
  const storedReferences = await createCodeReferences(
    file.file_id,
    result.references,
  );
  console.log("References saved:", storedReferences.length);

  return {
    success: true,
    status: "completed",
    symbols: storedSymbols,
    references: storedReferences,
    error: null,
  };
}
