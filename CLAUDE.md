# CLAUDE.md — GMAtlas

Context for Claude Code when working in this repo. Read this before making
changes. Keep this file lean — it's read every session; anything that can
live in one authoritative place instead of being duplicated here should.

## Context economy

Prefer reducing context usage over duplicating information across files.
Once something is settled and recorded in `design/adr/GMAtlas-Design-
Constitution.md` or `PROGRESS.md`, don't re-read source material that led to
it unless the task actually needs that history. `requirements/` (the target
functional spec, plus a large legacy corpus under
`requirements/previous-design-principles/`) is reference-only — read it when
a task specifically calls for checking against the target spec or historical
rationale, not by default.

## What this is

GMAtlas is a campaign operating system for solo and GM-run sci-fi tabletop
play — a static, local-first, installable-as-PWA web app, single HTML
document + one bundled JS file, no backend.

Design philosophy in one line: **Frictionless Empowerment** — a GM should be
able to run a four-hour session without thinking about the software. The
full spirit-of-intent statement, the architecture as actually built, and an
explicit list of what does and doesn't exist yet all live in
**`design/adr/GMAtlas-Design-Constitution.md`** — read it before any
non-trivial change; this file only covers day-to-day mechanics.

## Architecture reference

- **`design/adr/GMAtlas-Design-Constitution.md`** — the primary architecture
  document: design philosophy, the five non-negotiable rules, a module-by-
  module map of `src/`, and a clear "what exists / what doesn't" split.
  Start here for "how does X work" or "is Y built."
- **`design/adr/deviations.md`** — known conflicts inside
  `requirements/Functional-Requirements-v2.md` itself, and legacy-only
  concepts with no code equivalent. Check before treating anything in that
  spec as unambiguous.
- **`requirements/Functional-Requirements-v2.md`** — the target functional
  spec (what the app should do, written spec-complete enough to rebuild
  from). Sections marked `#### NEW!` are not yet built; sections marked
  `%%  %%` carry no new requirement beyond current behavior.
- **`PROGRESS.md`** — the phase-by-phase status ledger. Check it when a
  phase number is ambiguous.
- New architectural decisions (a new engine, a schema shape change, a
  persistence-behavior change) get a short ADR in `design/adr/`: Title,
  Status, Context, Decision, Consequences. Keep ADRs current, not a
  decision journal — when a later change reverses an earlier one, edit the
  earlier ADR in place rather than layering a "superseded" note on top.

## Non-negotiable architectural rules

1. **One versioned campaign document is the single source of truth.**
   `src/core/schema.js`'s `defaultCampaign()` + `schemaVersion`. Everything
   reads/writes through it.
2. **Exactly one module touches persistence: `src/core/store.js`.**
   IndexedDB, one DB, one object store, two keys (live doc + a one-slot
   backup written best-effort before every real write). Public surface:
   sync `get()`, sync-call-shape `update(fn)` (persists in background,
   rolls back + reports via `store.onPersistError(fn)` on failure), `sub
   scribe(fn)`, sync `export()`, async `import()`/`newCampaign()`/
   `bindFile()`/`restoreBackup()`. A few legacy `localStorage` keys are read
   once on first boot only, as a lossless fallback — never written again.
   Nothing else touches `localStorage`/`indexedDB` directly.
3. **The domain layer (`src/domain/*.js`) is pure and DOM-free.** Every
   mutator takes a campaign object and returns a NEW one (clone, never
   mutate the input). No side effects. This is what makes `node --test`
   cover real business logic headlessly and makes `store.update()`'s
   optimistic-then-rollback model safe.
4. **Exactly one delegated event listener per event type**, registered once
   on the root in `mountShell()` (`src/ui/shell.js`): `click`, `dblclick`,
   `change`, `input`, drag-and-drop, touch-gesture equivalents, pan/zoom
   mouse events, `focusout`. All routing goes through `data-*` attributes
   read via `target.closest(...)` inside those handlers — never a
   per-element listener, never global function reassignment. Adding a new
   interactive control means adding a `data-*` attribute and a branch in
   the relevant handler.
