/**
 * src/schemas/constraints.ts
 *
 * ConstraintObject Zod schema (AI_SPEC §10).
 * Validates the output of the accessibility engine before
 * it is passed to the language model.
 */
import { z } from "zod";

export const ConstraintSchema = z.object({
  mode: z.enum(["quiet", "audio-first", "simple-steps"]),
  durationMinutes: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  environment: z.string().min(1),
  avoid: z.array(z.string()),
  instructionStyle: z.enum(["calm", "spoken", "one-step"]),
});

export type ValidatedConstraint = z.infer<typeof ConstraintSchema>;
