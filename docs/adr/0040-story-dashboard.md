# ADR 0040 — Story Dashboard (Phase 12)

## Status

Proposed (roadmap only — none of 12a–12e is built yet). Direct request:
the 5-W workspace "is still missing a comprehensive and interactive
narrative-building GM guide that offers/suggests oracles and directive
story options while allowing the GM to adjust the options on the fly."
Four concrete directions were floated: consolidate the 5-W tabs into one
dashboard; randomly-generated scene-development steps; dropdowns that
surface tailored oracle suggestions; composing dropdown/textbox
selections into narrative prose, previewed and pasteable into the
Journal.

**This ADR records a deliberate exception to Article X** ("the workspace
changes, not the application" — one W-question at a time, the app's
governing UX principle since Phase 0). Asked directly whether to design
around that principle (strengthening the existing always-visible strip/
Co-Pilot instead of merging tabs) or genuinely reverse it, the answer was
explicit: **design a real merged dashboard**, despite the reversal. Per
this repo's own "no two docs get to disagree" rule (CLAUDE.md), that
makes this ADR the authority on the question going forward — a future
session should not flag the new `dashboard` view as contradicting Article
X once it's built; this decision supersedes that principle for this one
surface. Article X still governs the five individual W-tabs, which stay
exactly as they are — the dashboard is additive, not a replacement (see
Alternatives).

## Context

A full audit of `src/domain/*.js` against `src/ui/**/*.js` (grepping
every export for a UI caller) found the exact primitives this dashboard
needs already exist, several of them built and proven but scoped far
narrower than they could be:

- **`domain/scenes.js`'s `recomposeSceneText(scene)`** — a working
  "structured fields → live-recomposed narrative text" mechanism (edit
  any of a Scene's 7 fields, its `text` re-derives immediately). Used in
  exactly two places (`generateScene`'s initial roll,
  `session.js`'s `updateSceneField` on every edit) and scoped only to the
  Scene object's own fields — never generalized to compose WHO/WHERE/
  WHAT/WHY/HOW's own field values into anything.
- **`domain/recap.js`'s `buildSessionRecap`/`formatSessionRecap`** — a
  working "assemble N structured signals into readable prose, explicit-
  save (never auto-written to the Journal)" mechanism. One fixed report
  shape (6 hardcoded components), not reusable for a different
  combination of signals.
- **"Selection → tailored oracle suggestion" hooks**: exactly two exist —
  `data/activities.js`'s `suggestRulesLens(activityId)` (HOW tab's
  `Activity` dropdown only) and this session's own Story Options/
  weighted-lens-draw (WHY tab only, `docs/adr/0039`). WHO and WHAT have
  no equivalent hook at all. WHERE's `storyInspirationBlock` (Site
  Concept/Adventure Seed buttons) are unconditional random generators,
  not selection-driven.
- **`domain/context.js`'s 17 `SHIFTS` reducers** — 8 are defined,
  tested, and completely unreachable from any UI control: `Deepen
  Mystery`, `Resolve Mystery`, `Gain Resources`, `Spend Resources`,
  `Raise Reputation`, `Lower Reputation`, `Raise Stress`, `Change
  Location`. (`Change Location` specifically: WHERE's Focus text is
  edited directly, `data-ctx="where.summary"` — a separate code path
  that never calls `applyShift`, so the shift reducer that would log a
  location-change timeline event is simply never invoked.)
