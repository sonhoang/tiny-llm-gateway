import type { ChatCompletionRequest, ChatCompletionResponse } from "./openai";

export type ProviderId = "gemini" | "local";

export interface ProviderContext {
  apiKey: string;
  /** Upstream model id for this row (matches client `model`). */
  model: string;
  /** API root: Gemini Generative Language host, or OpenAI-compatible base URL. */
  host?: string;
}

export interface LLMProvider {
  readonly id: ProviderId;
  chat(ctx: ProviderContext, body: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}
