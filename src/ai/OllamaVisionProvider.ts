import type { LocalVisionProvider } from "@/ai/AIProvider";
import { extractJSON } from "@/ai/extractJSON";
import { getManualSceneContext } from "@/ai/manualScene";
import { VISION_SYSTEM_PROMPT } from "@/ai/prompts/visionPrompt";
import type { OllamaClient } from "@/ai/ollamaClient";
import { LocalOllamaClient } from "@/ai/ollamaClient";
import { LocalAIProviderError } from "@/ai/providerError";
import { SceneSchema } from "@/schemas/scene";
import type { SceneContext } from "@/types";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const FORBIDDEN_SCENE_CLAIMS =
  /\b(navigat(?:e|ion)|directions?|route|obstacle|hazard|safe|safety|accessible|accessibility|certif(?:y|ied|ication)|medical|therapeutic|therapy|diagnos)\b/i;
const PRECISE_DISTANCE = /\b\d+(?:\.\d+)?\s*(?:m|meters?|feet|ft|yards?|yd|km|kilometers?|miles?|mi)\b/i;

async function toBase64(image: Blob): Promise<string> {
  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
    throw new LocalAIProviderError("The selected image format is not supported.");
  }
  if (image.size === 0 || image.size > 10 * 1024 * 1024) {
    throw new LocalAIProviderError("The selected image size is not supported.");
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export class OllamaVisionProvider implements LocalVisionProvider {
  private readonly client: OllamaClient;

  constructor(client: OllamaClient = new LocalOllamaClient()) {
    this.client = client;
  }

  async analyze(image: Blob | undefined, manualEnvironment: string): Promise<SceneContext> {
    if (!image) {
      console.info("[OpenAir Quest][AI] Vision skipped; using manual environment context.");
      return getManualSceneContext(manualEnvironment);
    }

    try {
      console.info("[OpenAir Quest][AI] Vision request starting.", { model: "qwen2.5vl:3b" });
      const imageBase64 = await toBase64(image);
      const raw = await this.client.generate({
        model: "qwen2.5vl:3b",
        system: VISION_SYSTEM_PROMPT,
        prompt: `Describe only broad environmental context. The user selected "${manualEnvironment}". Return the requested JSON object.`,
        format: "json",
        stream: false,
        images: [imageBase64],
        options: { temperature: 0 },
      });
      const parsed = SceneSchema.safeParse(extractJSON(raw));
      if (!parsed.success) {
        console.warn("[OpenAir Quest][AI] Vision response failed scene schema validation.");
        throw new LocalAIProviderError("The local vision model returned invalid scene data.");
      }

      const scene: SceneContext = {
        environment: parsed.data.environment.trim().slice(0, 100),
        features: parsed.data.features.map((feature) => feature.trim().slice(0, 100)),
      };
      if (parsed.data.sensory_character) {
        scene.sensory_character = parsed.data.sensory_character.trim().slice(0, 200);
      }
      if (parsed.data.general_context) {
        scene.general_context = parsed.data.general_context.trim().slice(0, 200);
      }

      if (
        !scene.environment ||
        scene.features.some((feature) => !feature) ||
        Object.values(scene).flat().some((value) =>
          typeof value === "string" &&
          (FORBIDDEN_SCENE_CLAIMS.test(value) || PRECISE_DISTANCE.test(value))
        )
      ) {
        console.warn("[OpenAir Quest][AI] Vision response contained disallowed claims.");
        throw new LocalAIProviderError("The local vision model returned disallowed scene claims.");
      }
      console.info("[OpenAir Quest][AI] Vision request completed.");
      return scene;
    } catch (error) {
      console.error("[OpenAir Quest][AI] Vision request failed.", {
        error,
        message: error instanceof Error ? error.message : undefined,
      });
      if (error instanceof LocalAIProviderError) throw error;
      throw new LocalAIProviderError("Local vision processing failed.");
    }
  }
}
