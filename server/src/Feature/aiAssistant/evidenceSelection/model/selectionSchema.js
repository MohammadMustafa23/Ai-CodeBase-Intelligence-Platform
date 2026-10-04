import { z } from "zod";

const selectionSchema = z.object({
  selectedCandidates: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1).max(100),

        evidenceTypes: z
          .array(z.enum(["code_source", "graph_context", "metadata"]))
          .min(1)
          .max(3),
      }),
    )
    .max(10),
});

export { selectionSchema };
