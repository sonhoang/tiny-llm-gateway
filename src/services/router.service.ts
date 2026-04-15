import type { ProviderId } from "../types/provider";

function normalizeModel(model: string): string {
  return (model || "").toLowerCase();
}

/** Primary provider from model name / id. */
export function resolvePrimaryProvider(model: string): ProviderId {
  const m = normalizeModel(model);
  if (m.includes("gemini")) return "gemini";
  if (m.includes("qwen")) return "qwen";
  return "local";
}

function parseFallbackChain(): ProviderId[] {
  const raw = (process.env.PROVIDER_FALLBACK || "gemini,qwen,local")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed: ProviderId[] = [];
  for (const id of raw) {
    if (id === "gemini" || id === "qwen" || id === "local") {
      if (!allowed.includes(id)) allowed.push(id);
    }
  }
  return allowed.length ? allowed : ["gemini", "qwen", "local"];
}

/**
 * Ordered providers to try: primary first, then fallback chain (de-duped).
 */
export function getProviderOrder(model: string): ProviderId[] {
  const primary = resolvePrimaryProvider(model);
  const chain = parseFallbackChain();
  const out: ProviderId[] = [primary];
  for (const p of chain) {
    if (p !== primary && !out.includes(p)) out.push(p);
  }
  for (const p of ["gemini", "qwen", "local"] as ProviderId[]) {
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
