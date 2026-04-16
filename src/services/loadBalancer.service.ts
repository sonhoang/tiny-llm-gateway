import type { ProviderId } from "../types/provider";
import type { KeyEntry } from "./keyManager.service";
import { listEligibleEntries } from "./keyManager.service";
import type { ModelRouting } from "./modelRouting";

/**
 * Merges eligible Gemini and OpenAI-compatible rows, sorted by priority (then id).
 * - `auto`: every eligible row (gateway failover by priority).
 * - `pinned`: only rows whose configured `model` equals the pinned id (failover among those only).
 */
export function orderedFallbackCandidates(
  routing: ModelRouting
): Array<{ provider: ProviderId; entry: KeyEntry }> {
  const match = (e: KeyEntry) =>
    routing.kind === "auto" || (e.model || "").trim() === routing.model;
  const gem = listEligibleEntries("gemini").filter(match).map(e => ({ provider: "gemini" as const, entry: e }));
  const loc = listEligibleEntries("local").filter(match).map(e => ({ provider: "local" as const, entry: e }));
  const merged = [...gem, ...loc];
  merged.sort((a, b) => a.entry.priority - b.entry.priority || a.entry.id.localeCompare(b.entry.id));
  return merged;
}
