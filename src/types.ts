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

/** One thing the document said that this parser could not use (spec section 10.3). */
export interface Diagnostic {
  /** Dotted path into the document, e.g. `color.primary` or `icon[2].src`. */
  field: string;
  reason: string;
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
  /** Carried in the result rather than returned separately, so a consumer cannot forget to look:
   *  "I set it and nothing happened" is this format's most likely failure (spec section 10.3). */
  dropped: Diagnostic[];
}
