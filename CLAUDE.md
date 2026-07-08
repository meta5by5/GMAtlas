# CLAUDE.md — Saga Atlas

Context for Claude Code when working in this repo. Read this before making changes.

## CONTEXT ##

Always find ways to reduce the context window usage or context across all files without losing design meaning or requirements. If there is a way to keep the quality while operating the same, but use less context, please optimize and let me know. Once reviewed and incorporated into the design roadmap, ignore re-reading non-essential docs, requirements and samples unless needed.

## What this is

Saga Atlas is a campaign operating system for solo and GM-run sci-fi tabletop
play — a static, local-first, installable-as-PWA web app. It's a **clean
re-architecture** branched from a v0.53 prototype ("Hostile Sci-fi
Worldbuilder", now rebranded), not an incremental patch of it. The old
codebase (patch-on-patch scripts, global function reassignment, 15 scattered
localStorage keys) is kept only as a design reference
(`requirements/sourcecode/SagaAtlas-ChatGPT/`) — it is NOT part of this repo
and its patterns are exactly what this rewrite exists to avoid. Two other
reference-only source trees live alongside it under `requirements/sourcecode/`:
`saga-atlas_phase3d` (an old snapshot of this same project) and
`Iron-Fellowship_and_Crew-Link-prod` (the real source behind the Crew Link
companion tool linked from Settings) — neither is built or tested as part of
this repo; if you ever run a project-wide command (`node --test` with no
path, an IDE-wide search) and it starts touching either, that's scope
leakage, not a real failure (see "Testing workflow" below for the concrete
case this already bit once).

Design philosophy: **Frictionless Empowerment** — a GM should be able to run
a four-hour session without thinking about the software, via three visual
tiers (Primary/Secondary/Tertiary) and one defining interaction ("the
workspace changes, not the application"). Full description in `README.md`'s
"Design philosophy" section — not repeated here; the two things that matter
for writing code are: a new *interactive control* goes through the
delegated-listener rules below, and a new *tertiary feature* is a drawer
(edge-tab, zero space until opened), not a new top-level surface.

Also: **genre-aware, not genre-locked**. Nothing in the domain layer should
hardcode one ruleset's stat names or tables — statblock fields, oracle
tables, etc. are data.

## The Design Constitution (`requirements/`)

`requirements/` is organized into subfolders:
`design-principles/` holds the 77-document "Saga Atlas Design Constitution"
(`design-principles-pack-01.md`...`-77.md`, a `design-principles-final-summary.md`,
and a condensed `SagaAtlas-Design-Constitution.zip`) — the full long-range
vision for this product, well beyond what's built today. `initial design
inputs/` holds the earlier scoping documents (`GMAtlas-requirements.md`,
`gameplay-goals.md` — see the Rules Constitution below, `ChatGPT history.md`,
`SagaAtlas-Design-Recommendations.md`). `rulesystems/` holds source PDFs for
systems referenced by design docs but not yet fully authored as in-app data
(currently: three "Intergalactic Space Trader" books, cited as workflow
inspiration by the Merchant Rules Lens design — see ADR 0004).
`sourcecode/` holds reference-only old codebases (see above). None of this
is source for the app itself — see `src/` for that.

The Constitution was reviewed in full and reconciled against this codebase;
see `docs/adr/0001-adopt-design-constitution.md` for how, and
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

### The Rules Constitution (`requirements/initial design inputs/gameplay-goals.md`, ADR 0002)

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
2. **Exactly one module touches persistence**: `src/core/store.js`. As of
   `docs/adr/0015-indexeddb-persistence.md` (2026-07-06) this is IndexedDB,
   not `localStorage` — `localStorage`'s ~5-10MB per-origin quota was a
   real ceiling a campaign with a few embedded uploaded documents could
   hit (a real user report; IndexedDB's quota is a large fraction of free
   disk space instead, ~3.2GB observed in this environment). A few
   pre-existing `localStorage` keys are still read once, on first load
   only, as a lossless migration fallback for campaigns saved before this
   ADR (never written to again afterward). It exposes `store.get()`
   (synchronous — always the in-memory doc), `store.update(fn)`
   (synchronous call shape; persists in the background, rolls back +
   reports via `store.onPersistError(fn)` on the rare async failure),
   `store.subscribe(fn)`, `store.onPersistError(fn)`, `store.export()`, and
   real `async` functions `store.import()`, `store.newCampaign()`,
   `store.bindFile()`. Nothing else calls `localStorage`/`indexedDB`
   directly.
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
    store.js       the ONLY persistence access (IndexedDB); pubsub via subscribe()
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
  adr/             Architectural Decision Records (see pack 51 for the standard);
                    next-request.md is a standing inbox the user drops new
                    asks into between sessions — check it if asked to
                    "process requests" there
requirements/      reference only, not app source — see "The Design
                    Constitution" above for the subfolder breakdown
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
bug was only visible under `http://`, see `docs/archive/progress-log-2026-07.md`'s
Phase 5 bug list).

## Environment constraints

- **npm registry access works** in this environment (confirmed during Phase
  5 — `npm install` succeeded). The zero-dependency approach for the
  shipped app is still a deliberate choice (see CLAUDE.md history), not a
  sandbox limitation — but installing a *dev-only* tool (e.g. `jsdom` for a
  throwaway smoke test) is fine; just don't leave it in `package.json`
  unless it earns a permanent place (`npm install --no-save` for one-off
  verification, then remove `node_modules` if it's not staying).
- **One explicit, version-pinned exception to zero-dependency**:
  `assets/vendor/pdfjs/` (PDF.js's legacy UMD build, vendored not
  npm-installed, loaded via a plain `<script>` tag) powers the Guide's Game
  Mechanics Index PDF text scan — see `docs/adr/0014-mechanics-index-
  pdfjs.md` for why (user-requested real page scanning, not a hand-curated
  list) and a real constraint it surfaced: that one feature needs the app
  served over `http(s)` (`npm run serve`) — Chromium blocks a `file://`
  page from reading another `file://` resource's bytes at all, a different
  and more fundamental restriction than the well-known "no Worker from
  file://" one. Every other feature still works via a plain `file://`
  double-click; don't assume this carve-out extends to anything else.
- Playwright browser tests (when used) launch Chromium with
  `args: ['--no-sandbox']` and import as
  `import pw from '.../playwright-core/index.js'; const { chromium } = pw;`
  (CommonJS interop) — adjust for your actual environment if paths differ;
  it may not be pre-installed here (a `jsdom`-based smoke test driving the
  actual built bundle is a workable, lighter-weight substitute — see the
  Phase 5 verification approach in git history).

## Testing workflow (do this after every change)

```bash
npm test              # node --test tests/*.test.js — pure domain logic, must stay green
node scripts/build.js # rebuild dist/app.bundle.js
```

`package.json`'s `test` script deliberately names `tests/domain.test.js
tests/migrate.test.js` explicitly rather than a bare `node --test` — the
latter recursively discovers `*.test.*` files from the current directory
down, and once `requirements/sourcecode/` held real third-party npm
projects with their own test suites (see above), a bare `node --test` swept
those in too and failed on unrelated missing dependencies. If `npm test`
ever mysteriously starts failing on tests you don't recognize, this is the
first thing to check — don't debug someone else's test suite by mistake.

`npm test` also has a `pretest` script (`node scripts/build.js`) — not
redundant with the explicit build step below, it's there because
`domain/documents.js` imports `data/docsManifest.js`, a **gitignored,
build-generated** file (the Reference Library manifest, scanned from
`assets/docs/`). On a genuinely fresh checkout (a new clone, CI) that file
doesn't exist yet, so `tests/domain.test.js` fails to even load with
`ERR_MODULE_NOT_FOUND` — this is exactly what broke the GitHub Pages
deploy (the workflow's "Run tests" step failed before "Build bundle" ever
ran, so nothing after it — including the deploy — happened; verified via
the Actions API and a clean `git clone` reproduction, 2026-07-04). `pretest`
makes `npm test` self-sufficient regardless of what ran before it or what
order a workflow calls things in — don't remove it as looking redundant
with `npm run build`.

Then, for anything touching the UI, a manual or scripted browser smoke test
against `index.html` (`file://` at minimum) is worth doing before calling a
change done — check the console for errors and confirm state persists
across a reload (including a reload *without* first tabbing/clicking away
from whatever field you just edited — see "Known non-issues" below for why
that specific case matters). There's also precedent for subtle timing bugs
in *test scripts* (not the app) when scripting sequential field edits — a
blur-triggered re-render can replace a DOM node out from under a queued
`fill()`; add a small wait or a `Tab` keypress between sequential edits to
sidestep it if you hit something that looks like a silently-lost input.

Test count isn't repeated here on purpose — it changes every session and
this file is easy to forget to update; run `npm test` for the current
number (`src/core/buildInfo.js`'s in-app Build panel is the other
hand-maintained source of truth for phase/version, updated alongside
`README.md`'s checklist each time a phase-sized chunk lands).

## Current status

Phases 0–6 built, Phase 7 (Context Graph depth) in progress. This number is
the only status fact worth duplicating here — for what shipped, what's
next, and why, read `PROGRESS.md` (short status ledger) or
`DESIGN-NEW-FUNCTIONALITY.md` (full per-phase detail and rationale); don't
re-derive either from git log unless neither is current. Don't restate
phase status here when updating this file — update `PROGRESS.md`'s Status
Summary instead, so there's exactly one place this drifts from reality.

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
- Attribute fields (Edge, Combat, ...) are a directly-editable, validated
  numeric `<input>` with the field's *label* as the roll trigger — not a
  1-5 meter, not a +/- spinner (both were tried and replaced). `format`
  (`sign`/`inches`/`plain`) only changes how the value displays; it's never
  stored separately or parsed back out. A field with `rollMethod: 'none'`
  gets a plain, non-clickable label. Four dice models exist
  (`none`/`action`/`flat`/`traveller` — see `domain/dice.js`); the list is
  meant to grow (5PFH Planetfall, Stars Without Number) as those systems
  get authored mechanics, not a closed set.
- `ui/shell.js`'s `mountShell()` has a `beforeunload`/`visibilitychange`
  listener that blurs `document.activeElement` before the page unloads —
  this is a deliberate fix for a real reported bug (a field typed into but
  never blurred was silently lost on refresh, since every field only
  commits on `change`), not dead code or an accident. Don't remove it as
  unused-looking cruft.

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
- **Never use `window.prompt()` for data entry** (`docs/adr/0022-inline-
  prompt-standard.md`) — a button that needs one more piece of free text
  before it can act opens `ui/shell.js`'s generic inline prompt instead
  (`openInlinePrompt(kind, opts)` at the trigger, one branch in
  `commitInlinePrompt()`'s switch for what happens with the typed value —
  see the ADR for the exact three-line shape and worked examples). A
  genuinely multi-field form (Party Tracker creation, a Trade contract)
  still gets its own bespoke inline form, matching that existing
  established pattern — this rule is specifically about the single-string
  "click a button, type one line, go" case `window.prompt()` used to
  cover. `window.confirm()` (delete confirmations) is a different
  interaction — a yes/no decision, not a value — and is unaffected.
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
- **No two docs get to disagree about current reality.** Design principles
  and requirements accumulated over many sessions; when a newer one
  conflicts with an older one, the newer one wins outright — it replaces
  the old claim, it doesn't sit alongside it as a second "valid" option.
  This applies to everything: the `requirements/design-principles/` corpus
  vs. an ADR (the ADR wins — see the two-point caveat under "The Design
  Constitution" above), one ADR vs. a later one (say so explicitly in the
  older ADR's Status line, the way `0003` points at `0004`), or a design
  doc's prose vs. what the code actually does now (the code wins; fix the
  prose, don't leave a stale description standing — e.g. `DESIGN-NEW-
  FUNCTIONALITY.md`'s attribute-field history flags its own superseded
  step for exactly this reason). If you find a conflict while working —
  don't just work around it, correct the losing side or flag it inline as
  superseded so the next reader doesn't re-discover the same ambiguity.
