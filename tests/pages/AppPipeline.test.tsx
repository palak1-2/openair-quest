import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { getHistory } from "@/storage/historyStore";

describe("mock AI activity flow", () => {
  beforeEach(() => localStorage.clear());

  it("renders the generated mission and steps, records completion and feedback in history", async () => {
    const user = userEvent.setup();
    render(<App aiMode="mock" />);

    await user.click(screen.getByRole("button", { name: /start openair quest/i }));
    await user.click(screen.getByRole("radio", { name: /audio-first/i }));
    await user.click(screen.getByRole("radio", { name: /5 min/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("radio", { name: /park/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("heading", { name: "Listen and Notice" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Demo mode · Deterministic activity",
    );
    expect(screen.getByText(/5-minute activity/i)).toBeInTheDocument();
    expect(screen.queryByText(/placeholder mission/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start activity/i }));
    expect(screen.getByText("Pause in a comfortable place in the natural space.")).toBeInTheDocument();
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(screen.getByText("Finish whenever you feel ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /complete activity/i }));

    await waitFor(() => expect(getHistory()).toHaveLength(1));
    const saved = getHistory()[0];
    expect(saved.mode).toBe("audio-first");
    expect(saved.environment).toBe("park");
    expect(saved.mission.title).toBe("Listen and Notice");
    expect(saved.completedAt).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /comfortable/i }));
    await user.click(screen.getByRole("button", { name: /submit feedback/i }));
    await user.click(await screen.findByRole("button", { name: /view history/i }));
    expect(await screen.findByRole("heading", { name: "Listen and Notice" })).toBeInTheDocument();
    expect(screen.getByText(/comfortable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear history/i }));
    expect(screen.getByText(/no activities yet/i)).toBeInTheDocument();
    expect(getHistory()).toEqual([]);
  });

  it("does not describe a photo as analyzed in mock mode", async () => {
    const user = userEvent.setup();
    render(<App aiMode="mock" />);

    await user.click(screen.getByRole("button", { name: /start openair quest/i }));
    await user.click(screen.getByRole("radio", { name: /quiet/i }));
    await user.click(screen.getByRole("radio", { name: /10 min/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("radio", { name: /garden/i }));
    await user.upload(
      screen.getByLabelText(/tap to upload a photo/i),
      new File(["garden image"], "garden.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("heading", { name: "Outdoor Noticing" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Demo mode · Deterministic activity",
    );
    expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
  });
});
