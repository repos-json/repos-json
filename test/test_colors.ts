import test from "node:test";
import assert from "node:assert/strict";
import { isHexColor, normalizeHexColor, parseHexColor } from "../src/hexColor.js";
import { parseRepoJson } from "../src/parse.js";

// Spec section 8.1: `#rgb` and `#rrggbb`, case-insensitive, and nothing else.
test("both allowed forms parse, and the short form doubles its digits", () => {
  assert.deepEqual(parseHexColor("#abc"), [0xaa, 0xbb, 0xcc]);
  assert.deepEqual(parseHexColor("#AABBCC"), [0xaa, 0xbb, 0xcc]);
  assert.equal(normalizeHexColor("#ABC"), "#aabbcc");
});

test("every other colour syntax is not a colour", () => {
  ["rebeccapurple", "rgb(1,2,3)", "hsl(0 0% 0%)", "#7c3aedff", "#12345", "7c3aed", ""].forEach((value) => {
    assert.equal(isHexColor(value), false, value);
    assert.equal(normalizeHexColor(value), null, value);
  });
});

// Spec section 8.1: a role that is invalid is a role that was not declared, so that an unusable
// value cannot suppress the consumer's fallback.
test("an invalid role reads as absent, and the valid roles survive", () => {
  const meta = parseRepoJson({ color: { primary: "#1d4ed8", accent: "not-a-colour", background: "#0b1020" } });
  assert.deepEqual(meta.colors, { primary: "#1d4ed8", accent: null, background: "#0b1020" });
  assert.deepEqual(meta.dropped, [{ field: "color.accent", reason: "not #rgb or #rrggbb" }]);
});

test("colours are normalised on the way in, so two spellings compare equal", () => {
  assert.equal(parseRepoJson({ color: "#ABC" }).colors.primary, parseRepoJson({ color: "#aabbcc" }).colors.primary);
});

// Spec section 8.4: `color.dark` is reserved, so a file that carries it must still parse cleanly.
test("a reserved role is neither used nor reported as broken", () => {
  const meta = parseRepoJson({ color: { primary: "#1d4ed8", dark: { primary: "#0b1020" } } });
  assert.equal(meta.colors.primary, "#1d4ed8");
  assert.deepEqual(meta.dropped, []);
});
