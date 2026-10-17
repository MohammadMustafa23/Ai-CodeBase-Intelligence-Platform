import express from "express";

import {
  createRepositoryController,
  getRepositoriesController,
  getRepositoryController,
  getRepositoryProgressController,
  retryRepositoryController,
  deleteRepositoryController,
} from "../controller/repository.Controller.js";

import { validateRepositoryUrl } from "../validators/repositoryValidator.js";
import { authMiddleware } from "../../authentication/middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Static routes FIRST
|--------------------------------------------------------------------------
*/

/**
 * POST /api/repositories
 */
router.post(
  "/repositories",
  authMiddleware,
  validateRepositoryUrl,
  createRepositoryController,
);

/**
 * GET /api/repositories
 */
router.get("/repositories", authMiddleware, getRepositoriesController);

/*
|--------------------------------------------------------------------------
| Parameter routes AFTER static routes
|--------------------------------------------------------------------------
*/

/**
 * GET /api/repositories/:repositoryId/progress
 */
router.get(
  "/repositories/:repositoryId/progress",
  authMiddleware,
  getRepositoryProgressController,
);

/**
 * POST /api/repositories/:repositoryId/retry
 */
router.post(
  "/repositories/:repositoryId/retry",
  authMiddleware,
  retryRepositoryController,
);

/**
 * DELETE /api/repositories/:repositoryId
 */
router.delete(
  "/repositories/:repositoryId",
  authMiddleware,
  deleteRepositoryController,
);

/**
 * GET /api/repositories/:repositoryId
 */
router.get(
  "/repositories/:repositoryId",
  authMiddleware,
  getRepositoryController,
);

export default router;
