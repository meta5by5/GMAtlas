# GMAtlas — New Functionality Design

*Companion to the Phase 0 foundation. Covers what the re-architecture
made possible, what's already built, and what's proposed next.*

**Rebaselined 2026-07-15** — this file used to carry ~250 lines of
phase-by-phase prose that had drifted into duplicating both
`PROGRESS.md`'s Status Summary and the individual ADRs (the actual
source of truth for *why* a decision was made). Nothing was lost:
`docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md` has the full
verbatim history. This file now stays short — a pointer to what's built,
and the live forward-looking roadmap.

A 77-document Design Constitution lives under `requirements/` — a much
larger long-range vision than anything below, reconciled against this
repo in `docs/adr/0001-adopt-design-constitution.md`. `PROGRESS.md` is
the full phase-by-phase change-log; `docs/adr/` holds the reasoning
behind any specific decision. This file's only job is the roadmap.

---

## Where we are

Phases 0–11 complete (session loop, Story-shift reducers, Co-Pilot,
Threads, entities/relationships/Graph, statblocks, Document Library,
Party/Colony/Guide, Context Graph depth, Universal Search, Activity-
driven gameplay + genre packs, Trade/Missions/Faction depth, Gallery +
Battlemap). **Phase 12 (Story Dashboard) is functionally complete** —
12a/12b shipped 2026-07-15, 12f (full consolidation) shipped 2026-07-16;
12c is superseded by Phase 13, 12e still proposed, 12d partially done.
**Phase 13 (Scene Operating Model) is in progress** — 13a/13b (the scene
data model: Location Details + WHO's three NPC scene-groups) shipped
2026-07-16, same day as the roadmap; 13c–13k remain roadmap-only — see
below. For what shipped and why, `PROGRESS.md`'s Status Summary is current;
`docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md` has the full
per-phase detail this file used to carry inline.

---

## Phase 12: Story Dashboard (in progress)

Full design in `docs/adr/0040-story-dashboard.md` (12a/12b implemented
2026-07-15, 12f implemented 2026-07-16; 12c/12e still proposed, 12d
partial). Direct request: the 5-W workspace needed a genuinely
interactive, narrative-building surface — oracle suggestions and
cumulative story options the GM can steer live at the table, not just
entity pickers and text fields. Confirmed via direct question: this
**deliberately reverses Article X** ("the workspace changes, not the
application," one question at a time) — 12a shipped it as an additive 6th
view alongside the five existing W-tabs; a direct follow-up request went
further still (12f, below) and retired the five tabs entirely, folding
their editable content into the Dashboard as open/collapsible sections
and every suggestion-generating control into the Co-Pilot panel. Recorded
as an explicit, escalating exception in the ADR, not a silent
contradiction.

An audit of `src/domain/*.js` against `src/ui/**/*.js` found the
building blocks already exist, underused — `scenes.js`'s
`recomposeSceneText` (a live field→narrative composer, scoped only to
Scenes), `recap.js`'s `buildSessionRecap` (a multi-signal→prose
assembler, one fixed shape), `activities.js`'s `suggestRulesLens` (the
only other "selection→oracle suggestion" hook besides this session's own
WHY-only Story Options, `docs/adr/0039`), 8 of `context.js`'s 17
`SHIFTS` reducers reachable from no UI control at all, and a handful of
confirmed-dead exports (see the ADR for the full list). Phase 12 turns
these into one coherent surface rather than inventing new mechanics:

- **12a — New `dashboard` view — done, then superseded by 12f**:
  originally shipped as a 6th tab additive to WHO/WHERE/WHAT/WHY/HOW.
- **12b — Narrative Composer — done**: `composeNarrativeDraft()`,
  generalizing `recomposeSceneText` + `buildSessionRecap` into a draft
  paragraph — "📋 Copy" / "＋ Send to Journal," never auto-applied. Shipped
  as a read-only live preview rather than the originally-sketched editable
  field — a live-recomputed field would clobber a hand-edit on the next
  unrelated re-render; polishing happens after Send, in the Journal note
  itself.
