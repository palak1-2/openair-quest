import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as speech from "@/audio/speech";
import { ActiveActivity } from "@/pages/ActiveActivity";
import type { Mission } from "@/types";

vi.mock("@/audio/speech", () => ({
  isSupported: vi.fn(),
  speak: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
}));

const mission: Mission = {
  title: "A Garden Pause",
  summary: "Notice a few details.",
  durationMinutes: 5,
  steps: ["Pause comfortably.", "Notice a colour.", "Listen for a sound."],
  audioVersion: ["Please pause comfortably.", "Notice one colour.", "Listen for one sound."],
  comfortAdjustment: "Pause whenever you wish.",
  safetyNote: "Stay aware of your surroundings.",
};

function renderActivity() {
  const onComplete = vi.fn();
  const onStop = vi.fn();
  render(
    <ActiveActivity
      session={{
        mode: "audio-first",
        durationMinutes: 5,
        environment: "garden",
        photo: undefined,
        mission,
      }}
      onComplete={onComplete}
      onStop={onStop}
    />,
  );
  return { onComplete, onStop };
}

describe("ActiveActivity speech controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(speech.isSupported).mockReturnValue(true);
  });

  it("speaks the current mission audioVersion and supports pause and resume", async () => {
    const user = userEvent.setup();
    renderActivity();

    await user.click(screen.getByRole("button", { name: "Speak current step" }));
    expect(speech.speak).toHaveBeenCalledWith("Please pause comfortably.", expect.any(Function));
    expect(screen.getByRole("status")).toHaveTextContent("Speaking current step.");

    await user.click(screen.getByRole("button", { name: "Pause speech" }));
    expect(speech.pause).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Speech paused.");

    await user.click(screen.getByRole("button", { name: "Resume speech" }));
    expect(speech.resume).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Speaking current step.");
  });

  it("stops speech when requested or when changing steps", async () => {
    const user = userEvent.setup();
    renderActivity();

    await user.click(screen.getByRole("button", { name: "Speak current step" }));
    await user.click(screen.getByRole("button", { name: "Stop speech" }));
    expect(speech.stop).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Speech stopped.");

    await user.click(screen.getByRole("button", { name: "Speak current step" }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(speech.stop).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Speak current step" }));
    expect(speech.speak).toHaveBeenLastCalledWith("Notice one colour.", expect.any(Function));
  });

  it("announces when speech synthesis is unsupported and disables audio controls", () => {
    vi.mocked(speech.isSupported).mockReturnValue(false);
    renderActivity();

    expect(screen.getByRole("button", { name: "Speak current step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pause speech" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop speech" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Speech playback is not available in this browser. You can follow the written steps and use the buttons below.",
    );
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("stops speech before completing or stopping the activity", async () => {
    const user = userEvent.setup();
    const { onComplete, onStop } = renderActivity();
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /complete quest/i }));
    expect(speech.stop).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /stop quest/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
