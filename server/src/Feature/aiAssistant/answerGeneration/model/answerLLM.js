import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const answerModel = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_ANSWER_MODEL || "gemini-3.5-flash-lite",
  temperature: 0.2,
  maxOutputTokens: 4096,
});

export { answerModel };
