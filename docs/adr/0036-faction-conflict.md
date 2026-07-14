# ADR 0036 — Faction Conflict

## Status

Accepted and implemented. Direct request: incorporate
`docs/design/FACTION-CONFLICT.md` (a full external subsystem spec) into
the Living Faction Engine, validated against real GM-community sentiment
on faction/conflict tooling before building — "the design needs to be
intuitive and easy to use... provide reasonable capabilities that would
make the design a popular choice for 80% of users." Superseded its own
first-draft integration plan (a straight architectural mapping of the
spec, written before the community-validation pass — see
`docs/design/faction-conflict-integration-plan.md`, revised in place).

**Same-day follow-up**: on direct question ("would this be a foreign
design to the SWN community"), a second, narrower research pass (this
time against SWN/OSR-specific sources rather than general GM sentiment)
found the escalation clock being entirely GM-clicked, disconnected from
the already-faithful mechanical Faction Turn Engine, was the one specific
gap likely to read as "bolted on" to that particular audience — one
source describes SWN GMs specifically wanting "mechanical actions to
directly damage or aid Factions" rather than narrative-only state
tracking. Closed the same day — see the new "Escalation suggestions"
decision below.

**Second same-day follow-up**: on direct question ("where is the
selected Location for filtering... local-only factions"), found that
`conflict.locationId` (the "contested zone" field this ADR's own Decision
section describes composing with `factionsPresentAt`) had a data-model
slot but no UI control and no actual filtering behavior in the first
build pass — a real gap between the design doc and what shipped, not a
deliberate cut. Closed the same day, then relocated per direct follow-up
correction — see "Location-scoped faction picker" below.

## Context

The source spec (18+ fields per conflict, per-faction posture objects,
enumerated symmetry/appetite scales, a 7-table generation wizard) is a
rich, well-designed conflict-simulation model. Direct research before
building it found a consistent pattern across independent sources:

- Stars Without Number's own faction system — the direct ancestor of
  this app's Faction Turn Engine — is described in reviews as "complex
  and fiddly compared to the rest of the rules," tolerated by
  genre-committed GMs for its depth, not adopted because of it.
- Blades in the Dark's Progress Clock (a circle, segments, filled in by
  GM judgment) is the single most consistently cited "track pressure
  without homework" pattern across every source found.
- An indie TTRPG's public devlogs describe a faction system redesigned
  *twice* because real playtesting showed it "took up too much headspace"
  and "bogged down game setup."
- Gnome Stew's explicit GM complaint about faction tooling: frustration
  from "having to learn all these new rules and constantly go back and
  look stuff up" — their fix is reusing what a GM already knows and
  favoring abstraction over precision.

## Decision

**Conflict is a first-class entity type**, not a bespoke
`campaign.factionConflicts[]` array — `ENTITY_TYPES` gains `'conflict'`
(`entities.js`), matching `docs/adr/0012`'s `item` precedent exactly:
this gets @mentions, Graph nodes (`TYPE_COLOR.conflict`), Universal
Search, and Cast listing for free, and "which factions are involved"
becomes the existing relationship system (a new `involves` type,
`RELATIONSHIP_TYPE_TARGETS.involves = ['faction']`) instead of an id-
pointer array.

**A validated "hero path" / "Add depth" split**, not the spec's flat
18-field schema. Always visible, and alone a usable conflict:
`status` (plain labels), an **escalation clock** — a Thread
(`kind: 'faction-conflict-escalation', conflictId`, `ensureConflictEscalationTrack`/
`getConflictEscalationTrack` mirroring the faction goal track's exact
shape, reusing the SAME pip UI and the existing generic `data-thread-adv`/
`-back` controls with zero new wiring), `statedCause`/`rootCause`/
`causeGapHook`/`thirdPartyCasualty` as short plain fields, and
`sessionHooks` (`{id, text, used}`, a checkbox each). Everything else
from the spec survives, demoted behind an explicit "Add depth" toggle
(`expandedConflictDepth`, collapsed by default): `deepRootSummary`/
`precipitatingIncident`/`lastDeescalationAttempt`/`gmNotes` as longer
rich-text fields, `irreversibleFacts` (append-only, matching this app's
"flag/append, don't delete" ethos), `factionPostures` (per-conflict per-
faction — simplified from the spec's 5 sub-fields to just `cohesion`
(0-10, reusing this app's existing dial convention) plus one free-text
`notes`), and `informationAsymmetry` (one object, a `reveal`/`clear`
action pair).

**A single one-click quick-start**, not a multi-table review wizard.
`generateConflictSeed(campaign, {rng})` (`domain/factionConflicts.js`)
rolls a small new `SCENE_TABLES['Faction Conflict']` group (Root Cause
Category, Cause Gap Flavor, Third-Party Casualty, Starter Session Hook —
original GMAtlas content) and drops the results straight into the
already-editable hero-path fields — mirrors `missions.js`'s
`generateMission()` shape (plain content out, no draft/review step),
not the heavier Faction Turn propose/commit flow, since there's no dice
outcome to resolve here, only flavor text a GM edits or accepts as-is.

**UI**: `conflictSection(doc, e, ui)` in `drawers/index.js` (mirrors
`factionSection`'s exact pattern — a type-gated section function
unconditionally called from the shared `inspector()`), and a compact
Conflicts list in the Faction Events drawer (mirrors Roster/Missions —
name, status, escalation fraction, click through to the full Entity
Editor card, nothing duplicated).

**Escalation suggestions (same-day follow-up)**: `suggestedConflictEscalations
(campaign, eventIds)` (`factionTurnEngine.js`) — given the ids of one or
more just-COMMITTED Faction Events, finds every Conflict whose `involves`
relationships cover BOTH sides of that event: the acting faction, plus
either an Attack's named defender (`event.targets[0].factionId`, the only
action with one specific opponent) or any RIVAL entry in a faction-vs-
world event's frozen `coLocatedFactions` (Expand Influence/Seize Planet
have no single named opponent). A SUGGESTION only — it never advances
anything itself. Wired into `shell.js`'s existing commit handler
(`data-faction-events-commit`, both Step and Full Round go through it):
right after a commit, the suggestions compute and render as a dismissible
prompt ("`<Faction>`'s move may affect `<Conflict>`") in the same spot the
draft review just was, with an Escalate button (ticks the conflict's
escalation Thread by 1, starting the clock first via
`ensureConflictEscalationTrack` if the GM never had) or a Dismiss (✕,
clears the prompt with no state change) — Article II: the dice informed
this, they didn't decide it.

