import fs from "fs";
import path from "path";
import type { ChatCompletionRequest, ChatCompletionResponse } from "../types/openai";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "api_calls.json");
const MAX_CALLS = 50;

/** Per-message / response caps to keep `api_calls.json` bounded (LM Studio–style detail, not full dumps). */
const MAX_MESSAGES = 64;
const MAX_MSG_CONTENT = 12_000;
const MAX_RESPONSE_ASSISTANT = 24_000;

export type ApiCallLogEntry = {
  ts: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  model?: string;
  messagesCount?: number;
  responseModel?: string;
  error?: string;
  /** OpenAI-shaped request snapshot (truncated). */
  requestDetail?: Record<string, unknown>;
  /** OpenAI-shaped response snapshot on success, or `{ error }` on failure. */
  responseDetail?: Record<string, unknown>;
};

let buffer: ApiCallLogEntry[] = loadFromDisk();

function truncateText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated ${s.length - max} characters]`;
}

/** Safe for any POST body shape (invalid JSON fields, missing messages, etc.). */
export function snapshotChatRequestFromBody(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object") {
    return { _note: "Request body was not a JSON object" };
  }
  const b = body as Partial<ChatCompletionRequest> & Record<string, unknown>;
  const rawMessages = Array.isArray(b.messages) ? b.messages : [];
  const messages = rawMessages.slice(0, MAX_MESSAGES).map((m, i) => {
    if (!m || typeof m !== "object") return { index: i, role: "?", content: String(m) };
    const msg = m as { role?: string; content?: unknown };
    const content =
      typeof msg.content === "string"
        ? truncateText(msg.content, MAX_MSG_CONTENT)
        : JSON.stringify(msg.content ?? null);
    return { role: msg.role ?? "?", content };
  });
  const out: Record<string, unknown> = {
    model: b.model ?? null,
    messages,
    temperature: b.temperature,
    max_tokens: b.max_tokens,
    stream: b.stream
  };
  if (rawMessages.length > MAX_MESSAGES) {
    out._truncated = `Only first ${MAX_MESSAGES} of ${rawMessages.length} messages stored`;
  }
  return out;
}

export function snapshotChatRequest(body: ChatCompletionRequest): Record<string, unknown> {
  return snapshotChatRequestFromBody(body);
}

export function snapshotChatResponse(res: ChatCompletionResponse): Record<string, unknown> {
  const choice = res.choices?.[0];
  return {
    id: res.id,
    object: res.object,
    created: res.created,
    model: res.model,
    choices: choice
      ? [
          {
            index: choice.index,
            finish_reason: choice.finish_reason,
            message: {
              role: choice.message.role,
              content: truncateText(choice.message.content ?? "", MAX_RESPONSE_ASSISTANT)
            }
          }
        ]
      : [],
    usage: res.usage
  };
}

export function snapshotErrorResponse(message: string, statusCode: number): Record<string, unknown> {
  return { error: message, statusCode };
}

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

export function recordApiCall(
  entry: Omit<ApiCallLogEntry, "ts"> & {
    ts?: string;
    requestDetail?: Record<string, unknown>;
    responseDetail?: Record<string, unknown>;
  }
): void {
  const full: ApiCallLogEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    method: entry.method,
    path: entry.path,
    statusCode: entry.statusCode,
    durationMs: entry.durationMs,
    model: entry.model,
    messagesCount: entry.messagesCount,
    responseModel: entry.responseModel,
    error: entry.error,
    requestDetail: entry.requestDetail,
    responseDetail: entry.responseDetail
  };
  buffer = [full, ...buffer].slice(0, MAX_CALLS);
  persist();
}

export function getApiCallLogs(): ApiCallLogEntry[] {
  return [...buffer];
}
