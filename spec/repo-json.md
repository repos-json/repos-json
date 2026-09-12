---
title: Specification
nav_order: 2
permalink: /spec/
description: The normative specification for repo.json — a small, language-agnostic file with which a repository declares what it is and how it should be presented.
---

# `repo.json` — an open repository metadata file

|                   |                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Version**       | 0.1 (draft)                                                                                                                                                         |
| **Status**        | Draft. Stable enough to implement; fields may be added before v1, and nothing here will be removed without a version bump.                                          |
| **This document** | <https://repos-json.github.io/repos-json/spec/>                                                                                                                     |
| **Repository**    | <https://github.com/repos-json/repos-json>                                                                                                                          |
| **Discussion**    | <https://github.com/repos-json/repos-json/issues> — the format originated in [receptron/mulmoterminal#1438](https://github.com/receptron/mulmoterminal/issues/1438) |
| **Schema**        | <https://repos-json.github.io/repos-json/schema/repo.schema.json>                                                                                                   |
| **License**       | MIT                                                                                                                                                                 |

## Abstract

A repository has no way to say **what it is and how it should look**. Tools that display
repositories — terminal grids, IDE tab colours, project switchers, dashboards, CI listings — each
invent their own file, or guess. `repo.json` is one small file, in one place, that any of them can
read: a display name, a one-line description, an icon, a brand colour, and a namespace in which each
tool may keep what only it understands.

This document specifies the file's location, its fields, and — the part that decides whether two
tools show the same repository the same way — the algorithms for normalising shorthand, resolving
paths, choosing among several icons, and deriving a readable text colour.

## 1. Introduction

### 1.1 The gap, measured

Scanning 157 git repositories on one developer's machine:

```
git repositories          157
with a web app manifest     5   (3%)
with any favicon at all    26   (16%)   — every one of them a web project
the rest                  131          — ML, CLI, libraries, monorepos, docs
```

Those 131 are what this format is for. A tool that wants to show a repository can only pick up web
projects automatically, and what a developer opens is not usually a web project.

### 1.2 Why the existing files do not cover it

It nearly does exist, four times over, and each one stops short.

|                                                      | Why it doesn't cover this                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web App Manifest** (`site.webmanifest`)            | Only web apps have one. It describes the **deployed app**, not the repository, and its icon paths resolve against the **web root** rather than the checkout.                                            |
| **`package.json` / `Cargo.toml` / `pyproject.toml`** | One per ecosystem. A monorepo has five and none of them is "the repository". A machine-learning repo may have `pyproject.toml`, but that describes a distributable, not the project you are looking at. |
| **`codemeta.json` / `CITATION.cff`**                 | Built for academic citation. JSON-LD and author metadata; nothing about presentation.                                                                                                                   |
| **A forge's own description and topics**             | Lives on the forge, not in the clone. Invisible offline, and to every tool that isn't that forge.                                                                                                       |

### 1.3 Scope and non-goals

In scope: identity (`name`, `description`), presentation (`icon`, `color`), a few links
(`homepage`, `authors`, `keywords`), and a namespace for tool-specific settings.

Out of scope for version 0, deliberately:

