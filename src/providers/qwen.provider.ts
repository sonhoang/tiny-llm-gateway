import axios from "axios";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";
import type { LLMProvider, ProviderContext } from "../types/provider";

function baseUrl(): string {
  return (process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(
    /\/$/,
    ""
  );
}

export const qwenProvider: LLMProvider = {
  id: "qwen",

  async chat(ctx: ProviderContext, body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const openaiBody = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream: false
    };
    const res = await axios.post<ChatCompletionResponse>(
      `${baseUrl()}/chat/completions`,
      openaiBody,
      {
        headers: {
          Authorization: `Bearer ${ctx.apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 120_000,
        validateStatus: () => true
      }
    );
    if (res.status >= 400) {
      const msg =
        (res.data as unknown as { error?: { message?: string } })?.error?.message ||
        `Qwen HTTP ${res.status}`;
      const err = new Error(msg) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res.data;
  }
};
