import { pool } from "../../../config/database.js";

export async function createCodeReferences(fileId, references) {
  if (!references.length) {
    return [];
  }

  const rowsToInsert = [];

  for (const reference of references) {
    if (Array.isArray(reference.names) && reference.names.length > 0) {
      for (const item of reference.names) {
        const name = typeof item === "string" ? item : item?.name || null;

        rowsToInsert.push({
          fileId,
          referenceType: reference.referenceType,
          name,
          sourcePath: reference.sourcePath || null,
          referenceKind: reference.referenceKind || null,
        });
      }

      continue;
    }

    rowsToInsert.push({
      fileId,
      referenceType: reference.referenceType,
      name: reference.name || null,
      sourcePath: reference.sourcePath || null,
      referenceKind: reference.referenceKind || null,
    });
  }

  if (!rowsToInsert.length) {
    return [];
  }

  const values = [];
  const placeholders = [];

  rowsToInsert.forEach((reference, index) => {
    const offset = index * 5;

    placeholders.push(`(
      $${offset + 1}::uuid,
      $${offset + 2}::varchar,
      $${offset + 3}::varchar,
      $${offset + 4}::text,
      $${offset + 5}::varchar
    )`);

    values.push(
      reference.fileId,
      reference.referenceType,
      reference.name,
      reference.sourcePath,
      reference.referenceKind,
    );
  });

  const query = `
    INSERT INTO code_references (
      file_id,
      reference_type,
      name,
      source_path,
      reference_kind
    )
    VALUES ${placeholders.join(",")}
    RETURNING
      reference_id,
      file_id,
      reference_type,
      name,
      source_path,
      reference_kind;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
}
