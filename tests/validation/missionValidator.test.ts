/**
 * tests/validation/missionValidator.test.ts
 *
 * Tests for the Zod MissionSchema (AI_SPEC §13).
 */
import { describe, it, expect } from "vitest";
import { MissionSchema } from "@/validation/missionValidator";

const VALID_MISSION = {
  title: "Shade & Nature Quest",
  summary: "A calm activity for noticing simple details outdoors.",
  durationMinutes: 10,
  steps: [
    "Find a comfortable place to stand.",
    "Notice one tree.",
    "Find one interesting shape.",
  ],
  audioVersion: [
    "Find a comfortable place to stand.",
    "Notice one tree.",
    "Find one interesting shape.",
  ],
  comfortAdjustment: "If the area feels uncomfortable, stop and continue another time.",
  safetyNote: "Stay aware of your surroundings.",
};

describe("MissionSchema", () => {
  it("validates a correct mission", () => {
    const result = MissionSchema.safeParse(VALID_MISSION);
    expect(result.success).toBe(true);
  });

  it("rejects a mission with missing title", () => {
    const { title: _t, ...rest } = VALID_MISSION;
    expect(MissionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a title that exceeds 80 characters", () => {
    const mission = { ...VALID_MISSION, title: "A".repeat(81) };
    expect(MissionSchema.safeParse(mission).success).toBe(false);
  });

  it("rejects an invalid durationMinutes (e.g. 15)", () => {
    const mission = { ...VALID_MISSION, durationMinutes: 15 };
    expect(MissionSchema.safeParse(mission).success).toBe(false);
  });

  it("rejects steps fewer than 3", () => {
    const mission = {
      ...VALID_MISSION,
      steps: ["One step."],
      audioVersion: ["One step."],
    };
    expect(MissionSchema.safeParse(mission).success).toBe(false);
  });

  it("rejects steps greater than 5", () => {
    const steps = ["a.", "b.", "c.", "d.", "e.", "f."];
    const mission = { ...VALID_MISSION, steps, audioVersion: steps };
    expect(MissionSchema.safeParse(mission).success).toBe(false);
  });

  it("rejects when steps and audioVersion have different lengths", () => {
    const mission = {
      ...VALID_MISSION,
      audioVersion: ["Only one."],
    };
    expect(MissionSchema.safeParse(mission).success).toBe(false);
  });

  it("accepts all valid durationMinutes values", () => {
    for (const d of [5, 10, 20]) {
      const mission = { ...VALID_MISSION, durationMinutes: d };
      expect(MissionSchema.safeParse(mission).success).toBe(true);
    }
  });
});
