type LogEntry = { ts: string; level: string; msg: string; meta?: string };

const MAX = 500;
const buffer: LogEntry[] = [];

function push(level: string, msg: string, meta?: unknown): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    meta: meta !== undefined ? (typeof meta === "string" ? meta : JSON.stringify(meta)) : undefined
  };
  buffer.push(entry);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  const line = `[${entry.ts}] ${level.toUpperCase()} ${msg}${entry.meta ? ` ${entry.meta}` : ""}`;
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, meta?: unknown) => push("info", msg, meta),
  warn: (msg: string, meta?: unknown) => push("warn", msg, meta),
  error: (msg: string, meta?: unknown) => push("error", msg, meta),
  getRecent(): LogEntry[] {
    return [...buffer].reverse();
  }
};
