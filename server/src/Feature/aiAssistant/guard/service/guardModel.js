import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const guardModel = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_GUARD_MODEL || "gemini-3.5-flash-lite",
  temperature: 0,
  maxOutputTokens: 300,
});

export { guardModel };
