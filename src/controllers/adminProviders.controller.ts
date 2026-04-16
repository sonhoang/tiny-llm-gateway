import { Request, Response } from "express";
import {
  addProviderEntry,
  clearExhausted,
  deleteProviderEntry,
  listAllEntriesForAdmin,
  maskSecret,
  updateProviderEntry,
  type ProviderName
} from "../services/keyManager.service";

function isProvider(s: string): s is ProviderName {
  return s === "gemini" || s === "qwen" || s === "local";
}

function viewRows(provider: ProviderName) {
  return listAllEntriesForAdmin(provider).map(k => ({
    ...k,
    keyMasked: maskSecret(k.key)
  }));
}

export function providersPage(_req: Request, res: Response): void {
  const sections: Array<{
    provider: ProviderName;
    label: string;
    showBase: boolean;
    rows: ReturnType<typeof viewRows>;
  }> = [
    { provider: "gemini", label: "Google Gemini", showBase: false, rows: viewRows("gemini") },
    { provider: "qwen", label: "Qwen (OpenAI-compatible)", showBase: false, rows: viewRows("qwen") },
    {
      provider: "local",
      label: "Local / custom OpenAI-compatible",
      showBase: true,
      rows: viewRows("local")
    }
  ];
  res.render("providers", { sections });
}

export function providersAdd(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  if (!isProvider(p)) {
    res.redirect("/admin/providers?err=invalid");
    return;
  }
  const key = String(req.body?.key || "").trim();
  const baseURL = String(req.body?.baseURL || "").trim();
  const priorityRaw = req.body?.priority;
  const priority =
    priorityRaw !== undefined && priorityRaw !== "" ? Number(priorityRaw) : undefined;
  if (p !== "local" && !key) {
    res.redirect("/admin/providers?err=key");
    return;
  }
  if (p === "local") {
    const hasFallbackUrl = Boolean((process.env.LOCAL_LLM_URL || "").trim());
    if (!key && !baseURL && !hasFallbackUrl) {
      res.redirect("/admin/providers?err=local");
      return;
    }
  }
  addProviderEntry(p, {
    key,
    baseURL: p === "local" ? baseURL || undefined : undefined,
    priority: Number.isFinite(priority) ? priority : undefined
  });
  res.redirect("/admin/providers");
}

export function providersToggle(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  const enabled = String(req.body?.enabled || "") === "true";
  if (!isProvider(p) || !id) {
    res.redirect("/admin/providers");
    return;
  }
  updateProviderEntry(p, id, { enabled });
  res.redirect("/admin/providers");
}

export function providersPriority(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  const priority = Number(req.body?.priority);
  if (!isProvider(p) || !id || !Number.isFinite(priority)) {
    res.redirect("/admin/providers");
    return;
  }
  updateProviderEntry(p, id, { priority });
  res.redirect("/admin/providers");
}

export function providersDelete(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  if (!isProvider(p) || !id) {
    res.redirect("/admin/providers");
    return;
  }
  deleteProviderEntry(p, id);
  res.redirect("/admin/providers");
}

export function providersReactivate(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  if (!isProvider(p) || !id) {
    res.redirect("/admin/providers");
    return;
  }
  clearExhausted(p, id);
  res.redirect("/admin/providers");
}

export function providersRotateKey(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  const newKey = String(req.body?.newKey || "").trim();
  if (!isProvider(p) || !id || !newKey) {
    res.redirect("/admin/providers");
    return;
  }
  updateProviderEntry(p, id, { key: newKey });
  res.redirect("/admin/providers");
}
