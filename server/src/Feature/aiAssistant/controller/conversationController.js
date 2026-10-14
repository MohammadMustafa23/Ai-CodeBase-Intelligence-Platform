import {
  createNewConversation,
  getRepositoryConversation,
  getAllRepositoryConversations,
} from "../service/conversationService.js";

/**
 * Create conversation
 * POST /api/conversations
 */
export async function createConversationController(req, res) {
  try {
    const { repositoryId = null, title = null } = req.body;

    const conversation = await createNewConversation({
      repositoryId,
      title,
    });

    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Create conversation failed:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Get conversation for a repository
 * GET /api/repositories/:repositoryId/conversation
 */
export async function getRepositoryConversationController(req, res) {
  try {
    const { repositoryId } = req.params;

    const conversation = await getRepositoryConversation(repositoryId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Get repository conversation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get repository conversation.",
    });
  }
}

/**
 * Get all repository conversations
 * GET /api/conversations
 */
export async function getAllConversationsController(req, res) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const conversations =
      await getAllRepositoryConversations(userId);

    return res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    console.error(
      "Get all conversations failed:",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get conversations.",
    });
  }
}