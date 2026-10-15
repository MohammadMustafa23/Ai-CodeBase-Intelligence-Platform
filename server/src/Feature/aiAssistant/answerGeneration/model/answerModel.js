function getAnswerModel(model) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError("A valid Answer LLM model with invoke() is required");
  }

  return model;
}

async function invokeAnswerModel({ model, input }) {
  const answerModel = getAnswerModel(model);

  if (input === undefined || input === null) {
    throw new TypeError("input is required");
  }

  return answerModel.invoke(input);
}

export { getAnswerModel, invokeAnswerModel };
