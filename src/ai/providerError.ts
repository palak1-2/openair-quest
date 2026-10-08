export class LocalAIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalAIProviderError";
  }
}
