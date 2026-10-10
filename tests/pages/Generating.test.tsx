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
        onStage={vi.fn()}
        aiMode="local"
      />,
    );

    expect(screen.getByRole("heading", { name: "Understanding your surroundings" })).toBeInTheDocument();
    expect(screen.getByText("Starting with the environment you chose")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("prepared locally on this device");
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "This is taking a little longer than usual. Please keep this page open.",
    );
  });
});
