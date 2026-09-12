// The `sizes` syntax, borrowed from the Web App Manifest (spec section 4.4). Only the syntax:
// there is no reason to invent a second spelling for something already implemented everywhere.

/** A vector outranks every pixel count, so it is ranked as the largest area there is. */
export const VECTOR_AREA = Number.MAX_SAFE_INTEGER;

const SIZE_TOKEN_RE = /^(\d+)x(\d+)$/i;
const WHITESPACE_RE = /\s+/;
const ANY = "any";

/** The largest area a `sizes` string declares. Anything unparseable counts as zero rather than
 *  disqualifying the icon: an unstated size affects ordering only (spec section 4.4). */
export const largestIconArea = (sizes: unknown): number => {
  if (typeof sizes !== "string") return 0;
  return sizes
    .split(WHITESPACE_RE)
    .map((token) => {
      if (token.toLowerCase() === ANY) return VECTOR_AREA;
      const match = SIZE_TOKEN_RE.exec(token);
      return match === null ? 0 : Number(match[1]) * Number(match[2]);
    })
    .reduce((max, area) => Math.max(max, area), 0);
};
