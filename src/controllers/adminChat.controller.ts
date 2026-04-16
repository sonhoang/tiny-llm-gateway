import { Request, Response } from "express";
import { chatCompletion } from "../services/provider.service";
import type { ChatCompletionRequest } from "../types/openai";
import {
  recordApiCall,
  snapshotChatRequest,
  snapshotChatResponse,
  snapshotErrorResponse
} from "../services/apiCallLog.service";

function publicOrigin(req: Request): string {
  const xfProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const proto = xfProto || req.protocol || "http";
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.get("host") || "localhost:4000";
  return `${proto}://${host}`;
}

export function chatPage(req: Request, res: Response): void {
  const label = typeof req.query.label === "string" ? req.query.label : "";
  const origin = publicOrigin(req);
  const openaiBaseUrl = `${origin}/v1`;
  const chatCompletionsUrl = `${origin}/v1/chat/completions`;
  res.render("chat", { label, openaiBaseUrl, chatCompletionsUrl });
}

const CHAT_TEST_PATH = "/admin/api/chat-test";

export async function chatTestApi(req: Request, res: Response): Promise<void> {
  const started = Date.now();
  const modelRaw = req.body?.model;
  const model =
    modelRaw !== undefined && modelRaw !== null && String(modelRaw).trim() !== ""
      ? String(modelRaw).trim()
      : undefined;
  const modelLabel = model ?? "auto";
  const message = String(req.body?.message || "").trim();
  if (!message) {
    recordApiCall({
      method: "POST",
      path: CHAT_TEST_PATH,
      statusCode: 400,
      durationMs: Date.now() - started,
      model: modelLabel,
      error: "message required",
      requestDetail: { model: model ?? null, message: "", _note: "message field empty" },
      responseDetail: snapshotErrorResponse("message required", 400)
    });
    res.status(400).json({ error: "message required" });
    return;
  }
  try {
    const testBody: ChatCompletionRequest = {
      ...(model ? { model } : {}),
      messages: [{ role: "user", content: message }]
    };
    const out = await chatCompletion(testBody);
    recordApiCall({
      method: "POST",
      path: CHAT_TEST_PATH,
      statusCode: 200,
      durationMs: Date.now() - started,
      model: modelLabel,
      messagesCount: 1,
      responseModel: out.model,
      requestDetail: snapshotChatRequest(testBody),
      responseDetail: snapshotChatResponse(out)
    });
    const reply = out.choices?.[0]?.message?.content ?? "";
    res.json({ reply, model: out.model });
  } catch (e) {
    const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500;
    const failBody: ChatCompletionRequest = {
      ...(model ? { model } : {}),
      messages: [{ role: "user", content: message }]
    };
    recordApiCall({
      method: "POST",
      path: CHAT_TEST_PATH,
      statusCode: status >= 400 && status < 600 ? status : 500,
      durationMs: Date.now() - started,
      model: modelLabel,
      messagesCount: 1,
      error: e instanceof Error ? e.message : String(e),
      requestDetail: snapshotChatRequest(failBody),
      responseDetail: snapshotErrorResponse(
        e instanceof Error ? e.message : String(e),
        status >= 400 && status < 600 ? status : 500
      )
    });
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e instanceof Error ? e.message : String(e)
    });
  }
}
