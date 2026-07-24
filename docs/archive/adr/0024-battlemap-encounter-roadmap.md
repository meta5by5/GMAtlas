> Rejected-alternatives companion to
> `docs/adr/0024-battlemap-encounter-roadmap.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension, so
> the live ADR reads as pure accepted architecture. This file is never
> itself a decision record; it holds the "what was considered and
> rejected, and why" detail for the ADR above, preserved verbatim rather
> than deleted.

# ADR 0024 — Rejected alternatives

## From "Alternatives Considered"

- **Build the wishlist's three original tools (Battlemap, Base Builder,
  Interactive Maps) as three separate drawers/domain modules**, as
  Phase 11's original backlog entry framed them. Rejected — once ADR 0023
  was actually scoped, all three turned out to need the same data shape
  (a named map, a background, placed icons, an optional grid); building
  three would mean three copies of drag/placement/rendering code to keep
  in sync, the exact "parallel systems" Article IX exists to prevent.
- **Take the wishlist's 14 categories at face value and build all of
  them.** Rejected — several (infinite canvas, dynamic lighting, VTT
  export) are disproportionate to this app's zero-dependency/DOM
  architecture for the value they'd add, and the request's own framing
  ("an encounter and gameplay tool, not a map designer") argues against
  chasing full VTT parity in the first place.
- **Keep the asset/room library Planetfall-specific**, matching the
  original ask's literal wording. Rejected — would hardcode one
  ruleset's building list into `battlemaps.js`/UI code, the exact thing
  "genre-aware, not genre-locked" and `data/genrePacks.js`'s existing
  precedent both argue against; generalizing costs nothing extra (it's
  still just data) and keeps the next genre pack from having to work
  around Planetfall-only assumptions.

## Rejected option narrated inline in Context/Decision

The live ADR's 11b ("Encounter overlays") sub-section originally read:
"Reuses 11a's existing `icons[]` array — a token gains a few more optional
fields (`hp`, `maxHp`, `initiative`, `statusEffects: []`) **rather than a
second combatant list living somewhere else**." The live ADR now states
only that a token gains the extra fields; the rejected alternative
(tracking encounter combatants in a separate list independent of the
map's own icons) — bolded above — lives here.
