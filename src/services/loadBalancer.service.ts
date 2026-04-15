import { listActiveKeys } from "./keyManager.service";

const counters: Record<string, number> = {};

/**
 * Round-robin among active keys for a provider.
 * `local` with no configured keys returns "" (no Authorization header).
 */
export function pickProviderKey(provider: string): string | null {
  if (provider === "local") {
    const keys = listActiveKeys("local");
    if (keys.length === 0) return "";
  }
  const keys = listActiveKeys(provider);
  if (keys.length === 0) return null;
  const idx = counters[provider] ?? 0;
  counters[provider] = idx + 1;
  return keys[idx % keys.length];
}
