import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_CHUNK_CHARACTERS = 12000;
const PRIMARY_SYMBOL_TYPES = new Set(["function", "method", "constructor"]);
const CONTAINER_SYMBOL_TYPES = new Set(["class", "interface", "enum"]);

function createHash(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function normalizeSymbols(symbols) {
  return [...symbols].sort((a, b) => {
    if (a.startLine !== b.startLine) {
      return a.startLine - b.startLine;
    }

    return a.endLine - b.endLine;
  });
}

function hasNestedSymbol(symbol, symbols) {
  return symbols.some((other) => {
    if (other.symbolId === symbol.symbolId) {
      return false;
    }

    const startsInside = other.startLine >= symbol.startLine;

    const endsInside = other.endLine <= symbol.endLine;

    const isStrictlySmaller =
      other.startLine > symbol.startLine || other.endLine < symbol.endLine;

    return startsInside && endsInside && isStrictlySmaller;
  });
}

function getLineOffsets(sourceCode) {
  const lines = sourceCode.split(/\r?\n/);

  const newline = sourceCode.includes("\r\n") ? "\r\n" : "\n";

  const byteOffsets = [];

  let byteOffset = 0;

  for (let index = 0; index < lines.length; index++) {
    byteOffsets.push(byteOffset);

    byteOffset += Buffer.byteLength(lines[index], "utf8");

    if (index < lines.length - 1) {
      byteOffset += Buffer.byteLength(newline, "utf8");
    }
  }

  return {
    lines,
    byteOffsets,
  };
}

function getSourceRange({ lines, byteOffsets, startLine, endLine }) {
  const safeStartLine = Math.max(1, Math.min(startLine, lines.length));

  const safeEndLine = Math.max(safeStartLine, Math.min(endLine, lines.length));

  const content = lines.slice(safeStartLine - 1, safeEndLine).join("\n");

  const startByte = byteOffsets[safeStartLine - 1];

  const lastLineIndex = safeEndLine - 1;

  const endByte =
    byteOffsets[lastLineIndex] +
    Buffer.byteLength(lines[lastLineIndex], "utf8");

  return {
    content,
    startLine: safeStartLine,
    endLine: safeEndLine,
    startByte,
    endByte,
  };
}

function splitLargeSymbol({
  repositoryId,
  fileId,
  symbol,
  lines,
  byteOffsets,
}) {
  const chunks = [];

  let chunkStartLine = symbol.startLine;
  let chunkIndex = 0;

  while (chunkStartLine <= symbol.endLine) {
    let chunkEndLine = chunkStartLine;

    let content = "";

    while (chunkEndLine <= symbol.endLine) {
      const candidate = getSourceRange({
        lines,
        byteOffsets,
        startLine: chunkStartLine,
        endLine: chunkEndLine,
      });

      if (
        candidate.content.length > MAX_CHUNK_CHARACTERS &&
        chunkEndLine > chunkStartLine
      ) {
        break;
      }

      content = candidate.content;

      if (content.length >= MAX_CHUNK_CHARACTERS) {
        break;
      }

      chunkEndLine++;
    }

    const actualEndLine = Math.max(chunkStartLine, chunkEndLine);

    const range = getSourceRange({
      lines,
      byteOffsets,
      startLine: chunkStartLine,
      endLine: actualEndLine,
    });

    chunks.push({
      repositoryId,

      fileId,

      symbolId: symbol.symbolId,

      chunkKey: `symbol:${symbol.symbolId}:${chunkIndex}`,

      chunkType: symbol.symbolType,

      chunkIndex,

      startLine: range.startLine,

      endLine: range.endLine,

      startByte: range.startByte,

      endByte: range.endByte,

      chunkHash: createHash(range.content),
    });

    chunkIndex++;

    chunkStartLine = actualEndLine + 1;
  }

  return chunks;
}

function createSingleSymbolChunk({
  repositoryId,
  fileId,
  symbol,
  lines,
  byteOffsets,
}) {
  const range = getSourceRange({
    lines,
    byteOffsets,
    startLine: symbol.startLine,
    endLine: symbol.endLine,
  });

  return {
    repositoryId,

    fileId,

    symbolId: symbol.symbolId,

    chunkKey: `symbol:${symbol.symbolId}:0`,

    chunkType: symbol.symbolType,

    chunkIndex: 0,

    startLine: range.startLine,

    endLine: range.endLine,

    startByte: range.startByte,

    endByte: range.endByte,

    chunkHash: createHash(range.content),
  };
}

export async function buildCodeChunks({ repositoryPath, file, symbols }) {
  if (!symbols.length) {
    return [];
  }

  const filePath = path.join(repositoryPath, file.relative_path);

  const sourceCode = await fs.readFile(filePath, "utf8");

  const { lines, byteOffsets } = getLineOffsets(sourceCode);

  const normalizedSymbols = normalizeSymbols(symbols);

  const chunks = [];

  for (const symbol of normalizedSymbols) {
    const symbolType = symbol.symbolType?.toLowerCase();

    // Functions, methods and constructors
    // are our primary retrieval units.
    if (PRIMARY_SYMBOL_TYPES.has(symbolType)) {
      const range = getSourceRange({
        lines,
        byteOffsets,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
      });

      if (range.content.length <= MAX_CHUNK_CHARACTERS) {
        chunks.push(
          createSingleSymbolChunk({
            repositoryId: file.repository_id,
            fileId: file.file_id,
            symbol,
            lines,
            byteOffsets,
          }),
        );
      } else {
        chunks.push(
          ...splitLargeSymbol({
            repositoryId: file.repository_id,
            fileId: file.file_id,
            symbol,
            lines,
            byteOffsets,
          }),
        );
      }

      continue;
    }

    // Class / interface / enum:
    // only create a standalone chunk when
    // there are no smaller symbols inside it.
    if (CONTAINER_SYMBOL_TYPES.has(symbolType)) {
      const containsNestedSymbols = hasNestedSymbol(symbol, normalizedSymbols);

      if (!containsNestedSymbols) {
        const range = getSourceRange({
          lines,
          byteOffsets,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
        });

        if (range.content.length <= MAX_CHUNK_CHARACTERS) {
          chunks.push(
            createSingleSymbolChunk({
              repositoryId: file.repository_id,
              fileId: file.file_id,
              symbol,
              lines,
              byteOffsets,
            }),
          );
        } else {
          chunks.push(
            ...splitLargeSymbol({
              repositoryId: file.repository_id,
              fileId: file.file_id,
              symbol,
              lines,
              byteOffsets,
            }),
          );
        }
      }
    }
  }

  return chunks;
}
