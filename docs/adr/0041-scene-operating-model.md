# ADR 0041 — Scene Operating Model (Phase 13)

## Status

**13a (Location Details) and 13b (WHO's three NPC scene-groups + scene-
scoped fields) implemented 2026-07-16, same day as the roadmap.** Both
built exactly as scoped below — no deviations. 13c–13k remain roadmap-
depth only (a paragraph, not a spec) and will get their own detailed pass
when their turn comes, same rhythm as `docs/adr/0040-story-dashboard.md`'s
own 12a→12f history. See "13a/13b implementation notes" near the end of
this ADR for what actually shipped (file/function names, test coverage).

This is a new phase/ADR rather than another 0040 sub-phase — Phase 12
(0040) is functionally complete through 12f, and this request is an order
of magnitude larger: roughly 10 separable pieces, several with no
existing pattern to extend.

## Context

Direct follow-up feedback on the Phase 12 Dashboard/Co-Pilot: the shell is
right (one consolidated view, collapsible sections, an always-visible
decision-making panel), but it's still mostly empty of the actual content
a GM needs to run a scene end-to-end. The request, condensed:

1. **See the whole scene at a glance**, condensed by default, each
   section/entity expandable for motivations and consequences.
2. **Oracles that auto-populate details**, with edits *remembered* and
   applied to future suggestions — not just a one-shot roll.
3. **An optional guided walkthrough** for advancing the story with
   minimal effort — roll dice, pick a direction, nothing more — for when
   the GM is mentally tapped out.
4. **Steer opportunities/consequences**, and a way to feed a *manually
   rolled physical die result* into the app so it computes the
   consequence, rather than only ever rolling internally.
5. **Opportunities/consequences/rewards/dangers/environment should make
   sense for the scene without adjustment** — adjustment is for
   reshaping mood/risk/story-arc focus, not for filling gaps the app
   should have filled itself.
6. A full re-layout: Narrative Composer top-right at title level: a
   Location Details hierarchy; a two-column Dashboard (5-W left, scene
   activity right); Co-Pilot **merged into the drawer tab group**
   (persistent tab, not a separate always-there column) with Ctrl+Left/
   Right cycling its open tabs and a collapse-to-edge arrow that never
   loses the open tabs; trackers repositioned depending on whether that
   tab group is open or collapsed; WHO split into three NPC groups
   (Protagonists/Antagonists/Bystanders) each with per-NPC scene fields;
   WHERE's location hierarchy (immediate location → system object → star
   system → sector) with adjacency suggestions; WHAT's News Events/
   Dangers/Shared Circumstances; WHY's carried-over-situation oracle
   filtering; HOW's role-play + asset/gear suggestions.

### Decisions confirmed before scoping (asked directly, not assumed)

- **This pass is roadmap + ADR only.** No workspace code lands in this
  pass — chosen over "roadmap + build the first phase now" and "skip the
  roadmap, build as much as possible," specifically because several
  pieces here (oracle "learning" memory, the guided walkthrough mode,
  merging Co-Pilot into the drawer tab-group architecture) don't have an
  obvious single correct design yet and building without agreeing the
  shape first risks having to redo work.
- **Oracle "learning" is scoped down to extending `oracles.overrides`**
  (`src/domain/oracles.js`) — an already-proven mechanism where an edit
  to an oracle table entry becomes that entry's new default for every
  future roll. Rejected: a new weighted-preference layer that tracks the
  *pattern* of a GM's edits (e.g. "leans toward 'wary' over 'hostile'")
  and biases future random picks accordingly — bigger, fuzzier, no
  existing precedent, would need its own dedicated design pass. Every
  new "🎲 auto-populate" field this phase adds (13b's Disposition/
  Motivation/etc., 13c's News Events, 13e's asset suggestions) routes its
  edits through this same one mechanism — not a new subsystem per field
  type.
