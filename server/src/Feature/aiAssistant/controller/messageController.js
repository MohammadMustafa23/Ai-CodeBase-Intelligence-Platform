import { getConversationMessages } from "../Db_query/conversationMessages.js";
import { sendMessage } from "../service/messageService.js";
import { streamAnswer } from "../answerGeneration/service/answerStreamService.js";

export async function createMessageController(req, res) {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const result = await sendMessage({
      conversationId,
      content,
    });

    // Stream Phase 10 answer when an answer was generated.
    if (result?.answer?.answer) {
      res.status(200);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
      }

      const answerPayload = {
        answer: result.answer.answer,
        references: result.answer.references ?? [],
      };

      for await (const event of streamAnswer({
        answerPayload,
      })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.end();

      return;
    }

    // Non-repository or non-answer responses remain normal JSON responses.
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Send message failed:", error.message);

    if (res.headersSent) {
      res.end();
      return;
    }

    const statusCode = error.message === "Conversation not found." ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMessagesController(req, res) {
  try {
    const { conversationId } = req.params;

    const messages = await getConversationMessages({
      conversationId,
    });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get conversation messages failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load conversation messages.",
    });
  }
}
