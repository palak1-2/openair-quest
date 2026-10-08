export const DEFAULT_OLLAMA_ENDPOINT = "http://localhost:11434";

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system: string;
  format: "json" | Record<string, unknown>;
  stream: false;
  images?: string[];
  options: {
    temperature: number;
  };
}

export interface OllamaGenerateResponse {
  response: string;
}

export interface OllamaClient {
  generate(request: OllamaGenerateRequest): Promise<string>;
}

type RequestFailureType =
  | "network-or-cors"
  | "timeout"
  | "http"
  | "json-parsing"
  | "invalid-response"
  | "other";

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 240);
  return String(error).slice(0, 240);
}

function classifyFetchFailure(error: unknown, timedOut: boolean): RequestFailureType {
  if (timedOut) return "timeout";
  if (error instanceof TypeError) return "network-or-cors";
  return "other";
}

export class OllamaClientError extends Error {
  readonly kind: "unavailable" | "timeout" | "http" | "response";

  constructor(
    message: string,
    kind: "unavailable" | "timeout" | "http" | "response",
  ) {
    super(message);
    this.name = "OllamaClientError";
    this.kind = kind;
  }
}

interface OllamaClientOptions {
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function validateEndpoint(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new OllamaClientError(
      "Ollama endpoint must use HTTP on the local machine.",
      "response",
    );
  }
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new OllamaClientError(
      "Ollama endpoint must use HTTP on the local machine.",
      "response",
    );
  }
  return url.toString().replace(/\/$/, "");
}

export class LocalOllamaClient implements OllamaClient {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(options: OllamaClientOptions = {}) {
    this.endpoint = validateEndpoint(options.endpoint ?? DEFAULT_OLLAMA_ENDPOINT);
    this.timeoutMs = options.timeoutMs ?? 90_000;
    this.fetchImpl = options.fetchImpl;
  }

  async generate(request: OllamaGenerateRequest): Promise<string> {
    const url = `${this.endpoint}/api/generate`;
    const method = "POST";
    console.info("[OpenAir Quest][AI] Sending local Ollama request.", {
      url,
      method,
      model: request.model,
      contentType: "application/json",
      streaming: request.stream,
      imageIncluded: Boolean(request.images?.length),
    });
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      let response: Response;
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
          redirect: "error",
        };
        response = this.fetchImpl
          ? await this.fetchImpl(url, fetchOptions)
          : await globalThis.fetch(url, fetchOptions);
      } catch (error: unknown) {
        const failureType = classifyFetchFailure(error, timedOut);
        console.error("[OpenAir Quest][AI] Ollama fetch failed.", {
          url,
          method,
          model: request.model,
          status: null,
          statusText: null,
          responseContentType: null,
          failureType,
          message: getSafeErrorMessage(error),
        });
        if (timedOut) {
          throw new OllamaClientError("Ollama request timed out.", "timeout");
        }
        throw new OllamaClientError(
          `Ollama request failed (${failureType}): ${getSafeErrorMessage(error)}`,
          "unavailable",
        );
      }

      const responseContentType = response.headers.get("content-type");
      if (!response.ok) {
        console.error("[OpenAir Quest][AI] Ollama returned an HTTP error.", {
          url,
          method,
          model: request.model,
          status: response.status,
          statusText: response.statusText,
          responseContentType,
          failureType: "http",
          message: `HTTP ${response.status} ${response.statusText}`.trim(),
        });
        throw new OllamaClientError(`Ollama returned HTTP ${response.status}.`, "http");
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error: unknown) {
        console.error("[OpenAir Quest][AI] Ollama response JSON parsing failed.", {
          url,
          method,
          model: request.model,
          status: response.status,
          statusText: response.statusText,
          responseContentType,
          failureType: "json-parsing",
          message: getSafeErrorMessage(error),
        });
        throw new OllamaClientError("Ollama returned an invalid response.", "response");
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("response" in payload) ||
        typeof payload.response !== "string"
      ) {
        console.error("[OpenAir Quest][AI] Ollama response had an unexpected shape.", {
          url,
          method,
          model: request.model,
          status: response.status,
          statusText: response.statusText,
          responseContentType,
          failureType: "invalid-response",
          message: "Response JSON did not contain a string response field.",
        });
        throw new OllamaClientError("Ollama returned an invalid response.", "response");
      }

      console.info("[OpenAir Quest][AI] Ollama response received.", { model: request.model });
      return (payload as OllamaGenerateResponse).response;
    } catch (error: unknown) {
      const failureType: RequestFailureType = error instanceof OllamaClientError
        ? error.kind === "http"
          ? "http"
          : error.kind === "timeout"
            ? "timeout"
            : error.kind === "response"
              ? "invalid-response"
              : "network-or-cors"
        : "other";
      console.error("[OpenAir Quest][AI] Local Ollama request failed.", {
        url,
        method,
        model: request.model,
        failureType,
        message: getSafeErrorMessage(error),
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
