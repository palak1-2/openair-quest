import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { getValidatedFallbackMission } from "@/fallback/fallbackMissions";
import { MissionSchema } from "@/schemas/mission";
import { validateSafety } from "@/validation/safetyValidator";
import type { DurationMinutes, Mission, UserPreferences } from "@/types";

const localMission: Mission = {
  title: "A Local Garden Mission",
  summary: "Notice a few gentle details in the garden.",
  durationMinutes: 10,
  steps: ["Pause comfortably.", "Notice one colour.", "Listen for one sound."],
  audioVersion: ["Pause comfortably.", "Notice one colour.", "Listen for one sound."],
  comfortAdjustment: "Pause or stop whenever you wish.",
  safetyNote: "Stay aware of your surroundings.",
};

async function selectPreferences(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /initialize exploration/i }));
  await user.click(screen.getByRole("radio", { name: /simple steps/i }));
  await user.click(screen.getByRole("radio", { name: /10 min/i }));
  await user.click(screen.getByRole("button", { name: /choose surroundings/i }));
  await user.click(screen.getByRole("radio", { name: /garden/i }));
}

async function expectUsableValidatedFallback(
  durationMinutes: DurationMinutes = 10,
  title = "Garden Noticing",
) {
  expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /begin quest/i })).toBeEnabled();
  expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent("Built-in activity");
  expect(screen.queryByText(/generated on this device/i)).not.toBeInTheDocument();
  const mission = getValidatedFallbackMission("simple-steps", "garden", durationMinutes);
  expect(MissionSchema.safeParse(mission).success).toBe(true);
  expect(validateSafety(mission).safe).toBe(true);
  expect(mission.durationMinutes).toBe(durationMinutes);
  expect(screen.getByText(`${durationMinutes} minutes`)).toBeInTheDocument();
  for (const step of mission.steps) {
    expect(screen.getByText(step)).toBeInTheDocument();
  }
}

