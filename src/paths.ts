// Path resolution and containment (spec section 6) — the rule that separates this file from the
// formats it resembles. A web app manifest resolves against the web root; this one resolves against
// the directory holding `repo.json`, which is why it works for repositories that are not web apps.
//
// No filesystem here on purpose: this decides what a path is ALLOWED to name, and leaves reading it
// to the consumer, whose policy on symlinks, size and media types is its own (spec section 12).

// An absolute URI scheme. A Windows path like `C:/brand/mark.png` also matches, with scheme `c` —
// which lands it in the rejected branch, where an absolute path belongs anyway.
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
const ABSOLUTE_PATH_RE = /^([/\\]|[a-z]:[/\\])/i;
const SEPARATOR_RE = /[/\\]+/;
const PARENT = "..";
const CURRENT = ".";
const WILDCARD = "*";

/** The repository root, as `containedPath` normalises it (spec section 6). */
export const ROOT_PATH = "";

export type IconSource =
  { kind: "remote"; url: string } | { kind: "inline"; url: string } | { kind: "path"; path: string } | { kind: "rejected"; reason: string };

/** A `src` normalised to the one of four things it can be. `path` comes back repository-relative
 *  with `/` separators and `.` / `..` resolved, ready to join to the repository root. */
export const classifyIconSource = (src: string): IconSource => {
  const value = src.trim();
  if (value === "") return { kind: "rejected", reason: "empty" };
  const scheme = SCHEME_RE.exec(value)?.[1]?.toLowerCase();
  if (scheme === "http" || scheme === "https") return { kind: "remote", url: value };
  if (scheme === "data") return { kind: "inline", url: value };
  if (scheme !== undefined) return { kind: "rejected", reason: `unsupported URL scheme: ${scheme}:` };
  if (ABSOLUTE_PATH_RE.test(value)) return { kind: "rejected", reason: "absolute path" };
  const path = containedPath(value);
  if (path === null) return { kind: "rejected", reason: "path escapes the repository" };
  // An icon has to name a file. The repository root normalises to the empty path, which is a valid
  // project path and never a valid icon (spec section 6).
  if (path === ROOT_PATH) return { kind: "rejected", reason: "names the repository root, not a file" };
  return { kind: "path", path };
};

/** A repository-relative path with `.` and `..` resolved, or null when it escapes the repository.
 *  Applied to the NORMALISED path rather than to the string as written, which `a/../../etc` passes.
 *  The repository root itself normalises to `ROOT_PATH` — a directory, and never a file. */
export const containedPath = (value: string): string | null => {
  const segments = value.split(SEPARATOR_RE).reduce<string[] | null>((kept, segment) => {
    if (kept === null) return null;
    if (segment === "" || segment === CURRENT) return kept;
    if (segment !== PARENT) return [...kept, segment];
    return kept.length === 0 ? null : kept.slice(0, -1);
  }, []);
  return segments === null ? null : segments.join("/");
};

export type ProjectPath = { kind: "path"; path: string; wildcard: boolean } | { kind: "rejected"; reason: string };

/** A `projects[].path` resolved by spec section 9.2: the same containment as an icon, minus the URL
 *  forms — a unit of this repository is always a directory of it — plus `*` as a whole segment. */
export const classifyProjectPath = (src: string): ProjectPath => {
  const value = src.trim();
  if (value === "") return { kind: "rejected", reason: "empty" };
  if (SCHEME_RE.test(value)) return { kind: "rejected", reason: "a project path is never remote or inline" };
  if (ABSOLUTE_PATH_RE.test(value)) return { kind: "rejected", reason: "absolute path" };
  const segments = value.split(SEPARATOR_RE);
  // `**` and `pkg-*` are not this version's syntax. Ignoring the entry beats guessing at a glob
  // dialect, which is how two consumers end up listing different projects (spec section 9.2).
  if (segments.some((segment) => segment.includes(WILDCARD) && segment !== WILDCARD)) {
    return { kind: "rejected", reason: "undefined wildcard syntax: only a whole `*` segment" };
  }
  const path = containedPath(value);
  if (path === null) return { kind: "rejected", reason: "path escapes the repository" };
  return { kind: "path", path, wildcard: path.split("/").includes(WILDCARD) };
};
