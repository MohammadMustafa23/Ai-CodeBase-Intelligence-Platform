function getEvidenceItems(evidencePackage) {
  if (!evidencePackage || typeof evidencePackage !== "object") {
    throw new TypeError("evidencePackage must be an object");
  }

  if (!Array.isArray(evidencePackage.evidence)) {
    return [];
  }

  return evidencePackage.evidence;
}

function getReferenceId(item) {
  return item?.candidateId ?? null;
}

function getSourceData(item) {
  const source = item?.source ?? item?.codeSource ?? item?.sourceCode ?? null;

  if (source && typeof source === "object") {
    return source;
  }

  return null;
}

function buildSourceReference({ referenceId, evidence }) {
  const sourceData = getSourceData(evidence);

  return {
    referenceId,
    filePath:
      evidence?.filePath ??
      sourceData?.relativePath ??
      sourceData?.filePath ??
      null,
    fileName: evidence?.fileName ?? sourceData?.fileName ?? null,
    symbolName: evidence?.symbolName ?? null,
    symbolType: evidence?.symbolType ?? null,
    chunkType: evidence?.chunkType ?? null,
    startLine: evidence?.startLine ?? sourceData?.startLine ?? null,
    endLine: evidence?.endLine ?? sourceData?.endLine ?? null,
    language: evidence?.language ?? null,
  };
}

function attachSourceReferences({ answer, references, evidencePackage }) {
  if (typeof answer !== "string" || answer.trim().length === 0) {
    throw new TypeError("answer must be a non-empty string");
  }

  if (!Array.isArray(references)) {
    throw new TypeError("references must be an array");
  }

  const evidenceItems = getEvidenceItems(evidencePackage);

  const evidenceById = new Map();

  for (const item of evidenceItems) {
    const referenceId = getReferenceId(item);

    if (referenceId) {
      evidenceById.set(referenceId, item);
    }
  }

  const attachedReferences = [];

  for (const referenceId of references) {
    const evidence = evidenceById.get(referenceId);

    if (!evidence) {
      console.warn(`[PHASE 10] Source reference not found: ${referenceId}`);

      continue;
    }

    attachedReferences.push(
      buildSourceReference({
        referenceId,
        evidence,
      }),
    );
  }

  return {
    answer: answer.trim(),
    references: attachedReferences,
  };
}

export { attachSourceReferences };
