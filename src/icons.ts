// Icon ranking and selection (spec section 7). Without a stated rule two tools show two different
// icons for the same repository, so the order is part of the format rather than a matter of taste.
import { largestIconArea, VECTOR_AREA } from "./iconSizes.js";
import type { RepoIcon } from "./types.js";

const SVG_TYPE = "image/svg+xml";
const SVG_EXTENSION = ".svg";

/** A vector outranks every pixel count. `sizes: "any"` says so outright; an SVG says it by being
 *  one, which the specification lets a consumer honour (section 7, rule 1). */
export const iconArea = (icon: RepoIcon): number => {
  const declared = largestIconArea(icon.sizes);
  if (declared > 0) return declared;
  const isSvg = icon.type === SVG_TYPE || icon.src.toLowerCase().split("?")[0]?.endsWith(SVG_EXTENSION) === true;
  return isSvg ? VECTOR_AREA : 0;
};

/** Best first: vector, then largest declared size, then the order the author wrote.
 *
 *  The index is the explicit tie-break rather than a reliance on sort stability, so "the first
 *  listed wins a tie" is a property of this function and not of the engine running it. */
export const rankIcons = (icons: RepoIcon[]): RepoIcon[] =>
  icons
    .map((icon, index) => ({ icon, index, area: iconArea(icon) }))
    .sort((a, b) => b.area - a.area || a.index - b.index)
    .map((entry) => entry.icon);

/** The first ranked icon that RESOLVES, not the first that exists.
 *
 *  `resolves` is the consumer's: it knows whether it can read a file, fetch a URL or decode a
 *  payload, and this library touches none of those. Returning null means the file named no icon
 *  this consumer can obtain — never that it named none at all. */
export const selectIcon = (icons: RepoIcon[], resolves: (icon: RepoIcon) => boolean): RepoIcon | null =>
  rankIcons(icons).find((icon) => resolves(icon)) ?? null;
