import { neo4jDriver, neo4jDatabase } from "./neo4j.js";

const constraints = [
  `
  CREATE CONSTRAINT repository_id_unique IF NOT EXISTS
  FOR (n:Repository)
  REQUIRE n.id IS UNIQUE
  `,

  `
  CREATE CONSTRAINT file_id_unique IF NOT EXISTS
  FOR (n:File)
  REQUIRE n.id IS UNIQUE
  `,

  `
  CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
  FOR (n:Symbol)
  REQUIRE n.id IS UNIQUE
  `,
];

export async function initializeKnowledgeGraphSchema() {
  for (const query of constraints) {
    await neo4jDriver.executeQuery(
      query,
      {},
      {
        database: neo4jDatabase,
      },
    );
  }

  console.log("Knowledge graph schema initialized.");
}
