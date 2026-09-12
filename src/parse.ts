// Reading a `repo.json` document (spec sections 4 and 5).
//
// This normalises the SHAPE the specification allows into one predictable form. Both fields with a
// shorthand — `icon` and `color` — follow the same rule:
//
//   Where a field has an obvious primary value, the scalar form is shorthand for the fullest form.
//
// Normalising at the boundary is what that rule buys: everything downstream sees one form, so the
// shorthand costs a single function rather than a branch at every use.
import { isRecord, isUnknownArray, presentString } from "./guards.js";
import { normalizeHexColor } from "./hexColor.js";
import { rankIcons } from "./icons.js";
import type { Diagnostic, RepoColors, RepoIcon, RepoMeta } from "./types.js";

const HOMEPAGE_RE = /^https?:\/\/\S+$/i;
const COLOR_ROLES = ["primary", "accent", "background"] as const;
const EMPTY_COLORS: RepoColors = { primary: null, accent: null, background: null };

export const EMPTY_REPO_META: RepoMeta = {
  name: null,
  description: null,
  icons: [],
  colors: EMPTY_COLORS,
  homepage: null,
  authors: [],
  keywords: [],
  extensions: {},
  dropped: [],
};

/** Parse a `repo.json` body. Never throws and never rejects a document: an unusable value is
 *  dropped with a reason, which is what the specification requires of a consumer (section 10.2). */
export const parseRepoJson = (raw: unknown): RepoMeta => {
  if (!isRecord(raw)) return { ...EMPTY_REPO_META, dropped: [{ field: "", reason: "not a JSON object" }] };
  const dropped: Diagnostic[] = [];
  return {
    name: textField(raw.name, "name", dropped),
    description: textField(raw.description, "description", dropped),
    icons: parseIcons(raw.icon, dropped),
    colors: parseColors(raw.color, dropped),
    homepage: parseHomepage(raw.homepage, dropped),
    authors: stringArray(raw.authors, "authors", dropped),
    keywords: stringArray(raw.keywords, "keywords", dropped),
    extensions: parseExtensions(raw.extensions, dropped),
    dropped,
  };
};

const textField = (input: unknown, field: string, dropped: Diagnostic[]): string | null => {
  if (input === undefined) return null;
  const value = presentString(input);
  if (value === null) dropped.push({ field, reason: "not a non-empty string" });
  return value;
};

// `"icon": "x.png"` means exactly `[{ "src": "x.png" }]`, stated in the spec so that an
// implementation can normalise once and never branch on the form again.
const parseIcons = (input: unknown, dropped: Diagnostic[]): RepoIcon[] => {
  if (input === undefined) return [];
  const src = presentString(input);
  if (src !== null) return [{ src }];
  if (!isUnknownArray(input)) {
    dropped.push({ field: "icon", reason: "not a string or array" });
    return [];
  }
  return rankIcons(input.flatMap((entry, index) => parseIconEntry(entry, index, dropped)));
};

const parseIconEntry = (entry: unknown, index: number, dropped: Diagnostic[]): RepoIcon[] => {
  const field = `icon[${index}]`;
  if (!isRecord(entry)) {
    dropped.push({ field, reason: "not an object" });
    return [];
  }
  const src = presentString(entry.src);
  if (src === null) {
    dropped.push({ field: `${field}.src`, reason: "missing or not a non-empty string" });
    return [];
  }
  const sizes = presentString(entry.sizes);
  const type = presentString(entry.type);
  return [{ src, ...(sizes === null ? {} : { sizes }), ...(type === null ? {} : { type }) }];
};

// `"color": "#7c3aed"` means exactly `{ "primary": "#7c3aed" }` — the same shorthand rule as `icon`.
const parseColors = (input: unknown, dropped: Diagnostic[]): RepoColors => {
  if (input === undefined) return EMPTY_COLORS;
  if (typeof input === "string") return { ...EMPTY_COLORS, primary: role(input, "color", dropped) };
  if (!isRecord(input)) {
    dropped.push({ field: "color", reason: "not a string or object" });
    return EMPTY_COLORS;
  }
  const roles = COLOR_ROLES.map((name) => [name, role(input[name], `color.${name}`, dropped)] as const);
  return { ...EMPTY_COLORS, ...Object.fromEntries(roles) };
};

/** A role that is invalid is a role that was not declared, so that an unusable value cannot
 *  suppress the consumer's fallback (spec section 8.1). */
const role = (value: unknown, field: string, dropped: Diagnostic[]): string | null => {
  if (value === undefined) return null;
  const normalized = typeof value === "string" ? normalizeHexColor(value) : null;
  if (normalized === null) dropped.push({ field, reason: "not #rgb or #rrggbb" });
  return normalized;
};

const parseHomepage = (input: unknown, dropped: Diagnostic[]): string | null => {
  if (input === undefined) return null;
  const url = presentString(input);
  if (url !== null && HOMEPAGE_RE.test(url)) return url;
  dropped.push({ field: "homepage", reason: "not an absolute http(s) URL" });
  return null;
};

const stringArray = (input: unknown, field: string, dropped: Diagnostic[]): string[] => {
  if (input === undefined) return [];
  if (!isUnknownArray(input)) {
    dropped.push({ field, reason: "not an array" });
    return [];
  }
  return input.flatMap((entry, index) => {
    const value = presentString(entry);
    if (value === null) dropped.push({ field: `${field}[${index}]`, reason: "not a non-empty string" });
    return value === null ? [] : [value];
  });
};

/** Entries are kept raw: their contents belong to whoever owns the name, and this document says
 *  nothing about them beyond "it is an object" (spec section 4.7). */
const parseExtensions = (input: unknown, dropped: Diagnostic[]): Record<string, Record<string, unknown>> => {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    dropped.push({ field: "extensions", reason: "not an object" });
    return {};
  }
  const entries = Object.entries(input).flatMap(([name, value]) => {
    if (isRecord(value)) return [[name, value] as const];
    dropped.push({ field: `extensions.${name}`, reason: "not an object" });
    return [];
  });
  return Object.fromEntries(entries);
};
