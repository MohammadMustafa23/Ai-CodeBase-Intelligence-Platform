import { Router } from "express";

import {
  googleLoginController,
  googleCallbackController,
  githubLoginController,
  githubCallbackController,
  getCurrentUserController,
  logoutController,
} from "../controller/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/google", googleLoginController);
router.get("/google/callback", googleCallbackController);

router.get("/github", githubLoginController);
router.get("/github/callback", githubCallbackController);
router.get("/me", authMiddleware, getCurrentUserController);
router.post("/logout", logoutController);



export default router;
