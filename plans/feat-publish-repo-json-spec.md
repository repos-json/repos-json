# feat: publish `repo.json` v0 as a vendor-neutral RFC

Issue: repos-json/repos-json#1

## Why

`repo.json` v0 exists as a draft inside one application's repository
(`receptron/mulmoterminal:docs/repo-json.md`, discussion receptron/mulmoterminal#1438). A format whose
whole claim is "every tool reads this one file" cannot live inside one of those tools. This repository
is the vendor-neutral home: the normative text, a schema, examples, and a reference implementation
that a second implementer can check themselves against.

## What ships

| Path                            | Content                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `spec/repo-json.md`             | The RFC. Normative, RFC 2119 keywords, with the algorithms written out.                          |
| `schema/repo.schema.json`       | JSON Schema 2020-12. Advisory — the spec tolerates what the schema flags.                        |
| `examples/*.json`               | Minimal, ML, monorepo, web, and a full document.                                                 |
| `src/*.ts`                      | Reference implementation: normalization, icon ranking, path containment, WCAG text colour.       |
| `test/test_*.ts`                | `node:test` via tsx. Every normative rule has a test; examples are validated against the schema. |
| `.github/workflows/node.js.yml` | lint / typecheck / test / build on linux + mac + windows.                                        |
| `.github/workflows/pages.yml`   | Jekyll build of the spec to GitHub Pages.                                                        |
| `repo.json`                     | This repository describing itself.                                                               |

## Decisions

- **The RFC is a rewrite of the draft's structure, not of its content.** The measured motivation, the
  prior-art table and the reasoning behind each rule carry over; what changes is that every rule is
  restated with a normative keyword and an algorithm a second implementer can follow.
- **The reference implementation touches no filesystem.** Icon selection takes a caller-supplied
  `resolves` predicate, so the library stays pure and testable and the fs policy stays with the
  consumer. Path _containment_ is decided lexically here, because it is a rule of the format.
- **The seven-role palette derivation stays out.** It is one consumer's chrome, measured against one
  author's palettes; the spec references it as informative rather than standardising it.
- **The schema is advisory.** The spec requires a consumer to ignore an invalid value, not to reject
  the document, so a schema failure is a lint result and never a parse result. Stated in both files.
- **Jekyll builds from the repository root**, so the site serves `spec/repo-json.md` itself rather
  than a copy. Duplicating the normative text into `docs/` would guarantee the two drift.

## Verification

- `yarn lint` / `yarn typecheck` / `yarn test` / `yarn build` locally, then CI as the ground truth
  (the machine carried a load average over 100 while this was written).
- The examples are parsed by the reference implementation _and_ validated against the schema in the
  test run, so a sample that contradicts either one fails the build.

## Out of scope (recorded, not done)

- npm publish of the reference implementation (`repo-json` is free on the registry).
- Submitting the schema to SchemaStore.
- Updating `receptron/mulmoterminal:docs/repo-json.md` to point here — a change to another repository,
  and its own PR.
