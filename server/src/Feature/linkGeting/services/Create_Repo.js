import {
  findRepositoryByUserAndUrl,
  findRepositoryById,
  findRepositoriesByUserId,
  createRepositoryRecord,
} from "../Db_query/repositoryInsert.js";

import { fetchQueue } from "../queues/fetchQueue.js";

export async function createRepository({
  userId,
  githubUrl,
  owner,
  repositoryName,
}) {
  const existingRepository = await findRepositoryByUserAndUrl(
    userId,
    githubUrl,
  );

  if (existingRepository) {
    return {
      exists: true,
      message: "Repository already exists.",
      repository: existingRepository,
    };
  }

  const repository = await createRepositoryRecord({
    userId,
    githubUrl,
    owner,
    repositoryName,
  });

  await fetchQueue.add("fetch-repository", {
    repositoryId: repository.repository_id,
  });

  return {
    exists: false,
    message: "Repository created and fetch queued.",
    repository,
  };
}

export async function getRepositories(userId) {
  return await findRepositoriesByUserId(userId);
}

export async function getRepository(repositoryId) {
  return await findRepositoryById(repositoryId);
}

export async function getRepositoryProgress(repositoryId) {
  const repository = await findRepositoryById(repositoryId);

  if (!repository) {
    return null;
  }

  const status = repository.status;

  const stages = [
    {
      id: 1,
      key: "linkGeting",
      name: "Repository Intake & Fetch",
      status: "pending",
    },
    {
      id: 2,
      key: "repoAnalayis",
      name: "Repository Discovery & File Analysis",
      status: "pending",
    },
    {
      id: 3,
      key: "codeAnalysis",
      name: "Static Code Analysis",
      status: "pending",
    },
    {
      id: 4,
      key: "relationshipAnalysis",
      name: "Relationship Analysis",
      status: "pending",
    },
    {
      id: 5,
      key: "knowledgeGraph",
      name: "Knowledge Graph",
      status: "pending",
    },
    {
      id: 6,
      key: "codeChunking",
      name: "Code Chunking",
      status: "pending",
    },
    {
      id: 7,
      key: "embeddings",
      name: "Semantic Embeddings",
      status: "pending",
    },
  ];

  const statusMap = {
    scanning: 2,
    analyzing: 3,
    chunking: 6,
    embedding: 7,
  };

  const currentStage = statusMap[status] ?? null;

  if (status === "ready") {
    stages.forEach((stage) => {
      stage.status = "completed";
    });
  } else if (status === "partial") {
    stages.forEach((stage) => {
      if (stage.id < 7) {
        stage.status = "completed";
      }
    });

    stages[6].status = "partial";
  } else if (currentStage !== null) {
    stages.forEach((stage) => {
      if (stage.id < currentStage) {
        stage.status = "completed";
      }

      if (stage.id === currentStage) {
        stage.status = "processing";
      }
    });
  }

  const completedStages = stages.filter(
    (stage) => stage.status === "completed",
  ).length;

  const progress =
    status === "ready"
      ? 100
      : Math.round((completedStages / stages.length) * 100);

  return {
    repositoryId: repository.repository_id,
    repositoryName: repository.repository_name,
    status: repository.status,
    currentStage,
    progress,
    stages,
    updatedAt: repository.updated_at,
  };
}
