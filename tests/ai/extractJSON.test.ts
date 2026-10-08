/**
 * tests/ai/extractJSON.test.ts
 *
 * Tests for the JSON extraction boundary (TRD §10, AI_SPEC §7).
 */
import { describe, it, expect } from "vitest";
import { extractJSON } from "@/ai/extractJSON";

describe("extractJSON", () => {
  it("extracts a clean JSON object", () => {
    const result = extractJSON('{"environment": "garden", "features": []}');
    expect(result).toEqual({ environment: "garden", features: [] });
  });

  it("extracts JSON from prose prefix", () => {
    const result = extractJSON('Here is the result:\n{"environment": "park"}');
    expect(result).toEqual({ environment: "park" });
  });

  it("extracts JSON from prose suffix", () => {
    const result = extractJSON('{"environment": "campus"}\nHope that helps!');
    expect(result).toEqual({ environment: "campus" });
  });

  it("extracts JSON surrounded by prose", () => {
    const result = extractJSON(
      'Sure! Here you go:\n{"environment": "garden", "features": ["trees"]}\nLet me know!'
    );
    expect(result).toEqual({ environment: "garden", features: ["trees"] });
  });

  it("extracts valid JSON after malformed braces in leading prose", () => {
    expect(extractJSON('A note with {unfinished text. Actual result: {"ok":true}'))
      .toEqual({ ok: true });
  });

  it("handles braces and escaped quotes inside JSON strings", () => {
    expect(extractJSON('Result: {"text":"a } brace and \\"quote\\""}'))
      .toEqual({ text: 'a } brace and "quote"' });
  });

  it("throws when there is no JSON object", () => {
    expect(() => extractJSON("No JSON here at all.")).toThrow(
      "No JSON object found in model output."
    );
  });

  it("throws when the string is empty", () => {
    expect(() => extractJSON("")).toThrow("No JSON object found in model output.");
  });

  it("throws on malformed JSON", () => {
    expect(() => extractJSON("{bad json: true")).toThrow();
  });
});
