import fs from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
]);

const IGNORED_FILES = new Set([
  ".DS_Store",
]);

const LANGUAGE_MAP = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".java": "Java",
  ".cpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".go": "Go",
  ".rs": "Rust",
  ".php": "PHP",
  ".rb": "Ruby",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".json": "JSON",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".md": "Markdown",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".xml": "XML",
};

function getFileType(extension, fileName) {
  if ([".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c",
    ".cs", ".go", ".rs", ".php", ".rb", ".swift", ".kt"].includes(extension)) {
    return "source";
  }

  if (fileName === "package.json" ||[".json", ".yml", ".yaml", ".xml"].includes(extension)) {
    return "config";
  }

  if (extension === ".md" || fileName.toLowerCase() === "readme") {
    return "documentation";
  }

  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    fileName.startsWith("test.")
  ) {
    return "test";
  }

  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
      ".ico", ".mp4", ".mp3", ".zip", ".pdf"].includes(extension)
  ) {
    return "asset";
  }

  return "other";
}

function getLanguage(extension) {
  return LANGUAGE_MAP[extension] || null;
}

async function getLineCount(filePath) {
  const buffer = await fs.readFile(filePath);

  // Basic binary-file detection
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));

  if (sample.includes(0)) {
    return null;
  }

  if (buffer.length === 0) {
    return 0;
  }

  return buffer.toString("utf8").split(/\r?\n/).length;
}

async function scanDirectory(repositoryPath, currentPath = repositoryPath) {
  const entries = await fs.readdir(currentPath, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const nestedFiles = await scanDirectory(
        repositoryPath,
        fullPath,
      );

      files.push(...nestedFiles);

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (IGNORED_FILES.has(entry.name)) {
      continue;
    }

    const relativePath = path.relative(
      repositoryPath,
      fullPath,
    );

    const extension = path.extname(entry.name).toLowerCase();

    const stats = await fs.stat(fullPath);

    const fileType = getFileType(
      extension,
      entry.name,
    );

    const language = getLanguage(extension);

    const lineCount =
      fileType === "asset"
        ? null
        : await getLineCount(fullPath);

    files.push({
      relativePath: relativePath.replaceAll(path.sep, "/"),
      fileName: entry.name,
      extension: extension || null,
      fileType,
      language,
      sizeBytes: stats.size,
      lineCount,
    });
  }

  return files;
}

export async function scanRepository(repositoryPath) {
  const files = await scanDirectory(repositoryPath);

  console.log(
    `Repository scan completed. ${files.length} files found.`,
  );

  return files;
}