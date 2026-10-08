/**
 * tests/validation/safetyValidator.test.ts
 *
 * Tests for the safety validator (AI_SPEC §16).
 */
import { describe, it, expect } from "vitest";
import { validateSafety } from "@/validation/safetyValidator";
import type { Mission } from "@/types";

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    title: "Nature Observation",
    summary: "A calm outdoor activity.",
    durationMinutes: 10,
    steps: [
      "Find a comfortable place to stand.",
      "Notice one tree nearby.",
      "Pause and observe quietly.",
    ],
    audioVersion: [
      "Find a comfortable place to stand.",
      "Notice one tree nearby.",
      "Pause and observe quietly.",
    ],
    comfortAdjustment: "Stop if you feel uncomfortable.",
    safetyNote: "Stay aware of your surroundings.",
    ...overrides,
  };
}

describe("validateSafety", () => {
  it("passes a safe mission", () => {
    const result = validateSafety(makeMission());
    expect(result.safe).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.ruleIds).toEqual([]);
  });

  it("rejects a mission with navigation in steps", () => {
    const mission = makeMission({
      steps: ["Navigate to the park.", "Look at a tree.", "Sit down."],
      audioVersion: ["Navigate to the park.", "Look at a tree.", "Sit down."],
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.ruleIds).toContain("navigation");
  });

  it("rejects a mission that tells the user to cross a road", () => {
    const mission = makeMission({
      steps: ["Cross a road to reach the garden.", "Find a tree.", "Sit down."],
      audioVersion: ["Cross a road to reach the garden.", "Find a tree.", "Sit down."],
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
    expect(result.ruleIds).toContain("road_crossing");
  });

  it("rejects a mission with medical advice in the summary", () => {
    const mission = makeMission({
      summary: "This activity has medical benefits for anxiety.",
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
  });

  it("rejects a mission that approaches strangers", () => {
    const mission = makeMission({
      steps: ["Approach a stranger and ask for directions.", "Find a tree.", "Sit down."],
      audioVersion: ["Approach a stranger and ask for directions.", "Find a tree.", "Sit down."],
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
  });

  it("rejects a mission with therapeutic claims", () => {
    const mission = makeMission({
      safetyNote: "This activity is therapeutic and will reduce your anxiety.",
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
  });

  it("rejects a mission with GPS instructions", () => {
    const mission = makeMission({
      steps: ["Use GPS to find the nearest park.", "Find a tree.", "Sit down."],
      audioVersion: ["Use GPS to find the nearest park.", "Find a tree.", "Sit down."],
    });
    const result = validateSafety(mission);
    expect(result.safe).toBe(false);
  });

  it.each([
    "This area is guaranteed safe.",
    "The path is completely accessible.",
    "Walk along the road to the garden.",
    "There are no obstacles nearby.",
    "Enter the restricted area.",
    "This activity will treat anxiety.",
  ])("rejects additional unsafe or unsupported claims: %s", (instruction) => {
    const result = validateSafety(makeMission({
      steps: [instruction, "Notice a tree.", "Pause quietly."],
      audioVersion: [instruction, "Notice a tree.", "Pause quietly."],
    }));
    expect(result.safe).toBe(false);
  });
});