- **`campaign.oracles.usage`** (tracked on every real roll,
  `session.js`'s `rollOracle`) is read in exactly one place — a tie-break
  inside `buildStoryOptions`'s ranking (`docs/adr/0039` Phase 2). Nothing
  surfaces it as a stat, and `generateScene`'s own table picks don't read
  it at all.
- **Five confirmed dead exports** (zero callers anywhere in `src/domain`,
  `src/ui`, or `tests`, checked by direct grep): `entities.js`'s
  `getFactionDossier` (a full faction-profile aggregator — member
  entities, governed locations, goal progress, allies/rivals, event
  history — already built and tested, never rendered),
  `relationshipCount`, `toggleEntityStatblockFieldAttribute` (a distinct,
  also-unwired sibling of the already-known-intentionally-unwired
  `statblocks.js` toggle functions CLAUDE.md's "Known non-issues"
  documents), `setEntityTags`; and `oracles.js`'s
  `oraclePathsWithAnyTag`.
- **`worldbuilding.js`'s three generators are already fully wired**
  (Creature Concept/Site Concept/Adventure Seed, each with a real button
  in the Journal drawer, and Site Concept/Adventure Seed also on WHERE) —
  confirmed NOT a gap, despite looking like an obvious one going in.

The dashboard's job is to turn the underused primitives above into one
coherent surface, not to invent new generation mechanics — everything
below composes existing, tested domain functions.

## Decision

### 12a — New `dashboard` view

A 6th entry in `ui/workspace/index.js`'s `VIEWS` map, alongside `who`/
`where`/`what`/`why`/`how`, reachable from the same `[data-strip]` tab
strip mechanism (`ui/shell.js`) — additive, not a replacement. The five
focused tabs keep their exact current behavior and stay necessary for
what doesn't fit a dashboard grid without becoming clutter: a full rich-
text Journal note, a deep entity edit, the Oracle drawer's whole tree.
Likely becomes the new default landing tab (`context.active`'s initial
value), but that's a small, separate decision at build time, not part of
this ADR's scope.

Layout, top to bottom:
- **Header strip**: current Location(s) + System/Star/District (reuses
  `locationSummaryHeader`, already built for WHERE), current Activity,
  WHAT's 5 dials shown compactly (reuses existing slider markup).
- **Left column**: WHO's entity picker (condensed) + WHERE's factions/
  conflicts-here digest (reuses `locationFactionsBlock`/
  `locationConflictsBlock`, already built, zero new domain code).
- **Center column**: the FULL `buildStoryOptions()` list (not condensed
  to 3 the way the Co-Pilot panel's card is) — this is the dashboard's
  primary "cumulative option-building" surface.
- **Right column**: the Narrative Composer (12b).
- **Bottom**: condensed Threads/Foreshadowing/World Flags (reuses
  existing blocks).

Every piece listed above already exists as a render function — 12a is
primarily a new layout/composition pass, not new domain logic.

### 12b — Narrative Composer

New `domain/copilot.js` export, `composeNarrativeDraft(campaign,
{ selectedOptionIds })`, generalizing `recomposeSceneText`'s live-
recompose-on-edit pattern and `buildSessionRecap`'s multi-signal-
assembly pattern into one reusable composer: reads WHO/WHERE/WHAT/WHY/
HOW's current field values plus whichever Story Option(s) the GM has
marked "in play right now" (`selectedOptionIds`, new ephemeral dashboard
state — a Set, same shape as `docs/adr/0039`'s `dismissedStoryOptionIds`,
but a distinct concept: "selected for this composition" isn't "used/not
interested"), and template-composes a draft paragraph the same way
`recomposeSceneText` assembles a Scene's fields.

Rendered as an editable mention-editor field on the dashboard — never
read-only-final (Article II: the GM always has the last word on what
actually happened) — with a "📋 Copy" action and a "＋ Send to Journal"
action (the existing `addNote`), mirroring Session Recap's own explicit-
save posture exactly. Nothing here writes to the campaign automatically.

### 12c — Oracle-tailored dropdowns beyond WHY

Extends the two existing "selection → tailored oracle" hooks with the
same static-lookup-table architecture `GAMEPLAY_AREAS`/
`LENS_ORACLE_CATEGORIES` already use (data, not a new mechanism):
- WHAT's `Intent` dropdown (`Discovery`/`Travel`/`Social encounter`/...)
  gains an Intent → Oracle-category lookup, the same shape as
  `suggestRulesLens`'s Activity → provider lookup.
- The dashboard's own WHO/WHERE selections feed into the SAME
  `sceneContext`-weighted lens draw `docs/adr/0039` built for WHY
  (`drawSuggestionLenses`'s `sceneContext` param), just triggered from
  the dashboard instead of only WHY.

Changing a dropdown should visibly change which Oracle table gets
suggested next, closing the literal "dropdown selections that display
suggested oracles tailored to the selections" ask.

### 12d — Close the SHIFTS reachability gap

Surface the 8 orphaned reducers (`Deepen Mystery`, `Resolve Mystery`,
`Gain Resources`, `Spend Resources`, `Raise Reputation`, `Lower
Reputation`, `Raise Stress`, `Change Location`) as dashboard quick-action
chips, mirroring the existing `WHAT_ACTIONS` chip row exactly.
`context.js`'s `applyShift` already handles all 17 reducers uniformly —
this is a pure UI gap, zero domain changes needed.

### 12e — Dead-export housekeeping (decision point, not auto-resolved)

- **`getFactionDossier`** — the one orphan worth wiring up: a "📋 View
  Dossier" button on the Faction card, rendering what's already
  aggregated (member entities, governed locations, goal progress,
  allies/rivals, event history) instead of leaving it built-and-unused.
- **`relationshipCount`, `toggleEntityStatblockFieldAttribute`
  (entities.js layer), `setEntityTags`, `oraclePathsWithAnyTag`** — no
  clear use surfaced by this audit. Recommendation: remove them
  (CLAUDE.md's own "if you're certain something is unused, delete it"
  guidance) rather than build UI for something nobody asked for — but
  named explicitly here so a future pass doesn't have to re-derive that
  they're dead before deciding.

## Alternatives considered

- **Strengthen the existing strip/Co-Pilot instead of merging tabs**
  (this ADR's own default recommendation going in). Rejected per direct
  instruction — the ask was for a genuinely merged, visual decision-
  making surface, not an incremental strengthening of what already
  exists. Recorded here because it's the lower-risk path a future
  reviewer might reasonably ask "why wasn't this enough" about.
- **Replace the five W-tabs with the dashboard entirely.** Rejected —
  a dashboard grid has no room for a full rich-text Journal note editor,
  a deep entity inspector, or the Oracle drawer's whole tree without
  becoming unusable clutter; the five tabs stay for that work. The
  dashboard is a new "big picture / decision-making" mode, not a
  replacement for focused editing.
- **A literal step-by-step wizard for "randomly generated scene-
  development steps"** (a modal/state-machine walking the GM through
  WHO→WHERE→WHY→compose in sequence). Considered and set aside in favor
  of the dashboard's own top-to-bottom layout reading as that same
  sequence naturally, with no new state machine — matches "reduce
  cognitive effort" (Article X) even while adding a new surface; can be
  revisited if the layout alone doesn't read as guided enough once built.
- **A mechanized session-composition ratio** (35/25/20/15/5, `docs/
  adr/0008`'s explicitly-declined item). Not revisited — nothing in this
  request asks for it, and it was declined for reasons unrelated to this
  ADR's scope.

## Consequences

- Nothing in 12a–12e changes existing behavior on WHO/WHERE/WHAT/WHY/HOW
  — every reused function (`locationSummaryHeader`, `locationFactionsBlock`,
  `locationConflictsBlock`, `buildStoryOptions`, `recomposeSceneText`-
  style composition, `drawSuggestionLenses`) is called exactly as it
  already is; the dashboard is a new consumer, not a modified producer.
- `composeNarrativeDraft` (12b) is the one genuinely new domain function
  in this roadmap; everything else in 12a–12d is either pure UI
  composition of existing render functions or small, mechanical wiring
  (12d) / lookup-table data (12c).
- This ADR is the recorded exception to Article X for the `dashboard`
  view specifically — CLAUDE.md is updated alongside this ADR to say so,
  per this repo's "no two docs get to disagree" discipline.
- None of 12a–12e is built in the same pass as this ADR — it's a roadmap,
  scoped for incremental follow-up work, same rhythm as this session's
  own Story Options phases (`docs/adr/0039`).

## Related packs / ADRs

`docs/adr/0009-situation-engine-revisited.md` (Suggestion Lenses, the
deferred "surface fear/need on Negotiate" idea Story Options already
realized), `docs/adr/0039-reference-library-release-hosting-and-story-
options.md` (Story Options, `gatherSceneContext`, `dismissedStoryOptionIds`
— the direct precedent 12a–12c extend), pack 50's Article X (superseded
for the `dashboard` view only, by this ADR).
