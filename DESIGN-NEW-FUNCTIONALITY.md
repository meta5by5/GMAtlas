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
Battlemap). **Phase 12 (Story Dashboard) is proposed, not started** —
see below. For what shipped and why, `PROGRESS.md`'s Status Summary is
current; `docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md` has the
full per-phase detail this file used to carry inline.

---

## Proposed next — Phase 12: Story Dashboard

Full design in `docs/adr/0040-story-dashboard.md` (Status: Proposed —
none of this is built yet). Direct request: the 5-W workspace needed a
genuinely interactive, narrative-building surface — oracle suggestions
and cumulative story options the GM can steer live at the table, not
just entity pickers and text fields. Confirmed via direct question: this
**deliberately reverses Article X** ("the workspace changes, not the
application," one question at a time) for one new surface — recorded as
an explicit exception, not a silent contradiction; the five existing
W-tabs are untouched and stay necessary for what a dashboard grid can't
hold (a full Journal note, a deep entity edit, the Oracle tree).

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

- **12a — New `dashboard` view**: a 6th tab alongside WHO/WHERE/WHAT/
  WHY/HOW, composing already-built pieces (location summary, factions/
  conflicts-here, the full Story Options list) into one page.
- **12b — Narrative Composer**: a new `composeNarrativeDraft()`,
  generalizing `recomposeSceneText` + `buildSessionRecap` into a live,
  editable draft paragraph seeded by the dashboard's current selections
  — "📋 Copy" / "＋ Send to Journal," never auto-applied.
- **12c — Oracle-tailored dropdowns beyond WHY**: extend the
  Activity→Lens/Story-Options lookup-table pattern to WHAT's `Intent`
  and the dashboard's own selections.
- **12d — Close the SHIFTS reachability gap**: quick-action chips for
  the 8 orphaned reducers — a pure UI gap, `applyShift` already handles
  all 17 uniformly.
- **12e — Dead-export housekeeping**: wire up `getFactionDossier` (the
  one orphan worth it — a full faction profile, already built and
  tested); remove the rest (no surfaced use).

Scoped for incremental follow-up, same rhythm as this session's Story
Options phases — none of 12a–12e landed alongside this ADR.

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

## Testing posture

Every new capability lands as a pure domain function with unit tests
first, then a thin view and a browser smoke check. The invariant: risky
logic never lives in the DOM, so "can a GM run a four-hour session
without the software breaking" stays an assertion actually run, not a
hope.
