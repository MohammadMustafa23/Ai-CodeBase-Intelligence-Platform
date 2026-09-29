function getRetrievalModel(model) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError(
      "A valid Retrieval LLM model with invoke() is required",
    );
  }

  return model;
}

async function invokeRetrievalModel({ model, input }) {
  const retrievalModel = getRetrievalModel(model);

  if (input === undefined || input === null) {
    throw new TypeError("input is required");
  }

  return retrievalModel.invoke(input);
}

export { getRetrievalModel, invokeRetrievalModel };
