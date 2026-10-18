import express from "express";

import { getRepositoryFilesController } from "../controller/workspace.controller.js";

import { authMiddleware } from "../../Feature/authentication/middleware/authMiddleware.js";

const router = express.Router();

router.get("/repositories/:repositoryId/files",authMiddleware,getRepositoryFilesController,);

export default router;
