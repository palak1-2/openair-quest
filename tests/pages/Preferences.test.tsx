/**
 * tests/pages/Preferences.test.tsx
 *
 * Phase 1 smoke tests for the Preferences page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Preferences } from "@/pages/Preferences";

describe("Preferences page", () => {
  it("renders the page heading", () => {
    render(<Preferences onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your Preferences");
  });

  it("Continue button is disabled before selections are made", () => {
    render(<Preferences onComplete={vi.fn()} onBack={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it("enables Continue after selecting mode and duration", async () => {
    render(<Preferences onComplete={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/quiet/i));
    await userEvent.click(screen.getByLabelText(/10 min/i));
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });

  it("calls onComplete with correct values when Continue is clicked", async () => {
    const onComplete = vi.fn();
    render(<Preferences onComplete={onComplete} onBack={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/simple steps/i));
    await userEvent.click(screen.getByLabelText(/5 min/i));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("simple-steps", 5);
  });

  it("calls onBack when Back button is clicked", async () => {
    const onBack = vi.fn();
    render(<Preferences onComplete={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders all three accessibility mode options", () => {
    render(<Preferences onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByLabelText(/quiet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/audio-first/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/simple steps/i)).toBeInTheDocument();
  });
});
