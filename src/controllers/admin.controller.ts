import { Request, Response } from "express";
import { createKey, listKeys, revokeKey } from "../services/authKeyStore.service";
import { logger } from "../utils/logger";

export function loginPage(req: Request, res: Response): void {
  res.render("login", { error: null });
}

export function loginSubmit(req: Request, res: Response): void {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    res.redirect("/admin");
    return;
  }
  res.render("login", { error: "Invalid credentials" });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy(() => res.redirect("/admin/login"));
}

export function dashboard(req: Request, res: Response): void {
  const newKey = req.session.pendingNewKey;
  req.session.pendingNewKey = undefined;
  res.render("dashboard", { keys: listKeys(), newKey: newKey || null });
}

function wantsJson(req: Request): boolean {
  return Boolean(req.get("Accept")?.includes("application/json") || req.is("application/json"));
}

export function apiCreateKey(req: Request, res: Response): void {
  const name = (req.body?.name as string) || "Unnamed";
  const key = createKey(name);
  if (wantsJson(req)) {
    res.json({ key: key.key, name: key.name, createdAt: key.createdAt });
    return;
  }
  req.session.pendingNewKey = key.key;
  res.redirect("/admin");
}

export function apiRevokeKey(req: Request, res: Response): void {
  const prefix = String(req.body?.prefix || "");
  const ok = revokeKey(prefix);
  if (wantsJson(req)) {
    res.json({ revoked: ok });
    return;
  }
  res.redirect("/admin");
}

export function logsPage(_req: Request, res: Response): void {
  res.render("logs", { entries: logger.getRecent() });
}
