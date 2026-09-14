import express from "express";
import { createRepositoryController } from "../controller/repository.Controller.js";
const router = express.Router();

router.post("/repo-link", createRepositoryController);

export default router;