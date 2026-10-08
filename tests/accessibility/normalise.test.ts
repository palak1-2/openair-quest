/**
 * tests/accessibility/normalise.test.ts
 *
 * Tests for the scene normalisation function.
 */
import { describe, it, expect } from "vitest";
import { normaliseEnvironment } from "@/accessibility/constraints";

describe("normaliseEnvironment", () => {
  it("maps 'garden' to NATURAL_SPACE", () => {
    expect(normaliseEnvironment("garden")).toBe("NATURAL_SPACE");
  });

  it("maps 'park-like environment' to NATURAL_SPACE", () => {
    expect(normaliseEnvironment("park-like environment")).toBe("NATURAL_SPACE");
  });

  it("maps 'university campus' to CAMPUS", () => {
    expect(normaliseEnvironment("university campus")).toBe("CAMPUS");
  });

  it("maps 'residential neighbourhood' to NEIGHBOURHOOD", () => {
    expect(normaliseEnvironment("residential neighbourhood")).toBe("NEIGHBOURHOOD");
  });

  it("maps 'urban street' to URBAN_SPACE", () => {
    expect(normaliseEnvironment("urban street")).toBe("URBAN_SPACE");
  });

  it("maps unknown input to UNKNOWN", () => {
    expect(normaliseEnvironment("indoor gym")).toBe("UNKNOWN");
  });

  it("is case-insensitive", () => {
    expect(normaliseEnvironment("GARDEN")).toBe("NATURAL_SPACE");
    expect(normaliseEnvironment("Park")).toBe("NATURAL_SPACE");
  });
});
