import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mission } from "@/types";

const fallbackOverride = vi.hoisted(() => ({
  mission: undefined as unknown,
}));

vi.mock("@/fallback/fallbackMissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/fallback/fallbackMissions")>();
  const getCandidate = (mode: Parameters<typeof actual.getFallbackMission>[0],
    environment: Parameters<typeof actual.getFallbackMission>[1]) =>
    fallbackOverride.mission ?? actual.getFallbackMission(mode, environment);

  return {
    ...actual,
    getFallbackMission: vi.fn(getCandidate),
    getValidatedFallbackMission: (
      mode: Parameters<typeof actual.getFallbackMission>[0],
      environment: Parameters<typeof actual.getFallbackMission>[1],
      durationMinutes: Parameters<typeof actual.validateFallbackMission>[1],
    ) => actual.validateFallbackMission(getCandidate(mode, environment), durationMinutes),
  };
});

import { getValidatedFallbackMission, validateFallbackMission } from "@/fallback/fallbackMissions";
import { MissionSchema } from "@/schemas/mission";
import { validateSafety } from "@/validation/safetyValidator";
import App from "@/App";

const unsafeFallback: Mission = {
  title: "Unsafe fallback",
  summary: "An outdoor activity.",
  durationMinutes: 10,
  steps: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
  audioVersion: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
  comfortAdjustment: "Stop whenever you wish.",
  safetyNote: "Stay aware of your surroundings.",
};

describe("validated built-in fallbacks", () => {
  beforeEach(() => {
    fallbackOverride.mission = undefined;
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("validates normal built-in fallbacks and preserves the requested duration", () => {
    for (const mode of ["quiet", "audio-first", "simple-steps"] as const) {
      const fallback = getValidatedFallbackMission(mode, "garden", 20);
      expect(MissionSchema.safeParse(fallback).success).toBe(true);
      expect(validateSafety(fallback).safe).toBe(true);
      expect(fallback.durationMinutes).toBe(20);
    }
  });

  it("rejects an unsafe fallback instead of returning it", () => {
    expect(() => validateFallbackMission(unsafeFallback, 10))
      .toThrow("Built-in fallback mission failed safety validation.");
  });

  it("does not render an invalid fallback in Activity", async () => {
    fallbackOverride.mission = unsafeFallback;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await user.click(screen.getByRole("button", { name: /start openair quest/i }));
    await user.click(screen.getByRole("radio", { name: /quiet/i }));
    await user.click(screen.getByRole("radio", { name: /10 min/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("radio", { name: /garden/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("heading", { name: "Your Environment" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: unsafeFallback.title })).not.toBeInTheDocument();
  });
});
