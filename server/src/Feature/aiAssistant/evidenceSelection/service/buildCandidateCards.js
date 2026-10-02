function buildCandidateCards(candidates) {
  if (!Array.isArray(candidates)) {
    throw new TypeError("candidates must be an array");
  }

  const cards = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    if (!candidate) {
      continue;
    }

    const card = {
      candidateId: `candidate_${index + 1}`,

      candidateKey: candidate.candidateKey ?? null,

      entityType: candidate.entityType ?? "unknown",

      filePath: candidate.filePath ?? null,

      fileName: candidate.fileName ?? null,

      language: candidate.language ?? null,

      symbolName: candidate.symbolName ?? null,

      symbolType: candidate.symbolType ?? null,

      chunkType: candidate.chunkType ?? null,

      startLine: candidate.startLine ?? null,

      endLine: candidate.endLine ?? null,

      score: candidate.score ?? null,

      retrievalSources: Array.isArray(candidate.retrievalSources)
        ? candidate.retrievalSources
        : [],

      retrievalCount: candidate.retrievalCount ?? 1,

      hasSource:
        typeof candidate.sourceCode === "string" &&
        candidate.sourceCode.length > 0,
    };

    cards.push(card);
  }

  return cards;
}

export { buildCandidateCards };
