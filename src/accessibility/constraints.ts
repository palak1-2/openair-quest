/**
 * src/accessibility/constraints.ts
 *
 * Scene normalisation utilities (TRD §11, AI_SPEC §8).
 *
 * Normalises unpredictable model-generated environment labels into
 * stable internal category strings.
 *
 * The deterministic accessibility engine must not depend on
 * unpredictable model wording.
 *
 * Implemented in Phase 4.
 */

/** Canonical internal environment categories. */
export type NormalisedEnvironment =
  | "NATURAL_SPACE"
  | "URBAN_SPACE"
  | "CAMPUS"
  | "NEIGHBOURHOOD"
  | "UNKNOWN";

/** Keyword → normalised category mapping. */
const KEYWORD_MAP: [string[], NormalisedEnvironment][] = [
  [["garden", "green area", "natural outdoor", "park", "park-like", "trees", "woodland", "forest", "greenery", "meadow", "field"], "NATURAL_SPACE"],
  [["urban", "city", "street", "road", "plaza", "square", "shopping"], "URBAN_SPACE"],
  [["campus", "university", "college", "school"], "CAMPUS"],
  [["neighbourhood", "neighborhood", "residential", "suburb", "estate"], "NEIGHBOURHOOD"],
];

/**
 * Normalises a raw environment string from the vision model or manual selection
 * into a stable category.
 *
 * @param raw - Raw environment string (e.g. "park-like area", "neighborhood").
 * @returns A stable NormalisedEnvironment category.
 */
export function normaliseEnvironment(raw: string): NormalisedEnvironment {
  const lower = raw.toLowerCase();
  for (const [keywords, category] of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "UNKNOWN";
}
