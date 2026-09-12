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
import { classifyProjectPath } from "./paths.js";
import type { Diagnostic, RepoColors, RepoIcon, RepoMeta, RepoProject } from "./types.js";

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
  projects: [],
  dropped: [],
};

/** Parse a `repo.json` body. Never throws and never rejects a document: an unusable value is
 *  dropped with a reason, which is what the specification requires of a consumer (section 11.2). */
export const parseRepoJson = (raw: unknown): RepoMeta => {
  if (!isRecord(raw)) return { ...EMPTY_REPO_META, dropped: [{ field: "", reason: "not a JSON object" }] };
  const dropped: Diagnostic[] = [];
  const document = parseDocument(raw, "", dropped);
  return { ...document, projects: parseProjects(raw.projects, dropped), dropped };
};

// One function for the document and for every `projects` entry, because the specification says an
// entry IS a `repo.json` document with a path (section 9.1) — two parsers would be two dialects.
// `prefix` keeps a nested entry's diagnostics addressable (`projects[1].color`) while they all
// collect in the one array the caller reads.
const parseDocument = (raw: Record<string, unknown>, prefix: string, dropped: Diagnostic[]): RepoMeta => ({
  name: textField(raw.name, `${prefix}name`, dropped),
  description: textField(raw.description, `${prefix}description`, dropped),
  icons: parseIcons(raw.icon, `${prefix}icon`, dropped),
  colors: parseColors(raw.color, `${prefix}color`, dropped),
  homepage: parseHomepage(raw.homepage, `${prefix}homepage`, dropped),
  authors: stringArray(raw.authors, `${prefix}authors`, dropped),
  keywords: stringArray(raw.keywords, `${prefix}keywords`, dropped),
  extensions: parseExtensions(raw.extensions, `${prefix}extensions`, dropped),
  projects: [],
  dropped: [],
});

const textField = (input: unknown, field: string, dropped: Diagnostic[]): string | null => {
  if (input === undefined) return null;
  const value = presentString(input);
  if (value === null) dropped.push({ field, reason: "not a non-empty string" });
  return value;
};

// `"icon": "x.png"` means exactly `[{ "src": "x.png" }]`, stated in the spec so that an
// implementation can normalise once and never branch on the form again.
const parseIcons = (input: unknown, field: string, dropped: Diagnostic[]): RepoIcon[] => {
  if (input === undefined) return [];
  const src = presentString(input);
  if (src !== null) return [{ src }];
  if (!isUnknownArray(input)) {
    dropped.push({ field, reason: "not a string or array" });
    return [];
  }
  return rankIcons(input.flatMap((entry, index) => parseIconEntry(entry, `${field}[${index}]`, dropped)));
};

const parseIconEntry = (entry: unknown, field: string, dropped: Diagnostic[]): RepoIcon[] => {
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
const parseColors = (input: unknown, field: string, dropped: Diagnostic[]): RepoColors => {
  if (input === undefined) return EMPTY_COLORS;
  if (typeof input === "string") return { ...EMPTY_COLORS, primary: role(input, field, dropped) };
  if (!isRecord(input)) {
    dropped.push({ field, reason: "not a string or object" });
    return EMPTY_COLORS;
  }
  const roles = COLOR_ROLES.map((name) => [name, role(input[name], `${field}.${name}`, dropped)] as const);
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

const parseHomepage = (input: unknown, field: string, dropped: Diagnostic[]): string | null => {
  if (input === undefined) return null;
  const url = presentString(input);
  if (url !== null && HOMEPAGE_RE.test(url)) return url;
  dropped.push({ field, reason: "not an absolute http(s) URL" });
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
const parseExtensions = (input: unknown, field: string, dropped: Diagnostic[]): Record<string, Record<string, unknown>> => {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    dropped.push({ field, reason: "not an object" });
    return {};
  }
  const entries = Object.entries(input).flatMap(([name, value]) => {
    if (isRecord(value)) return [[name, value] as const];
    dropped.push({ field: `${field}.${name}`, reason: "not an object" });
    return [];
  });
  return Object.fromEntries(entries);
};

// `"projects": "packages/*"` means `[{ "path": "packages/*" }]`, and a string entry means an object
// with only `path` — the section 5 shorthand rule, applied to the field that needed it most.
const parseProjects = (input: unknown, dropped: Diagnostic[]): RepoProject[] => {
  if (input === undefined) return [];
  if (typeof input === "string") return parseProjectEntry(input, "projects[0]", dropped);
  if (!isUnknownArray(input)) {
    dropped.push({ field: "projects", reason: "not a string or array" });
    return [];
  }
  return input.flatMap((entry, index) => parseProjectEntry(entry, `projects[${index}]`, dropped));
};

const parseProjectEntry = (entry: unknown, field: string, dropped: Diagnostic[]): RepoProject[] => {
  const shorthand = presentString(entry);
  if (shorthand !== null) return projectFor(shorthand, EMPTY_REPO_META, field, dropped);
  if (!isRecord(entry)) {
    dropped.push({ field, reason: "not a string or object" });
    return [];
  }
  const path = presentString(entry.path);
  if (path === null) {
    dropped.push({ field: `${field}.path`, reason: "missing or not a non-empty string" });
    return [];
  }
  // Nesting is expressed by the nested directory's own file, never inline, so that a document
  // stays finite and nothing claims to describe a tree it cannot see (spec section 9.1).
  if (entry.projects !== undefined) dropped.push({ field: `${field}.projects`, reason: "a project entry may not carry projects" });
  return projectFor(path, parseDocument(entry, `${field}.`, dropped), field, dropped);
};

const projectFor = (path: string, meta: RepoMeta, field: string, dropped: Diagnostic[]): RepoProject[] => {
  const resolved = classifyProjectPath(path);
  if (resolved.kind === "rejected") {
    dropped.push({ field: `${field}.path`, reason: resolved.reason });
    return [];
  }
  if (!resolved.wildcard) return [{ path: resolved.path, wildcard: false, meta }];
  // One entry standing for many directories cannot name them. The path survives; the names do not
  // (spec section 9.2).
  return [{ path: resolved.path, wildcard: true, meta: withoutIdentity(meta, field, dropped) }];
};

const IDENTITY_FIELDS = ["name", "description", "icon"] as const;

const withoutIdentity = (meta: RepoMeta, field: string, dropped: Diagnostic[]): RepoMeta => {
  const named = IDENTITY_FIELDS.filter((name) => (name === "icon" ? meta.icons.length > 0 : meta[name] !== null));
  named.forEach((name) => dropped.push({ field: `${field}.${name}`, reason: "a wildcard entry names many directories and cannot name one" }));
  return { ...meta, name: null, description: null, icons: [] };
};
