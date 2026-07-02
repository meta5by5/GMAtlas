# CLAUDE.md — Saga Atlas

Context for Claude Code when working in this repo. Read this before making changes.

## What this is

Saga Atlas is a campaign operating system for solo and GM-run sci-fi tabletop
play — a static, local-first, installable-as-PWA web app. It's a **clean
re-architecture** branched from a v0.53 prototype ("Hostile Sci-fi
Worldbuilder", now rebranded), not an incremental patch of it. The old
codebase (patch-on-patch scripts, global function reassignment, 15 scattered
localStorage keys) is kept only as a design reference at `/tmp/saga` in the
environment this was built in — it is NOT part of this repo and its patterns
are exactly what this rewrite exists to avoid.

Design philosophy: **Frictionless Empowerment** — a GM should be able to run
a four-hour session without thinking about the software. Three visual tiers:
Primary (Mission Control: context strip, Adaptive Workspace, Co-Pilot),
Secondary (recommendation, breadcrumb timeline, story-shift actions),
Tertiary (Journal/Oracle/Cast/Graph/Documents/Settings — edge-tab drawers,
zero space until opened). The defining interaction: **the workspace changes,
not the application** — selecting a context question reshapes the center
panel, never navigates away.

Also: **genre-aware, not genre-locked**. Nothing in the domain layer should
hardcode one ruleset's stat names or tables — statblock fields, oracle
tables, etc. are data.

## Non-negotiable architectural rules

These were deliberately chosen to structurally exclude v0.53's failure
modes. Don't reintroduce them.

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
  domain/          pure, tested, DOM-free business logic
    context.js     WHO/WHERE/WHAT/WHY/HOW + story-shift reducers
    oracles.js     oracle table engine (makeRng seeded PRNG, rollTable, rollGroup)
    scenes.js      scene generation
    session.js     orchestration: continueStory, rollOracle, addNote, logRoll, etc.
    entities.js    NPCs/locations/factions/assets/lore + relationships + @mentions
    statblocks.js  statblock field CRUD, text<->numeric-track conversion
    dice.js        rollAction() — d6+value vs 2d10, RNG-injectable, pure
    threads.js     progress clocks (segments/filled/done)
    graph.js       deterministic Fruchterman-Reingold force layout
    copilot.js     advise(campaign) -> observation/consequence/opportunity/suggestion
  ui/
    shell.js       mountShell(), ALL delegated event handlers, render()
    workspace/     center-panel Adaptive Workspace rendering
    drawers/       Journal/Oracle/Cast/Graph/Documents/Settings drawer rendering
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
bundler was only visible under `file://`).

## Environment constraints

- **No npm registry access** in the sandbox this was built in (403
  Forbidden) — everything is hand-built or uses what's pre-installed under
  `/opt/node-tools` (e.g. `playwright-core`). If you're now in a normal
  VSCode/Claude Code environment with real npm access, this constraint may
  no longer apply — check before assuming you still can't install packages.
  If npm does work now, there's no pressing need to add dependencies; the
  zero-dependency approach was a constraint-driven choice, not just a
  preference, but it's fine to revisit if it clearly helps.
- Playwright browser tests (when used) launch Chromium with
  `args: ['--no-sandbox']` and import as
  `import pw from '.../playwright-core/index.js'; const { chromium } = pw;`
  (CommonJS interop) — adjust for your actual environment if paths differ.

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

As of the last commit: **57 unit tests, all passing.**

## Current status (see README.md / DESIGN-NEW-FUNCTIONALITY.md for detail)

Phases 0 through 3D are built:

- **0** — single versioned document, store, lossless migration, three-tier
  cockpit shell, PWA scaffold, the `file://` bundler.
- **1** — oracle roll engine, scene generation, context model as pure tested
  modules.
- **2** — interactive cockpit: Continue Story, Shift Story reducers, Oracle
  + Journal drawers, live Co-Pilot, breadcrumb timeline.
- **New (between 2 and 3A)** — Threads (progress clocks) with Co-Pilot
  awareness.
- **3A** — Entity Inspector + `@mention`/`@[Multi Word]` auto-linking.
- **3B** — deterministic force-directed relationship graph (SVG).
- **3C** — NPC/vehicle statblocks (auto-attach: NPC type → npc statblock,
  asset + `#vehicle` tag → vehicle statblock), drag-and-drop entity↔entity
  linking, drag-and-drop entity → Journal/context-field `@mention`
  insertion, a Build/changelog panel in Settings.
- **3D** — statblock fields can be numeric **tracks** instead of plain
  text: a Crew-Link-Starforged-style row of click-to-set boxes (click box
  *n* to set the value; click the already-active box again to step it down
  by one). Any field converts between text and track via a toggle button;
  `+ Track` adds a new one. Double-clicking a track's value badge rolls it
  — `domain/dice.js` implements d6(action die) + value vs 2d10(challenge
  dice), Strong Hit / Weak Hit / Miss, matches flagged — filed to the
  Journal like any other roll. This was modeled directly on
  https://starforged-crew-link.scottbenton.dev as a visual/interaction
  reference, per explicit user request.

**Not started yet — Phase 4 (next up, per DESIGN-NEW-FUNCTIONALITY.md):**
Document Library — PDF upload/local storage, an indexed library list in a
Docs drawer (currently a placeholder — `campaign.documents.library` is
reserved in the schema but unbuilt), and extending `@mention` parsing /
autocomplete to point at documents (with a page anchor) alongside entities.
Also bundled into "Phase 4" scope per the roadmap: Crew Link / Shipyard as
new-tab companions (never iframes — that was the specific fix for an
Android failure mode noted in the original design chat), full responsive
polish, and retiring remaining legacy-nav concepts.

Ranked backlog beyond Phase 4 (B–F) is in `DESIGN-NEW-FUNCTIONALITY.md`:
session recap, an oracle table editor, genre packs, and — much later — an
optional sync adapter (Phase 6, "Crew Log shared database").

## Known non-issues (don't rediscover these as bugs)

- Old statblock fields saved before Phase 3D (`{key, value}` with no
  `track` property) render fine as plain text rows — no migration was
  needed because `track` undefined is falsy and the old UI path still
  works. Only NEW default fields (Health, Hull/Integrity) are tracks by
  default going forward.
- `addStatblockField()` in `src/domain/statblocks.js` intentionally accepts
  two call shapes: `(entity, key, value)` for a plain text field (legacy
  positional form, still used/tested) and `(entity, { key, value, track,
  max })` for a track field. This is deliberate, not leftover cruft — check
  both call sites before "simplifying" it.
- Dice rolls use real randomness (`Math.random` by default) via an
  RNG-injectable `rollAction(value, { rng })` — only tests pass a seeded
  `rng` (via `makeRng` from `oracles.js`). Don't make real gameplay rolls
  deterministic.

## Style/contribution notes

- Keep new domain logic pure and add `node --test` coverage in
  `tests/domain.test.js` (or a new file if it's a big enough area) before —
  or at least alongside — wiring up UI for it.
- Match the existing three-tier CSS variable system in `styles/tokens.css`
  (`--accent`, `--accent-strong`, `--border`, `--text-dim`, `--sp-*`, etc.)
  rather than hardcoding colors/spacing.
- Keep statblocks, oracle tables, and similar content **data, not code** —
  the "genre-aware, not genre-locked" principle is load-bearing for future
  genre packs (Phase D in the backlog).
- Update `src/core/buildInfo.js` (phase/version/changelog) and the relevant
  checkbox in `README.md` when a phase-sized chunk of work lands, so the
  in-app Settings → Build panel stays honest.
