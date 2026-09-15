import express from "express";
import { createRepositoryController } from "../controller/repository.Controller.js";
import { validateRepositoryUrl } from "../validators/repositoryValidator.js";
const router = express.Router();

router.post("/repo-link",validateRepositoryUrl,createRepositoryController);

export default router;