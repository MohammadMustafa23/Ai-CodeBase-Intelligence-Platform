import { Router } from "express";

import { createConversationController } from "../controller/conversationController.js";

import {
  createMessageController,
  getMessagesController,
} from "../controller/messageController.js";

const router = Router();

// Create conversation
router.post("/conversations", createConversationController);

// Send user message
router.post("/conversations/:conversationId/messages", createMessageController);

router.get("/conversations/:conversationId/messages", getMessagesController);

export default router;
