import axios from "axios";
import type { ChatCompletionRequest } from "../types/openai";
import type { LLMProvider, ProviderContext } from "../types/provider";
import { completionFromAssistant } from "./base.provider";

function mapModelId(requested: string): string {
  const m = requested.toLowerCase();
  if (m.includes("gemini-2") || m.includes("2.0")) return "gemini-2.0-flash";
  if (m.includes("1.5-pro") || (m.includes("pro") && !m.includes("flash"))) return "gemini-1.5-pro";
  return "gemini-1.5-flash";
}

function buildGeminiPayload(body: ChatCompletionRequest) {
  const systemTexts: string[] = [];
  const contents: Array<{ role: string; parts: { text: string }[] }> = [];
  for (const msg of body.messages) {
    if (msg.role === "system") {
      systemTexts.push(msg.content);
      continue;
    }
    const role = msg.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: msg.content }] });
  }
  const payload: Record<string, unknown> = { contents };
  if (systemTexts.length) {
    payload.systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  }
  if (body.temperature !== undefined) payload.generationConfig = { temperature: body.temperature };
  if (body.max_tokens !== undefined) {
    const gc = (payload.generationConfig as Record<string, number>) || {};
    gc.maxOutputTokens = body.max_tokens;
    payload.generationConfig = gc;
  }
  return payload;
}

export const geminiProvider: LLMProvider = {
  id: "gemini",

  async chat(ctx: ProviderContext, body: ChatCompletionRequest) {
    const modelId = mapModelId(ctx.model || body.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    const payload = buildGeminiPayload(body);
    const res = await axios.post(`${url}?key=${encodeURIComponent(ctx.apiKey)}`, payload, {
      timeout: 120_000,
      validateStatus: () => true
    });
    if (res.status >= 400) {
      const msg =
        (res.data as { error?: { message?: string } })?.error?.message || `Gemini HTTP ${res.status}`;
      const err = new Error(msg) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const text =
      (res.data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
        ?.content?.parts?.[0]?.text ?? "";
    return completionFromAssistant(body, text, body.model);
  }
};
