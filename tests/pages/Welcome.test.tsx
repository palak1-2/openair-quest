/**
 * tests/pages/Welcome.test.tsx
 *
 * Phase 1 smoke tests for the Welcome page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Welcome } from "@/pages/Welcome";

describe("Welcome page", () => {
  it("renders the application name", () => {
    render(<Welcome onStart={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("OpenAir Quest");
  });

  it("renders the Start button", () => {
    render(<Welcome onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("calls onStart when Start button is clicked", async () => {
    const onStart = vi.fn();
    render(<Welcome onStart={onStart} />);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("has a main landmark with an accessible label", () => {
    render(<Welcome onStart={vi.fn()} />);
    expect(screen.getByRole("main")).toHaveAccessibleName(/welcome/i);
  });

  it("contains the privacy information note", () => {
    render(<Welcome onStart={vi.fn()} />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
