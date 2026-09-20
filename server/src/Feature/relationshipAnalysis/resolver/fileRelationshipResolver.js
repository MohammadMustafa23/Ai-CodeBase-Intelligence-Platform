import path from "node:path";

const DEFAULT_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cpp",
  ".cc",
  ".cxx",
  ".h",
  ".hpp",
  ".hh",
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function createCandidates(relativePath, extensions = DEFAULT_EXTENSIONS) {
  const candidates = new Set();

  const normalized = normalizePath(relativePath);
  const extension = path.posix.extname(normalized);

  // Exact path
  candidates.add(normalized);

  // Add extensions if import doesn't contain one.
  if (!extension) {
    for (const ext of extensions) {
      candidates.add(`${normalized}${ext}`);
    }
  }

  // Directory import:
  // ./utils -> ./utils/index.js
  if (!extension) {
    for (const ext of extensions) {
      candidates.add(`${normalized}/index${ext}`);
    }
  }

  return [...candidates];
}

export function resolveFileRelationship({
  currentFile,
  sourcePath,
  repositoryFiles,
}) {
  if (!sourcePath) {
    return {
      status: "unresolved",
      targetFile: null,
    };
  }

  // We only resolve repository-internal relative imports
  // in this first implementation.
  if (!sourcePath.startsWith(".") && !sourcePath.startsWith("/")) {
    return {
      status: "external",
      targetFile: null,
    };
  }

  const currentDirectory = path.posix.dirname(
    normalizePath(currentFile.relative_path),
  );

  const importPath = normalizePath(sourcePath);

  const resolvedPath = normalizePath(
    path.posix.normalize(path.posix.join(currentDirectory, importPath)),
  );

  const candidates = createCandidates(resolvedPath);

  const fileMap = new Map(
    repositoryFiles.map((file) => [normalizePath(file.relative_path), file]),
  );

  for (const candidate of candidates) {
    const targetFile = fileMap.get(candidate);

    if (targetFile) {
      return {
        status: "resolved",
        targetFile,
      };
    }
  }

  return {
    status: "unresolved",
    targetFile: null,
  };
}
