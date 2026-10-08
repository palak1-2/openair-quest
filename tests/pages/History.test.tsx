/**
 * tests/pages/History.test.tsx
 *
 * Phase 1 smoke tests for the History page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { History } from "@/pages/History";

describe("History page", () => {
  it("renders the page heading", () => {
    render(<History onStartNew={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("History");
  });

  it("shows the empty state message when there is no history", () => {
    render(<History onStartNew={vi.fn()} />);
    expect(screen.getByText(/no activities yet/i)).toBeInTheDocument();
  });

  it("renders a Start new activity button", () => {
    render(<History onStartNew={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start a new activity/i })).toBeInTheDocument();
  });

  it("calls onStartNew when the button is clicked", async () => {
    const onStartNew = vi.fn();
    render(<History onStartNew={onStartNew} />);
    await userEvent.click(screen.getByRole("button", { name: /start a new activity/i }));
    expect(onStartNew).toHaveBeenCalledOnce();
  });
});
