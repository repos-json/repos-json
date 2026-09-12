---
title: Examples
nav_order: 3
permalink: /examples/
description: Sample repo.json documents, one per shape a real repository takes.
---

# Examples

Every file here is a valid `repo.json`. The test suite parses each one with the reference
implementation **and** validates it against [the schema](../schema/repo.schema.json), so a sample
that contradicts either one fails the build.

| File                                   | What it shows                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [`empty.json`](empty.json)             | `{}` is valid. Every field is optional, and a consumer must work with nothing.                                                       |
| [`minimal.json`](minimal.json)         | What most repositories will actually write: a name, a line, a colour.                                                                |
| [`ml-project.json`](ml-project.json)   | The case the format exists for — no web assets, no package registry, an icon that lives in `docs/`.                                  |
| [`monorepo.json`](monorepo.json)       | Several icon sizes, and all three colour roles. No single ecosystem manifest speaks for the whole tree.                              |
| [`web-project.json`](web-project.json) | A project whose favicon is already discoverable: `repo.json` adds only what the existing files cannot say, plus one tool's settings. |
| [`full.json`](full.json)               | Every field, including a remote icon and two `extensions` entries.                                                                   |

## Trying one

```bash
npx tsx -e "
  import { readFileSync } from 'node:fs';
  import { parseRepoJson } from './src/index.ts';
  console.dir(parseRepoJson(JSON.parse(readFileSync('examples/full.json', 'utf8'))), { depth: null });
"
```

The shorthand rules ([spec §5](https://repos-json.github.io/repos-json/spec/#5-normalisation)) mean
`minimal.json`'s `"color": "#0f766e"` comes back as `{ primary: "#0f766e", accent: null, background: null }`,
and a string `icon` comes back as a one-entry array — one shape downstream, whichever form the
author wrote.
