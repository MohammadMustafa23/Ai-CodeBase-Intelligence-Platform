import neo4j from "neo4j-driver";

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE } = process.env;

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD || !NEO4J_DATABASE) {
  throw new Error("Missing Neo4j environment variables.");
}

// Create ONE driver for the application.
// Do NOT create a new driver for every query/request.
export const neo4jDriver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
);

export const neo4jDatabase = NEO4J_DATABASE;

export async function verifyNeo4jConnection() {
  try {
    await neo4jDriver.verifyConnectivity();

    console.log("Neo4j connection established.");
  } catch (error) {
    console.error("Neo4j connection failed:", error.message);

    throw error;
  }
}

export async function closeNeo4jConnection() {
  await neo4jDriver.close();
}
