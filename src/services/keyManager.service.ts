import crypto from "crypto";
import { saveEncrypted, loadEncrypted } from "./cryptoStore.service";

const FILE = "provider_keys.enc";

export type ProviderName = "gemini" | "local";

export interface KeyEntry {
  id: string;
  key: string;
  exhausted: boolean;
  /** Admin can disable without deleting */
  enabled: boolean;
  /** Lower number = higher priority (tried first). */
  priority: number;
  /** Must match client `model` in chat requests; sent upstream. */
  model: string;
  /** Optional. Gemini: API root (default Google). Local: OpenAI-compatible base (default Ollama). */
  host?: string;
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
    host: partial.host,
    model: partial.model || ""
  };
}

function defaultStore(): KeyStore {
  return { gemini: [], local: [] };
}

function migrate(store: KeyStore & { qwen?: KeyEntry[] }): boolean {
  let changed = false;
  if (store.qwen) {
    delete store.qwen;
    changed = true;
  }
  for (const prov of ["gemini", "local"] as const) {
    const arr = store[prov] || [];
    arr.forEach((k, i) => {
      const e = k as KeyEntry & { baseURL?: string };
      if (e.baseURL && !e.host) {
        e.host = e.baseURL;
        delete e.baseURL;
        changed = true;
      }
      if (!e.model || !String(e.model).trim()) {
        e.model = prov === "gemini" ? "gemini-1.5-flash" : "llama3";
        changed = true;
      }
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
  const store = loadEncrypted<KeyStore & { qwen?: KeyEntry[] }>(FILE, defaultStore());
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
  input: { key: string; model: string; host?: string; priority?: number }
): KeyEntry {
  const store = load();
  const list = store[provider] || [];
  const maxP = list.reduce((m, k) => Math.max(m, k.priority), -1);
  const entry = seedEntry(
    {
      key: input.key.trim(),
      model: input.model.trim(),
      host: input.host?.trim() || undefined,
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
  patch: {
    enabled?: boolean;
    priority?: number;
    key?: string;
    host?: string | null;
    model?: string;
  }
): boolean {
  const store = load();
  const list = store[provider] || [];
  const found = list.find(k => k.id === id);
  if (!found) return false;
  if (patch.enabled !== undefined) found.enabled = patch.enabled;
  if (patch.priority !== undefined) found.priority = patch.priority;
  if (patch.key !== undefined && patch.key.trim() !== "") found.key = patch.key.trim();
  if (patch.host !== undefined) {
    found.host = patch.host === null || patch.host === "" ? undefined : patch.host.trim();
  }
  if (patch.model !== undefined && patch.model.trim() !== "") found.model = patch.model.trim();
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
  return keys[0] ?? null;
}

export function markKeyFailed(
  provider: string,
  apiKey: string,
  host: string | undefined,
  entryId: string | undefined,
  model: string | undefined
): void {
  const store = load();
  const list = store[provider] || [];
  const found = entryId
    ? list.find(k => k.id === entryId && !k.exhausted)
    : list.find(k => {
        if (k.exhausted) return false;
        if (k.key !== apiKey) return false;
        if ((k.host || "") !== (host || "")) return false;
        if ((k.model || "") !== (model || "")) return false;
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
