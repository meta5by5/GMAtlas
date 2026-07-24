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

## Superseded implementation history (removed from the live ADR 2026-07-23
per the "ADRs are living documents" policy — the live ADR now describes
only the current, final shape)

- **"Replace the five W-tabs with the dashboard entirely"** was originally
  rejected at 12a time — a dashboard grid has no room for a full rich-text
  Journal note editor, a deep entity inspector, or the Oracle drawer's
  whole tree without becoming unusable clutter. Reconsidered and done
  anyway at 12f, per direct follow-up request: the clutter concern was
  addressed by making each W's content collapsible rather than by keeping
  a separate tab per W — the Journal, Entity Editor, and Oracle drawer
  were never W-tab content in the first place (they're tertiary-tier edge
  drawers, unaffected by this decision).
- **12a's original shape** (2026-07-15, superseded the next day by 12f):
  a 6th entry in `ui/workspace/index.js`'s `VIEWS` map, alongside `who`/
  `where`/`what`/`why`/`how`, additive not a replacement — the five
  focused tabs stayed byte-for-byte unchanged. Deliberately not added to
  `schema.js`'s `CONTEXT_QUESTIONS` (that array's own doc comment calls it
  "the canonical WHO/WHERE/WHAT/WHY/HOW context — a first-class stored
  model," and Dashboard had no persisted `context.dashboard` sub-object of
  its own). The strip (`ui/shell.js`'s `render()`) appended one more
  `[data-question]` button after the `CONTEXT_QUESTIONS.map(...)` loop,
  reusing the generic click handler unchanged. Ctrl+Left/Right cycling
  deliberately still only cycled the 5 real questions; Dashboard was a
  direct click. Layout: header row (`currentLocationBanner`, WHAT's
  Threat/Mystery/Stress dials, HOW's Activity select) + 2-column grid
  (left: `whoEntityPicker`/`locationFactionsBlock`/
  `locationConflictsBlock`/`nearbyLocationsBlock`; right:
  `storyOptionsBlock` in a new `selectable` mode + the Narrative
  Composer). All of this was superseded by 12f's single consolidated
  Dashboard (collapsible sections replacing the separate tabs, Composer
  moved to a sticky top-right column) — see the live ADR for the current
  shape.
- **12c's original sketch** (superseded by `docs/adr/0041-scene-
  operating-model.md`'s 13d, which is now the authority — don't build
  both): extend the two existing "selection → tailored oracle" hooks with
  the same static-lookup-table architecture `GAMEPLAY_AREAS`/
  `LENS_ORACLE_CATEGORIES` already use — WHAT's `Intent` dropdown gaining
  an Intent → Oracle-category lookup (same shape as `suggestRulesLens`'s
  Activity → provider lookup), and the dashboard's WHO/WHERE selections
  feeding the same `sceneContext`-weighted lens draw ADR 0039 built for
  WHY (`drawSuggestionLenses`'s `sceneContext` param), triggered from the
  dashboard instead of only WHY.
