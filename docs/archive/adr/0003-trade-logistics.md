> Rejected-alternatives companion to `docs/adr/0003-trade-logistics.md` —
> split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0003 — Rejected alternatives

## From "Alternatives Considered"

- **Reorder the roadmap so Trade lands before Phase 6/7/8/9.** Rejected —
  contradicts the pack-66 priority framework this repo already adopted
  twice (ADR 0001, ADR 0002) with no new information that would justify
  reopening that ordering; the user's own phrasing ("soonest phase that
  doesn't cause conflicts") asks to respect existing prioritization, not
  override it.
- **Wait for a Traveller sourcebook and build this as "Traveller's trade
  rules, implemented."** Rejected for now — no such book exists in this
  repo's library, and blocking a user-requested feature on an unspecified
  future document acquisition isn't a real plan. If a Traveller sourcebook
  is added later, its trade tables become a second, swappable
  `data/commodities.js`-shaped data set (same pattern SWN/Traveller
  character content would follow per ADR 0002), not a rewrite of this
  design.
- **A full economic simulation** (multiple interacting commodities, NPC
  traders acting independently, supply chains). Rejected as scope well
  beyond "Frictionless Empowerment" — the corpus's own maturity-ladder
  framing (pack 39) puts this comfortably at "Level 4-5," far past this
  repo's current Level 1-2; two GM-legible dials per commodity per Location
  is enough to make the planning/risk/reward loop real without becoming a
  second product to maintain.
- **A bespoke progress mechanic for "in transit" instead of reusing
  Threads.** Rejected — `domain/threads.js` already has everything a
  transport run needs (a clock, a lifecycle, Co-Pilot surfacing); a second
  clock primitive would just be the same idea maintained twice.
