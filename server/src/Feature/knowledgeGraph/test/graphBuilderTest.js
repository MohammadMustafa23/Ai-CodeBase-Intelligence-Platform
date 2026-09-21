import { buildKnowledgeGraph } from "../service/graphBuilder.js";

const repositoryId = "28604b5f-ef50-4e1b-80fa-c14e122918fb";

try {
  const result = await buildKnowledgeGraph(repositoryId, {
    batchSize: 500,
  });

  console.dir(result, {
    depth: null,
  });
} catch (error) {
  console.error("Knowledge graph build failed:", error);
}
