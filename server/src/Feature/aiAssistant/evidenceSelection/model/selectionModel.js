function getSelectionModel(model) {
  if (!model || typeof model.invoke !== "function") {
    throw new TypeError(
      "A valid Selection LLM model with invoke() is required",
    );
  }

  return model;
}

async function invokeSelectionModel({ model, input }) {
  const selectionModel = getSelectionModel(model);

  if (input === undefined || input === null) {
    throw new TypeError("input is required");
  }

  return selectionModel.invoke(input);
}

export { getSelectionModel, invokeSelectionModel };
