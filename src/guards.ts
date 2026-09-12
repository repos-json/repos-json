// Type guards for values that come straight out of `JSON.parse`. A `repo.json` arrives with the
// repository, so nothing about its shape may be assumed (spec section 12).

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

/** A string the specification counts as present: non-empty once trimmed (spec section 4.1). */
export const presentString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};
