> Rejected-alternatives companion to `docs/adr/0040-story-dashboard.md` —
> split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension. Preserved verbatim, never deleted. Note: one
> entry from the live ADR's original "Alternatives considered" section
> ("Replace the five W-tabs with the dashboard entirely") is deliberately
> **not** duplicated here — it was initially rejected but later
> reconsidered and actually adopted (at Phase 12f), so it documents the
> current design's own history rather than a genuinely rejected
> alternative; it stays in the live ADR.

# ADR 0040 — Rejected alternatives

## From "Alternatives Considered"

- **Strengthen the existing strip/Co-Pilot instead of merging tabs**
  (this ADR's own default recommendation going in). Rejected per direct
  instruction — the ask was for a genuinely merged, visual decision-
  making surface, not an incremental strengthening of what already
  exists. Recorded here because it's the lower-risk path a future
  reviewer might reasonably ask "why wasn't this enough" about.
- **A literal step-by-step wizard for "randomly generated scene-
  development steps"** (a modal/state-machine walking the GM through
  WHO→WHERE→WHY→compose in sequence). Considered and set aside in favor
  of the dashboard's own top-to-bottom layout reading as that same
  sequence naturally, with no new state machine — matches "reduce
  cognitive effort" (Article X) even while adding a new surface; can be
  revisited if the layout alone doesn't read as guided enough once built.
- **A mechanized session-composition ratio** (35/25/20/15/5,
  `docs/adr/0008-situation-engine.md`'s explicitly-declined item). Not
  revisited — nothing in this request asks for it, and it was declined
  for reasons unrelated to this ADR's scope.
