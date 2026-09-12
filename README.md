# `repo.json`

**An open metadata file with which a repository declares what it is and how it should look.**

A repository has no way to say _what it is and how it should be presented_. Tools that display
repositories — terminal grids, IDE tab colours, project switchers, dashboards, CI listings — each
invent their own file, or guess. `repo.json` is one small file, in one place, that any of them can
read.

```json
{
  "name": "diffusion-lab",
  "description": "Training and evaluation for latent diffusion models",
  "icon": "docs/logo.png",
  "color": "#0f766e"
}
```

Put it at the root of your repository, beside `README.md`. Every field is optional.

- 📄 **[Specification](spec/repo-json.md)** — the normative document ([web version](https://repos-json.github.io/repos-json/spec/))
- 🧩 **[JSON Schema](schema/repo.schema.json)** — for editor completion and CI linting
- 🗂️ **[Examples](examples/)** — minimal, ML, monorepo, web, and every field at once
- 🛠️ **[Reference implementation](src/)** — TypeScript, no filesystem access, one test per normative rule

## Why not an existing file

|                                                      | Why it doesn't cover this                                                                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web App Manifest**                                 | Only web apps have one — 3% of repositories on the machine this was measured on. It describes the deployed app, and resolves icons against the _web root_, not the checkout. |
| **`package.json` / `Cargo.toml` / `pyproject.toml`** | One per ecosystem. A monorepo has five and none of them is "the repository".                                                                                                 |
| **`codemeta.json` / `CITATION.cff`**                 | Built for academic citation: JSON-LD and authorship, nothing about presentation.                                                                                             |
| **A forge's description and topics**                 | Lives on the forge, not in the clone. Invisible offline, and to every tool that isn't that forge.                                                                            |

Of 157 git repositories on one developer's machine, 5 had a web app manifest and 26 had a favicon of
any kind — all of them web projects. The remaining 131, the ML repos and CLIs and libraries and
monorepos, had nowhere to put this. They are what the format is for.

## Using it

Add `$schema` and your editor will complete the fields for you:

```json
{
  "$schema": "https://repos-json.github.io/repos-json/schema/repo.schema.json",
  "name": "acme platform",
  "icon": [
    { "src": "brand/mark.svg", "sizes": "any" },
    { "src": "brand/mark-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "color": { "primary": "#1d4ed8", "accent": "#f59e0b", "background": "#0b1020" }
}
```

The shorthand rule is worth knowing: **where a field has an obvious primary value, the scalar form is
the fullest form's shorthand.** `"icon": "x.png"` means `[{ "src": "x.png" }]`, and
`"color": "#1d4ed8"` means `{ "primary": "#1d4ed8" }`.

Three rules decide whether two tools show your repository the same way, and they are the reason this
is a specification rather than a convention:

1. **Relative paths resolve against `repo.json`** — not against a web root, and never outside the repository.
2. **Icons are ranked** vector first, then largest, then author order — and a consumer takes the first that _resolves_.
3. **Text colour is derived, never declared**, by WCAG relative luminance. A declared one is an unreadable one, sooner or later.

## Monorepos

A repository is not always one unit. `projects` names the units it contains, so a tool no longer has
to guess where they are:

```json
{
  "name": "acme platform",
  "color": "#1d4ed8",
  "projects": ["packages/*"]
}
```

An entry is a `repo.json` document with a `path`, so a unit can carry its own name, icon and colour —
inline, or in its own `repo.json` one directory down. Projects **may nest**: a root that is itself a
unit with `functions/` inside it is written `[".", "functions"]`, and a consumer computing what
belongs to `.` must exclude `functions/`. Skipping that is how a type check reports zero errors
having never looked at 93 files ([§9](https://repos-json.github.io/repos-json/spec/#9-projects)).

## For implementers

```bash
yarn install
yarn test        # node:test via tsx — one test per normative rule
yarn typecheck
yarn lint
yarn build
```

The reference implementation touches no filesystem: `selectIcon` takes a predicate for _does this
resolve_, so the policy for reading files, fetching URLs and following symlinks stays with the
consumer, where the specification puts it.

```ts
import { parseRepoJson, selectIcon, classifyIconSource, readableTextColorFor, resolveProjects } from "repo-json";

const meta = parseRepoJson(JSON.parse(await readFile("repo.json", "utf8")));
meta.dropped.forEach(({ field, reason }) => console.warn(`repo.json: ignored ${field} — ${reason}`));

const icon = selectIcon(meta.icons, (candidate) => canRead(classifyIconSource(candidate.src)));
const ink = meta.colors.primary === null ? null : readableTextColorFor(meta.colors.primary);

// Wildcards expand against a directory lister you supply — the library never reads a directory.
const { projects } = resolveProjects(meta, (dir) =>
  readdirSync(join(repo, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);
```

## Status

**Version 0.1, draft.** Stable enough to implement; fields may be added before v1, and nothing will be
removed without a version bump. The format was designed and first implemented in
[MulmoTerminal](https://github.com/receptron/mulmoterminal)
([discussion](https://github.com/receptron/mulmoterminal/issues/1438)) and moved here so that it
belongs to no single tool.

Open questions — `color.dark`, extension-name ownership, forge rendering, localisation — are listed
at the end of the [specification](spec/repo-json.md#14-open-questions). Comments and second
implementations are both welcome in [issues](https://github.com/repos-json/repos-json/issues).

> The file is `repo.json`, singular — one repository describing itself. The organisation is
> `repos-json`, plural, because it is the home for the format rather than for one repository.

## License

MIT — see [LICENSE](LICENSE).
