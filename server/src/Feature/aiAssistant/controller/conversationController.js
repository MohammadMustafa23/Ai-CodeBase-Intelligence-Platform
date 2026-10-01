import { createNewConversation } from "../service/conversationService.js";

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
