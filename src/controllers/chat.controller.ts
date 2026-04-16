import { Request, Response, NextFunction } from "express";
import { chatCompletion } from "../services/provider.service";
import type { ChatCompletionRequest } from "../types/openai";
import { recordApiCall } from "../services/apiCallLog.service";
import { logger } from "../utils/logger";

const CHAT_PATH = "/v1/chat/completions";

export async function handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  const started = Date.now();
  const modelLabel = (req.body as ChatCompletionRequest)?.model?.trim() || "auto";
  try {
    const body = req.body as ChatCompletionRequest;
    if (!body?.messages?.length) {
      recordApiCall({
        method: "POST",
        path: CHAT_PATH,
        statusCode: 400,
        durationMs: Date.now() - started,
        model: modelLabel,
        error: "messages required"
      });
      res.status(400).json({ error: "messages required" });
      return;
    }
    logger.info("chat completion", { model: body.model?.trim() || "auto" });
    const out = await chatCompletion(body);
    recordApiCall({
      method: "POST",
      path: CHAT_PATH,
      statusCode: 200,
      durationMs: Date.now() - started,
      model: body.model?.trim() || "auto",
      messagesCount: body.messages.length,
      responseModel: out.model
    });
    res.json(out);
  } catch (e) {
    const status =
      typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500;
    recordApiCall({
      method: "POST",
      path: CHAT_PATH,
      statusCode: status >= 400 && status < 600 ? status : 500,
      durationMs: Date.now() - started,
      model: modelLabel,
      messagesCount: (req.body as ChatCompletionRequest)?.messages?.length,
      error: e instanceof Error ? e.message : String(e)
    });
    next(e);
  }
}
