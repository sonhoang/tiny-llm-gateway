import axios from "axios";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";
import type { LLMProvider, ProviderContext } from "../types/provider";

function baseUrl(): string {
  return (process.env.LOCAL_LLM_URL || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
}

export const localProvider: LLMProvider = {
  id: "local",

  async chat(ctx: ProviderContext, body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const openaiBody = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream: false
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ctx.apiKey) headers.Authorization = `Bearer ${ctx.apiKey}`;
    const res = await axios.post<ChatCompletionResponse>(
      `${baseUrl()}/chat/completions`,
      openaiBody,
      { headers, timeout: 120_000, validateStatus: () => true }
    );
    if (res.status >= 400) {
      const msg =
        (res.data as unknown as { error?: { message?: string } })?.error?.message ||
        `Local LLM HTTP ${res.status}`;
      const err = new Error(msg) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res.data;
  }
};
