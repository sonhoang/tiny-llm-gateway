import axios from "axios";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";
import type { LLMProvider, ProviderContext } from "../types/provider";

/** Build OpenAI-compatible chat/completions URL from any reasonable base. */
function chatCompletionsUrl(baseURL: string): string {
  const t = baseURL.replace(/\/$/, "");
  if (t.endsWith("/chat/completions")) return t;
  if (t.endsWith("/v1")) return `${t}/chat/completions`;
  return `${t}/v1/chat/completions`;
}

function resolveOpenAiRoot(ctx: ProviderContext): string {
  const raw =
    (ctx.baseURL && ctx.baseURL.trim()) ||
    (process.env.LOCAL_LLM_URL || "").trim() ||
    "http://127.0.0.1:11434/v1";
  return raw.replace(/\/$/, "");
}

export const localProvider: LLMProvider = {
  id: "local",

  async chat(ctx: ProviderContext, body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = chatCompletionsUrl(resolveOpenAiRoot(ctx));
    const openaiBody = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream: false
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ctx.apiKey) headers.Authorization = `Bearer ${ctx.apiKey}`;
    const res = await axios.post<ChatCompletionResponse>(url, openaiBody, {
      headers,
      timeout: 120_000,
      validateStatus: () => true
    });
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
