import test from "node:test";
import assert from "node:assert/strict";
import { validateRepoJson } from "./schemaValidator.js";

// The schema is advisory — the specification requires a consumer to IGNORE an invalid value rather
// than reject the document (section 11.2) — so what these tests pin is that it FLAGS what the
// specification forbids a producer from writing, and stays quiet about everything else.
const accepts = (document: unknown, why: string): void => {
  assert.equal(validateRepoJson(document), true, `${why}: ${JSON.stringify(validateRepoJson.errors)}`);
};

const rejects = (document: unknown, why: string): void => {
  assert.equal(validateRepoJson(document), false, why);
};

test("the shapes the specification defines are accepted", () => {
  accepts({}, "an empty object is valid");
  accepts({ projects: "packages/*" }, "the string shorthand");
  accepts({ projects: ["packages/*", { path: "functions", name: "Cloud Functions" }] }, "a mixed array");
  accepts({ projects: [{ path: ".", color: "#1d4ed8", homepage: "https://example.com" }] }, "an entry is a document with a path");
  accepts({ projects: [{ path: "packages/*", color: "#1d4ed8" }] }, "a colour applies to every match, so a wildcard may carry one");
});

// Spec section 10.2 and 4.1: an unknown key is tomorrow's field or another tool's extension.
test("unknown keys are not the schema's business", () => {
  accepts({ futureField: { anything: true } }, "unknown top-level key");
  accepts({ color: { primary: "#1d4ed8", dark: { primary: "#0b1020" } } }, "color.dark is reserved, not wrong");
});

// Spec section 9.2: one entry standing for many directories cannot name them.
test("a wildcard entry may not carry identity fields", () => {
  rejects({ projects: [{ path: "packages/*", name: "everything" }] }, "name on a wildcard");
  rejects({ projects: [{ path: "packages/*", description: "all of them" }] }, "description on a wildcard");
  rejects({ projects: [{ path: "*", icon: "x.png" }] }, "icon on a wildcard");
});

// Spec section 9.1: nesting is the nested directory's own file, never inline.
test("an entry may not nest, and may not be pathless", () => {
  rejects({ projects: [{ path: "apps", projects: ["web"] }] }, "inline nesting");
  rejects({ projects: [{ name: "no path" }] }, "an entry without a path");
});

// Spec section 9.2: a unit of this repository is always a directory of it.
test("a project path is never remote and never absolute", () => {
  ["https://example.com/pkg", "data:text/plain,x", "/etc", "\\\\server\\share"].forEach((path) => {
    rejects({ projects: [{ path }] }, `project path ${path}`);
  });
});

// Spec section 8.1: #rgb and #rrggbb, and nothing else.
test("colours outside the allowed syntax are flagged", () => {
  rejects({ color: "rebeccapurple" }, "a named colour");
  rejects({ projects: [{ path: "a", color: "rgb(1,2,3)" }] }, "the same rule one level down");
});
