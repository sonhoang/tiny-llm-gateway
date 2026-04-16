import axios from "axios";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";
import type { LLMProvider, ProviderId } from "../types/provider";
import { geminiProvider } from "../providers/gemini.provider";
import { localProvider } from "../providers/local.provider";
import { orderedFallbackCandidates } from "./loadBalancer.service";
import { parseModelRouting } from "./modelRouting";
import { markKeyFailed } from "./keyManager.service";
import { logger } from "../utils/logger";

const registry: Record<ProviderId, LLMProvider> = {
  gemini: geminiProvider,
  local: localProvider
};

function shouldRetireKey(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const s = err.response?.status;
    return s === 401 || s === 403 || s === 429;
  }
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403 || status === 429;
}

export async function chatCompletion(body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  if (body.stream) {
    throw Object.assign(new Error("Streaming not supported yet"), { status: 400 });
  }
  const routing = parseModelRouting(body.model);
  const candidates = orderedFallbackCandidates(routing);
  if (candidates.length === 0) {
    if (routing.kind === "pinned") {
      throw Object.assign(
        new Error(
          `No provider row for model "${routing.model}". Add it under Admin → Providers, or use model "auto".`
        ),
        { status: 400 }
      );
    }
    throw Object.assign(
      new Error("No eligible provider rows — add Gemini or OpenAI-compatible rows under Admin → Providers."),
      { status: 400 }
    );
  }
  let lastErr: unknown;
  for (const { provider, entry } of candidates) {
    try {
      return await registry[provider].chat(
        { apiKey: entry.key, model: entry.model, host: entry.host },
        body
      );
    } catch (e) {
      lastErr = e;
      logger.warn(`provider failed: ${provider}`, e instanceof Error ? e.message : e);
      if (shouldRetireKey(e)) {
        markKeyFailed(provider, entry.key, entry.host, entry.id, entry.model);
      }
    }
  }
  const message =
    lastErr instanceof Error ? lastErr.message : String(lastErr || "All providers failed");
  throw Object.assign(new Error(message), { status: 502 });
}