describe("local AI application flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("runs local vision and mission providers and renders the generated mission", async () => {
    const requests: { model: string; prompt: string; images?: string[] }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as {
        model: string;
        prompt: string;
        images?: string[];
      };
      requests.push(request);
      const response = request.model === "qwen2.5vl:3b"
        ? { response: '{"environment":"urban park","features":["open grassy area","trees","shaded seating"],"sensory_character":"calm","general_context":"A leafy public space"}' }
        : { response: JSON.stringify(localMission) };
      return new Response(JSON.stringify(response), { status: 200 });
    }));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    const file = new File(["garden image"], "garden.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/tap to upload a photo/i), file);
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: localMission.title })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Local AI · Generated on this device",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(localMission.summary)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Context from your photo" }))
      .toHaveTextContent("From your photoUrban park · open grassy area · trees");
    expect(screen.getByText("10 minutes")).toBeInTheDocument();
    expect(screen.getByText("Notice one colour.")).toBeInTheDocument();
    expect(requests.map((request) => request.model)).toEqual(["qwen2.5vl:3b", "gemma3:4b"]);
    expect(requests[0].images).toHaveLength(1);
    expect(JSON.parse(requests[1].prompt)).toMatchObject({
      constraints: { mode: "simple-steps", durationMinutes: 10 },
      scene: {
        environment: "urban park",
        features: ["open grassy area", "trees", "shaded seating"],
        sensory_character: "calm",
        general_context: "A leafy public space",
      },
    });
  });

  it("shows and renders a built-in activity when local Ollama is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    await expectUsableValidatedFallback();
  });

  it("recovers from photo vision failure using manual context and continues to the LLM", async () => {
    const requests: { model: string; prompt: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { model: string; prompt: string };
      requests.push(request);
      if (request.model === "qwen2.5vl:3b") {
        throw new TypeError("vision unavailable");
      }
      return new Response(JSON.stringify({ response: JSON.stringify(localMission) }), { status: 200 });
    }));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.upload(
      screen.getByLabelText(/tap to upload a photo/i),
      new File(["garden image"], "garden.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: localMission.title })).toBeInTheDocument();
    expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Local AI · Generated on this device",
    );
    expect(screen.getAllByRole("status").map((status) => status.textContent).join(" ")).toContain(
      "The photo was not analyzed, so this quest follows the environment you selected.",
    );
    expect(requests.map((request) => request.model)).toEqual(["qwen2.5vl:3b", "gemma3:4b"]);
    expect(JSON.parse(requests[1].prompt).scene).toMatchObject({ environment: "garden" });
  });

  it("does not surface disallowed photo context after manual recovery", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { model: string };
      const response = request.model === "qwen2.5vl:3b"
        ? { response: '{"environment":"safe garden","features":["flowers"]}' }
        : { response: JSON.stringify(localMission) };
      return new Response(JSON.stringify(response), { status: 200 });
    }));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.upload(
      screen.getByLabelText(/tap to upload a photo/i),
      new File(["garden image"], "garden.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: localMission.title })).toBeInTheDocument();
    expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").map((status) => status.textContent).join(" ")).toContain(
      "The photo was not analyzed, so this quest follows the environment you selected.",
    );
  });

  it("uses a validated fallback when vision fails without a valid manual environment", async () => {
    const { generateMissionPipelineWithFallback } = await import("@/ai/MockAIProvider");
    const vision = {
      analyze: vi.fn(async () => {
        throw new TypeError("vision unavailable");
      }),
    };
    const llm = { generateMission: vi.fn(async () => localMission) };
    const result = await generateMissionPipelineWithFallback({
      mode: "simple-steps",
      durationMinutes: 10,
      environment: undefined,
      photo: new Blob(["image"], { type: "image/png" }),
    } as unknown as UserPreferences, vision, llm);

    expect(vision.analyze).toHaveBeenCalledOnce();
    expect(llm.generateMission).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(MissionSchema.safeParse(result.mission).success).toBe(true);
    expect(validateSafety(result.mission).safe).toBe(true);
    expect(result.mission.durationMinutes).toBe(10);
    expect(result.scene).toBeUndefined();
    expect(result.sceneSource).toBeUndefined();
  });

  it.each([
    ["malformed output", "not JSON"],
    ["schema-invalid output", JSON.stringify({ ...localMission, steps: [] })],
    ["safety-invalid output", JSON.stringify({
      ...localMission,
      steps: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
      audioVersion: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
    })],
  ])("renders a validated fallback when local LLM returns %s", async (_caseName, llmOutput) => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { model: string };
      return new Response(JSON.stringify({ response: request.model === "gemma3:4b"
        ? llmOutput
        : "{}" }), { status: 200 });
    }));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    await expectUsableValidatedFallback();
    expect(screen.queryByText(/cross the road/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Generated output was unavailable or did not pass validation, so this built-in quest is shown.",
    );
  });

  it("renders a validated fallback after a local Ollama request timeout", async () => {
    const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((handler, timeout, ...args) =>
      nativeSetTimeout(handler, timeout === 90_000 ? 1 : timeout, ...args)
    ) as typeof setTimeout);
    vi.stubGlobal("fetch", vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
    ));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    await expectUsableValidatedFallback();
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain("response");
  });

  it("continues from Environment to local mission generation without an image", async () => {
    const requests: { model: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { model: string };
      requests.push(request);
      return new Response(JSON.stringify({ response: JSON.stringify(localMission) }), { status: 200 });
    }));

    const user = userEvent.setup();
    render(<App aiMode="local" />);
    await selectPreferences(user);
    await user.click(screen.getByRole("button", { name: /prepare my quest/i }));

    expect(await screen.findByRole("heading", { name: localMission.title })).toBeInTheDocument();
    expect(screen.queryByText("From your photo")).not.toBeInTheDocument();
    expect(requests.map((request) => request.model)).toEqual(["gemma3:4b"]);
  });
});
