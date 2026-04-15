import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) return;
  const status = typeof (err as { status?: number })?.status === "number"
    ? (err as { status: number }).status
    : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error("unhandled error", message);
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}
