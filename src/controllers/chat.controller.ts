import { Request, Response, NextFunction } from "express";
import { chatCompletion } from "../services/provider.service";
import type { ChatCompletionRequest } from "../types/openai";
import { logger } from "../utils/logger";

export async function handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as ChatCompletionRequest;
    if (!body?.messages?.length) {
      res.status(400).json({ error: "messages required" });
      return;
    }
    if (!body.model) {
      res.status(400).json({ error: "model required" });
      return;
    }
    logger.info("chat completion", { model: body.model });
    const out = await chatCompletion(body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
