import { extractJavaScript } from "./javascriptExtractor.js";
import { extractPython } from "./pythonExtractor.js";
import { extractJava } from "./javaExtractor.js";
import { extractCpp } from "./cppExtractor.js";
import { extractTypeScript } from "./typescriptExtractor.js";

const extractorRegistry = new Map([
  ["javascript", extractJavaScript],
  ["python", extractPython],
  ["java", extractJava],
  ["c++", extractCpp],
  ["typescript", extractTypeScript],
  ["tsx", extractTypeScript],
]);

export function getExtractor(language) {
  if (!language) {
    return null;
  }

  const normalizedLanguage = language.trim().toLowerCase();

  return extractorRegistry.get(normalizedLanguage) || null;
}
