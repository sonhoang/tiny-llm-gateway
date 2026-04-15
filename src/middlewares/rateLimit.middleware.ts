import { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_MINUTE || 120);
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
}
