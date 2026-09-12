// The only colour syntax the specification allows: `#rgb` and `#rrggbb`, case-insensitive
// (spec section 8.1). Accepting more here would mean rendering files another conforming tool
// rejects, which is the disagreement this format exists to prevent.

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SHORT_FORM_LENGTH = 3;
const HEX_RADIX = 16;
const CHANNEL_DIGITS = 2;

export type Rgb = [number, number, number];

export const isHexColor = (value: unknown): value is string => typeof value === "string" && HEX_COLOR_RE.test(value.trim());

/** `#rgb` / `#rrggbb` to channels, or null when it is not a colour this format allows. */
export const parseHexColor = (value: string): Rgb | null => {
  const hex = value.trim();
  if (!HEX_COLOR_RE.test(hex)) return null;
  const body = hex.slice(1);
  const full = body.length === SHORT_FORM_LENGTH ? [...body].map((digit) => digit + digit).join("") : body;
  const channel = (index: number): number => parseInt(full.slice(index, index + CHANNEL_DIGITS), HEX_RADIX);
  return [channel(0), channel(2), channel(4)];
};

/** `#rgb` widened to `#rrggbb`, lowercased. Two spellings of one colour compare equal after this. */
export const normalizeHexColor = (value: string): string | null => {
  const rgb = parseHexColor(value);
  return rgb === null ? null : `#${rgb.map((channel) => channel.toString(HEX_RADIX).padStart(CHANNEL_DIGITS, "0")).join("")}`;
};
