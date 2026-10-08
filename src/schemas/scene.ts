/**
 * src/schemas/scene.ts
 *
 * Scene context Zod schema (AI_SPEC §4).
 * Validates vision model output after JSON extraction.
 */
import { z } from "zod";

export const SceneSchema = z.object({
  environment: z.string().trim().min(1).max(100),
  features: z.array(z.string().trim().min(1).max(100)).max(10),
  sensory_character: z.string().trim().max(200).optional(),
  general_context: z.string().trim().max(200).optional(),
});

export type ValidatedScene = z.infer<typeof SceneSchema>;