5. **Migration never drops data.** `src/core/migrate.js` absorbs legacy
   storage keys into the one document and parks anything unmapped under
   `_legacy`. A schema change must keep old exports importable.

Every delegated handler is wrapped so a thrown exception (most commonly a
failed persist) surfaces as a visible toast instead of the interaction
silently doing nothing.

## Where things live

```
src/
  core/
    schema.js      defaultCampaign(), schemaVersion
    store.js       the ONLY persistence access (IndexedDB); pubsub via subscribe()
    migrate.js     legacy key absorption, lossless
    buildInfo.js   hand-maintained phase/version/changelog (Settings → Build)
  data/            28 files — every game-content catalog (oracle tables x3 genre
                   packs, genre pack registry, rulesets, statblock/gear templates,
                   gear catalog, Rules Constitution provider registry, two
                   interchangeable faction content catalogs, trade economy/
                   commodities/biomes, UWP tables, suggestion lenses, enhancement
                   types, battlemap icons, Reference Library manifest). All content
                   is data — no ruleset vocabulary belongs in src/domain/.
  domain/          34 files, pure/DOM-free, one test file covers all of them.
                   session.js/context.js/scenes.js/copilot.js/recap.js orchestrate
                   the WHO/WHERE/WHAT/WHY/HOW model and Co-Pilot; oracles.js is the
                   roll engine; entities.js/statblocks.js/threads.js/graph.js/
                   worldFlags.js/foreshadowing.js cover cast & world state;
                   factions.js/factionTurnEngine.js/factionConflicts.js are three
                   coexisting faction-mechanic layers; trade.js/missions.js/
                   enhancements.js/expeditions.js are economy & jobs;
                   documents.js/guide.js/mechanicsIndex.js/toc.js/worldbuilding.js/
                   hostileLocations.js are content & reference; party.js/colony.js/
                   gallery.js/battlemaps.js round out the rest; search.js/
                   activities.js/contentPack.js/titleCase.js are cross-cutting.
  ui/
    shell.js           mountShell(), every delegated handler, the render loop
    workspace/index.js the Story Dashboard (WHO/WHERE/WHAT/WHY/HOW as collapsible
                        sections + sticky Narrative Composer + pressure dials)
    copilotPanel.js     the always-visible Co-Pilot ("decision sandbox")
    drawers/index.js    every drawer's render, dispatched through one switch
                        (factionEvents.js is split out only to avoid a circular import)
    mentionEditor.js, searchPanel.js, imageResize.js, mechanicsScan.js, tocScan.js,
    hostileLocationsFetch.js — rich-text editor, search render, and the browser-only
                        impure edges kept out of the domain layer
styles/
  tokens.css       three-tier design tokens (colors, spacing vars)
  cockpit.css      layout + component styles
tests/
  domain.test.js   436 tests — direct coverage of every domain module
  migrate.test.js  15 tests — legacy-key absorption + round-trip
scripts/
  build.js         zero-dependency bundler (see below) — re-run after any src/ edit
  save-import.js   standalone CLI: stage an exported campaign JSON for manual use
dist/
  app.bundle.js    build output, gitignored, regenerate with `npm run build`
design/adr/        architecture reference (Constitution, deviations, new ADRs)
requirements/      the target functional spec + a legacy reference corpus (rarely needed)
```

The drawer/panel system is a **single visible panel with an internal tab
strip** — not a multi-slot layout. At most one of {drawer panel, document
viewer} is visible at a time. Faction Events is the one exception: it can
dock as a second column inside the WHERE dashboard section instead of the
drawer tab strip, GM-toggleable either direction.

## The bundler — why it exists, and the one gotcha