**Location-scoped faction picker (second same-day follow-up)**: the
Conflict card's "Involved" section gained a "+ add a local faction"
`<select>`, populated by `factionsPresentAt(doc, e.locationId)` when a
Location is set (falls back to every faction, with a hint, when unset) —
wired via a new `data-conflict-faction-link` change handler that just
calls the existing `addRelationship(..., 'involves')`, so a link made
this way is indistinguishable from one made through the generic
Relationships block further down (which still works unfiltered, for any
faction, regardless — Article II, this is a curated convenience, never a
restriction). Per a direct follow-up correction, the Location `<select>`
itself does NOT live on the Conflict's own Entity Editor card — it was
moved to the WHO workspace tab (`activeConflictLocationPicker`,
`workspace/index.js`), rendered only while a Conflict is the active/open
entity, since scoping "which factions are eligible" was judged a WHO-tab
concern (who's in play), not an entity-detail-form one. The field is
still plain `data-entity-field="locationId"` — that handler already
targets whichever entity is active regardless of which tab renders the
control, so relocating it needed no new handler, only the addition
itself did.

## Alternatives considered

- **The spec's literal schema, built as-is.** Rejected — this is exactly
  the shape of design the research found gets abandoned in practice
  (SWN's own tolerated-not-loved complexity, the "desert" devlogs'
  concrete redesign-twice story).
- **`power_symmetry` and `escalation_appetite` as separate enumerated
  fields.** Dropped entirely rather than demoted — the two fields
  research most directly flags as "spreadsheet-feeling," and nothing
  else in this design depends on them.
- **A second, date-based "clock" distinct from the escalation ladder**
  (the spec's own `clock` object). Folded into the one escalation clock
  instead — this app has no calendar/date system, and "the fewer things
  a GM has to track, the better it lands" argues against a second
  parallel clock even if one could be built.
- **A separate `campaign.factionConflicts[]` record type**, as the
  spec's own "Implementation Notes" section suggested. Rejected in favor
  of a first-class entity type — see Decision above.

## Consequences

- A GM who never creates a conflict sees zero behavior change — a new
  entity type is exactly as inert as `item` was when it shipped.
- A conflict created with just a name and one linked faction is fully
  functional (status defaults, escalation clock startable, hooks
  addable) — nothing blocks play waiting for the rest of the schema to
  be filled in.
- Verified via 11 new domain tests (427 total): default field values,
  escalation-track creation/idempotency/no-op-on-wrong-type, the
  existing generic Thread controls working unmodified for the escalation
  clock, session-hook add/toggle/remove, append-only irreversible facts,
  per-conflict faction posture creation/patch/clamp/isolation-between-
  conflicts, information-asymmetry create-or-patch/reveal/clear, the
  quick-start generator's purity, and `suggestedConflictEscalations`
  against the REAL `attack()`/`expandInfluence()`/`buyAsset()` action
  functions (not synthetic event fixtures) — confirming the Attack match
  via `targets[0].factionId`, the rival-matches-but-ally-doesn't
  distinction for a faction-vs-world event, and that self-scoped events
  never match — plus direct render-path smoke checks confirming the full
  Entity Editor card (hero path, collapsed vs. expanded "Add depth"), the
  Faction Events Conflicts list, and the post-commit escalation-suggestion
  prompt all render correctly against real campaign data.

## Related packs / ADRs

`docs/design/FACTION-CONFLICT.md` (the source spec), `docs/design/
faction-conflict-integration-plan.md` (this decision's full validation
research and field-by-field mapping), `docs/adr/0012` (the `item`
first-class-entity-type precedent this follows), `docs/adr/0034`/`0035`
(the Living Faction Engine phases this extends).
