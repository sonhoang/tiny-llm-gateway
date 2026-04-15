import { saveEncrypted, loadEncrypted } from "./cryptoStore.service";

const FILE = "provider_keys.enc";

interface KeyEntry {
  key: string;
  exhausted: boolean;
}
type KeyStore = Record<string, KeyEntry[]>;

function defaultStore(): KeyStore {
  return {
    gemini: (process.env.GEMINI_KEYS || "")
      .split(",")
      .filter(Boolean)
      .map(k => ({ key: k.trim(), exhausted: false })),
    qwen: (process.env.QWEN_KEYS || "")
      .split(",")
      .filter(Boolean)
      .map(k => ({ key: k.trim(), exhausted: false })),
    local: (process.env.LOCAL_API_KEYS || "")
      .split(",")
      .filter(Boolean)
      .map(k => ({ key: k.trim(), exhausted: false }))
  };
}

function load(): KeyStore {
  return loadEncrypted<KeyStore>(FILE, defaultStore());
}

function save(store: KeyStore): void {
  saveEncrypted(FILE, store);
}

export function listActiveKeys(provider: string): string[] {
  const store = load();
  return (store[provider] || []).filter(k => !k.exhausted).map(k => k.key);
}

/** First non-exhausted key (legacy helper). */
export function getAvailableKey(provider: string): string | null {
  const keys = listActiveKeys(provider);
  if (provider === "local" && keys.length === 0) return "";
  return keys[0] ?? null;
}

export function markKeyFailed(provider: string, apiKey: string): void {
  const store = load();
  const list = store[provider] || [];
  const found = list.find(k => k.key === apiKey && !k.exhausted);
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
