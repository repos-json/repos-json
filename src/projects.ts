// Resolving `projects` (spec section 9): expanding wildcards, deduplicating, ordering, and the
// nesting rule that decides what belongs to which unit.
//
// No filesystem here either. `listDirectories` is the caller's, for the same reason `selectIcon`
// takes a predicate: this library decides what the file MEANS, and the consumer decides what it is
// willing to read. It is also why "this wildcard matched nothing" is reported from here rather than
// from the parser — a document alone cannot know.
import { ROOT_PATH } from "./paths.js";
import type { Diagnostic, RepoMeta, RepoProject } from "./types.js";

/** One directory, one unit — a project with its wildcards expanded. */
export interface ResolvedProject {
  path: string;
  meta: RepoMeta;
}

export interface ResolvedProjects {
  /** In display order: the order the entries were declared, each wildcard's matches by code unit. */
  projects: ResolvedProject[];
  dropped: Diagnostic[];
}

/** Directories a `*` should not match. The specification names these two and leaves the rest to the
 *  consumer's ecosystem, because "whatever that ecosystem vendors" is not something a test can check. */
export const VENDORED_DIRECTORIES = ["node_modules", "vendor"];

const WILDCARD = "*";

/** By UTF-16 code unit, never by locale: `localeCompare` disagrees with this on exactly the names a
 *  monorepo has — case, digits, accents — and two tools listing packages in two orders is the
 *  disagreement this format exists to prevent (spec section 9.3). */
export const compareByCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The projects of a document, with the specification's default applied: a file that names none has
 *  one project at the repository root. Absent never means unknown (spec section 9.3). */
export const resolveProjects = (meta: RepoMeta, listDirectories: (path: string) => string[]): ResolvedProjects =>
  meta.projects.length === 0 ? { projects: [{ path: ROOT_PATH, meta }], dropped: [] } : expandProjects(meta.projects, listDirectories);

/** Declared entries to directories. One directory is one project however many entries name it: the
 *  first to name it supplies its metadata and its position (spec section 9.3). */
export const expandProjects = (projects: RepoProject[], listDirectories: (path: string) => string[]): ResolvedProjects => {
  const dropped: Diagnostic[] = [];
  const byPath = new Map<string, ResolvedProject>();
  projects.forEach((project, index) => {
    const field = `projects[${index}].path`;
    const matches = project.wildcard ? expandWildcard(project.path, listDirectories) : [project.path];
    if (matches.length === 0) dropped.push({ field, reason: `matched no directory: ${project.path}` });
    matches.forEach((path) => {
      if (byPath.has(path)) {
        dropped.push({ field, reason: `already a project: ${displayPath(path)}` });
        return;
      }
      byPath.set(path, { path, meta: project.meta });
    });
  });
  return { projects: [...byPath.values()], dropped };
};

/** The projects nested inside this one — the directories a consumer computing an extent MUST
 *  exclude from it (spec section 9.4). Projects may nest, and assuming they do not is what makes a
 *  measurement count half a repository and report success. */
export const nestedProjectPaths = (path: string, all: string[]): string[] => all.filter((other) => isInside(path, other));

const isInside = (parent: string, child: string): boolean => child !== parent && (parent === ROOT_PATH || child.startsWith(`${parent}/`));

const displayPath = (path: string): string => (path === ROOT_PATH ? "." : path);

const expandWildcard = (path: string, listDirectories: (path: string) => string[]): string[] =>
  path.split("/").reduce<string[]>((prefixes, segment) => prefixes.flatMap((prefix) => childrenOf(prefix, segment, listDirectories)), [ROOT_PATH]);

// A literal segment is kept only when the listing shows it as a directory: once a path is being
// walked, "does it exist" is already answerable, and reporting a wildcard that matched nothing
// (section 9.3) depends on the answer.
const childrenOf = (prefix: string, segment: string, listDirectories: (path: string) => string[]): string[] => {
  const children = listDirectories(prefix);
  const matched = segment === WILDCARD ? children.filter(isMatchable).sort(compareByCodeUnit) : children.filter((child) => child === segment);
  return matched.map((child) => (prefix === ROOT_PATH ? child : `${prefix}/${child}`));
};

// The dot rule is the specification's MUST; the vendored list is its SHOULD. Both apply to what a
// `*` matches, never to a segment the author wrote out: `.github/*` names `.github` deliberately.
const isMatchable = (name: string): boolean => !name.startsWith(".") && !VENDORED_DIRECTORIES.includes(name);
