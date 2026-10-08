/**
 * src/validation/safetyValidator.ts
 *
 * Safety Validation (AI_SPEC §16, PRD §10).
 *
 * Schema validation checks structure. This module checks content.
 *
 * Detects unsafe content in generated missions and rejects them.
 * When unsafe output is detected, the caller must use a fallback mission.
 *
 * Implemented and tested in Phase 5.
 */
import type { Mission } from "@/types";

/** Stable identifiers describe the matched safety rule without exposing text. */
const UNSAFE_PATTERNS = [
  { id: "road_crossing", pattern: /\bcross(?:ing)?\b.{0,40}\broad\b/i },
  { id: "navigation", pattern: /\bnavigat/i },
  { id: "gps", pattern: /\bGPS\b/i },
  { id: "route", pattern: /\broute\b/i },
  { id: "directions", pattern: /\bdirection[s]?\b/i },
  { id: "approach_or_interaction_with_people_or_animals", pattern: /\b(?:approach|follow|interact with|go with|ask|meet)\s+(?:(?:a|the)\s+)?(?:strangers?|persons?|people|animals?|dogs?|cats?)\b/i },
  { id: "talk_to_people", pattern: /\b(?:talk|speak)\s+to\s+(?:(?:a|the)\s+)?(?:strangers?|persons?|people)\b/i },
  { id: "interaction_near_people_or_animals", pattern: /\b(?:strangers?|animals?|dogs?|cats?)\b.{0,40}\b(?:approach|talk|speak|interact)\b/i },
  { id: "stranger_interaction", pattern: /\bstranger interaction\b/i },
  { id: "medical_advice", pattern: /\bmedical\b|\bmedicat(?:e|ion)\b|\bprescription\b|\bdiagnos/i },
  { id: "therapy_claim", pattern: /\btherapeu/i },
  { id: "guaranteed_safety", pattern: /\bguaranteed\s+safe\b/i },
  { id: "guarantee_claim", pattern: /\bguarantee(?:d|s)?\b.{0,30}\b(?:safe|safety|accessible|accessibility|hazard|obstacle)\b/i },
  { id: "safety_guarantee", pattern: /\bsafety\b.{0,30}\bguaranteed?\b/i },
  { id: "dangerous_area", pattern: /\bdanger(ous)?\s+area\b/i },
  { id: "restricted_area", pattern: /\benter\s+(a\s+)?restricted\b/i },
  { id: "hazard_free_claim", pattern: /\bhazard-free\b/i },
  { id: "obstacle_or_hazard_absence_claim", pattern: /\b(?:obstacles?|hazards?)\b.{0,30}\b(?:free|clear|absent|none)\b/i },
  { id: "obstacle_or_hazard_free_claim", pattern: /\b(?:obstacle|hazard)[-\s]?free\b/i },
  { id: "free_of_obstacles_or_hazards_claim", pattern: /\bfree\s+of\s+(?:obstacles?|hazards?)\b/i },
  { id: "no_obstacles_or_hazards_claim", pattern: /\bno\s+(?:obstacles?|hazards?)\b/i },
  { id: "area_safety_claim", pattern: /\b(?:area|place|path|route)\s+(?:is|looks)\s+safe\b/i },
  { id: "accessibility_claim", pattern: /\b(?:fully|completely|is)\s+accessible\b/i },
  { id: "accessibility_certification_claim", pattern: /\baccessibility certified\b/i },
  { id: "therapeutic_benefit_claim", pattern: /\b(?:treat|cure|relieve|reduce|improve)\b.{0,40}\b(?:anxiety|depression|stress|health|pain|symptom)/i },
  { id: "climbing", pattern: /\bclimb\b/i },
  { id: "dangerous_jumping", pattern: /\bjump\s+(?:from|off|over)\b/i },
  { id: "entering_water", pattern: /\benter\s+(?:the\s+)?(?:water|lake|river)\b/i },
  { id: "restricted_entry", pattern: /\benter\b.{0,30}\brestricted\b/i },
  { id: "movement_near_road", pattern: /\b(?:walk|go|move|head|travel|follow)\b.{0,40}\b(?:road|street|intersection|crosswalk)\b/i },
] as const;

export type SafetyRuleId = (typeof UNSAFE_PATTERNS)[number]["id"];

export interface SafetyValidationResult {
  safe: boolean;
  violations: string[];
  ruleIds: SafetyRuleId[];
}

/**
 * Checks a Mission for unsafe content patterns.
 *
 * @param mission - A schema-validated Mission object.
 * @returns An object indicating whether the mission is safe and any violations.
 */
export function validateSafety(mission: Mission): SafetyValidationResult {
  const textFields: string[] = [
    mission.title,
    mission.summary,
    mission.comfortAdjustment,
    mission.safetyNote,
    ...mission.steps,
    ...mission.audioVersion,
  ];

  const violations: string[] = [];
  const ruleIds = new Set<SafetyRuleId>();

  for (const text of textFields) {
    for (const rule of UNSAFE_PATTERNS) {
      if (rule.pattern.test(text)) {
        violations.push(`Pattern "${rule.pattern.source}" matched in: "${text}"`);
        ruleIds.add(rule.id);
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    ruleIds: [...ruleIds],
  };
}
