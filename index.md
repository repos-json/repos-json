---
title: Home
layout: default
nav_order: 1
permalink: /
description: repo.json — an open metadata file with which a repository declares what it is and how it should look. Name, description, icon and colours, with a namespace for tool-specific extensions.
---

# `repo.json`

**An open metadata file with which a repository declares what it is and how it should look.**

Tools that display repositories — terminal grids, IDE tab colours, project switchers, dashboards —
each invent their own file, or guess. This is one small file, at the root of the repository, that any
of them can read.

```json
{
  "name": "diffusion-lab",
  "description": "Training and evaluation for latent diffusion models",
  "icon": "docs/logo.png",
  "color": "#0f766e"
}
```

Every field is optional, and `{}` is valid.

- **[Specification](spec/)** — the normative document: fields, normalisation, path resolution, icon selection, colour rules, security considerations.
- **[Examples](examples/)** — one per shape a real repository takes.
- **[Schema](schema/repo.schema.json)** — add it as `$schema` and your editor completes the fields.
- **[Repository](https://github.com/repos-json/repos-json)** — reference implementation, tests, and the issue tracker.

## The three rules that matter

1. **Relative paths resolve against `repo.json`** — not against a web root, and never outside the
   repository. This is what makes the file work for the 84% of repositories that are not web
   projects.
2. **Icons are ranked and the first that _resolves_ wins** — vector, then largest, then author
   order. Without a stated rule, two tools show two different icons for the same repository.
3. **Text colour is derived, never declared** — by WCAG relative luminance, so that every conforming
   tool reaches the same readable answer on whatever surface it happens to be painting.

And one more, for repositories that hold several units: **`projects` names them**, so a monorepo can
say so and a tool no longer guesses where its packages are — including the case where the root is
itself a unit and another sits inside it.

## Status

Version 0, draft. Designed and first implemented in
[MulmoTerminal](https://github.com/receptron/mulmoterminal), then moved here so that it belongs to no
single tool. Second implementations, and arguments with the [open
questions](spec/#14-open-questions), are both welcome.