- **First increment to actually build (next turn): 13a + 13b** — the
  scene *data model* (WHO's three NPC groups + per-NPC scene fields, and
  WHERE's Location Details hierarchy) — over WHAT's generators, the
  Co-Pilot/tab-group merge, or the guided walkthrough mode. Reasoning:
  every other piece either reads or writes this data (Shared
  Circumstances reads NPC fields + location; the guided mode walks
  through scene state that doesn't exist without this; Co-Pilot's asset/
  danger suggestions need somewhere to point) — building it first avoids
  designing downstream pieces against a data shape that doesn't exist yet.

## Decision — Phase 13 roadmap

### 13a — Location hierarchy / Location Details (LD) — **Implemented**

New Location entity fields (`ensureWorldProfileFields`,
`src/domain/entities.js` — alongside the already-existing `zone`/
`starSystem`/`bases`, none of which change): `sector` (free text),
`objectType` (planet/comet/derelict/station/etc, a `<select>`), and
`sights`/`smells`/`sounds` (oracle-populated the same way 13b's NPC
fields are — reusing WHERE's existing suggested-oracle path,
`['Location Themes', 'Sensory Detail']`, `src/domain/copilot.js:134`).

WHERE's existing `currentLocationBanner` IL chip (`src/ui/workspace/
index.js`) gains an expander opening a new "Location Details" block —
title composed as `[immediate location] at/on the [objectType] in the
[starSystem] [sector]`. The structural chain reuses
`getContainingLocation`/`getContainedLocations` (entities.js); the flat
System/Star/Colony-Base/District fields `locationSummaryHeader` already
renders today become the fallback text for whichever level isn't a
separate structural entity. "Adjacent IL" suggestions extend the
already-built `nearbyLocationsBlock` (structural siblings under the same
parent) — likely a relabel/polish, not new data: it already answers
"what else is around here."

A location is never the star itself, only a system object or something
finer inside one — this is a modeling constraint on what a GM creates as
a Location entity, not new schema.

### 13b — WHO: three NPC scene-groups + per-NPC scene fields — **Implemented**

New **scene-scoped** state — deliberately not a permanent entity
mutation, since these values are "specific to this situation." Lives on
the current `doc.scenes[]` entry (the same object `lastScene()`'s
Opening/Driver/Clue/etc. fields already live on): a new `npcStates` map
keyed by entity id, `{ group, disposition, motivation, threatRank,
challenges, opportunities }`.

Grouping:
- **Protagonists** = WHO's already-computed `whoEntities`
  (`gatherSceneContext`, copilot.js) filtered to entities tagged
  `#character` (the existing `entity.tags` mechanism — no new tag
  vocabulary needed).
- **Antagonists** = the rest of `whoEntities`.
- **Bystanders** = a new lightweight GM-driven add-list, not
  auto-derived — there's no existing "who's physically nearby but
  unmentioned" query safe to build this from automatically.

`currentGoal` is **already built** (`ensureNpcFields`, entities.js,
pre-dates this ADR) and gets reused directly for the "current goal" row —
not reinvented. Disposition/Motivation/Threat Rank/Challenges/
Opportunities are new: each gets a "🎲 auto-populate" oracle roll
(reuses the existing `rollOracle`) seeding an editable field; an edit
writes back through `oracles.overrides` per the learning decision above.

**Explicitly out of scope for 13b**: the bidirectional "Threat Rank
auto-adjusts `context.what.threat`" / "Motivation auto-adjusts
`context.how.activity`" calculation loop the original request describes.
That needs the fields to exist first, and needs a concrete rule for what
"makes sense" actually means in practice — flagged as a likely 13c/13f
follow-on, not committed to sight-unseen.

### 13c — WHAT: News Events, Dangers, Shared Circumstances (roadmap only)

**News Events**: a tracker-linked announcement — a category (faction
conflict / job opportunity / tax-fee-license / indirect conflict), a
read-only generated blurb, and a real tracker delta + timeline log entry.
Extends the existing `SHIFTS`/`applyShift` pattern (`src/domain/
context.js`) rather than inventing a second reducer mechanism.

**Dangers**: a list that persists *across* scenes (unlike 13b's NPC
states, which are current-scene-only) — closest existing precedent is
`src/domain/foreshadowing.js`'s open/paid-off shape; likely a sibling
module (`dangers.js`) rather than folded into an existing one.

**Shared Circumstances**: an algorithmic generator combining present
NPCs' new 13b fields (challenges/opportunities/current goal) with the
campaign's 5 trackers into a weighted oracle pick — a direct extension of
`buildStoryOptions`'s existing weighting pattern (copilot.js), not a new
ranking mechanism.

