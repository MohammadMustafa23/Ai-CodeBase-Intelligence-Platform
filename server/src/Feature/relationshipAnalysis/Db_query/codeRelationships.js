import { pool } from "../../../config/database.js";

export async function createCodeRelationships(relationships) {
  if (!relationships.length) {
    return [];
  }

  const values = [];
  const placeholders = [];

  relationships.forEach((relationship, index) => {
    const offset = index * 5;

    placeholders.push(`(
      $${offset + 1}::uuid,
      $${offset + 2}::uuid,
      $${offset + 3}::varchar,
      $${offset + 4}::varchar,
      $${offset + 5}::uuid
    )`);

    values.push(
      relationship.sourceFileId,
      relationship.targetFileId || null,
      relationship.relationshipType,
      relationship.resolutionStatus,
      relationship.referenceId || null,
    );
  });

  const query = `
    INSERT INTO code_relationships (
      source_file_id,
      target_file_id,
      relationship_type,
      resolution_status,
      reference_id
    )
    VALUES ${placeholders.join(",")}
    ON CONFLICT DO NOTHING
    RETURNING
      relationship_id,
      source_file_id,
      target_file_id,
      relationship_type,
      resolution_status,
      reference_id;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
}
