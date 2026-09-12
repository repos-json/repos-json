# feat: `projects` — let a repository say which directories it contains

Issue: repos-json/repos-json#4

## Why

§3.1 already lets a consumer read a `repo.json` in a subdirectory. Nothing tells it which
subdirectories those are, so the permission is unreachable without guessing — which is what this
format exists to stop. `examples/monorepo.json` is named for a monorepo and is structurally identical
to `web-project.json`, which is the same gap in sample form.

## Decisions (issue #4, confirmed with the author)

- **In v0.** `projects` carries no dependency graph, build order or task definitions, so §1.3's
  exclusion does not reach it. Version moves to 0.1 (draft).
- **Rule 5 is a conditional MUST**: every consumer MUST NOT assume projects are disjoint; a consumer
  _that computes an extent_ MUST exclude nested project directories. A blanket MUST would bind a
  dashboard that computes no extent; a SHOULD would leave the measurement failure conforming.
- **An entry is a `repo.json` document with a `path`** — every field except `projects`. One sentence
  instead of an exclusion list, and one code path in the parser.
- **Two samples**: `monorepo.json` gains the field, and a new file carries the nested case.

## Gaps found in review, settled here

1. **The repository root.** `containedPath(".")` returned null, which is right for `icon.src` (an
   icon must name a file) and wrong for `projects[].path` (`.` is how a root unit is named). The
   normalised root is now the empty path; `icon.src` rejects it, `projects[].path` accepts it.
2. **A directory named twice.** `["packages/*", "packages/web"]` is writable and had no meaning.
   One directory is one project; the first entry naming it wins, later ones are reported.
3. **"Lexicographic" was undefined.** `localeCompare` and `<` disagree on the paths a monorepo
   actually has, so the order is now normatively by UTF-16 code unit.
4. **Wildcard syntax pinned.** A segment that is exactly `*`; `**` and partial-segment `*` are
   undefined in this version and the entry is ignored and reported, rather than guessed at.
5. **The vendored-directory clause became a SHOULD** with a named list. "Whatever its ecosystem
   vendors" cannot be tested, and an untestable MUST is decoration.

## Structure

A new normative section §9 _Projects_ between colours and precedence, which renumbers the tail
(9→10 … 14→15). The Changelog carries the map because issue #4 cites sections by number.

## Verification

- `yarn lint` / `typecheck` / `test` / `build`, and CI on three platforms.
- Every internal `(#anchor)` in the spec checked against the headings the site actually generates,
  by script, since the renumbering touches ~30 cross-references.
- The Jekyll site rebuilt and the built page read — a Jekyll build reports success for a page that
  renders wrong, as PR #3 established.