- **12f — Full consolidation — done (2026-07-16)**: direct follow-up
  fixed a real bug (the Composer/Story Options weren't reflecting free
  prose typed into WHO/WHERE's Focus fields — they only ever read parsed
  `@mentions`, never the surrounding text; fixed by using the raw Focus
  text directly) and went further on the design — **the 5 individual W
  tabs are retired entirely**, their editable content folded into the
  Dashboard as open/collapsible sections, the Composer moved to the
  workspace's top-right (sticky), and every suggestion/oracle-generating
  control (Story Options — now the full list, not condensed — both
  Suggestion Lens pickers, Site Concept/Adventure Seed, Rules Lens
  suggestion, Continue Story, the WHAT_ACTIONS shift chips) relocated into
  the always-visible Co-Pilot panel as "an active decision sandbox."
- **12c — Oracle-tailored dropdowns beyond WHY** — superseded by Phase
  13's 13d (below), not built as its own item.
- **12d — Close the SHIFTS reachability gap** (partially done): 12f
  relocated the 6 `WHAT_ACTIONS` chips into Co-Pilot; the 8 *other*
  orphaned reducers (Deepen/Resolve Mystery, Gain/Spend Resources, Raise/
  Lower Reputation, Raise Stress, Change Location) are still not surfaced
  anywhere — `applyShift` already handles all 17 uniformly.
- **12e — Dead-export housekeeping** (not yet built): wire up
  `getFactionDossier` (the one orphan worth it — a full faction profile,
  already built and tested); remove the rest (no surfaced use).

12a/12b landed same-day, 12f the next day; 12c/12e still scoped for
incremental follow-up, same rhythm as this session's Story Options
phases.

---

## Phase 13: Scene Operating Model (in progress)

Full design in `docs/adr/0041-scene-operating-model.md` (13a/13b
implemented 2026-07-16, same day as the roadmap; 13c–13k still proposed).
Direct follow-up, much larger than Phase 12: the Dashboard/Co-Pilot shell
is right but still mostly empty of the actual scene content a GM needs to
run a scene end-to-end. Confirmed via 3 direct questions before scoping:
the roadmap pass was roadmap-only (several pieces have no existing
pattern to extend and building blind risks redoing work); oracle
"learning" is scoped down to extending the already-proven
`oracles.overrides` mechanism, not a new weighted-preference layer; the
first phase to actually build was the scene data model (13a/13b), since
everything else reads or writes it.

- **13a — Location hierarchy / Location Details — done**: a `sector`
  field, an `objectType` select, oracle-populated sights/smells/sounds
  (new `Location Themes.Sight/Smell/Sound` oracle tables), and an
  expander on WHERE's location chip showing `[immediate location] at/on
  the [object] in the [star system] [sector]` — composed entirely from
  flat fields on the location entity itself, no structural parent walk
  needed for the title.
- **13b — WHO: three NPC scene-groups + per-NPC scene fields — done**:
  Protagonists (`#character`-tagged, derived from WHO's @mentions) /
  Antagonists (everyone else mentioned) / Bystanders (GM-added), each NPC
  expandable to scene-scoped Disposition/Motivation/Threat Rank/
  Challenges/Opportunities — oracle-seeded, edits remembered via
  `oracles.overrides` (a rolled-then-edited field writes back to that
  exact table entry; a hand-typed field doesn't, since it was never
  sourced from one). Lives on the current scene object (`scenes.js`'s new
  `npcStates`), not a permanent entity mutation. `currentGoal` reuses the
  field `ensureNpcFields` already added.
