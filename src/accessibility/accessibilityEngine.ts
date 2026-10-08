/**
 * src/accessibility/accessibilityEngine.ts
 *
 * Deterministic Accessibility Engine (AI_SPEC §9)
 *
 * Converts user-selected accessibility mode and other preferences into
 * a typed ConstraintObject that is passed to the language model.
 *
 * AI must NOT decide what accessibility modes mean.
 * This engine, not the model, is the source of truth for constraints.
 *
 * Implemented fully in Phase 4.
 */
import type { AccessibilityMode, DurationMinutes, ConstraintObject } from "@/types";
import { ACCESSIBILITY_RULES } from "./rules";

/**
 * Converts user preferences into a ConstraintObject for the AI pipeline.
 *
 * @param mode - User-selected accessibility mode.
 * @param durationMinutes - Selected activity duration.
 * @param environment - Normalised environment string.
 * @returns A fully typed ConstraintObject.
 */
export function buildConstraints(
  mode: AccessibilityMode,
  durationMinutes: DurationMinutes,
  environment: string,
): ConstraintObject {
  const rules = ACCESSIBILITY_RULES[mode];
  return {
    mode,
    durationMinutes,
    environment,
    avoid: rules.avoid,
    instructionStyle: rules.instructionStyle,
  };
}
