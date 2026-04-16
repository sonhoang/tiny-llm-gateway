import type { ChatCompletionRequest, ChatCompletionResponse } from "./openai";

export type ProviderId = "gemini" | "qwen" | "local";

export interface ProviderContext {
  apiKey: string;
  model: string;
  /** OpenAI-compatible API root for `local` when using per-endpoint keys (optional). */
  baseURL?: string;
}

export interface LLMProvider {
  readonly id: ProviderId;
  chat(ctx: ProviderContext, body: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}
