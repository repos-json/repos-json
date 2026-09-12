// Deriving a readable text colour (spec section 8.2). The specification forbids a declared text
// colour and states this algorithm instead, so that every conforming tool reaches the same answer
// on the same background.
//
// The shortcut this replaces — YIQ perceived brightness on raw channels against a threshold — picks
// the worse of black and white for 29.7% of the colour space. `#00ff00` is the visible case: it
// scores 149.685 against the usual threshold of 150, taking white at 1.37:1 where black gives 15.3:1.
import { parseHexColor, type Rgb } from "./hexColor.js";

const CHANNEL_MAX = 255;
const SRGB_LINEAR_CUTOFF = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const LUMINANCE_WEIGHTS: Rgb = [0.2126, 0.7152, 0.0722];
const CONTRAST_OFFSET = 0.05;

export const BLACK = "#000000";
export const WHITE = "#ffffff";
/** WCAG AA for normal text. Exported so a consumer can check its own softened inks (spec 8.2). */
export const AA_CONTRAST = 4.5;

const BLACK_LUMINANCE = 0;
const WHITE_LUMINANCE = 1;

// sRGB to linear light, which is what luminance has to be computed on.
const toLinear = (channel: number): number => {
  const value = channel / CHANNEL_MAX;
  return value <= SRGB_LINEAR_CUTOFF ? value / SRGB_LINEAR_DIVISOR : Math.pow((value + SRGB_OFFSET) / SRGB_SCALE, SRGB_GAMMA);
};

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  LUMINANCE_WEIGHTS[0] * toLinear(r) + LUMINANCE_WEIGHTS[1] * toLinear(g) + LUMINANCE_WEIGHTS[2] * toLinear(b);

/** 1:1 for identical luminances, 21:1 for black against white. */
export const contrastRatio = (luminanceA: number, luminanceB: number): number =>
  (Math.max(luminanceA, luminanceB) + CONTRAST_OFFSET) / (Math.min(luminanceA, luminanceB) + CONTRAST_OFFSET);

/** Whichever of black or white is more readable on this background. Ties go to black, which the
 *  specification fixes so that two implementations cannot differ at the midpoint. */
export const readableTextColor = (rgb: Rgb): typeof BLACK | typeof WHITE => {
  const background = relativeLuminance(rgb);
  return contrastRatio(background, BLACK_LUMINANCE) >= contrastRatio(background, WHITE_LUMINANCE) ? BLACK : WHITE;
};

/** The same answer for a colour as written in the file, or null when it is not a usable colour. */
export const readableTextColorFor = (color: string): typeof BLACK | typeof WHITE | null => {
  const rgb = parseHexColor(color);
  return rgb === null ? null : readableTextColor(rgb);
};
