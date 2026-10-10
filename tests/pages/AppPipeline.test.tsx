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

    await user.click(screen.getByRole("button", { name: /initialize exploration/i }));
    await user.click(screen.getByRole("radio", { name: /audio-first/i }));
    await user.click(screen.getByRole("radio", { name: /5 min/i }));
    await user.click(screen.getByRole("button", { name: /choose surroundings/i }));
    await user.click(screen.getByRole("radio", { name: /park/i }));
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: "Park Noticing" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Demo mode · Deterministic activity",
    );
    expect(screen.getByText(/5-minute activity/i)).toBeInTheDocument();
    expect(screen.queryByText(/placeholder mission/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /begin quest/i }));
    expect(screen.getByText("Pause where you are in the park.")).toBeInTheDocument();
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(screen.getByText("Finish whenever you feel ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /complete quest/i }));

    await waitFor(() => expect(getHistory()).toHaveLength(1));
    const saved = getHistory()[0];
    expect(saved.mode).toBe("audio-first");
    expect(saved.environment).toBe("park");
    expect(saved.mission.title).toBe("Park Noticing");
    expect(saved.completedAt).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /comfortable/i }));
    await user.click(screen.getByRole("button", { name: /^done/i }));
    await user.click(await screen.findByRole("button", { name: /view your journal/i }));
    expect(await screen.findByRole("heading", { name: "Park Noticing" })).toBeInTheDocument();
    expect(screen.getByText(/comfortable/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear journal/i }));
    expect(screen.getByText(/your completed outdoor experiences will appear here/i)).toBeInTheDocument();
    expect(getHistory()).toEqual([]);
  });

  it("does not describe a photo as analyzed in mock mode", async () => {
    const user = userEvent.setup();
    render(<App aiMode="mock" />);

    await user.click(screen.getByRole("button", { name: /initialize exploration/i }));
    await user.click(screen.getByRole("radio", { name: /quiet/i }));
    await user.click(screen.getByRole("radio", { name: /10 min/i }));
    await user.click(screen.getByRole("button", { name: /choose surroundings/i }));
    await user.click(screen.getByRole("radio", { name: /garden/i }));
    await user.upload(
      screen.getByLabelText(/tap to upload a photo/i),
      new File(["garden image"], "garden.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: "Garden Noticing" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Demo mode · Deterministic activity",
    );
    expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The photo was not analyzed, so this quest follows the environment you selected.",
    );
  });
});
