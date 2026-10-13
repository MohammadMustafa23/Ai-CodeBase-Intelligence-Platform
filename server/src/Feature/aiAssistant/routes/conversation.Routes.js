import { Router } from "express";

import {
  createConversationController,
  getRepositoryConversationController,
  getAllConversationsController,
} from "../controller/conversationController.js";

import {
  createMessageController,
  getMessagesController,
} from "../controller/messageController.js";

import { authMiddleware } from "../../authentication/middleware/authMiddleware.js";

const router = Router();

/**
 * Create conversation
 * POST /api/conversations
 */
router.post("/conversations", authMiddleware, createConversationController);

/**
 * Get conversation for a repository
 * GET /api/repositories/:repositoryId/conversation
 */
router.get(
  "/repositories/:repositoryId/conversation",
  authMiddleware,
  getRepositoryConversationController,
);

router.get("/conversations", authMiddleware, getAllConversationsController);

/**
 * Send user message
 * POST /api/conversations/:conversationId/messages
 */
router.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  createMessageController,
);

/**
 * Get conversation messages
 * GET /api/conversations/:conversationId/messages
 */
router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  getMessagesController,
);

export default router;
