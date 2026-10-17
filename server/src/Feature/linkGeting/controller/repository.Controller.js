import {
  createRepository,
  getRepositories,
  getRepository,
  getRepositoryProgress,
  
} from "../services/Create_Repo.js";

import {deleteRepository} from "../services/DeleteRepo.js";
export async function createRepositoryController(req, res) {
  try {
    const userId = req.user.userId;

    const result = await createRepository({
      userId,
      ...req.repository,
    });

    if (result.exists) {
      return res.status(409).json({
        success: false,
        message: result.message,
        data: result.repository,
      });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.repository,
    });
  } catch (error) {
    console.error("Create Repository Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
}

export async function getRepositoriesController(req, res) {
  try {
    const userId = req.user.userId;

    const repositories = await getRepositories(userId);

    return res.status(200).json({
      success: true,
      count: repositories.length,
      data: repositories,
    });
  } catch (error) {
    console.error("Get Repositories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
}

export async function getRepositoryController(req, res) {
  try {
    const { repositoryId } = req.params;

    const repository = await getRepository(repositoryId);

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: repository,
    });
  } catch (error) {
    console.error("Get Repository Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch repository.",
    });
  }
}

export async function getRepositoryProgressController(req, res) {
  try {
    const { repositoryId } = req.params;

    const progress = await getRepositoryProgress(repositoryId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("Get Repository Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch repository progress.",
    });
  }
}

// --------------------------------------------------
// RETRY REPOSITORY
// POST /api/repositories/:repositoryId/retry
// --------------------------------------------------

export async function retryRepositoryController(req, res) {
  try {
    const userId = req.user.userId;
    const { repositoryId } = req.params;

    const result = await retryRepository(repositoryId, userId);

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    if (result.conflict) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(202).json({
      success: true,
      message: "Repository embedding retry queued.",
      data: {
        repository: result.repository,
        resetChunks: result.resetCount,
      },
    });
  } catch (error) {
    console.error("Retry Repository Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retry repository processing.",
    });
  }
}

// --------------------------------------------------
// DELETE REPOSITORY
// DELETE /api/repositories/:repositoryId
// --------------------------------------------------

export async function deleteRepositoryController(req, res) {
  try {
    const userId = req.user.userId;
    const { repositoryId } = req.params;

    const result = await deleteRepository(repositoryId, userId);

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Repository not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Repository deleted successfully.",
      data: {
        repositoryId: result.repository.repository_id,
        repositoryName: result.repository.repository_name,
        storageCleanup: result.storageCleanup,
      },
    });
  } catch (error) {
    console.error("Delete Repository Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete repository.",
    });
  }
}
