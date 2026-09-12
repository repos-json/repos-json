import test from "node:test";
import assert from "node:assert/strict";
import { parseRepoJson } from "../src/parse.js";
import { classifyProjectPath } from "../src/paths.js";
import { compareByCodeUnit, expandProjects, nestedProjectPaths, resolveProjects } from "../src/projects.js";
import type { RepoProject } from "../src/types.js";

const paths = (projects: { path: string }[]): string[] => projects.map((project) => project.path);

// What a consumer's directory lister returns: DIRECTORY names only, which is the consumer's side of
// "a consumer MUST match directories only" (spec section 9.2) and the contract `listDirectories` states.
const tree: Record<string, string[]> = {
  "": ["packages", "functions", "node_modules", ".github"],
  packages: ["web", "api", "Zed", ".cache", "node_modules"],
  functions: ["src"],
  node_modules: ["left-pad"],
};
const listDirectories = (path: string): string[] => tree[path] ?? [];

// Spec section 9.1: the shorthand rule, applied to the field that needed it most.
test("a string, and a string entry, are shorthand for an entry with only a path", () => {
  assert.deepEqual(parseRepoJson({ projects: "packages/*" }).projects, [{ path: "packages/*", wildcard: true, meta: parseRepoJson({}) }]);
  const fromArray = parseRepoJson({ projects: ["functions"] }).projects;
  assert.equal(fromArray[0]?.path, "functions");
  assert.equal(fromArray[0]?.wildcard, false);
});

// Spec section 9.1: an entry IS a repo.json document with a path.
test("an entry carries every field the document carries", () => {
  const [project] = parseRepoJson({
    projects: [{ path: "functions", name: "Cloud Functions", color: "#0f766e", homepage: "https://example.com", extensions: { mine: { a: 1 } } }],
  }).projects;
  assert.equal(project?.meta.name, "Cloud Functions");
  assert.equal(project?.meta.colors.primary, "#0f766e");
  assert.equal(project?.meta.homepage, "https://example.com");
  assert.deepEqual(project?.meta.extensions, { mine: { a: 1 } });
});

test("an entry may not nest inline, and says so", () => {
  const meta = parseRepoJson({ projects: [{ path: "apps", projects: ["web"] }] });
  assert.deepEqual(meta.projects[0]?.meta.projects, []);
  assert.deepEqual(meta.dropped, [{ field: "projects[0].projects", reason: "a project entry may not carry projects" }]);
});

test("a nested entry's diagnostics are addressable", () => {
  const meta = parseRepoJson({ projects: [{ path: "a", color: "rebeccapurple" }] });
  assert.deepEqual(meta.dropped, [{ field: "projects[0].color", reason: "not #rgb or #rrggbb" }]);
  assert.deepEqual(meta.projects[0]?.meta.dropped, [], "one document, one place to look");
});

test("an entry without a usable path is ignored and reported", () => {
  const meta = parseRepoJson({ projects: [{ name: "no path" }, 42, { path: "kept" }] });
  assert.deepEqual(paths(meta.projects), ["kept"]);
  assert.deepEqual(
    meta.dropped.map((entry) => entry.field),
    ["projects[0].path", "projects[1]"],
  );
});

// Spec section 9.2: a project path is a directory of this repository, and nothing else.
test("a project path is never remote, absolute, or outside the repository", () => {
  ["https://example.com/pkg", "data:text/plain,x", "/etc", "C:/tmp", "../sibling", "a/../../etc"].forEach((path) => {
    assert.equal(classifyProjectPath(path).kind, "rejected", path);
  });
});

test("the repository root is a project path", () => {
  assert.deepEqual(classifyProjectPath("."), { kind: "path", path: "", wildcard: false });
  assert.deepEqual(parseRepoJson({ projects: ["."] }).projects[0]?.path, "");
});

// Spec section 9.2: only a whole `*` segment; no glob dialect is guessed at.
test("undefined wildcard syntax is ignored and reported", () => {
  ["packages/**", "packages/pkg-*", "**/lib", "*.json"].forEach((path) => {
    assert.equal(classifyProjectPath(path).kind, "rejected", path);
  });
  assert.deepEqual(classifyProjectPath("apps/*/web"), { kind: "path", path: "apps/*/web", wildcard: true });
});

