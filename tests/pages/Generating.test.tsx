import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Generating } from "@/pages/Generating";

vi.mock("@/ai/providerFactory", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/ai/providerFactory")>(),
  generateSelectedMission: vi.fn(() => new Promise(() => {})),
}));

describe("Generating", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces that generation is taking longer while continuing to wait", () => {
    vi.useFakeTimers();
    render(
      <Generating
        session={{
          mode: "quiet",
          durationMinutes: 10,
          environment: "garden",
          photo: undefined,
        }}
        onComplete={vi.fn()}
        onError={vi.fn()}
        aiMode="local"
      />,
    );

    expect(screen.getByText("Preparing your activity…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByText(
      "This is taking a little longer than usual. Please keep this page open.",
    )).toBeInTheDocument();
  });
});
