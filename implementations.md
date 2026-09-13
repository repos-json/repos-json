---
title: Implementations
nav_order: 4
permalink: /implementations/
description: What reads repo.json today — MulmoTerminal's cells and chips, and scoria's measurement targets — and what each one actually does with the file.
---

# Implementations

Two consumers read this file, for opposite reasons: one to **show** a repository, one to **measure**
one. That is the argument for the format being open rather than one tool's config — and the second
consumer is where [§9 `projects`]({{ '/spec/#9-projects' | relative_url }}) came from.

## MulmoTerminal — a repository that ships `repo.json` gets a cell

[MulmoTerminal](https://github.com/receptron/mulmoterminal) runs several AI coding agents in
parallel, one terminal per repository. Nine cells of the same dark grey, and the only way to tell
them apart is to read the path — which is the problem this file exists to solve. Shipping since
4.5.0 (2026-08-05), and the implementation the specification was extracted from.

![Two cell headers, each carrying its repository's own icon, name badge and colour]({{ '/assets/screenshots/mulmoterminal-cells.png' | relative_url }})

_Neither of these directories was configured in MulmoTerminal. The mark, the name and the colour all
come from each repository's own `repo.json`. From
[MulmoTerminal's 4.5.0 guide](https://receptron.github.io/mulmoterminal/guide/en/v4.5.0.html#repo-json)._

| Field                      | What it becomes                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`                     | the badge on the cell header                                                                                                   |
| `icon`                     | the mark — ranked by [§7]({{ '/spec/#7-icon-selection'                                                                         | relative_url }}) and taking the first entry that **resolves** |
| `color`                    | all **seven** chrome colours: the header is the colour exactly; badge, border, status dot and buttons are derived from its hue |
| `color.background`         | the cell body directly                                                                                                         |
| —                          | the header **text** colour, which the file may not declare ([§8.2]({{ '/spec/#82-text-colour-is-derived-never-declared'        | relative_url }}))                                             |
| `extensions.mulmoterminal` | `theme`, `orderPriority`, `sound` — what only this app understands                                                             |

The launcher chips read the same file:

![Launcher chips, each carrying its repository's icon and brand colour]({{ '/assets/screenshots/mulmoterminal-chips.png' | relative_url }})

### One colour, seven roles

A repository declares one brand colour; a cell is painted with seven. Rather than ask a repository to
describe one app's chrome, MulmoTerminal derives the other six — and the derivation is measured, not
invented: against eleven hand-tuned palettes it lands within **ΔE76 2.5, median 1.9**, below the 2.3
threshold at which a difference becomes noticeable at all. One derived value came out byte-identical
to the hand-picked one. [§8.3]({{ '/spec/#83-deriving-further-roles-informative' | relative_url }})
carries what that measurement also found: badges sit _relative_ to the brand colour while surfaces sit
at _absolute_ lightness, so no single rule fits every role.

### Three files, general to specific

```text
repo.json   →   .mulmoterminal.json   →   .mulmoterminal.local.json
the project     this app's settings       this checkout
```

The open file sits **under** the app's own two, which is
[§10 precedence]({{ '/spec/#10-precedence-among-sources' | relative_url }}) in practice: a repository
can ship `repo.json` alone and never create the other two, and a user who would rather not look at a
project's brand colour all day can override it locally without touching the repository.

### Saying what it applied, and what it ignored

![A settings panel naming the file every value came from, listing each applied setting, and flagging two keys it does not read]({{ '/assets/screenshots/mulmoterminal-settings-preview.png' | relative_url }})

_[§11.3]({{ '/spec/#113-diagnostics' | relative_url }}) asks a consumer to be able to say which fields
it applied and which it dropped. This panel names the file, lists what came from it, and flags what it
could not use — here two misspelled keys. The screenshot shows a `.mulmoterminal.json`; a repository
that ships `repo.json` gets an "Offered by `repo.json`" line in the same panel. From the
[Configuration guide](https://receptron.github.io/mulmoterminal/guide/en/config.html#repo-json)._

"I set it and nothing happened" is the most likely failure of a format like this one, and it is only
debuggable if something reports it.

## scoria — the same directories, measured instead of shown

**scoria** is a code-quality assay harness: it runs existing tools over a repository and turns their
machine evidence into a score over time. It is specified and not yet released, and it is the consumer
that produced [§9]({{ '/spec/#9-projects' | relative_url }}).

The problem it hit is the one [§9.4]({{ '/spec/#94-extent-and-nesting' | relative_url }}) is written
for. Measured from the root, a repository whose app sits at the root with a second unit inside it
reports this:

```text
ownplate
  src/         a Vue app              the root tsconfig / lockfile
  functions/   Firebase Functions     its own tsconfig / package.json / yarn.lock

  measured from the root
    tsc        0 errors     ← only ever looked at src/. functions/'s 93 files are unchecked
    audit      3 high       ← functions/yarn.lock's 4 high and 19 moderate are invisible
    file-based both counted ← the denominator alone is whole
```

The denominator is the whole repository and the numerator is half of it — and the run reports success.

scoria names its units in its own config field, `targets`, and then hands the rules over:

> **The expansion rules are not scoria's. They follow `repo.json` §9.2–§9.3** — because once a
> repository has declared its units, every tool that reads them should get the same set.
>
> — the scoria specification, §9.3

So `.` is a valid target and means the repository root; a wildcard is a whole `*` segment or nothing;
`**` is rejected and **reported** rather than guessed at; dot-directories and `node_modules` are
skipped; matches sort by UTF-16 code unit, never `localeCompare`; one directory is one project with
the first entry winning; and a target's extent excludes its nested targets — which for a measurement
tool means passing that exclusion _down_, to `oxlint --ignore-pattern`, `jscpd --ignore` and
`madge --exclude`, because a tool that walks a whole directory will otherwise count it twice.

That is what "open" buys, concretely: the second consumer did not have to invent an answer, and a
repository that declares its units once is read the same way by the thing that draws it and the thing
that grades it.

## Adding yours

A second implementation **this format's authors did not write** is what unblocks
[proposing repository cards to a forge](https://github.com/repos-json/repos-json/issues/9). The
[reference implementation](https://github.com/repos-json/repos-json/tree/main/src) is MIT and touches
no filesystem, so it drops into a tool that already has its own opinions about reading files.

Open a pull request adding a row here — what you read, and what you do with it.
