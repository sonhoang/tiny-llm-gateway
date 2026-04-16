import type { ProviderId } from "../types/provider";
import { listActiveKeys, listEligibleEntries } from "./keyManager.service";

const counters: Record<string, number> = {};

export type ProviderPick = { apiKey: string; baseURL?: string; entryId?: string };

/**
 * Legacy: round-robin key strings (tests / old code paths).
 */
export function pickProviderKey(provider: string): string | null {
  if (provider === "local") {
    const keys = listActiveKeys("local");
    if (keys.length === 0) return "";
  }
  const keys = listActiveKeys(provider);
  if (keys.length === 0) return null;
  const idx = counters[`legacy_${provider}`] ?? 0;
  counters[`legacy_${provider}`] = idx + 1;
  return keys[idx % keys.length];
}

/**
 * Picks API key, optional base URL (local), and entry id for markKeyFailed.
 */
export function pickProviderRequest(provider: ProviderId): ProviderPick | null {
  if (provider === "local") {
    const entries = listEligibleEntries("local");
    if (entries.length === 0) {
      const url = (process.env.LOCAL_LLM_URL || "").trim();
      if (!url) return null;
      return { apiKey: "" };
    }
    const idx = counters[provider] ?? 0;
    counters[provider] = idx + 1;
    const e = entries[idx % entries.length];
    return { apiKey: e.key, baseURL: e.baseURL, entryId: e.id };
  }
  const entries = listEligibleEntries(provider);
  if (entries.length === 0) return null;
  const idx = counters[provider] ?? 0;
  counters[provider] = idx + 1;
  const e = entries[idx % entries.length];
  return { apiKey: e.key, baseURL: e.baseURL, entryId: e.id };
}
