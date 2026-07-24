> Rejected-alternatives companion to `docs/adr/0030-starforged-starsmith-
> oracles.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0030 — Rejected alternatives / rejected detail

## From "Alternatives Considered"

- **A second, per-system navigation tree/tab.** Rejected per the resolved
  `AskUserQuestion` — one small content group doesn't justify a parallel
  browsing mode; the existing tree + search already scales to this.
- **Bake the source into `label` itself** (e.g. store the key as
  `'Starforged Oracles (Starforged/StarSmith-inspired)'`). Rejected —
  `label`/`path` double as functional identifiers for roll dispatch and
  search; changing them risks breaking `rollGroup`/`filterOracleTree`
  call sites and would make the suffix show up inside search-match
  highlighting instead of being purely cosmetic.
- **Transcribe Starforged's/StarSmith's actual oracle tables.** Rejected —
  the same line ADR 0010/0011 already drew.

## Rejected option narrated inline in the original Context section

The live ADR's Context section originally read: "A separate
`AskUserQuestion` resolved the navigation-structure fork ahead of
implementation: keep the same merged Oracle tree (matching the existing
Stars Without Number precedent, ADR 0010/0011) **rather than a second
per-system tree**, since a GM already has one tree with tags/search and a
second parallel navigation mode would add a mode switch for one small
content group." The live ADR now states only that the merged-tree
decision was confirmed via `AskUserQuestion`; the comparison against the
rejected second-tree alternative (bolded above) lives here.