test("a wildcard entry cannot name a directory, and loses the attempt", () => {
  const meta = parseRepoJson({ projects: [{ path: "packages/*", name: "everything", icon: "x.png", color: "#1d4ed8" }] });
  const [project] = meta.projects;
  assert.equal(project?.meta.name, null);
  assert.deepEqual(project?.meta.icons, []);
  assert.equal(project?.meta.colors.primary, "#1d4ed8", "a colour applies to all of them; a name cannot");
  assert.deepEqual(
    meta.dropped.map((entry) => entry.field),
    ["projects[0].name", "projects[0].icon"],
  );
});

// Spec section 9.3, rule 1: declaration order, each wildcard's matches by code unit.
test("wildcards expand in code-unit order, inside the order the author wrote", () => {
  const declared = parseRepoJson({ projects: ["functions", "packages/*"] }).projects;
  const { projects } = expandProjects(declared, listDirectories);
  assert.deepEqual(paths(projects), ["functions", "packages/Zed", "packages/api", "packages/web"]);
});

test("code-unit order is not locale order", () => {
  const sorted = ["web", "Zed", "api"].sort(compareByCodeUnit);
  assert.deepEqual(sorted, ["Zed", "api", "web"]);
});

// Spec section 9.2: what a `*` must not match.
test("a wildcard skips dot directories and vendored ones", () => {
  const { projects } = expandProjects(parseRepoJson({ projects: ["*"] }).projects, listDirectories);
  assert.deepEqual(paths(projects), ["functions", "packages"]);
});

test("a segment the author wrote out is matched even when a wildcard would skip it", () => {
  const declared = parseRepoJson({ projects: ["node_modules/*"] }).projects;
  assert.deepEqual(paths(expandProjects(declared, listDirectories).projects), ["node_modules/left-pad"]);
});

// Spec section 9.3, rule 2: one directory is one project; the first entry naming it wins.
test("a duplicate directory is one project, named by the first entry", () => {
  const declared = parseRepoJson({ projects: [{ path: "packages/web", name: "Web" }, "packages/*"] }).projects;
  const { projects, dropped } = expandProjects(declared, listDirectories);
  assert.deepEqual(paths(projects), ["packages/web", "packages/Zed", "packages/api"]);
  assert.equal(projects[0]?.meta.name, "Web");
  assert.deepEqual(dropped, [{ field: "projects[1].path", reason: "already a project: packages/web" }]);
});

// Spec section 9.3, rule 3: absent means one project at the root, never "unknown".
test("a file that names no projects has one", () => {
  const meta = parseRepoJson({ name: "solo" });
  const { projects } = resolveProjects(meta, listDirectories);
  assert.deepEqual(paths(projects), [""]);
  assert.equal(projects[0]?.meta.name, "solo");
});

// Spec section 9.3, rule 4: measuring zero units and declaring success is the failure nobody sees.
test("a wildcard that matches nothing is reported", () => {
  const declared = parseRepoJson({ projects: ["apps/*"] }).projects;
  const { projects, dropped } = expandProjects(declared, listDirectories);
  assert.deepEqual(projects, []);
  assert.deepEqual(dropped, [{ field: "projects[0].path", reason: "matched no directory: apps/*" }]);
});

// Spec section 9.4: projects nest, and an extent that ignores that counts a directory twice.
test("nested projects are what an extent must exclude", () => {
  const all = ["", "functions", "packages/web"];
  assert.deepEqual(nestedProjectPaths("", all), ["functions", "packages/web"]);
  assert.deepEqual(nestedProjectPaths("functions", all), []);
  assert.deepEqual(nestedProjectPaths("packages", ["packages", "packages/web", "packages-old/x"]), ["packages/web"]);
});

test("a sibling whose name merely starts the same is not nested", () => {
  assert.deepEqual(nestedProjectPaths("app", ["app", "apple", "app/web"]), ["app/web"]);
});

test("declared projects keep the order and the metadata through resolution", () => {
  const declared: RepoProject[] = parseRepoJson({
    projects: [
      { path: ".", name: "web app" },
      { path: "functions", name: "cloud functions" },
    ],
  }).projects;
  const { projects, dropped } = expandProjects(declared, listDirectories);
  assert.deepEqual(paths(projects), ["", "functions"]);
  assert.deepEqual(
    projects.map((project) => project.meta.name),
    ["web app", "cloud functions"],
  );
  assert.deepEqual(dropped, []);
});