`file://` blocks `<script type="module">` via CORS, and this app is meant to
run by double-clicking `index.html` with no server. `scripts/build.js` is a
hand-written, zero-dependency, regex-based bundler that inlines every ES
module under `src/` into `dist/app.bundle.js` as a single classic script,
including aggregate re-exports (`export { X, Y }`) — if you add a new export
style it doesn't recognize, that's the first place to look. It also builds
the gitignored `src/data/docsManifest.js` at build time from the committed
Reference Library manifest.

**Run `node scripts/build.js` (or `npm run build`) after every change under
`src/` before testing in a browser.** `dist/` is gitignored — a build
artifact, not source; it's normal for `git status` to show nothing there
after a rebuild.

`npm run serve` runs the bundler and serves over `http://localhost:8080` —
worth testing both `file://` and real HTTP when in doubt, since the two
environments have diverged before (a CORS bug only visible under `file://`;
a stale-service-worker-cache bug only visible under `http://`).

## Environment constraints

- **npm registry access works.** The zero-dependency shipped-app approach is
  a deliberate choice, not a sandbox limitation — installing a *dev-only*
  tool for a throwaway check is fine; don't leave it in `package.json`
  unless it earns a permanent place.
- **One explicit, version-pinned exception to zero-dependency**:
  `assets/vendor/pdfjs/` (PDF.js legacy UMD build, vendored not
  npm-installed, loaded via a plain `<script>` tag) powers the Guide's Game
  Mechanics Index and TOC-scan PDF features. Both require the app be served
  over `http(s)` (`npm run serve`) — Chromium blocks a `file://` page from
  reading another `file://` resource's bytes at all. Every other feature
  works via plain `file://` double-click; this carve-out doesn't extend to
  anything else.
- **No Playwright/browser automation in this environment** — a
  `jsdom`-based smoke test driving the actual built bundle is the workable
  substitute. For verifying an *external* resource (a deployed URL, a
  GitHub Release asset) rather than the app's own UI, direct `curl`/the
  GitHub REST API works well with no browser needed at all.

## Testing workflow (do this after every change)

```bash
npm test              # node --test tests/domain.test.js tests/migrate.test.js
node scripts/build.js # rebuild dist/app.bundle.js
```

`npm test`'s `test` script names the two test files explicitly rather than a
bare `node --test` — the latter recursively discovers `*.test.*` files from
the current directory down, and `requirements/` can contain files that would
get swept in and fail on unrelated missing dependencies. If `npm test` ever
mysteriously fails on tests you don't recognize, this is the first thing to
check.

`npm test` also runs `pretest` (`node scripts/build.js`) first — not
redundant, because `domain/documents.js` imports the gitignored, build-
generated `data/docsManifest.js`; on a fresh checkout that file doesn't
exist yet and `tests/domain.test.js` fails to load at all without a build
first. Don't remove `pretest` as looking redundant with the manual build
step above.

For anything touching the UI, follow up with a manual or scripted browser
smoke test against `index.html` (`file://` at minimum): check the console
for errors, and confirm state persists across a reload — including a reload
*without* first tabbing away from whatever field you just edited (a
`beforeunload`/`visibilitychange` listener in `shell.js` exists specifically
to force-blur the active field before unload; don't remove it as
unused-looking). When scripting sequential field edits in a test, a
blur-triggered re-render can replace a DOM node out from under a queued
`fill()` — add a small wait or a `Tab` keypress between edits if you hit
what looks like a silently-lost input.

## Current status

