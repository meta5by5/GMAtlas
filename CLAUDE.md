# CLAUDE.md — Saga Atlas

Context for Claude Code when working in this repo. Read this before making changes.

## What this is

Saga Atlas is a campaign operating system for solo and GM-run sci-fi tabletop
play — a static, local-first, installable-as-PWA web app. It's a **clean
re-architecture** branched from a v0.53 prototype ("Hostile Sci-fi
Worldbuilder", now rebranded), not an incremental patch of it. The old
codebase (patch-on-patch scripts, global function reassignment, 15 scattered
localStorage keys) is kept only as a design reference (`SagaAtlas-ChatGPT.zip`
under `requirements/`) — it is NOT part of this repo and its patterns are
exactly what this rewrite exists to avoid.

Design philosophy: **Frictionless Empowerment** — a GM should be able to run
a four-hour session without thinking about the software. Three visual tiers:
Primary (Mission Control: context strip, Adaptive Workspace, Co-Pilot),
Secondary (recommendation, breadcrumb timeline, story-shift actions),
Tertiary (Journal/Oracle/Cast/Party/Colony/Guide/Graph/Documents/Settings —
edge-tab drawers, zero space until opened). The defining interaction: **the
workspace changes, not the application** — selecting a context question
reshapes the center panel, never navigates away.

Also: **genre-aware, not genre-locked**. Nothing in the domain layer should
hardcode one ruleset's stat names or tables — statblock fields, oracle
tables, etc. are data.

## The Design Constitution (`requirements/`)

`requirements/` holds a 77-document "Saga Atlas Design Constitution"
(`design-principles-pack-01.md`...`-77.md`, plus a `design-principles-final-summary.md`
and a condensed `SagaAtlas-Design-Constitution.zip`) — the full long-range
vision for this product, well beyond what's built today. It was reviewed in
full and reconciled against this codebase; see
`docs/adr/0001-adopt-design-constitution.md` for how, and
`PROGRESS.md` for the resulting roadmap. Two things worth knowing before
reading it:

1. **The corpus describes a mature end-state (its own "Level 4–5" on pack
   39's maturity ladder), not this repo's current state.** This repo is
   closer to Level 1–2 ("Organizer" reaching into "Assistant"). Don't treat
   a pack's present-tense description of a subsystem ("the Story Engine
   does X") as evidence that subsystem already exists here — check `src/`.
2. **The corpus is not fully internally consistent** (it was assembled
   across many sessions — three different packs read as intended
   endpoints, and terms like Context Graph/Knowledge Graph, and the
   Consequence/Thread state names, drift between packs). Where GMAtlas has
   picked one convention, that choice is recorded in the ADR — don't "fix"
   this code to match a pack that contradicts another pack.

The ten Articles of the Constitution (pack 50) are the top-level intent this
repo answers to: **I.** the campaign is the primary product · **II.** the GM
always retains creative authority · **III.** story is permanent, mechanics
are interchangeable lenses · **IV.** context is the foundation of every
recommendation · **V.** Mission Control is the primary workspace ·
**VI.** relationships create meaning · **VII.** everything important should
be connected · **VIII.** campaign data is sacred · **IX.** the platform
extends via engines/templates/activities/plugins, not parallel systems ·
**X.** Frictionless Empowerment — reduce cognitive effort, increase
meaningful creative control. When a design choice is ambiguous, these are
the tie-breaker.

### Terminology map (Constitution → this codebase)

| Constitution term | Here | Status |
|---|---|---|
| Storage Kernel | `src/core/store.js` | adopted, same shape |
| Canonical Campaign Object | `src/core/schema.js` `defaultCampaign()` | adopted, fewer top-level sections than the corpus's 12 |
| Context Graph | `src/domain/entities.js` relationships + `src/domain/graph.js` | partial — edges are `{to, label}`, not typed/weighted |
| Knowledge Graph | `src/domain/documents.js` + `@mention`/`@[Doc]` parsing | merged into Context Graph for now, deliberately (see ADR) |
| Story Engine | `src/domain/session.js` + `src/domain/context.js` | partial — `continueStory`/`applyStoryShift` exist; no `resolveScene` |
| Co-Pilot | `src/domain/copilot.js` `advise()` | adopted — its 4-field shape already matches the corpus's Recommendation Card closely |
| Entity Templates | `src/data/statblockTemplates.js` + `src/domain/statblockTemplates.js` | adopted (Phase 5) — Bestiary templates are a working instance |
| Rules Lens / Activity | `settings.statRuleset` + per-entity ruleset + `src/data/rulesConstitution.js` (reference table) | partial — not yet Activity-driven; HOW is still free text |
| Thread | `src/domain/threads.js` (progress clocks) | simplified — no lifecycle states, priority/urgency/momentum |
| Narrative Trackers | `context.what.threat` / `.mystery` | minimal — 2 of the corpus's ~10 named trackers |
| Consequence Engine | inline heuristic in `continueStory()` | ad hoc — no formal entity/state machine yet |
| Event Bus | `store.subscribe()` (single global listener, full re-render) | intentionally simpler — see rule 4 below; revisit only if a Refactor Trigger fires (pack 32) |
| Universal Search / Knowledge Cards | per-drawer search boxes | not unified yet |
| Campaign Director, Scenario Engine, Living World Engine | — | not built |

### The Rules Constitution (`requirements/gameplay-goals.md`, ADR 0002)

A sharper, more concrete version of Article III above: **every ruleset is a
content provider, not the application.** `src/data/rulesConstitution.js`
records which of six named systems (Starforged, Traveller, Five Parsecs
From Home, Hostile, Stars Without Number, Planetfall) is the intended
provider for each gameplay area (story structure, exploration, combat,
setting, trade, factions, ...), plus four responsibilities reserved for
Saga Atlas itself and never delegated to a ruleset (campaign memory, story
continuity, rules switching, the recommendation engine). It's a read-only
reference surfaced in Settings today — see `docs/adr/0002-rules-constitution.md`
for why this isn't yet an Activity → Rules Lens recommender (that's Phase
9, and this document didn't change its place in the priority order).
Traveller and Stars Without Number are named providers with **zero authored
data** right now (`RULES_PROVIDERS[id].status` says so honestly) — don't
assume they're integrated because they're listed.

## Non-negotiable architectural rules

These were deliberately chosen to structurally exclude v0.53's failure
modes. Ensure they work — treat them as this repo's answer to the
Constitution's "Architectural Fitness Functions" (pack 63): structural
rules that should hold at every commit, not just at design time. There's no
automated check for them yet; if you touch build tooling, adding lint rules
or a CI check for rules 2 and 4 (single storage module, no per-element
listeners) would be a reasonable first fitness function.

1. **One versioned campaign document is the single source of truth.**
   `src/core/schema.js` defines it (`defaultCampaign()`, `schemaVersion`).
   Everything reads/writes through it.
2. **Exactly one module touches `localStorage`**: `src/core/store.js`. It
   exposes `store.get()`, `store.update(fn)`, `store.subscribe(fn)`,
   `store.export()`, `store.import()`, `store.newCampaign()`,
   `store.bindFile()`. Nothing else calls `localStorage` directly.
3. **The domain layer (`src/domain/*.js`) is pure and DOM-free.** Every
   mutator takes a campaign object and returns a NEW one (via a local
   `clone()` — `structuredClone` with a `JSON.parse(JSON.stringify())`
   fallback). No mutation of the input. No side effects. This is what makes
   `node --test` able to cover the actual business logic headlessly.
4. **Exactly one delegated event listener per event type**, registered once
   on the root in `mountShell()` (`src/ui/shell.js`): `click`, `dblclick`,
   `change`, `input`, `dragstart`, `dragover`, `dragleave`, `drop`. All
   interaction routing goes through `data-*` attributes read via
   `target.closest('[data-whatever]')` inside those handlers — never
   per-element `addEventListener`, never global function reassignment
   (`window.foo = ...`), never polling/timing hacks. When adding a new
   interactive control, add a `data-*` attribute to the markup and a branch
   in the relevant delegated handler — don't attach a new listener.
5. **Migration never drops data.** `src/core/migrate.js` absorbs ~15 legacy
   v0.53/pre-rebrand `hostile*` storage keys into the one document and
   parks anything it can't map under `_legacy`. Any schema change should
   keep old exports importable.

## Where things live

```
src/
  core/
    schema.js      defaultCampaign(), schemaVersion, shape of everything
    store.js       the ONLY localStorage access; pubsub via subscribe()
    migrate.js     legacy v0.53 key absorption, lossless
    buildInfo.js   hand-maintained phase/version/changelog (Settings → Build)
  data/
    tables.js          SCENE_TABLES — oracle table content
    oracleGroups.js     ORACLE_GROUPS — category manifest for the Oracle tree
    rulesets.js         RULESETS — per-system character sheet templates
    statblockTemplates.js  DEFAULT_STATBLOCK_TEMPLATES — Bestiary field manifests per system
    rulesConstitution.js  RULES_PROVIDERS/GAMEPLAY_AREAS — Rules Constitution reference (ADR 0002)
    docsManifest.js     AUTO-GENERATED by scripts/build.js from assets/docs/ — gitignored
  domain/          pure, tested, DOM-free business logic
    context.js     WHO/WHERE/WHAT/WHY/HOW + story-shift reducers
    oracles.js     oracle table engine + grouped/collapsible tree (buildGroupedOracleTree, filterOracleTree)
    scenes.js      scene generation
    session.js     orchestration: continueStory, rollOracle, addNote, logRoll, etc.
    entities.js    NPCs/locations/factions/assets/lore + relationships + @mentions
    statblocks.js  statblock field CRUD, text<->numeric-track conversion, Bestiary template application
    statblockTemplates.js  campaign-level CRUD for Bestiary templates (Settings-editable)
    dice.js        rollAction()/rollFlat() — pure, RNG-injectable roll mechanics
    threads.js     progress clocks (segments/filled/done)
    graph.js       deterministic Fruchterman-Reingold force layout
    copilot.js     advise(campaign) -> observation/consequence/opportunity/suggestion
    party.js       Party tab: #character roster (live entity filter) + party-wide trackers
    colony.js      Colony tab: 5PFH Planetfall turn sheet, crew roster, #lifeform filter
    guide.js       Guide tab: freeform @mention/@[Doc]-linked reference document
    documents.js    document library CRUD, tags, search, @[Doc] mention parsing/linking
    recap.js       Session Recap ("Previously on...") — buildSessionRecap()/formatSessionRecap(), read-only
  ui/
    shell.js       mountShell(), ALL delegated event handlers, render()
    workspace/     center-panel Adaptive Workspace rendering
    drawers/       Journal/Oracle/Cast/Party/Colony/Guide/Graph/Documents/Settings drawer rendering
    copilotPanel.js
  main.js          boot: migrate -> render -> subscribe
styles/
  tokens.css       three-tier design tokens (colors, spacing vars)
  cockpit.css      layout + component styles
tests/
  domain.test.js   the bulk of coverage — pure domain functions
  migrate.test.js  legacy-key absorption + round-trip
scripts/
  build.js         zero-dependency bundler (see below) — re-run after any src/ edit
dist/
  app.bundle.js    build output, gitignored, regenerate with `npm run build`
docs/
  adr/             Architectural Decision Records (see `requirements/` pack 51 for the standard)
requirements/
  design-principles-pack-*.md   the 77-pack Design Constitution (reference, not source of truth for current state)
```

## The bundler — why it exists, and the one gotcha

`file://` blocks `<script type="module">` via CORS (origin `"null"`), and
this app is meant to run by double-clicking `index.html` with no server. So
`scripts/build.js` is a hand-written, zero-dependency bundler that inlines
all ES modules under `src/` into `dist/app.bundle.js` as a single classic
script. `index.html` loads that bundle, not the ES modules directly.

**You must run `node scripts/build.js` (or `npm run build`) after every
change under `src/` before testing in a browser.** `dist/` is gitignored —
it's a build artifact, not source. It's normal for `git status` to show no
changes there even after a rebuild.

The bundler handles `import`/`export`, including aggregate re-exports
(`export { X, Y }`) via a regex pass — if you add a new export style it
doesn't recognize, that's the first place to look.

`npm run serve` runs the bundler and serves over `http://localhost:8080` if
you want to test both environments (`file://` and real HTTP) — do both when
in doubt, since they've diverged before (the CORS bug that started the
bundler was only visible under `file://`, and a stale-service-worker-cache
bug was only visible under `http://`, see PROGRESS.md's Phase 5 bug list).

## Environment constraints

- **npm registry access works** in this environment (confirmed during Phase
  5 — `npm install` succeeded). The zero-dependency approach for the
  shipped app is still a deliberate choice (see CLAUDE.md history), not a
  sandbox limitation — but installing a *dev-only* tool (e.g. `jsdom` for a
  throwaway smoke test) is fine; just don't leave it in `package.json`
  unless it earns a permanent place (`npm install --no-save` for one-off
  verification, then remove `node_modules` if it's not staying).
- Playwright browser tests (when used) launch Chromium with
  `args: ['--no-sandbox']` and import as
  `import pw from '.../playwright-core/index.js'; const { chromium } = pw;`
  (CommonJS interop) — adjust for your actual environment if paths differ;
  it may not be pre-installed here (a `jsdom`-based smoke test driving the
  actual built bundle is a workable, lighter-weight substitute — see the
  Phase 5 verification approach in git history).

## Testing workflow (do this after every change)

```bash
npm test              # node --test — pure domain logic, must stay green
node scripts/build.js # rebuild dist/app.bundle.js
```

Then, for anything touching the UI, a manual or scripted browser smoke test
against `index.html` (`file://` at minimum) is worth doing before calling a
change done — check the console for errors and confirm state persists
across a reload. There's precedent for subtle timing bugs in *test scripts*
(not the app) when scripting sequential field edits — a blur-triggered
re-render can replace a DOM node out from under a queued `fill()`; add a
small wait or a `Tab` keypress between sequential edits to sidestep it if
you hit something that looks like a silently-lost input.

As of the last commit: **96 unit tests, all passing.**

## Current status (see README.md / DESIGN-NEW-FUNCTIONALITY.md for detail)

Phases 0 through 5 are built, and Phase 6 (Campaign Continuity) has begun
— see `DESIGN-NEW-FUNCTIONALITY.md` for the full per-phase breakdown. Phase
5 added Party/Colony/Guide drawers, Settings-editable Bestiary statblock
templates (since revised — see below), a grouped Oracle tree, Document
Library tags/search/multi-upload/in-app PDF viewer, editable relationship
notes, and fixes for three reported bugs. A follow-up pass then made
Bestiary an explicit NPC subtype (statblock add-choices are scoped by
entity type), redesigned attribute/stat fields as a signed-number +/-
spinner instead of a 1-5 meter (Starforged/5PFH-accurate), and collapsed
the statblock "+ Add" row behind a gear icon. Phase 6 itself opened with
Session Recap ("Previously on...", `domain/recap.js`) in the Journal
drawer.

**Next up** (see `PROGRESS.md` for the full roadmap reconciled against the
Design Constitution): the rest of Phase 6 — richer Thread lifecycle and
Narrative Trackers beyond threat/mystery (both serve "campaign continuity,"
the Constitution's top-ranked priority — pack 66) — then Context Graph
depth (typed/weighted relationships, tag-vocabulary dropdowns), then
Unified Discovery (Universal Search, Cast entity-type filters). Full
backlog and rationale in `PROGRESS.md`.

## Known non-issues (don't rediscover these as bugs)

- Old statblock fields saved before Phase 3D (`{key, value}` with no
  `track` property) render fine as plain text rows — no migration was
  needed because `track` undefined is falsy and the old UI path still
  works. Only NEW default fields (Health, Hull/Integrity) are tracks by
  default going forward.
- An entity's statblocks are an ARRAY (`entity.statblocks`), not a singular
  `entity.statblock` — that field name was retired when multiple
  simultaneous groups (e.g. a Starforged AND a 5PFH character sheet on the
  same entity) were added. Every mutator in `statblocks.js`/`entities.js`
  takes a `groupIndex` before the field index for this reason
  (`setStatblockField(entity, groupIndex, fieldIndex, patch)`, etc.) — don't
  "simplify" that back to a single index.
- `addStatblockField()` in `src/domain/statblocks.js` intentionally accepts
  two call shapes after the group index: `(entity, groupIndex, key, value)`
  for a plain text field (legacy positional form, still used/tested) and
  `(entity, groupIndex, { key, value, track, max })` for a track field. This
  is deliberate, not leftover cruft — check both call sites before
  "simplifying" it.
- Per-field rename/format-toggle/remove controls (the old ★/Aa/✕ buttons)
  are gone from the entity statblock view on purpose — a field's name and
  kind (text/attribute/track) is fixed by its template (Settings' Bestiary
  template editor), not editable per-instance. `toggleStatblockFieldTrack`/
  `toggleStatblockFieldAttribute` still exist as tested domain functions but
  aren't wired to any UI control — don't rewire them without re-reading why
  they were disconnected (a user explicitly asked for label+value-only rows).
- Dice rolls use real randomness (`Math.random` by default) via
  RNG-injectable `rollAction(value, { rng })` / `rollFlat(value, { rng })`
  — only tests pass a seeded `rng` (via `makeRng` from `oracles.js`). Don't
  make real gameplay rolls deterministic.
- A statblock field's `rollMethod` is `undefined` on any field created
  before Phase 5's Bestiary templates (Health/Hull tracks, manually-added
  "+ Track" fields) — this is treated as `'action'` (rollable) for backward
  compatibility. Only an explicit `'none'` (a Bestiary progress-bar field)
  opts out of the roll button. Don't "fix" old fields to have an explicit
  `rollMethod` — the fallback is intentional.

## Style/contribution notes

- Keep new domain logic pure and add `node --test` coverage in
  `tests/domain.test.js` (or a new file if it's a big enough area) before —
  or at least alongside — wiring up UI for it.
- Match the existing three-tier CSS variable system in `styles/tokens.css`
  (`--accent`, `--accent-strong`, `--border`, `--text-dim`, `--sp-*`, etc.)
  rather than hardcoding colors/spacing.
- Keep statblocks, oracle tables, and similar content **data, not code** —
  the "genre-aware, not genre-locked" principle is load-bearing for future
  genre packs.
- Update `src/core/buildInfo.js` (phase/version/changelog) and the relevant
  checkbox in `README.md` when a phase-sized chunk of work lands, so the
  in-app Settings → Build panel stays honest.
- When a change is architecturally significant — a new engine/subsystem, a
  schema shape change, a persistence-behavior change, or reconciling
  against a `requirements/` Design Constitution pack that conflicts with
  current behavior — write a short ADR in `docs/adr/` (Title, Status,
  Context, Decision, Alternatives Considered, Consequences, Related Packs).
  See `docs/adr/0001-adopt-design-constitution.md` for the template and a
  worked example. Not every feature needs one — a new drawer or domain
  module following existing patterns doesn't; a new cross-cutting
  mechanism (e.g. the Event Bus, if it's ever built) does.
