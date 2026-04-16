import { Request, Response } from "express";
import { chatCompletion } from "../services/provider.service";

export function chatPage(req: Request, res: Response): void {
  const label = typeof req.query.label === "string" ? req.query.label : "";
  res.render("chat", { label });
}

export async function chatTestApi(req: Request, res: Response): Promise<void> {
  const model = String(req.body?.model || "gemini-1.5-flash").trim();
  const message = String(req.body?.message || "").trim();
  if (!message) {
    res.status(400).json({ error: "message required" });
    return;
  }
  try {
    const out = await chatCompletion({
      model,
      messages: [{ role: "user", content: message }]
    });
    const reply = out.choices?.[0]?.message?.content ?? "";
    res.json({ reply, model: out.model });
  } catch (e) {
    const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e instanceof Error ? e.message : String(e)
    });
  }
}
