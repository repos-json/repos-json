/** One entry of `icon`, after the string shorthand has been expanded (spec section 5). */
export interface RepoIcon {
  src: string;
  /** Space-separated `<w>x<h>`, or `any` for a vector. Absent when the file didn't say. */
  sizes?: string;
  /** A hint only: a wrong or absent type never disqualifies an icon (spec section 4.4). */
  type?: string;
}

/** The three colour roles. A role that was absent OR invalid is null — the specification treats
 *  those two cases identically, so that an unusable value cannot suppress a fallback (spec 8.1). */
export interface RepoColors {
  primary: string | null;
  accent: string | null;
  background: string | null;
}

/** One thing the document said that this parser could not use (spec section 11.3). */
export interface Diagnostic {
  /** Dotted path into the document, e.g. `color.primary` or `icon[2].src`. */
  field: string;
  reason: string;
}

/** One unit of a repository (spec section 9): a `repo.json` document with a path. */
export interface RepoProject {
  /** Normalised and repository-relative. The empty string is the repository root itself. */
  path: string;
  /** True when `path` carries a `*` segment, in which case it stands for many directories and
   *  names none of them — the identity fields are dropped rather than applied (spec section 9.2). */
  wildcard: boolean;
  /** What the entry said about this unit. Its own `projects` is always empty: nesting is expressed
   *  by the nested directory's own file, not inline (spec section 9.1). */
  meta: RepoMeta;
}

export interface RepoMeta {
  name: string | null;
  description: string | null;
  /** Ranked best-first by spec section 7; empty when the file names no usable icon. */
  icons: RepoIcon[];
  colors: RepoColors;
  homepage: string | null;
  authors: string[];
  keywords: string[];
  /** `extensions`, keyed by tool name. Each value is raw — validated by whoever owns the name. */
  extensions: Record<string, Record<string, unknown>>;
  /** Declared units, in the order written. Empty means the file named none, which the specification
   *  reads as one project at the repository root — never as "unknown" (spec section 9.3). */
  projects: RepoProject[];
  /** Carried in the result rather than returned separately, so a consumer cannot forget to look:
   *  "I set it and nothing happened" is this format's most likely failure (spec section 11.3).
   *  Always empty on a nested project's `meta`: one document, one place to look, with the field
   *  names of nested entries prefixed (`projects[1].color`). */
  dropped: Diagnostic[];
}
