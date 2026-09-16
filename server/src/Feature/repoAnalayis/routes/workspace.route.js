import express from "express";
import { getRepositoryFilesController } from "../controller/repositoryFileController.js";

const router = express.Router();

router.get("/repositories/:repositoryId/files", getRepositoryFilesController);

export default router;
