/**
 * src/ai/extractJSON.ts
 *
 * JSON Extraction Boundary (TRD §10 / AI_SPEC §7)
 *
 * Small local models may emit prose before or after JSON.
 * This utility extracts the first valid JSON object from raw model output.
 *
 * Result must still be validated with Zod — this function only handles
 * the extraction step.
 *
 * Implemented and tested in Phase 5.
 */

/**
 * Extracts the first JSON object from a raw string.
 *
 * @param raw - Raw string that may contain prose around a JSON object.
 * @returns The parsed JSON value.
 * @throws {Error} If no valid JSON object is found.
 */
export function extractJSON(raw: string): unknown {
  for (let start = raw.indexOf("{"); start !== -1; start = raw.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < raw.length; index += 1) {
      const character = raw[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === "\"") {
          inString = false;
        }
        continue;
      }

      if (character === "\"") {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(raw.slice(start, index + 1)) as unknown;
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error("No JSON object found in model output.");
}
