import Parser from "tree-sitter";
import { getParserLanguage } from "./parserRegistry.js";

export function parseSource({ sourceCode, language, extension }) {
  if (typeof sourceCode !== "string") {
    throw new Error("Source code must be a string.");
  }

  const parserLanguage = getParserLanguage({
    language,
    extension,
  });

  if (!parserLanguage) {
    return {
      success: false,
      status: "unsupported",
      tree: null,
      error: `Unsupported language: ${language || extension}`,
    };
  }

  const parser = new Parser();
  parser.setLanguage(parserLanguage);
  const tree = parser.parse(sourceCode);

  return {
    success: true,
    status: "parsed",
    tree,
    error: null,
  };
}
