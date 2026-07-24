> Rejected-alternatives companion to `docs/adr/0008-situation-engine.md` —
> split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0008 — Rejected alternatives

## From "Alternatives Considered"

- **Build a literal `domain/situations.js`** formalizing Objective/
  Pressure/Unknown/Decision/Consequence as a stored, structured record per
  scene. Rejected — that state already exists, spread across
  `context.what` (Objective/Pressure), Threads (long-running Unknowns), and
  the Co-Pilot (Consequence). A parallel structured record would duplicate
  state that already lives elsewhere — the same objection ADR 0004 raised
  against a separate `domain/contracts.js`.
- **Mechanize the 35/25/20/15/5 session-focus ratio** as an enforced or
  tracked budget. Rejected per Article II — see Decision item 5.
- **Give each of the four new oracle chains its own new oracle group.**
  Rejected — `Derelicts`, `Exploration`, `Trade & Cargo`, and `Mysteries &
  Coverups` already exist and are exactly where each chain belongs; a new
  group per chain would fragment the tree for no reason.
