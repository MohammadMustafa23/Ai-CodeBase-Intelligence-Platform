import { pool } from "../../../config/database.js";

export async function createCodeSymbols(fileId, symbols) {
  if (!symbols.length) {
    return [];
  }

  const values = [];
  const placeholders = [];

  symbols.forEach((symbol, index) => {
    const offset = index * 9;

    placeholders.push(`(
      $${offset + 1}::uuid,
      $${offset + 2}::varchar,
      $${offset + 3}::varchar,
      $${offset + 4}::uuid,
      $${offset + 5}::text,
      $${offset + 6}::integer,
      $${offset + 7}::integer,
      $${offset + 8}::integer,
      $${offset + 9}::integer
    )`);

    values.push(
      fileId,
      symbol.symbolName,
      symbol.symbolType,
      symbol.parentSymbolId || null,
      symbol.signature || null,
      symbol.startLine,
      symbol.startColumn ?? null,
      symbol.endLine,
      symbol.endColumn ?? null,
    );
  });

  const query = `
    INSERT INTO code_symbols (
      file_id,
      symbol_name,
      symbol_type,
      parent_symbol_id,
      signature,
      start_line,
      start_column,
      end_line,
      end_column
    )
    VALUES ${placeholders.join(",")}
    RETURNING
      symbol_id,
      file_id,
      symbol_name,
      symbol_type,
      parent_symbol_id,
      signature,
      start_line,
      start_column,
      end_line,
      end_column;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
}
