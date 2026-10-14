function validateAnswerPayload(answerPayload) {
  if (
    !answerPayload ||
    typeof answerPayload !== "object" ||
    Array.isArray(answerPayload)
  ) {
    throw new TypeError("answerPayload must be an object");
  }

  if (
    typeof answerPayload.answer !== "string" ||
    answerPayload.answer.trim().length === 0
  ) {
    throw new TypeError("answerPayload.answer must be a non-empty string");
  }

  if (!Array.isArray(answerPayload.references)) {
    throw new TypeError("answerPayload.references must be an array");
  }
}

function createAnswerChunks(answer, chunkSize = 120) {
  const chunks = [];

  for (let index = 0; index < answer.length; index += chunkSize) {
    chunks.push(answer.slice(index, index + chunkSize));
  }

  return chunks;
}

async function* streamAnswer({ answerPayload, chunkSize = 120 }) {
  validateAnswerPayload(answerPayload);

  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 1000) {
    throw new TypeError("chunkSize must be between 1 and 1000");
  }

  console.log("[PHASE 10] Answer streaming started");

  yield {
    type: "answer_start",
  };

  const chunks = createAnswerChunks(answerPayload.answer.trim(), chunkSize);

  console.log(`[PHASE 10] Answer chunks prepared: ${chunks.length}`);

  for (const chunk of chunks) {
    yield {
      type: "answer",
      content: chunk,
    };
  }

  yield {
    type: "references",
    references: answerPayload.references,
  };

  yield {
    type: "done",
  };

  console.log("[PHASE 10] Answer streaming completed");
}

export { streamAnswer };