Revealed-info-from-NPCs (a collapsed list the GM unveils manually) likely
reuses the generic `entity.revealed` field every entity already has, in
a new scene-scoped list rather than a schema change.

### 13d — WHY: oracle filtering tailored by carried-over situations (roadmap only)

Reuses Threads/Foreshadowing/World Flags — already this app's "what
carries over between scenes" mechanism — as the filter input for which
oracle tables get suggested. **This absorbs `docs/adr/0040`'s still-open
12c** ("oracle-tailored dropdowns beyond WHY") — 12c is recorded there as
superseded by this phase, not tracked twice.

### 13e — HOW: suggestions + asset/gear associations (roadmap only)

Role-play/negotiation suggestions extend Story Options' existing shape.
"Assets useful and relevant... scatter terrain, tools, gear" is a new
algorithmic generator over the existing Item entity type +
`data/gearCatalog.js` (`entities.js`'s `createItemFromCatalog`), driven
by tags and the location/faction's rules provider rather than purely the
generic relationship system.

### 13f — Oracle learning via `oracles.overrides`

Not a separate build — every auto-populate button 13b/13c/13e add routes
its edits through the existing override mechanism as it's built. Called
out as its own line only because it's a cross-cutting decision worth
naming, not because it needs its own implementation pass.

### 13g — Guided step-by-step scene mode (roadmap only — biggest open design question left)

A new interaction mode: optional (a toggle, never forced), walks through
revealing/investigating the scene's events in sequence, and at each step
only asks the GM to roll dice and pick a direction — never free-form
authoring. Needs its own dedicated design pass once 13a-13c's data
actually exists to walk through; nothing more is decided here.

### 13h — Manual dice-result → consequence calculation (roadmap only)

Today every roll (`src/domain/dice.js`'s `rollAction`/`rollFlat`/
`rollTraveller`) computes its own result internally via `Math.random`
(RNG-injectable for tests only — CLAUDE.md's own "Known non-issues" is
explicit that real gameplay rolls stay non-deterministic). This needs a
new path that accepts a GM-typed *physical* die result instead and
computes the same hit/success outcome from it — likely a thin variant
reusing each function's existing outcome-comparison logic with the roll
value passed in rather than generated.

### 13i — Co-Pilot as a persistent tab in the drawer group

A real architectural change, not a wiring job. Today `.mc-copilot` is a
fixed CSS Grid column (`grid-area: copilot`, `styles/cockpit.css`),
entirely separate from `openDrawers`/`activeDrawer`/`drawerCollapsed` —
the drawer tab-group machinery (`src/ui/shell.js`'s `toggleDrawer`/
`closeDrawerTab`/`data-drawer-collapse`) that **already** supports
multiple pinned-open tabs plus a collapse-to-edge arrow that doesn't lose
them. Plan: fold Co-Pilot into that same `openDrawers` array as one more,
always-present, not-closable-by-✕ tab, instead of its own `copilotOpen`
boolean — the "always display an arrow to collapse... without losing the
open tabs" ask already exists for this exact group today; it just needs
Co-Pilot folded in as a member instead of building a second version of
the same mechanism.

Ctrl+Left/Right is **repurposed again** — from Phase 12f's
dashboard-section-expand cycling to cycling the open tabs in this group
instead. Not actually a conflict with the request: the 5-W jump
navigation it separately asks for (13k) is click-button-only, not
keyboard, so Phase 12f's dashboard-section Ctrl+Left/Right binding is
simply superseded, not contended over.

### 13j — Responsive 3-column layout

Paired with 13i, not separable. Trackers move to a new middle card under
the Narrative Composer when the tab group is open (3 columns: 5-W left /
trackers+NC middle / tabs+Co-Pilot right), collapsing to 2 columns (5-W
left / trackers+NC right) when the tab group is minimized. A real CSS
Grid change — a conditional column count driven by the tab-group's
collapsed state — not just a reflow within one existing column.

### 13k — 5-W jump-button row

A small-font button row at the top of the Dashboard's left column
(WHO/WHERE/WHAT/WHY/HOW) that, on click, collapses every *other* section
and expands+scrolls to the clicked one — distinct from each section's own
independent ▸/▾ toggle (Phase 12f, stays additive/independent, unaffected
by this). Small and self-contained; doesn't depend on 13a/13b's data, so
it can land any time once its turn comes.

## 13a/13b implementation notes (2026-07-16)

Built exactly as scoped above, no deviations. Concrete shape, for a
future session picking up 13c onward:

- **New oracle content** (`data/tables.js`, default/'hostile' genre pack
  only — cyberpunk/fantasy packs don't have these tables yet, which
  degrades gracefully to "nothing to roll" rather than an error, same
  posture as every other genre-pack-specific gap in this app):
  `Characters.Opportunity` and `Characters['Threat Rank']` (new, mirror
  `Complication`'s existing tone); `Location Themes.Sight/Smell/Sound`
  (new, split out of the existing mixed-sense `Sensory Detail` table so
  each labeled sense gets on-topic entries). Motivation reuses the
  already-existing `Characters.Want`; Disposition/Challenges reuse the
  already-existing `Characters.Disposition`/`Complication` — no
  duplicate content authored for those three.
- **`entities.js`**: `ensureWorldProfileFields` gained `sector`/
  `objectType`; `ensureLocationFields` gained `sights`/`smells`/`sounds`
  + a `sensorySource` side-channel (`{sights,smells,sounds}`, each
  `null` or `{path,index}`) recording which oracle entry a sensory
  field's CURRENT value came from, if any. New export
  `LOCATION_OBJECT_TYPES` (the `objectType` `<select>`'s options) and
  `LOCATION_SENSORY_ORACLE_PATH` (field → oracle table path map).
- **`scenes.js`**: `generateScene` now seeds every new scene with
  `npcStates: {}`/`bystanderIds: []`. New exports: `getNpcSceneState`
  (read-only, returns the all-blank default shape for an untouched NPC —
  UI always renders through this, never `scene.npcStates[id]` directly),
  `ensureNpcSceneState` (mutating, used by session.js's roll/edit
  functions), `addSceneBystander`/`removeSceneBystander`, and the
  `NPC_SCENE_FIELD_ORACLE_PATH` map (disposition→`Characters.Disposition`,
  motivation→`Characters.Want`, threatRank→`Characters['Threat Rank']`,
  challenges→`Characters.Complication`, opportunities→
  `Characters.Opportunity`). `currentGoal` is deliberately NOT part of
  this map — it's the pre-existing permanent `npc.currentGoal` entity
  field, reused as-is.
- **`session.js`** (orchestration, mirrors `generateNpc`/`deepenNpc`'s
  existing "roll from oracles.js, patch via entities.js/scenes.js" shape):
  `rollNpcSceneField`/`editNpcSceneField` and
  `rollLocationSensoryField`/`editLocationSensoryField`. Rolling records
  the exact table+index picked; editing a field whose value came from a
  roll ALSO calls `oracles.js`'s `updateOracleEntry` on that same
  table+index — the "remembered, applied to subsequent suggestions" half,
  scoped down (per the confirmed decision above) to reusing this one
  existing mechanism rather than a new one. A hand-typed value (never
  rolled) has no source to write back to, so editing it is a plain field
  update — verified explicitly in tests (a rolled-then-edited field DOES
  create an override; a typed-only field does NOT).
- **`ui/workspace/index.js`**: WHO's body gained `npcSceneGroupsBlock`
  (Protagonists/Antagonists derived live from `gatherSceneContext`'s
  `whoEntities` + the `#character` tag; Bystanders read from the current
  scene's `bystanderIds` with an add-`<select>`/✕-remove), rendering each
  NPC via `npcSceneCard` (collapsed to a name chip by default,
  `ui.expandedSceneNpcs`) which expands to the reused `currentGoal` field
  plus the 5 new oracle-backed fields via the shared `oracleFieldRow`
  helper (label + 🎲 roll + editable text — also reused by WHERE below).
  Gracefully shows a placeholder ("Continue Story to start a scene")
  before any scene exists, since scene-scoped state has nowhere to live
  yet. WHERE's body gained `locationDetailsBlock` (collapsed by default,
  `ui.expandedLocationDetails`) — the `[IL] at/on the [objectType] in the
  [starSystem] [sector]` title composed entirely from flat fields on the
  IL entity itself (no structural parent walk needed, unlike
  `locationSummaryHeader`'s own District field just above it), plus the
  three sensory `oracleFieldRow`s.
- **`ui/shell.js`**: new explicit-id `id::field` handlers
  (`data-scene-npc-field`, `data-location-field` — mirror the existing
  `data-faction-field` convention exactly, since these edit a specific
  NPC/Location, not necessarily Cast's active entity) plus toggle/roll/
  add/remove handlers. New `currentSceneId()` helper resolves "the latest
  scene" fresh at click/change time (never stale — this app fully
  re-renders after every mutation).
- **Verification**: 5 new domain tests (447 total) covering the new
  entity-field defaults, `generateScene`'s seeded shape, bystander add/
  remove/dedupe, and — the two tests that matter most for the "learning"
  half — that a rolled-then-edited field writes back to `oracles.overrides`
  at the exact right index while a hand-typed field does not, for both
  the NPC-field and Location-sensory-field versions. `node scripts/
  build.js` stays clean (77 modules). No browser automation available in
  this environment — verified via a direct Node smoke test of
  `renderWorkspace` exercising the full round trip (create entities →
  tag one `#character` → mention both in WHO/WHERE Focus → generate a
  scene → add a bystander → roll a Disposition → edit it → re-render)
  against both the real app's all-collapsed default UI state and a fully
  expanded one, confirming no throw and every expected element present.

## Alternatives considered

- **One giant pass building everything described.** Rejected outright —
  at least 3 pieces (oracle learning, the guided mode, the Co-Pilot/
  drawer merge) have no existing pattern to extend and a wrong guess at
  their shape would mean redoing real work; CLAUDE.md's own "no
  half-finished implementations" argues against committing to a design
  this large without checkpoints.
- **A weighted-preference oracle "learning" layer** (tracking edit
  *patterns*, not just remembering the last edit per table entry).
  Rejected for v1, per the direct answer above — `oracles.overrides`
  already does the concrete, provable half of "remembered and applied to
  subsequent suggestions"; a pattern-learning layer is a genuinely
  different, fuzzier feature that deserves its own scoping conversation
  once the simpler version is in use and its gaps are known.
- **Auto-derive Bystanders from location presence** instead of a
  GM-driven add-list. Rejected for 13b — there's no existing query for
  "NPCs physically nearby but not @mentioned anywhere," and inventing one
  now (versus reusing WHO/WHERE's established @mention-is-truth
  convention) risks a second, competing "who's really in the scene"
  signal; a manual add-list is honest about that gap instead of papering
  over it with a guess.

## Consequences

- Nothing lands in `src/` this pass — this ADR and its companion doc
  updates (`PROGRESS.md`, `DESIGN-NEW-FUNCTIONALITY.md`) are the entire
  deliverable. `npm test`/`node scripts/build.js` are unaffected (442
  passing, 77 modules — unchanged from before this pass).
- `docs/adr/0040-story-dashboard.md`'s 12c is recorded as superseded by
  13d, per CLAUDE.md's "no two docs get to disagree" rule — it stays
  listed there for history, not silently dropped, but this ADR is now the
  authority on that specific piece of work.
- 13a/13b's scene-scoped `npcStates` living on the current `doc.scenes[]`
  entry (rather than a new top-level `campaign` array) is a real
  precedent-setting choice for the rest of Phase 13 — 13c's Shared
  Circumstances and 13g's guided mode should follow the same "scene-
  scoped state lives on the scene object, cross-scene state gets its own
  module" split established here, not reinvent the boundary per feature.

## Related packs / ADRs

`docs/adr/0040-story-dashboard.md` (Phase 12 — the Dashboard/Co-Pilot
skeleton this phase fills in; 12c superseded by 13d above),
`docs/adr/0039-reference-library-release-hosting-and-story-options.md`
(Story Options/`gatherSceneContext` — the pattern 13c's Shared
Circumstances and 13e's suggestions extend), `docs/adr/0037-
foreshadowing-worldflags-npc-goal.md` (`currentGoal`, `foreshadowing.js`'s
open/paid-off shape — the precedent 13c's Dangers module follows),
`docs/adr/0031-swn-faction-turn-engine.md` (`oracles.overrides`'s
original design intent, "drives Co-Pilot suggestions later" — 13f is
that "later," now for NPC/location fields too, not just table entries).
