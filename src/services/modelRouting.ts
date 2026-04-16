/** Empty or case-insensitive `auto` = try all rows by priority. Anything else = only rows with that configured model. */
export function isAutoModel(raw?: string | null): boolean {
  const t = (raw ?? "").trim();
  return t === "" || t.toLowerCase() === "auto";
}

export type ModelRouting = { kind: "auto" } | { kind: "pinned"; model: string };

export function parseModelRouting(raw?: string): ModelRouting {
  if (isAutoModel(raw)) return { kind: "auto" };
  return { kind: "pinned", model: (raw ?? "").trim() };
}

/** OpenAI response `model`: pinned request echoes pin; `auto` echoes the row actually used. */
export function effectiveResponseModel(requestModel: string | undefined, rowModel: string): string {
  if (isAutoModel(requestModel)) return rowModel;
  const p = (requestModel ?? "").trim();
  return p || rowModel;
}