- **Build, dependency or packaging information.** The ecosystem manifests already carry it.
- **Citation and provenance metadata.** `CITATION.cff` and `codemeta.json` already carry it.
- **A design system.** Three colour roles, not a token set — see [§8](#8-colours).
- **A registry.** Extension names are claimed by convention, not by an authority — see [§4.7](#47-extensions).

## 2. Notational conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, **MAY** and
**OPTIONAL** in this document are to be interpreted as described in
[BCP 14](https://www.rfc-editor.org/info/bcp14) ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119),
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

Two roles are named throughout:

- A **producer** is whatever writes `repo.json` — usually a human, sometimes a scaffolding tool.
- A **consumer** is any tool that reads it.

Examples marked _informative_ carry no requirements. Everything else is normative.

## 3. The file

### 3.1 Location

The file is named `repo.json` and lives at the **root of the repository**, beside `README.md` and
`LICENSE`.

It is not a dotfile on purpose. This is declarative content **about the project**, like `README.md`,
`LICENSE` and `CITATION.cff` — not tool configuration like `.gitignore` or `.editorconfig`. It is
meant to be seen, and a specification nobody sees is a specification nobody adopts.

A consumer **MUST NOT** search parent directories for it: within a monorepo, a subdirectory without
its own `repo.json` has no `repo.json`. A consumer **MAY** read a `repo.json` in a subdirectory as
metadata for that subdirectory, and if it does, paths in that file resolve against **that**
directory ([§6](#6-path-resolution)).

### 3.2 Encoding and syntax

The file is UTF-8-encoded JSON as defined by [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259). The
top-level value **MUST** be an object. Comments are not part of JSON and **MUST NOT** appear;
samples in this document that use `//` are `jsonc` for explanation only.

A byte order mark **MAY** be present and, if present, **MUST** be ignored.

When a media type is needed, `application/json` applies.

A consumer that cannot parse the file — invalid JSON, a top-level array, an unreadable file —
**MUST** behave exactly as if no `repo.json` existed, and **SHOULD** report why
([§11.3](#113-diagnostics)).

## 4. Document model

**Every field is OPTIONAL.** A consumer **MUST** work with an empty object, and `{}` is a valid
`repo.json`.

```jsonc
{
  "name": "stable-diffusion-webui",
  "description": "Browser interface for Stable Diffusion",
  "icon": "assets/logo.svg",
  "color": "#7c3aed",
  "homepage": "https://example.com",
  "authors": ["Ada Lovelace <ada@example.com>"],
  "keywords": ["diffusion", "image-generation"],

  "extensions": {
    "mulmoterminal": { "theme": "midnight", "badgeColor": "#5b21b6" },
  },
}
```

| Field         | Type             | Meaning                                                                                        |
| ------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `name`        | string           | Display name. Not necessarily the directory or package name — this is what a human should see. |
| `description` | string           | One line. What the project is, not how to install it.                                          |
| `icon`        | string \| array  | The project's mark. See [§4.4](#44-icon).                                                      |
| `color`       | string \| object | Brand colour, or colours by role. See [§4.5](#45-color).                                       |
| `homepage`    | string           | An absolute `http` or `https` URL.                                                             |
| `authors`     | array of strings | Free-form; `Name <email>` is conventional but not required.                                    |
| `keywords`    | array of strings | For search and grouping.                                                                       |
| `extensions`  | object           | Tool-specific settings, keyed by tool name. See [§4.7](#47-extensions).                        |
| `projects`    | string \| array  | The units this repository contains. See [§9](#9-projects).                                     |
| `$schema`     | string           | Reserved for editor tooling. A consumer **MUST** ignore it.                                    |

### 4.1 Types and tolerance

A value of the wrong type is **ignored, never fatal** ([§11.2](#112-consumers)). A number where
`name` expects a string drops `name`; it does not drop the file.

A consumer **MUST** treat a string that is empty or contains only whitespace as absent, and
**SHOULD** trim leading and trailing whitespace from every string it keeps. Two files that differ
only in trailing spaces describe the same repository, and a consumer that renders one of them with a
stray space has made the file's formatting visible.

### 4.2 `name`

The name a human should see. A consumer **SHOULD** prefer it over the directory name and over any
ecosystem manifest's name ([§10](#10-precedence-among-sources)).

`name` is text. A consumer **MUST NOT** interpret it as markup, a path, or a format string
([§12](#12-security-considerations)).

### 4.3 `description`

One line. A consumer **MAY** truncate it for display, and **SHOULD** do so on a grapheme boundary
rather than mid-character.

### 4.4 `icon`

`icon` is a string, or an array of objects when a project has several sizes.

```jsonc
"icon": "assets/logo.svg"

"icon": [
  { "src": "assets/logo.svg", "sizes": "any" },
  { "src": "assets/logo-192.png", "sizes": "192x192", "type": "image/png" }
]
```

**The two forms are equivalent**: `"icon": "x.png"` means exactly `"icon": [{ "src": "x.png" }]`
([§5](#5-normalisation)).

| Member  |              |                                                                                                            |
| ------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `src`   | **REQUIRED** | A path relative to this file, or an absolute `http`, `https` or `data:` URL. See [§6](#6-path-resolution). |
| `sizes` | OPTIONAL     | Space-separated `<w>x<h>` in ASCII digits, or `any` for a vector.                                          |
| `type`  | OPTIONAL     | MIME type. A **hint** only: a wrong or absent `type` **MUST NOT** stop a usable icon from being used.      |

An array entry that is not an object, or whose `src` is absent or not a non-empty string, **MUST**
be ignored; the remaining entries stand.

`sizes` and `type` borrow their syntax from the Web App Manifest. Only the syntax: there is no
reason to invent a second spelling for something already implemented everywhere. A `sizes` value
that does not parse **MUST** be treated as _unstated_, which affects only ordering
([§7](#7-icon-selection)) and never eligibility.

### 4.5 `color`

```jsonc
"color": "#7c3aed"

"color": {
  "primary": "#7c3aed",     // the brand colour. If you set one thing, set this
  "accent": "#22d3ee",      // secondary, for highlights
  "background": "#0b1020"   // the surface the other two sit on
}
```

**The two forms are equivalent**: `"color": "#7c3aed"` means exactly `{ "primary": "#7c3aed" }`
([§5](#5-normalisation)).

Three roles, because one is too thin to render with and more than three is a design system rather
than an identity. The Web App Manifest already carries two (`theme_color`, `background_color`);
Material names three (primary, secondary, surface). All three are OPTIONAL, and a consumer **MUST**
be able to work from `primary` alone. Syntax and processing are specified in [§8](#8-colours).

### 4.6 `homepage`, `authors`, `keywords`

`homepage` **MUST** be an absolute URL with the `http` or `https` scheme; a consumer **MUST** ignore
any other scheme, and **MUST NOT** resolve a relative `homepage` against anything.

`authors` and `keywords` are arrays of strings. A consumer **MUST** ignore non-string entries and
keep the rest.

### 4.7 `extensions`

Tool-specific settings go under `extensions`, keyed by tool name:

```jsonc
"extensions": {
  "mulmoterminal": { "theme": "midnight", "badgeColor": "#5b21b6" },
  "some-other-tool": { "…": "…" }
}
```

Each value **MUST** be an object; a consumer **MUST** ignore an entry whose value is not one. The
contents of an entry are defined entirely by whoever owns the name — this document says nothing
about them.

- A consumer **MUST** ignore `extensions` entries it does not own.
- A consumer that rewrites the file **MUST** preserve entries it does not own, byte-equivalent in
  value. Dropping another tool's settings on save is the fastest way to make this format unusable.
- A producer **SHOULD** choose a name it demonstrably owns: a published package name, a forge
  organisation, or reverse DNS.

The noun is OpenAPI's — it calls `x-` entries **Specification Extensions** — while the shape is
devcontainer's: one reserved object with tools namespaced inside. `tools` was the obvious name and
is the wrong one: in a world of MCP and function calling, "tools" already means something else
entirely, and a reader would take it for a list of tools the repository _provides_.

`pyproject.toml` makes ownership a hard rule (you may use `[tool.$NAME]` only if you own `$NAME` on
PyPI). Here it is a convention, because there is no registry to check against — see
[§14](#14-open-questions).

## 5. Normalisation

> Where a field has an obvious primary value, the scalar form is shorthand for the fullest form.

One rule, stated once, covering every field that has a shorthand:

| Written                     | Means                                    |
| --------------------------- | ---------------------------------------- |
| `"icon": "x.png"`           | `"icon": [{ "src": "x.png" }]`           |
| `"color": "#7c3aed"`        | `"color": { "primary": "#7c3aed" }`      |
| `"projects": "packages/*"`  | `"projects": [{ "path": "packages/*" }]` |
| `"projects": ["functions"]` | `"projects": [{ "path": "functions" }]`  |

A consumer **SHOULD** normalise at the boundary — once, where the file is read — and work with the
expanded form everywhere after. The rule exists so that an implementation has a single code path
rather than a branch at every use, and so that two implementations cannot disagree about what the
shorthand meant.

## 6. Path resolution

**A relative path resolves against the directory holding `repo.json`.**

This is the single most important rule, and the one that separates this file from the formats it
resembles. A web app manifest resolves `/icon.png` against the _web root_, which in a typical Vite
or Next project means `public/`. A tool that carries that assumption over will find icons in web
projects and nowhere else — which is exactly the outcome this file exists to avoid.

Given a `src` (or any future path-valued field), a consumer **MUST** resolve it as follows:

1. If it matches an absolute URL with scheme `http` or `https`, it is a **remote** reference. A
   consumer **MAY** fetch it, and **MAY** decline to ([§12](#12-security-considerations)).
2. If it begins with `data:`, it is an **inline** reference, subject to the consumer's own size and
   media-type limits.
3. If it carries any other URL scheme — `file:`, `javascript:`, `ftp:` and the rest — the consumer
   **MUST** reject the entry.
4. Otherwise it is a **repository-relative path**. The consumer **MUST** reject it if it is
   absolute (`/etc/passwd`, `C:\Windows`, or a UNC path), and **MUST** reject it if resolving it
   against the repository root — after normalising `.` and `..` — lands outside that root.

**The repository root normalises to the empty path.** `.`, `./` and `a/..` all name the directory
holding `repo.json`. Whether that is usable depends on the field asking: `icon.src` **MUST** reject
it, because an icon has to name a file, while `projects[].path` **MUST** accept it, because the root
of a repository can itself be one of its units ([§9](#9-projects)).

A consumer **MUST NOT** follow a relative path outside the repository. `../../etc/passwd` is not a
mistake to tolerate quietly; it is a path the file was never entitled to name. A rejected entry is
skipped, and the remaining entries stand ([§7](#7-icon-selection)).

A path separator is `/`. A consumer on a platform whose native separator differs **MUST** accept
`/` and **SHOULD** accept the native one as well when reading; a producer **SHOULD** write `/`.

## 7. Icon selection

Without a stated rule, two tools show two different icons for the same repository. A consumer that
needs one icon **MUST** choose it as follows.

**Rank** the normalised entries:

1. **A vector first.** An entry whose `sizes` contains `any` outranks every pixel count. (An SVG
   `src` or `type` **SHOULD** be treated the same way.)
2. Then by **the largest area any of its `sizes` tokens declares** (`width × height`), descending. An
   entry whose `sizes` is absent or unparseable counts as area 0 — it is ranked last, not excluded.
3. On a tie, **the order the author wrote them**. Author order carries intent; a consumer **MUST**
   preserve it rather than rely on the sort being stable.

Then **take the first entry that resolves**, where "resolves" means the consumer can actually obtain
the image: the file exists and can be read, or the URL was fetched, or the `data:` payload decoded.
An entry that does not resolve **MUST** be skipped and the next one tried.

> Rule 4 is not theoretical. An implementation that stopped at the first entry that _existed_ let
> one unusable high-priority file bury every good one behind it. "Keep going until one **resolves**"
> is the rule; "until one exists" is the bug.

A consumer that needs a specific size **MAY** reorder by fitness for that size instead, but **MUST**
keep the "first that resolves" behaviour and **MUST NOT** upscale in preference to a larger source:
scaling down is clean, scaling up is not.

## 8. Colours

### 8.1 Syntax

A colour **MUST** be `#rgb` or `#rrggbb`, case-insensitive. `#rgb` expands by doubling each digit
(`#abc` → `#aabbcc`). Anything else — a named colour, `rgb()`, `hsl()`, an eight-digit hex with
alpha — **MUST** be ignored as an invalid value for that role.

Allowing the whole CSS colour syntax means implementations disagree about what a colour is, and a
file that renders in one conforming tool and not in another is the failure this document exists to
prevent.

A role whose value is invalid is **not declared**. A consumer **MUST** fall back exactly as if the
role had been absent, and **MUST NOT** let the presence of an unusable value suppress the fallback.

### 8.2 Text colour is derived, never declared

There is no `textColor`, and there **MUST NOT** be one. A consumer painting text on a colour from
this file **MUST** derive the foreground from the background it is actually painting on, using the
WCAG relative luminance:

1. For each channel, take `c / 255`, then gamma-decode:
   `c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`.
2. Luminance is `0.2126 R + 0.7152 G + 0.0722 B` over those linear values.
3. The contrast ratio between two luminances is `(lighter + 0.05) / (darker + 0.05)`.
4. Choose whichever of black or white has the higher ratio against the background. On an exact tie,
   choose black.

Declared text colours produce unreadable combinations, because the author cannot know what surface a
given tool will paint on. Deriving it also makes every conforming tool reach the same answer.

The common shortcut — YIQ perceived brightness (`0.299 R + 0.587 G + 0.114 B` on raw channel values,
against a threshold) — **MUST NOT** be used. Measured over a 32,768-point sample of the colour
space it picks the worse of black and white for **29.7%** of colours, and 28.7% of its picks fall
below the WCAG AA 4.5:1 minimum for normal text. A vivid green (`#00ff00`) is the visible case: it
scores 149.685 against the usual threshold of 150, so it takes white text at a ratio of 1.37:1 —
effectively unreadable — where black would have given 15.3:1.

A consumer **MAY** substitute a softened near-black for pure black, and **SHOULD** fall back to pure
black when the softened ink would drop the pair below 4.5:1.

### 8.3 Deriving further roles (informative)

A consumer that needs more colours than three **SHOULD** derive them from `primary` rather than ask
the author for more.

This is not a hope. MulmoTerminal paints seven roles per repository, and deriving all seven from
`primary` alone reproduces eleven hand-tuned palettes to a **median ΔE76 of 1.9, worst case 2.5** —
the median below 2.3, the threshold at which a difference becomes noticeable at all. One derived
value came out byte-identical to the hand-picked one.

What the measurement also showed is that a single rule does not fit every role. Snapping every role
to a fixed saturation and lightness drifts by ΔE 20 at the dark end of the hue wheel; making every
role a fixed offset from `primary` drifts by ΔE 15 at the pale end. The roles differ in kind: a
**badge** sits relative to the brand colour, while **surfaces** sit at absolute lightness whatever
the brand colour is. A consumer deriving a palette should expect to do both.

An achromatic `primary` (saturation 0) has no hue to move. A consumer **SHOULD** keep derived roles
achromatic in that case rather than tinting them, since an achromatic colour reports hue 0 and
tinting by it turns every derived role red.

### 8.4 Light and dark

Version 0 defines **one** set of colours and expects consumers to adapt: derive the foreground as in
[§8.2](#82-text-colour-is-derived-never-declared), and adjust surfaces to the theme in force.

`color.dark` is **reserved** for a future version. It is left out of v0 because most of what it
would buy is already covered by deriving contrast, and a field that authors fill in inconsistently
is worse than no field.

## 9. Projects

A repository is not always one unit. A monorepo holds packages; an application repository holds the
app and its functions; a mixed-ecosystem repository holds a Python service beside a TypeScript front
end. [§3.1](#31-location) already lets a consumer read a `repo.json` in a subdirectory — but nothing
tells it which subdirectories to look in, which leaves that permission unreachable without guessing,
and guessing is what this format exists to stop.

`projects` names them.

```jsonc
"projects": ["packages/*"]
```

```jsonc
"projects": [
  { "path": ".", "name": "web", "color": "#1d4ed8" },
  { "path": "functions", "name": "Firebase Functions", "icon": "brand/fn.svg" },
  { "path": "packages/*" }
]
```

The field says **what units exist and what each one is**. It carries no dependency graph, no build
order and no task definitions — a consumer cannot build anything from it — so it stays on the
identity side of [§1.3](#13-scope-and-non-goals), and the ecosystem manifests keep everything they
carry today.

### 9.1 The field

`projects` **MUST** be a string, or an array whose entries are strings or objects. The shorthand rule
of [§5](#5-normalisation) applies: a string is shorthand for a one-entry array, and a string entry is
shorthand for an object carrying only `path`.

**An entry is a `repo.json` document with a `path`.** Every field of [§4](#4-document-model) may
appear in one and means there exactly what it means at the top level, one directory down — a
dashboard showing five packages wants five names and five marks, not one repeated five times.

- `path` is **REQUIRED**. An entry without a usable one **MUST** be ignored and reported
  ([§11.3](#113-diagnostics)).
- An entry **MUST NOT** carry `projects`, and a consumer **MUST** ignore it if present. Nesting is
  expressed by the nested directory's own `repo.json` ([§3.1](#31-location)), which keeps a document
  finite and stops one file from describing a tree it cannot see.

### 9.2 Paths and wildcards

A `path` resolves by [§6](#6-path-resolution), with two differences that follow from naming a
directory rather than a file:

- A project path is **never remote and never inline**. A `path` carrying any URL scheme — `https:`
  and `data:` included — **MUST** be rejected.
- The **repository root is a valid project path**: `.` names the directory holding `repo.json`, and
  is how a repository says its own root is one of its units.

A path segment that is exactly `*` is a **wildcard**, matching one directory name:

- A consumer **MUST** match directories only. `packages/README.md` is not a project.
- A consumer **MUST NOT** match a name beginning with `.`, and **SHOULD NOT** match `node_modules`,
  `vendor`, or a directory its ecosystem treats as vendored. Nothing good comes of a switcher
  listing nine hundred projects.
- `*` anywhere else within a segment, and `**` in any position, are **not defined by this version**.
  A consumer **MUST** ignore such an entry and report it rather than guess at a glob dialect.
- An entry whose `path` contains a wildcard **MUST NOT** carry the identity fields `name`,
  `description` or `icon`: one entry standing for many directories cannot name them. A consumer
  **MUST** ignore those fields, keep the path, and report what it dropped.

### 9.3 Resolving the set

1. **Expand wildcards** in the declaration order of the entries, each wildcard's matches sorted **by
   UTF-16 code unit** — not by locale. `localeCompare` and a plain comparison disagree on exactly the
   names a monorepo has (case, digits, accents), and two tools listing the same packages in two
   orders is the disagreement this document exists to prevent.
2. **Deduplicate: one directory is one project**, however many entries name it. The **first** entry
   naming a directory supplies its metadata and its position; any later entry naming the same
   directory **MUST** be ignored and **SHOULD** be reported. To give one directory of a wildcard a
   name of its own, name it **before** the wildcard.
3. **Absent means one project.** `projects` absent **MUST** mean a single project rooted at the
   directory holding `repo.json`. It never means "unknown", so a consumer has one code path whether
   or not the repository turns out to be a monorepo.
4. **Report what matched nothing.** A wildcard that matches no directory **SHOULD** be reported
   ([§11.3](#113-diagnostics)). Measuring zero units and declaring success is the one outcome nobody
   notices is wrong. A consumer that cannot list directories cannot honour this; one that can
   **SHOULD**.

Declaration order is significant: it is the order a consumer **SHOULD** display the projects in,
because the order an author wrote them in is information.

### 9.4 Extent and nesting

Projects **MAY** nest, and a consumer **MUST NOT** assume they are disjoint.

A consumer that computes a project's **extent** — the files it treats as belonging to that project —
**MUST** exclude the directories of any nested projects.

```jsonc
"projects": [".", "functions"]
```

This is the shape that breaks a naive consumer, and what it costs is measurable. In one repository of
exactly this layout the application is rooted at the repository root — its `package.json`,
`tsconfig.json` and lockfile all sit there — while `functions/` carries its own three. Measured as if
`.` were the whole tree: `tsc` reported zero type errors having never looked at `functions/`'s 93
TypeScript files, because the root `tsconfig.json` includes only `src/**`; `npm audit` read the root
lockfile and reported 3 high advisories, while `functions/yarn.lock` held 4 more high and 19 moderate
that nothing ever saw. The denominator was the whole repository and the numerator was half of it.

A consumer that only displays projects computes no extent, and this rule does not reach it. It is
written for the consumers that measure, lint, audit or package them.

## 10. Precedence among sources

A repository can carry several sources of the same fact. Tools that disagree about which to read
show the same repository differently, so the order is part of this specification:

1. **`repo.json`** — written for this purpose; it wins.
2. **The ecosystem manifest** — `package.json`, `Cargo.toml`, `pyproject.toml`, a web app manifest.
   Useful for `name` and `description`, which they already carry.
3. **Convention** — `public/favicon.svg`, `apple-touch-icon.png`, and friends, for an icon.

This applies **per field, not per file**: a `repo.json` that sets only `icon` leaves `name` to be
found at step 2. A consumer **MUST NOT** treat the presence of `repo.json` as suppressing the lower
sources for fields the file does not set.

A consumer's own per-repository configuration, if it has one, sits **above** all three: `repo.json`
is what a repository says to every tool, not an override of what a user told one tool.

### 10.1 A project's fields

A consumer reading metadata for a project ([§9](#9-projects)) resolves each field in this order:

1. **The project directory's own `repo.json`**, if present — the unit's own statement about itself.
2. **The inline entry** in the parent's `projects`.
3. **The parent document**, for the presentation fields `color` and `icon` only. Inheriting the brand
   colour is what makes a monorepo look like one repository in a dashboard, while a package that sets
   its own still wins.
4. **The ecosystem manifest** in the project directory, for `name` and `description` — step 2 above,
   applied one level down. Failing that, a consumer **SHOULD** fall back to the directory name.

`name` and `description` **MUST NOT** be inherited from the parent document: five packages all
called "acme platform" is worse than five packages called by their directories.

An entry **MAY** carry `extensions`, scoped to that project; the ownership rules of
[§4.7](#47-extensions) apply unchanged.

## 11. Conformance

### 11.1 Producers

A conforming producer:

- **MUST** write a JSON object, UTF-8, at the repository root, named `repo.json`.
- **MUST** keep every value within the types in [§4](#4-document-model).
- **SHOULD** write `/`-separated relative paths that stay inside the repository.
- **SHOULD** claim only `extensions` names it owns.
- **SHOULD** list its units with `projects` when the repository holds more than one, and **SHOULD**
  name a specific directory before a wildcard that also matches it ([§9.3](#93-resolving-the-set)).
- **MUST NOT** rely on a consumer reading any field: every field is optional to _read_ as well as to
  write, and a consumer may support a subset.

### 11.2 Consumers

A conforming consumer:

- **MUST** accept an empty object and a file that sets any subset of fields.
- **MUST** ignore an invalid value rather than reject the document. A malformed colour drops that
  colour; it does not drop the file. A consumer that refuses to read a file over one bad field turns
  a cosmetic mistake into a broken project.
- **MUST** preserve unknown keys when rewriting the file, and **MUST NOT** treat one as an error.
  Today's unknown key is tomorrow's field, or another tool's extension.
- **MUST** implement [§6](#6-path-resolution) containment, [§7](#7-icon-selection) selection order,
  and [§8.1](#81-syntax) colour syntax if it implements the corresponding field at all.
- **MUST** treat an absent `projects` as one project at the repository root, and **MUST NOT** assume
  projects are disjoint ([§9.4](#94-extent-and-nesting)), if it implements `projects` at all.
- **MAY** implement any subset of the fields. Partial support is conforming; silent misbehaviour is
  not.

### 11.3 Diagnostics

A consumer **SHOULD** be able to report which fields it applied and which it dropped, and why.

"I set it and nothing happened" is the most common failure of a format like this, and it is only
debuggable if something reports it. A consumer whose only feedback is the rendered result puts the
author in the position of bisecting their own metadata file.

## 12. Security considerations

`repo.json` arrives with the repository. Anyone who can get a checkout onto a machine — a clone, a
pull request, a submodule, a downloaded archive — controls every byte of it. A consumer **MUST**
treat the whole document as untrusted input.

- **Path traversal.** `icon.src` names a file the consumer will read. [§6](#6-path-resolution)'s
  containment rule is the mitigation, and it **MUST** be applied to the resolved, normalised path —
  not to the string as written, which `a/../../../etc/passwd` passes trivially.
- **Symbolic links.** Lexical containment does not survive a symlink inside the repository pointing
  out of it. A consumer that reads the file **SHOULD** re-check containment after resolving symlinks
  (`realpath`), or decline to follow them.
- **Scriptable images.** An SVG icon is a document, not a bitmap: it can carry scripts and external
  references. A consumer that renders one **MUST** do so in a context where script does not run
  (a sandboxed image context, or after sanitising), and **MUST NOT** inline untrusted SVG into its
  own DOM.
- **Remote and inline references.** Fetching an `http(s)` icon discloses to a third party that this
  repository is being viewed, and is a request the user never made. A consumer **SHOULD** make such
  fetches opt-in, and **MUST** bound them — a timeout, a size limit, and no redirect to a
  non-`http(s)` scheme. A `data:` payload **MUST** be size-limited before decoding.
- **Text is text.** `name`, `description`, `authors` and `keywords` are attacker-controlled strings.
  A consumer **MUST NOT** render them as markup, pass them to a shell, or use them to build a path.
  A display name of `../../../../etc` is a name, not a location.
- **Resource limits.** A consumer **SHOULD** bound the size of the file it will read and the number
  of icon entries it will consider. Nothing in this format needs to be large.
- **Extensions are not safer.** `extensions.<name>` is untrusted for exactly the same reasons. An
  owner validating its own entry gets no guarantees from this document beyond "it is an object".
- **Walking project paths.** Expanding a wildcard means listing directories the file chose. Every
  expanded path **MUST** satisfy [§6](#6-path-resolution) containment in its own right — a `*` must
  never match `..` — and a project directory that is a symlink is the symlink case above, one level
  up. A consumer **SHOULD** bound how many directories one expansion may produce.

## 13. Examples (informative)

A machine-learning repository — no web assets, no package registry:

```json
{
  "name": "diffusion-lab",
  "description": "Training and evaluation for latent diffusion models",
  "icon": "docs/logo.png",
  "color": "#0f766e"
}
```

A monorepo, where no single ecosystem manifest speaks for the whole:

```json
{
  "name": "acme platform",
  "description": "Web, API and infrastructure in one tree",
  "icon": [
    { "src": "brand/mark.svg", "sizes": "any" },
    { "src": "brand/mark-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "color": { "primary": "#1d4ed8", "accent": "#f59e0b", "background": "#0b1020" }
}
```

A web project that already has a favicon — `repo.json` adds only what the existing files cannot say:

```json
{
  "name": "acme.com",
  "color": "#be123c",
  "extensions": { "mulmoterminal": { "orderPriority": 20 } }
}
```

A repository whose root is itself a unit, with a second unit inside it — the nesting of
[§9.4](#94-extent-and-nesting):

```json
{
  "name": "acme storefront",
  "color": "#f43f5e",
  "projects": [
    { "path": ".", "name": "web app" },
    { "path": "functions", "name": "cloud functions" }
  ]
}
```

More, including a document that exercises every field, are in
[`examples/`](https://github.com/repos-json/repos-json/tree/main/examples).

## 14. Open questions

- **`color.dark`** — worth adding, or does deriving contrast cover it?
- **Enforcing `extensions.<name>` ownership** — is a convention enough without a registry?
- **Forge rendering** — `name` + `icon` + `color` is exactly a repository card. Worth proposing to
  GitHub/GitLab once the format has more than one implementation.
- **Localisation** — a `name` per locale, or out of scope for a file this small?
- **Recursive wildcards** — `**` is undefined in [§9.2](#92-paths-and-wildcards). Is a depth-limited
  form worth defining, or is a repository that needs one better described by nested `repo.json` files?
- **Project kinds** — a consumer often wants to know that `functions/` is deployed and `packages/ui`
  is published. Is that identity, and so in scope, or build information, and so out?

## 15. References

### 15.1 Normative

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) / [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — requirement keywords.
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) — JSON.
- [WCAG 2.2, relative luminance and contrast ratio](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance) — the derivation in [§8.2](#82-text-colour-is-derived-never-declared).

### 15.2 Informative

- [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/) — `icons[]`, `sizes`, `theme_color`, `background_color`.
- [pyproject.toml `[tool]`](https://packaging.python.org/en/latest/specifications/pyproject-toml/) — reserves a namespace without specifying its contents.
- [Cargo `package.metadata`](https://doc.rust-lang.org/cargo/reference/manifest.html) — ignored by Cargo, left open for external tools.
- [Development Containers `customizations`](https://containers.dev/supporting) — tool settings alongside a core spec.
- [OpenAPI Specification Extensions](https://spec.openapis.org/oas/latest.html#specification-extensions) — the noun.
- [CITATION.cff](https://citation-file-format.github.io/) / [CodeMeta](https://codemeta.github.io/) — prior art for citation metadata.

## Appendix A. Changelog

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0       | 2026-09-12 | First publication in this repository. Carried over from `receptron/mulmoterminal:docs/repo-json.md` and restated normatively: requirement keywords throughout, path resolution and icon selection written as algorithms, and a security-considerations section added. No field changed meaning.                                                                     |
| 0.1     | 2026-09-12 | Added `projects` ([§9](#9-projects)) and the per-project precedence of [§10.1](#101-a-projects-fields); [§6](#6-path-resolution) now defines the repository root as the empty path. The tail renumbered: precedence 9→10, conformance 10→11 (10.3→11.3), security 11→12, examples 12→13, open questions 13→14, references 14→15. No existing field changed meaning. |

## Appendix B. Reference implementation

[`src/`](https://github.com/repos-json/repos-json/tree/main/src) in this repository implements
normalisation ([§5](#5-normalisation)), path resolution ([§6](#6-path-resolution)), icon ranking
([§7](#7-icon-selection)), the colour rules ([§8](#8-colours)) and projects ([§9](#9-projects)), with
a test per normative rule. It touches no filesystem: icon selection takes a caller-supplied predicate
for "does this resolve", and wildcard expansion takes a caller-supplied directory lister, so the
policy for reading files and walking directories stays with the consumer.

The first shipping implementation is
[MulmoTerminal](https://github.com/receptron/mulmoterminal), which reads `repo.json` for a
repository's name, icon and colours, and derives its seven chrome roles from `primary` as described
in [§8.3](#83-deriving-further-roles-informative).
