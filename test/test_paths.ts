import test from "node:test";
import assert from "node:assert/strict";
import { classifyIconSource, containedPath } from "../src/paths.js";

// Spec section 6, step 1 and 2: http(s) is remote, data: is inline.
test("http(s) and data URLs are classified, not resolved", () => {
  assert.deepEqual(classifyIconSource("https://cdn.example/logo.png"), { kind: "remote", url: "https://cdn.example/logo.png" });
  assert.deepEqual(classifyIconSource("HTTP://cdn.example/logo.png"), { kind: "remote", url: "HTTP://cdn.example/logo.png" });
  assert.equal(classifyIconSource("data:image/png;base64,AAAA").kind, "inline");
});

// Spec section 6, step 3: every other scheme is rejected.
test("other URL schemes are rejected", () => {
  ["file:///etc/passwd", "javascript:alert(1)", "ftp://example.com/a.png"].forEach((src) => {
    assert.equal(classifyIconSource(src).kind, "rejected", src);
  });
});

// Spec section 6, step 4: an absolute path is not a repository-relative path.
test("absolute paths are rejected on both platforms", () => {
  ["/etc/passwd", "C:/Windows/system32", "c:\\Windows", "\\\\server\\share\\logo.png"].forEach((src) => {
    assert.equal(classifyIconSource(src).kind, "rejected", src);
  });
});

// Spec section 6 and 11: containment is applied to the NORMALISED path. The string as written
// passes any check that only looks at how it starts.
test("a path that escapes the repository is rejected however it is spelled", () => {
  ["../../etc/passwd", "assets/../../etc/passwd", "..", "./../x", "a/b/../../../c"].forEach((src) => {
    assert.equal(classifyIconSource(src).kind, "rejected", src);
  });
});

test("a contained path comes back normalised, with forward slashes", () => {
  assert.deepEqual(classifyIconSource("./assets//logo.svg"), { kind: "path", path: "assets/logo.svg" });
  assert.deepEqual(classifyIconSource("brand\\mark.png"), { kind: "path", path: "brand/mark.png" });
  assert.deepEqual(classifyIconSource("assets/tmp/../logo.svg"), { kind: "path", path: "assets/logo.svg" });
});

test("an empty or all-dots path names nothing", () => {
  assert.equal(classifyIconSource("   ").kind, "rejected");
  assert.equal(containedPath("."), null);
  assert.equal(containedPath("./"), null);
});

test("containment returns the repository-relative path, never an absolute one", () => {
  assert.equal(containedPath("docs/logo.png"), "docs/logo.png");
  assert.equal(containedPath("a/./b/../c"), "a/c");
});
