import test from "node:test";
import assert from "node:assert/strict";
import { iconArea, rankIcons, selectIcon } from "../src/icons.js";
import { largestIconArea, VECTOR_AREA } from "../src/iconSizes.js";
import { parseRepoJson } from "../src/parse.js";
import type { RepoIcon } from "../src/types.js";

const srcs = (icons: RepoIcon[]): string[] => icons.map((icon) => icon.src);

// Spec section 7, rule 1: a vector outranks every pixel count.
test("a vector ranks above any raster", () => {
  const ranked = rankIcons([
    { src: "big.png", sizes: "4096x4096" },
    { src: "mark.svg", sizes: "any" },
  ]);
  assert.deepEqual(srcs(ranked), ["mark.svg", "big.png"]);
});

test("an svg is treated as a vector when sizes says nothing", () => {
  assert.equal(iconArea({ src: "mark.svg" }), VECTOR_AREA);
  assert.equal(iconArea({ src: "mark.png", type: "image/svg+xml" }), VECTOR_AREA);
  assert.equal(iconArea({ src: "mark.png" }), 0);
});

// Spec section 7, rule 2: largest declared area next, and an unstated size ranks last rather than
// being excluded.
test("larger declared sizes rank first and an unstated size ranks last", () => {
  const ranked = rankIcons([{ src: "unstated.png" }, { src: "small.png", sizes: "16x16" }, { src: "large.png", sizes: "32x32 512x512" }]);
  assert.deepEqual(srcs(ranked), ["large.png", "small.png", "unstated.png"]);
});

// Spec section 7, rule 3: author order breaks a tie — a property of the function, not of the engine.
test("a tie keeps the order the author wrote", () => {
  const ranked = rankIcons([
    { src: "first.png", sizes: "64x64" },
    { src: "second.png", sizes: "64x64" },
    { src: "third.png", sizes: "64x64" },
  ]);
  assert.deepEqual(srcs(ranked), ["first.png", "second.png", "third.png"]);
});

test("an unparseable sizes value is an unstated size, not a disqualification", () => {
  assert.equal(largestIconArea("huge"), 0);
  assert.equal(largestIconArea("16x16 nonsense 48x48"), 48 * 48);
  assert.equal(srcs(rankIcons([{ src: "odd.png", sizes: "huge" }])).length, 1);
});

// Spec section 7: take the first that RESOLVES, not the first that exists. An unusable
// high-priority entry must not bury the working ones behind it.
test("selection skips entries that do not resolve", () => {
  const icons: RepoIcon[] = [
    { src: "missing.svg", sizes: "any" },
    { src: "dead-512.png", sizes: "512x512" },
    { src: "works-64.png", sizes: "64x64" },
  ];
  const selected = selectIcon(icons, (icon) => icon.src.startsWith("works"));
  assert.equal(selected?.src, "works-64.png");
});

test("selection returns null when nothing resolves", () => {
  assert.equal(
    selectIcon([{ src: "a.png" }], () => false),
    null,
  );
});

// Spec section 4.4: an entry without a usable `src` is ignored; the remaining entries stand.
test("a malformed entry is ignored and the rest survive", () => {
  const meta = parseRepoJson({ icon: [{ sizes: "any" }, "not-an-object", { src: "good.png", sizes: "48x48" }] });
  assert.deepEqual(srcs(meta.icons), ["good.png"]);
  assert.deepEqual(
    meta.dropped.map((entry) => entry.field),
    ["icon[0].src", "icon[1]"],
  );
});

test("sizes and type are carried through only when stated", () => {
  const [withBoth, bare] = parseRepoJson({
    icon: [
      { src: "a.png", sizes: "48x48", type: "image/png" },
      { src: "b.png", sizes: 42 },
    ],
  }).icons;
  assert.deepEqual(withBoth, { src: "a.png", sizes: "48x48", type: "image/png" });
  assert.deepEqual(bare, { src: "b.png" });
});
