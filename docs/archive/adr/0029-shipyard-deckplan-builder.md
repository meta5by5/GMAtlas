> Rejected-alternatives companion to `docs/adr/0029-shipyard-deckplan-
> builder.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0029 — Rejected alternatives

## From "Alternatives Considered"

- **A genuinely new "vessel builder" drawer/domain module**, separate
  from Battlemap. Rejected for the same reason ADR 0024 rejected three
  separate map-shaped drawers — the data shape (named canvas, placed
  parts, a background-optional surface) is identical; only the
  rotate/flip field and the tonnage rollup are actually new.
- **Replicate Geomorph Shipyard's own scroll+hover library UI.** Rejected
  — it's the literal thing the user asked to do differently, and this
  app already has a proven tag-filter pattern (Gallery) solving the exact
  same "find the right image in a growing collection" problem.
- **A real per-ship JSON export/import**, matching Geomorph Shipyard's
  local-file save/load. Rejected as redundant — this app's whole-campaign
  export/import already covers "get my data out"/"bring it back in";
  adding a second, narrower file format for one sub-object isn't
  something any other feature here does.
