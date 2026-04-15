import axios from "axios";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";
import type { LLMProvider, ProviderId } from "../types/provider";
import { geminiProvider } from "../providers/gemini.provider";
import { qwenProvider } from "../providers/qwen.provider";
import { localProvider } from "../providers/local.provider";
import { getProviderOrder } from "./router.service";
import { pickProviderKey } from "./loadBalancer.service";
import { markKeyFailed } from "./keyManager.service";
import { logger } from "../utils/logger";

const registry: Record<ProviderId, LLMProvider> = {
  gemini: geminiProvider,
  qwen: qwenProvider,
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
  const order = getProviderOrder(body.model);
  let lastErr: unknown;
  for (const id of order) {
    const apiKey = pickProviderKey(id);
    if (apiKey === null) {
      logger.warn(`provider skipped (no active key): ${id}`);
      continue;
    }
    try {
      const provider = registry[id];
      return await provider.chat({ apiKey, model: body.model }, body);
    } catch (e) {
      lastErr = e;
      logger.warn(`provider failed: ${id}`, e instanceof Error ? e.message : e);
      if (apiKey && shouldRetireKey(e)) markKeyFailed(id, apiKey);
    }
  }
  const message =
    lastErr instanceof Error ? lastErr.message : String(lastErr || "All providers failed");
  throw Object.assign(new Error(message), { status: 502 });
}
