import crypto from "crypto";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";

export function completionFromAssistant(
  req: ChatCompletionRequest,
  content: string,
  modelOverride?: string
): ChatCompletionResponse {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "chatcmpl-" + crypto.randomBytes(12).toString("hex"),
    object: "chat.completion",
    created: now,
    model: modelOverride || req.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}
