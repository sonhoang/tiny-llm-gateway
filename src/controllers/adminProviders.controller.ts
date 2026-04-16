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
  return s === "gemini" || s === "local";
}

function viewRows(provider: ProviderName) {
  return listAllEntriesForAdmin(provider).map(k => ({
    ...k,
    keyMasked: maskSecret(k.key)
  }));
}

export function providersPage(_req: Request, res: Response): void {
  const sections = [
    { provider: "gemini" as const, label: "Google Gemini", rows: viewRows("gemini") },
    { provider: "local" as const, label: "Custom OpenAI-compatible", rows: viewRows("local") }
  ];
  res.render("providers", { sections: sections || [] });
}

export function providersAdd(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  if (!isProvider(p)) {
    res.redirect("/admin/providers?err=invalid");
    return;
  }
  const key = String(req.body?.key || "").trim();
  const model = String(req.body?.model || "").trim();
  const host = String(req.body?.host || "").trim();
  const priorityRaw = req.body?.priority;
  const priority =
    priorityRaw !== undefined && priorityRaw !== "" ? Number(priorityRaw) : undefined;
  if (!model) {
    res.redirect("/admin/providers?err=model");
    return;
  }
  if (p === "gemini" && !key) {
    res.redirect("/admin/providers?err=key");
    return;
  }
  if (p === "local" && !key && !host) {
    res.redirect("/admin/providers?err=local");
    return;
  }
  addProviderEntry(p, {
    key,
    model,
    host: host || undefined,
    priority: Number.isFinite(priority) ? priority : undefined
  });
  res.redirect("/admin/providers");
}

export function providersUpdateMeta(req: Request, res: Response): void {
  const p = String(req.body?.provider || "");
  const id = String(req.body?.id || "");
  const model = String(req.body?.model || "").trim();
  const host = String(req.body?.host || "").trim();
  if (!isProvider(p) || !id || !model) {
    res.redirect("/admin/providers?err=model");
    return;
  }
  updateProviderEntry(p, id, { model, host: host || null });
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
