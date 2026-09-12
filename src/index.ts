// The package entry point — the one place re-exports are the interface rather than indirection.
export { parseRepoJson, EMPTY_REPO_META } from "./parse.js";
export { rankIcons, selectIcon, iconArea } from "./icons.js";
export { largestIconArea, VECTOR_AREA } from "./iconSizes.js";
export { classifyIconSource, containedPath, type IconSource } from "./paths.js";
export { isHexColor, parseHexColor, normalizeHexColor, type Rgb } from "./hexColor.js";
export { readableTextColor, readableTextColorFor, relativeLuminance, contrastRatio, AA_CONTRAST, BLACK, WHITE } from "./contrast.js";
export type { Diagnostic, RepoColors, RepoIcon, RepoMeta } from "./types.js";
