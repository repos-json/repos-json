import test from "node:test";
import assert from "node:assert/strict";
import { parseRepoJson } from "../src/parse.js";

// Spec section 5: the scalar form is shorthand for the fullest form, for BOTH fields that have one.
test("a string icon expands to a one-entry array", () => {
  assert.deepEqual(parseRepoJson({ icon: "assets/logo.svg" }).icons, [{ src: "assets/logo.svg" }]);
});

test("a string color expands to the primary role", () => {
  assert.deepEqual(parseRepoJson({ color: "#7c3aed" }).colors, { primary: "#7c3aed", accent: null, background: null });
});

// Spec section 4: every field is optional and an empty object is valid.
test("an empty object parses to nothing dropped", () => {
  const meta = parseRepoJson({});
  assert.deepEqual(meta.icons, []);
  assert.deepEqual(meta.colors, { primary: null, accent: null, background: null });
  assert.equal(meta.name, null);
  assert.deepEqual(meta.dropped, []);
});

test("a document that is not an object is reported, not thrown", () => {
  [null, [], "repo", 42].forEach((raw) => {
    const meta = parseRepoJson(raw);
    assert.equal(meta.name, null);
    assert.deepEqual(meta.dropped, [{ field: "", reason: "not a JSON object" }]);
  });
});

// Spec section 11.2: an invalid value is ignored, not fatal — the rest of the document stands.
test("one bad field does not drop the file", () => {
  const meta = parseRepoJson({ name: 42, description: "kept", color: "rebeccapurple" });
  assert.equal(meta.name, null);
  assert.equal(meta.description, "kept");
  assert.equal(meta.colors.primary, null);
  assert.deepEqual(
    meta.dropped.map((entry) => entry.field),
    ["name", "color"],
  );
});

// Spec section 4.1: a blank string is absent, and what is kept is trimmed.
test("blank strings are absent and kept strings are trimmed", () => {
  assert.equal(parseRepoJson({ name: "   " }).name, null);
  assert.equal(parseRepoJson({ name: "  spaced  " }).name, "spaced");
});

test("authors and keywords keep the string entries and report the rest", () => {
  const meta = parseRepoJson({ authors: ["Ada", 7, "Grace"], keywords: "not-an-array" });
  assert.deepEqual(meta.authors, ["Ada", "Grace"]);
  assert.deepEqual(meta.keywords, []);
  assert.deepEqual(
    meta.dropped.map((entry) => entry.field),
    ["authors[1]", "keywords"],
  );
});

// Spec section 4.6: an absolute http(s) URL, and nothing else, is a homepage.
test("homepage takes http(s) only", () => {
  assert.equal(parseRepoJson({ homepage: "https://example.com" }).homepage, "https://example.com");
  ["/docs", "ftp://example.com", "example.com"].forEach((homepage) => {
    assert.equal(parseRepoJson({ homepage }).homepage, null, homepage);
  });
});

// Spec section 4.7: entries are kept raw, and an entry that is not an object is ignored.
test("extensions are kept per tool, unvalidated", () => {
  const meta = parseRepoJson({ extensions: { mine: { theme: "midnight" }, broken: "nope" } });
  assert.deepEqual(meta.extensions, { mine: { theme: "midnight" } });
  assert.deepEqual(meta.dropped, [{ field: "extensions.broken", reason: "not an object" }]);
});

// Spec section 11.2: unknown keys are preserved, never an error. Preservation is the consumer's job
// when it rewrites, so what this library must guarantee is that it does not touch the document.
test("parsing leaves the document untouched, unknown keys included", () => {
  const raw = { name: "x", futureField: { keep: true }, extensions: { other: { a: 1 } } };
  const snapshot = JSON.stringify(raw);
  const meta = parseRepoJson(raw);
  assert.equal(JSON.stringify(raw), snapshot);
  assert.deepEqual(meta.dropped, []);
});
