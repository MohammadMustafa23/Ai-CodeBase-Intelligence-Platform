import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import Java from "tree-sitter-java";
import Cpp from "tree-sitter-cpp";

/*
 * Language -> Tree-sitter grammar
 */
const languageRegistry = new Map([
  ["javascript", JavaScript],
  ["typescript", TypeScript.typescript],
  ["tsx", TypeScript.tsx],
  ["python", Python],
  ["java", Java],
  ["c++", Cpp],
]);

const extensionRegistry = new Map([
  [".js", JavaScript],
  [".jsx", JavaScript],

  [".ts", TypeScript.typescript],
  [".tsx", TypeScript.tsx],

  [".py", Python],

  [".java", Java],

  [".cpp", Cpp],
  [".cc", Cpp],
  [".cxx", Cpp],
  [".hpp", Cpp],
  [".hh", Cpp],
  [".hxx", Cpp],
]);

export function getParserLanguage({ language, extension }) {
  const normalizedExtension = extension?.trim().toLowerCase();

  if (normalizedExtension) {
    const parser = extensionRegistry.get(normalizedExtension);
    if (parser) {
      return parser;
    }
  }

  const normalizedLanguage = language?.trim().toLowerCase();
  return languageRegistry.get(normalizedLanguage) || null;
}
