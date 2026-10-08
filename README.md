# OpenAir Quest

OpenAir Quest creates short outdoor activities adapted to a selected accessibility mode, duration, and broad environment. It is a local-first application: it has no accounts, backend, analytics, or cloud AI integration.

## Local open-weight AI

The application can run with deterministic mock providers or with local open-weight models served by [Ollama](https://ollama.com/). Local inference keeps the generation pipeline available without sending prompts or images to a remote AI provider. Ollama and the model files must be installed by the user; the application never downloads models.

The provider architecture keeps the UI separate from model runtimes:

```text
Manual preferences and optional photo
  → vision provider (Ollama Qwen2.5-VL with a photo; manual context without one)
  → SceneContext
  → deterministic accessibility engine
  → ConstraintObject
  → mission provider (Ollama Gemma 3 or deterministic mock)
  → JSON extraction
  → Zod schema and safety validation
  → built-in fallback on failure
  → Activity and ActiveActivity
  → local history
```

Accessibility rules are enforced by the application, not delegated to a model. The three modes are **Quiet** (calm, lower-stimulation instructions), **Audio-first** (short spoken-friendly instructions paired with visible text), and **Simple steps** (one primary action at a time).

## Requirements

- Node.js and npm
- For local AI mode: Ollama installed and running on the same machine
- Models pulled manually before use:
  - `qwen2.5vl:3b` for broad image context
  - `gemma3:4b` for activity generation

## Install and run

Install the app dependencies:

```sh
npm install
```

In a terminal, start Ollama and allow the local Vite development origin. If Ollama is already running, configure `OLLAMA_ORIGINS` for its process and restart it:

```sh
OLLAMA_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 ollama serve
```

Pull the models yourself; the app does not install or download them:

```sh
ollama pull qwen2.5vl:3b
ollama pull gemma3:4b
```

Start the application in local AI mode:

```sh
VITE_AI_MODE=local npm run dev
```

For a persistent local configuration, put these settings in `.env.local` and restart Vite:

```dotenv
VITE_AI_MODE=local
VITE_OLLAMA_ENDPOINT=http://localhost:11434
```

`VITE_OLLAMA_ENDPOINT` is optional. Only HTTP endpoints on `localhost`, `127.0.0.1`, or `::1` are accepted; remote Ollama hosts are rejected.

## Mock mode

Mock mode is deterministic and is the default, so the app and tests work without Ollama:

```sh
VITE_AI_MODE=mock npm run dev
```

The mock vision provider derives context only from the manually selected environment and does not inspect uploaded images. The mock mission provider generates repeatable activities.

## Privacy

Without a photo, the local vision model is not called; the selected manual environment is used as context. With a photo in local AI mode, the browser sends the image only to the user's Ollama service over the loopback interface. It is processed on the user's machine and is not stored by OpenAir Quest. Photos are not included in local activity history. In mock mode, uploaded images are not sent to any model.

Preferences and history remain in the browser's local storage. There is no cloud AI, remote model endpoint, analytics service, account system, or application backend.

## Fallback behavior

If Ollama is unavailable, a requested model is missing, a request times out, or model output fails JSON parsing, Zod validation, duration checks, or safety validation, OpenAir Quest uses a built-in activity instead. Raw model output and technical errors are not shown in the UI. Local mode displays a notice when a built-in activity is used.

## Safety and known limitations

OpenAir Quest provides broad environmental context and accessibility-adapted activities. It is **not** a navigation or safety product. It does not guarantee accessibility or safety, detect every obstacle or hazard, provide routes, or offer medical advice or therapy. Vision output is limited to broad descriptions, and pattern-based mission safety checks cannot guarantee that all unsafe content will be recognized. Model availability and performance depend on the user's device and Ollama setup.

Text remains available in every mode. Text-to-speech integration is not part of this milestone.

## Development checks

```sh
npm test
npm run build
npm run lint
```

Tests use mock providers and mocked Ollama HTTP responses; they do not require Ollama or downloaded models.
