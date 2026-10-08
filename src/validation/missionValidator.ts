/**
 * src/validation/missionValidator.ts
 *
 * Mission schema validation (AI_SPEC §13).
 *
 * Validates raw model output (post JSON extraction) against MissionSchema.
 * Invalid output must never be rendered.
 *
 * Uses Zod. Implemented in Phase 3/5.
 */
import { z } from "zod";

export const MissionSchema = z
  .object({
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(300),
    durationMinutes: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    steps: z.array(z.string().min(1).max(200)).min(3).max(5),
    audioVersion: z.array(z.string().min(1).max(200)).min(3).max(5),
    comfortAdjustment: z.string().max(300),
    safetyNote: z.string().max(300),
  })
  .refine((m) => m.steps.length === m.audioVersion.length, {
    message: "steps and audioVersion must have the same number of items.",
    path: ["audioVersion"],
  });

export type ValidatedMission = z.infer<typeof MissionSchema>;