Phase 13 (Scene Operating Model) in progress — 13a (Location Details) and
13b (WHO's scene-scoped Protagonist/Antagonist/Bystander NPC groups) are
built; 13c–13k are roadmap only. `PROGRESS.md` has the full ledger;
`design/adr/GMAtlas-Design-Constitution.md` Part IV has the current, explicit
"what doesn't exist yet" list — don't re-derive either from git log.

## Known non-issues (don't rediscover these as bugs)

- An entity's statblocks are an ARRAY (`entity.statblocks`), not a singular
  `entity.statblock`, because an entity can carry several simultaneously
  (e.g. two rulesets' character sheets at once). Every mutator in
  `statblocks.js`/`entities.js` takes a `groupIndex` before the field index
  for this reason — don't "simplify" that back to a single index.
- `addStatblockField()` in `src/domain/statblocks.js` intentionally accepts
  two call shapes after the group index: `(entity, groupIndex, key, value)`
  for a plain text field (legacy positional form, still tested) and
  `(entity, groupIndex, {key, value, track, max})` for a track field. Check
  both call sites before "simplifying" it.
- Per-field rename/format-toggle/remove controls are gone from the entity
  statblock view on purpose — a field's name and kind (text/attribute/
  track) is fixed by its template (Settings' Bestiary template editor), not
  editable per-instance. `toggleStatblockFieldTrack`/
  `toggleStatblockFieldAttribute` still exist as tested domain functions but
  aren't wired to any UI control — don't rewire them without checking why
  they were disconnected.
- Dice rolls use real randomness (`Math.random` by default) via
  RNG-injectable `rollAction(value, {rng})`/`rollFlat(value, {rng})` — only
  tests pass a seeded `rng` (via `makeRng` from `oracles.js`). Don't make
  real gameplay rolls deterministic.
- A statblock field's `rollMethod` is `undefined` on any field created
  before Bestiary templates existed — treated as `'action'` (rollable) for
  backward compatibility. Only an explicit `'none'` opts out of the roll
  button. Don't "fix" old fields to have an explicit `rollMethod`.
- Attribute fields (Edge, Combat, ...) are a directly-editable, validated
  numeric `<input>` with the field's *label* as the roll trigger — not a
  meter, not a spinner. `format` (`sign`/`inches`/`plain`) only changes
  display, never parsed back out. Four dice models exist
  (`none`/`action`/`flat`/`traveller`) and the list is meant to grow, not a
  closed set.
- `context.active: 'what'` in the schema is vestigial — the UI no longer
  branches on it. Don't remove it (migration rule 5) and don't wire new
  behavior to it.
- `director: {}` and `settings.form: {}` in the schema are inert, carried-
  over state from a retired predecessor system, preserved rather than
  deleted per migration rule 5. Nothing reads them meaningfully; don't
  build new behavior on them.

## Style/contribution notes

- Keep new domain logic pure and add `node --test` coverage in
  `tests/domain.test.js` (or a new file for a big enough area) before, or
  alongside, wiring up UI for it.
- Match the existing three-tier CSS variable system in `styles/tokens.css`
  (`--accent`, `--accent-strong`, `--border`, `--text-dim`, `--sp-*`, etc.)
  rather than hardcoding colors/spacing.
- Keep statblocks, oracle tables, and similar content **data, not code** —
  this is load-bearing for future genre packs.
- **Never use `window.prompt()` for data entry.** A button that needs one
  more piece of free text before it can act opens `shell.js`'s generic
  inline prompt instead: `openInlinePrompt(kind, opts)` at the trigger, one
  branch in `commitInlinePrompt()`'s switch for what happens with the typed
  value. A genuinely multi-field form (Party Tracker creation, a Trade
  Contract) gets its own bespoke inline form matching the same no-popup
  posture. `window.confirm()` (delete confirmations) is a different
  interaction — a yes/no decision, not a value — and is unaffected.
- Update `src/core/buildInfo.js` (phase/version/changelog) and the relevant
  checkbox in `README.md` when a phase-sized chunk of work lands, so the
  in-app Settings → Build panel stays honest.
- **No two docs get to disagree about current reality.** When a newer
  decision conflicts with an older one, the newer one wins outright and
  replaces the old claim — it doesn't sit alongside it as a second "valid"
  option.

## Testing posture

Every new capability lands as a pure domain function with unit tests first,
then a thin view and a browser smoke check. The invariant: risky logic
never lives in the DOM, so "can a GM run a four-hour session without the
software breaking" stays an assertion actually run, not a hope.
