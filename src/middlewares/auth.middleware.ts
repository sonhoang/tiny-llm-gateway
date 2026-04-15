import { Request, Response, NextFunction } from "express";
import { validateKey } from "../services/authKeyStore.service";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"] || "";
  const raw = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : header;
  const token = typeof raw === "string" ? raw : "";
  if (!token || !validateKey(token)) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }
  next();
}
