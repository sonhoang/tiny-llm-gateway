import crypto from "crypto";
import { saveEncrypted, loadEncrypted } from "./cryptoStore.service";

const FILE = "provider_keys.enc";

export type ProviderName = "gemini" | "qwen" | "local";

export interface KeyEntry {
  id: string;
  key: string;
  exhausted: boolean;
  /** Admin can disable without deleting */
  enabled: boolean;
  /** Lower number = higher priority (tried first). */
  priority: number;
  /** For `local` only: OpenAI-compatible base (e.g. https://host/v1). */
  baseURL?: string;
}

export type KeyStore = Record<string, KeyEntry[]>;

function newId(): string {
  return crypto.randomUUID();
}

function seedEntry(partial: Omit<KeyEntry, "id"> & { id?: string }, index: number): KeyEntry {
  return {
    id: partial.id || newId(),
    key: partial.key,
    exhausted: partial.exhausted ?? false,
    enabled: partial.enabled !== false,
    priority: partial.priority ?? index * 10,
    baseURL: partial.baseURL
  };
}

/**
 * LOCAL_PROVIDER_ENDPOINTS: comma-separated `url|key` or `url` only.
 * Otherwise LOCAL_API_KEYS + LOCAL_LLM_URL.
 */
function parseLocalKeyEntries(): KeyEntry[] {
  const eps = (process.env.LOCAL_PROVIDER_ENDPOINTS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (eps.length > 0) {
    return eps.map((seg, i) => {
      const pipe = seg.indexOf("|");
      if (pipe === -1) {
        return seedEntry(
          { key: "", baseURL: seg.replace(/\/$/, ""), exhausted: false, enabled: true, priority: i * 10 },
          i
        );
      }
      return seedEntry(
        {
          baseURL: seg.slice(0, pipe).trim().replace(/\/$/, ""),
          key: seg.slice(pipe + 1).trim(),
          exhausted: false,
          enabled: true,
          priority: i * 10
        },
        i
      );
    });
  }
  const keys = (process.env.LOCAL_API_KEYS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return keys.map((key, i) =>
    seedEntry({ key, exhausted: false, enabled: true, priority: i * 10 }, i)
  );
}

function defaultStore(): KeyStore {
  return {
    gemini: (process.env.GEMINI_KEYS || "")
      .split(",")
      .filter(Boolean)
      .map((k, i) => seedEntry({ key: k.trim(), exhausted: false, enabled: true, priority: i * 10 }, i)),
    qwen: (process.env.QWEN_KEYS || "")
      .split(",")
      .filter(Boolean)
      .map((k, i) => seedEntry({ key: k.trim(), exhausted: false, enabled: true, priority: i * 10 }, i)),
    local: parseLocalKeyEntries()
  };
}

function migrate(store: KeyStore): boolean {
  let changed = false;
  for (const prov of ["gemini", "qwen", "local"]) {
    const arr = store[prov] || [];
    arr.forEach((k, i) => {
      const e = k as KeyEntry & { enabled?: boolean; priority?: number; id?: string };
      if (!e.id) {
        e.id = newId();
        changed = true;
      }
      if (e.enabled === undefined) {
        e.enabled = true;
        changed = true;
      }
      if (e.priority === undefined) {
        e.priority = i * 10;
        changed = true;
      }
    });
  }
  return changed;
}

function load(): KeyStore {
  const store = loadEncrypted<KeyStore>(FILE, defaultStore());
  if (migrate(store)) save(store);
  return store;
}

function save(store: KeyStore): void {
  saveEncrypted(FILE, store);
}

/** Eligible for routing: enabled, not auto-exhausted. Sorted by priority then id. */
export function listEligibleEntries(provider: string): KeyEntry[] {
  const store = load();
  return (store[provider] || [])
    .filter(k => k.enabled !== false && !k.exhausted)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export function listActiveKeys(provider: string): string[] {
  return listEligibleEntries(provider).map(k => k.key);
}

export function listActiveLocalEntries(): KeyEntry[] {
  return listEligibleEntries("local");
}

export function listAllEntriesForAdmin(provider: ProviderName): KeyEntry[] {
  const store = load();
  return [...(store[provider] || [])].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export function maskSecret(value: string): string {
  if (!value) return "—";
  if (value.length <= 10) return "••••";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function addProviderEntry(
  provider: ProviderName,
  input: { key: string; baseURL?: string; priority?: number }
): KeyEntry {
  const store = load();
  const list = store[provider] || [];
  const maxP = list.reduce((m, k) => Math.max(m, k.priority), -1);
  const entry = seedEntry(
    {
      key: input.key.trim(),
      baseURL: input.baseURL?.trim() || undefined,
      exhausted: false,
      enabled: true,
      priority: input.priority ?? maxP + 10
    },
    list.length
  );
  list.push(entry);
  store[provider] = list;
  save(store);
  return entry;
}

export function updateProviderEntry(
  provider: ProviderName,
  id: string,
  patch: { enabled?: boolean; priority?: number; key?: string; baseURL?: string | null }
): boolean {
  const store = load();
  const list = store[provider] || [];
  const found = list.find(k => k.id === id);
  if (!found) return false;
  if (patch.enabled !== undefined) found.enabled = patch.enabled;
  if (patch.priority !== undefined) found.priority = patch.priority;
  if (patch.key !== undefined && patch.key.trim() !== "") found.key = patch.key.trim();
  if (patch.baseURL !== undefined) {
    found.baseURL = patch.baseURL === null || patch.baseURL === "" ? undefined : patch.baseURL.trim();
  }
  save(store);
  return true;
}

export function deleteProviderEntry(provider: ProviderName, id: string): boolean {
  const store = load();
  const list = store[provider] || [];
  const idx = list.findIndex(k => k.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  store[provider] = list;
  save(store);
  return true;
}

export function clearExhausted(provider: ProviderName, id: string): boolean {
  const store = load();
  const found = (store[provider] || []).find(k => k.id === id);
  if (!found) return false;
  found.exhausted = false;
  save(store);
  return true;
}

export function getAvailableKey(provider: string): string | null {
  const keys = listActiveKeys(provider);
  if (provider === "local" && keys.length === 0) return "";
  return keys[0] ?? null;
}

export function markKeyFailed(
  provider: string,
  apiKey: string,
  baseURL?: string,
  entryId?: string
): void {
  const store = load();
  const list = store[provider] || [];
  const found = entryId
    ? list.find(k => k.id === entryId && !k.exhausted)
    : list.find(k => {
        if (k.exhausted) return false;
        if (k.key !== apiKey) return false;
        if (provider === "local") return (k.baseURL || "") === (baseURL || "");
        return true;
      });
  if (found) {
    found.exhausted = true;
    save(store);
  }
}

export function resetKeys(provider: string): void {
  const store = load();
  (store[provider] || []).forEach(k => {
    k.exhausted = false;
  });
  save(store);
}
