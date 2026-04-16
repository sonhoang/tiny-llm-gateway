import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "api_calls.json");
const MAX_CALLS = 50;

export type ApiCallLogEntry = {
  ts: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  /** Request model (auto / pinned / omitted). */
  model?: string;
  messagesCount?: number;
  /** Response model when success. */
  responseModel?: string;
  error?: string;
};

let buffer: ApiCallLogEntry[] = loadFromDisk();

function loadFromDisk(): ApiCallLogEntry[] {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is ApiCallLogEntry => x && typeof x === "object" && typeof (x as ApiCallLogEntry).ts === "string")
      .slice(0, MAX_CALLS);
  } catch {
    return [];
  }
}

function persist(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(buffer, null, 2), "utf8");
  fs.renameSync(tmp, FILE);
}

export function recordApiCall(entry: Omit<ApiCallLogEntry, "ts"> & { ts?: string }): void {
  const full: ApiCallLogEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    method: entry.method,
    path: entry.path,
    statusCode: entry.statusCode,
    durationMs: entry.durationMs,
    model: entry.model,
    messagesCount: entry.messagesCount,
    responseModel: entry.responseModel,
    error: entry.error
  };
  buffer = [full, ...buffer].slice(0, MAX_CALLS);
  persist();
}

/** Newest first (same as file order). */
export function getApiCallLogs(): ApiCallLogEntry[] {
  return [...buffer];
}
