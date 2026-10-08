import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalOllamaClient } from "@/ai/ollamaClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = {
  model: "gemma3:4b",
  system: "Rules",
  prompt: "Generate JSON",
  format: "json" as const,
  stream: false as const,
  options: { temperature: 0 },
};

describe("LocalOllamaClient", () => {
  it("posts only to the local Ollama API and returns the generated response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ response: '{"ok":true}' }), { status: 200 }),
    );
    const client = new LocalOllamaClient({ fetchImpl });
    await expect(client.generate(request)).resolves.toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:11434/api/generate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "error",
      }),
    );
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: "gemma3:4b",
      stream: false,
      format: "json",
      system: "Rules",
      prompt: "Generate JSON",
    });
  });

  it("invokes the default browser fetch with its global receiver", async () => {
    const browserFetch = vi.fn(function (
      this: typeof globalThis,
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(JSON.stringify({ response: '{"ok":true}' }), { status: 200 }),
      );
    });
    vi.stubGlobal("fetch", browserFetch);

    const client = new LocalOllamaClient();
    await expect(client.generate(request)).resolves.toBe('{"ok":true}');
    expect(browserFetch).toHaveBeenCalledOnce();
    expect(browserFetch.mock.instances[0]).toBe(globalThis);
  });

  it("reports HTTP errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("missing model", { status: 404 }),
    );
    await expect(
      new LocalOllamaClient({ fetchImpl }).generate(request),
    ).rejects.toMatchObject({ kind: "http" });
  });

  it("reports an unavailable Ollama service", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("connection refused"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      new LocalOllamaClient({ fetchImpl }).generate(request),
    ).rejects.toMatchObject({ kind: "unavailable" });
    expect(errorLog).toHaveBeenCalledWith(
      "[OpenAir Quest][AI] Ollama fetch failed.",
      expect.objectContaining({
        url: "http://localhost:11434/api/generate",
        method: "POST",
        model: "gemma3:4b",
        status: null,
        responseContentType: null,
        failureType: "network-or-cors",
        message: "connection refused",
      }),
    );
    errorLog.mockRestore();
  });

  it("includes response metadata for HTTP failures without logging response content", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("private server body", {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      new LocalOllamaClient({ fetchImpl }).generate(request),
    ).rejects.toMatchObject({ kind: "http" });
    expect(errorLog).toHaveBeenCalledWith(
      "[OpenAir Quest][AI] Ollama returned an HTTP error.",
      expect.objectContaining({
        url: "http://localhost:11434/api/generate",
        method: "POST",
        model: "gemma3:4b",
        status: 404,
        statusText: "Not Found",
        responseContentType: "text/plain",
        failureType: "http",
      }),
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private server body");
    errorLog.mockRestore();
  });

  it("reports a request timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
        );
      }),
    );
    await expect(
      new LocalOllamaClient({ fetchImpl, timeoutMs: 1 }).generate(request),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("refuses a non-local Ollama endpoint", () => {
    expect(() => new LocalOllamaClient({ endpoint: "https://example.com" }))
      .toThrow("Ollama endpoint must use HTTP on the local machine.");
  });
});