- **13c — WHAT: News Events, Dangers, Shared Circumstances** (roadmap
  only): tracker-linked announcements, a cross-scene Dangers list
  (`foreshadowing.js`'s open/paid-off shape is the closest precedent),
  and an algorithmic "combine present NPCs + trackers" circumstance
  generator extending `buildStoryOptions`'s weighting.
- **13d — WHY: oracle filtering tailored by carried-over situations**
  (roadmap only, absorbs the old 12c): Threads/Foreshadowing/World Flags
  as the filter input for which oracle tables get suggested.
- **13e — HOW: role-play suggestions + asset/gear associations**
  (roadmap only): extends Story Options' shape, plus a new algorithmic
  generator over the Item entity type + `data/gearCatalog.js`.
- **13f — Oracle learning via `oracles.overrides`**: not a separate
  build — every 13b/13c/13e auto-populate button routes through this one
  existing mechanism as it's built.
- **13g — Guided step-by-step scene mode** (roadmap only, biggest open
  design question left): an optional low-effort walkthrough — roll dice,
  pick a direction, nothing more. Needs its own design pass once 13a-13c
  exist to walk through.
- **13h — Manual dice-result → consequence calculation** (roadmap only):
  a GM-typed physical die result feeding the same outcome-comparison
  logic `dice.js` already computes internally from `Math.random`.
- **13i — Co-Pilot as a persistent tab in the drawer group** (roadmap
  only): a real architectural change — folding Co-Pilot into the
  existing `openDrawers` tab-group machinery (which already supports
  multiple pinned tabs + collapse-to-edge) instead of its own fixed CSS
  Grid column. Ctrl+Left/Right is retargeted to cycle that group's tabs
  (superseding Phase 12f's dashboard-section-expand binding).
- **13j — Responsive 3-column layout** (roadmap only, paired with 13i):
  trackers become a middle card when the tab group is open, the right
  card when it's collapsed.
- **13k — 5-W jump-button row** (roadmap only): a small-font button row
  that collapses every other Dashboard section and expands the clicked
  one — self-contained, can land whenever its turn comes.

---

## Also still open (not part of Phase 12)

- **Shipyard companion link** — scoped (`docs/adr/0029-shipyard-
  deckplan-builder.md`), not built: a gridless Battlemap map + a
  Gallery-style tagged part library + icon rotation/flip.
- **Sync adapter / shared campaign database** — backend chosen
  (Supabase), but bundled with a full multi-user/auth ask that's a
  genuine architectural fork from this app's local-first design
  (`docs/adr/0028-multiuser-access-and-cloud-sync.md`) — long-horizon,
  explicitly not started pending its own architecture pass.
- **Battlemap Encounter Roadmap 11b–11f** (`docs/adr/0024-battlemap-
  encounter-roadmap.md`) — encounter overlays, room/asset templates +
  procedural generation, deeper campaign-integration links, manual-
  reveal fog of war, multi-map floors, all feature-flagged extensions of
  the one Battlemap subsystem (11a, done). None start before 11a is
  fully finished.
- **UI/UX open items** (2026-07-03 review, partially resolved
  2026-07-04): no in-session undo beyond the one-slot backup key; toasts
  are single-slot and can clobber each other during multi-file upload;
  icon-only buttons rely on hover tooltips that don't fire on touch; "more
  compact access to forms and tabs" on mobile (2026-07-08 ask) is
  unscoped pending specifics on which screens feel cramped.
- **Plugin-style rules-lens registration** — the Constitution's
  long-horizon "Ecosystem" milestone; not worth building until more than
  two rulesets have proven the Activity→Lens pattern.

---

## Explicitly not adopted

See `docs/adr/0001-adopt-design-constitution.md` for reasoning: a formal
typed Event Bus (no Refactor Trigger hit yet), a split Context Graph /
Knowledge Graph (merged is fine at this maturity level), a full
Act/Mission/Objective/Scene/Beat/Moment story hierarchy (the corpus
itself doesn't agree on one across its own packs).

`requirements/initial design inputs/gameplay-goals.md`'s Rules
Constitution is reference data only (`src/data/rulesConstitution.js`,
read-only in Settings) — Traveller/Stars Without Number gameplay-area
mechanics (beyond the character rulesets/oracle content already built)
remain unauthored.

---

