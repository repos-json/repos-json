import test from "node:test";
import assert from "node:assert/strict";
import { AA_CONTRAST, BLACK, WHITE, contrastRatio, readableTextColor, readableTextColorFor, relativeLuminance } from "../src/contrast.js";
import { parseHexColor, type Rgb } from "../src/hexColor.js";

const rgb = (hex: string): Rgb => {
  const parsed = parseHexColor(hex);
  assert.notEqual(parsed, null, hex);
  return parsed ?? [0, 0, 0];
};

// Spec section 8.2: the algorithm's anchors.
test("luminance runs from 0 at black to 1 at white", () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0);
  assert.equal(relativeLuminance([255, 255, 255]), 1);
  assert.equal(contrastRatio(0, 1), 21);
});

test("a light surface takes black and a dark one takes white", () => {
  assert.equal(readableTextColorFor("#ffffff"), BLACK);
  assert.equal(readableTextColorFor("#000000"), WHITE);
  assert.equal(readableTextColorFor("#0b1020"), WHITE);
});

// Spec section 8.2: the YIQ shortcut is forbidden, and this is the colour that shows why. It scores
// 149.685 against the usual threshold of 150, which hands a 1.37:1 pair to a reader.
test("#00ff00 takes black, which is what the forbidden shortcut gets wrong", () => {
  const green = rgb("#00ff00");
  assert.equal(readableTextColor(green), BLACK);

  const yiqBrightness = 0.299 * green[0] + 0.587 * green[1] + 0.114 * green[2];
  assert.ok(yiqBrightness < 150, `YIQ would pick white here: ${yiqBrightness}`);

  const surface = relativeLuminance(green);
  assert.ok(contrastRatio(surface, 0) > 15, "black on this green is comfortably readable");
  assert.ok(contrastRatio(surface, 1) < 1.5, "white on this green is not");
});

test("the chosen ink always clears AA on the extremes and the midpoint", () => {
  ["#ffffff", "#000000", "#767676", "#00ff00", "#7c3aed", "#be123c"].forEach((color) => {
    const surface = relativeLuminance(rgb(color));
    const ink = readableTextColorFor(color) === BLACK ? 0 : 1;
    assert.ok(contrastRatio(surface, ink) >= AA_CONTRAST, `${color} fell below AA`);
  });
});

// Spec section 8.2: on an exact tie, black — fixed so two implementations cannot differ.
test("a tie goes to black", () => {
  // The luminance where both inks are equally readable: (L + 0.05) / 0.05 === 1.05 / (L + 0.05).
  const TIE_LUMINANCE = Math.sqrt(1.05 * 0.05) - 0.05;
  assert.ok(Math.abs(contrastRatio(TIE_LUMINANCE, 0) - contrastRatio(TIE_LUMINANCE, 1)) < 1e-12);
  // The nearest grey a file can actually name sits just on the black side of it.
  assert.equal(readableTextColorFor("#767676"), BLACK);
});

test("a value that is not a colour has no readable ink", () => {
  assert.equal(readableTextColorFor("rebeccapurple"), null);
});
