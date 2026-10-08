/**
 * src/accessibility/rules.ts
 *
 * Deterministic accessibility rules per mode (AI_SPEC §9, PRD §5).
 *
 * These rules are application logic — not AI decisions.
 * Each mode maps to a set of avoidance constraints and an instruction style.
 *
 * Fully validated and tested in Phase 4.
 */
import type { AccessibilityMode, ConstraintObject } from "@/types";

type ModeRule = Pick<ConstraintObject, "avoid" | "instructionStyle">;

export const ACCESSIBILITY_RULES: Record<AccessibilityMode, ModeRule> = {
  quiet: {
    instructionStyle: "calm",
    avoid: [
      "unnecessary social interaction",
      "approaching strangers",
      "approaching animals",
      "unnecessary noise",
      "roads",
      "navigation",
    ],
  },
  "audio-first": {
    instructionStyle: "spoken",
    avoid: [
      "complex multi-part instructions",
      "visual-only information",
      "navigation",
      "roads",
    ],
  },
  "simple-steps": {
    instructionStyle: "one-step",
    avoid: [
      "multi-action instructions",
      "complicated steps",
      "navigation",
      "roads",
    ],
  },
};
