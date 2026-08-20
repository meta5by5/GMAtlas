# The GMAtlas Design Constitution

**Status:** Living document. **Written:** 2026-08-09, from a direct audit of the
source tree (`src/`, `tests/`, `scripts/`) cross-referenced against the spec
now at `requirements/previous-design-principles/Functional-Requirements-v2.md`
(superseded 2026-08-10 by `requirements/functional-requirements-v3.md`, which
carries the current functional requirements and roadmap forward — this
document's architecture content is unaffected by that change). This is an
original synthesis, not a copy of any prior design document — it describes
GMAtlas as it actually exists today, plus the intent that shaped it.

This document has three parts: **why** the application exists (Part I), **how**
it is actually built (Part II), and **what it does and does not yet do**
(Part III–IV). It is the primary architecture reference for this repository.
When code and this document disagree, the code is correct and this document
is stale — fix the document, not the other way around.

---

## Part I — Spirit of Intent

GMAtlas is a **campaign operating system** for solo and GM-run sci-fi tabletop
RPG play: a tool that helps a Game Master run a session, not a tool that runs
the session for them.

**The GM's attention is the scarce resource.** Every feature is judged against
one test: does it let someone run a four-hour session without stopping to
think about the software? A powerful control that makes the GM hunt for it
has failed regardless of its power. The highest compliment the app can earn
is that the GM forgot they were using it.

**The campaign is permanent; the rules are a lens.** A ruleset (Starforged,
Five Parsecs From Home, Hostile, Traveller, Stars Without Number, Planetfall,
...) supplies stat names, dice mechanics, and table content — never the
narrative engine itself. Swapping which system is "active" must never rewrite
campaign history. Nothing in the domain layer hardcodes one ruleset's
vocabulary; every catalog is data, resolved through small lookup functions
that degrade to a safe default instead of throwing on an unrecognized id.
**Genre-aware, not genre-locked** is not a slogan here — it is the reason
`src/data/` holds 28 content files and `src/domain/` holds none of their
vocabulary.

**The GM always retains creative authority.** The system proposes; it never
silently commits. A generated scene is not appended until the GM continues; a
faction's turn is drafted against a scratch clone and only takes effect on
explicit commit; a rolled oracle result is a suggestion sitting in a field
until the GM leaves it there. Nothing overwrites a GM's own text with a fresh
random roll — a hand-edited field has no "source" to regenerate from and stays
exactly as typed.

**Context drives suggestion, not configuration.** The WHO/WHERE/WHAT/WHY/HOW
model — who's present, where the scene is, what's happening, why it matters,
how it's being resolved — is read directly, live, by every suggestion engine.
The Co-Pilot infers from what's already on the page before it asks the GM to
fill out a form.

**Relationships carry meaning; records alone don't.** Entities connect through
typed, weighted relationships and free-text `@mentions`, and both are live —
clicking a mention navigates, dragging one entity onto another creates a
relationship, editing a relationship never silently "fixes" a mismatch it
finds (a stale type mismatch is flagged for a GM to resolve, never
auto-corrected or auto-deleted).

**Campaign data is sacred.** Nothing a GM has typed is ever silently dropped
by an import, a migration, or a schema change. Some records are deliberately
append-only (a Conflict's irreversible facts, a paid-off Foreshadowing entry)
— flag or mark, never delete, when the data represents something that
actually happened in the story. Migration absorbs what it recognizes and
parks everything else under a clearly-named catch-all rather than discarding
it.

**Extend by adding data or a new pure module, not a parallel system.** A new
genre pack, ruleset, or faction-content provider is a new file in
`src/data/`. A new mechanic is a new pure module in `src/domain/`, reusing an
existing primitive (the Thread progress-clock, the entity/relationship model,
the oracle engine) wherever the shape already fits, rather than inventing a
second one beside it.

**Frictionless empowerment, concretely.** When two designs are otherwise
equal, the one that keeps the GM improvising — rather than filling out a form
— wins. This is why suggestions are ranked and explainable rather than a
blank search box, why a drawer takes zero screen space until opened, and why
the single most common action (Continue Story) is always one click away from
wherever the GM currently is.

---

## Part II — Architecture as Built

### The five non-negotiable rules

These exist to structurally prevent a specific, real failure mode from an
earlier prototype: patch-on-patch scripts, storage scattered across a dozen
keys, global function reassignment, and a per-element listener for every
control. Every one of these is enforced in the current code, not just
documented:

1. **One versioned campaign document is the single source of truth.**
   `src/core/schema.js`'s `defaultCampaign()` defines its exact shape and a
   `schemaVersion`. Every feature reads and writes through it — no feature
   keeps a separate store.
2. **Exactly one module touches persistence: `src/core/store.js`.** IndexedDB
   (one database, one key/value object store, two keys: the live document and
   a one-slot backup written best-effort immediately before every real
   write). Its public surface: synchronous `get()` (always the in-memory
   doc), synchronous-call-shape `update(fn)` (persists in the background,
   notifies subscribers immediately, rolls back and re-notifies on a failed
   persist unless a newer edit has already landed on top), `subscribe(fn)`,
   `onPersistError(fn)`, synchronous `export()`, and real `async`
   `import()`/`newCampaign()`/`bindFile()`/`restoreBackup()`. A handful of
   legacy `localStorage` keys are read once, on first boot only, as a
   lossless fallback for pre-IndexedDB campaigns — never written to again.
   Nothing else calls `localStorage` or `indexedDB` directly.
3. **The domain layer (`src/domain/*.js`, 34 files) is pure and DOM-free.**
   Every mutator takes a campaign object and returns a new one — no mutation
   of the input, no side effects, no DOM access. This is what makes 451
   `node --test` tests exercise real business logic headlessly, and what
   makes `store.update()`'s optimistic-then-rollback persistence model safe.
4. **Exactly one delegated event listener per browser event type**, bound
   once on the shell's root element in `mountShell()`
   (`src/ui/shell.js`): `click`, `dblclick`, `change`, `input`, the
   drag-and-drop events, a from-scratch touch-gesture equivalent
   (`touchstart`/`touchmove`/`touchend`/`touchcancel`), pan/zoom mouse
   events for the Graph and Battlemap, and `focusout` (commits a pending
   rich-text edit, which has no native `change` event). A `keydown`
   listener bound to `document` (not the root, so it fires regardless of
   focus) handles a small, deliberately limited shortcut set. A
   `beforeunload`/`visibilitychange` listener force-blurs the active field
   so an uncommitted edit is never lost on refresh. All interaction routing
   reads a `data-*` attribute via `target.closest(...)` inside those
   handlers — never a per-element listener, never `window.foo =`
   reassignment. Adding a new interactive control means adding a `data-*`
   attribute to rendered markup and a branch in the relevant handler, not a
   new listener.
5. **Migration never drops data.** `src/core/migrate.js` absorbs ~15 legacy
   pre-rebrand storage keys into the one document and parks anything it
   can't map under `_legacy`. A schema change must keep old exports
   importable.

Every delegated handler is wrapped so a thrown exception (most often a failed
persist) becomes a visible toast instead of the interaction silently doing
nothing.

### The campaign document

`defaultCampaign()`'s top-level shape: `schemaVersion`, `app`, `meta`
(id/title/timestamps), `context` (the WHO/WHERE/WHAT/WHY/HOW model — WHAT
carries five 0–10 dials: threat/mystery default 2, resources/reputation/stress
default 5), `entities` (items/activeId/history), `scenes`, `journal`,
`timeline` (capped at the most recent 6 breadcrumbs), `threads`,
`foreshadowing`, `worldFlags`, `factionEvents` + `factionTurnNumber`,
`missions`, `director` (a largely-inert legacy carry-over, preserved rather
than deleted per rule 5), `oracles` (overrides/usage/tags), `documents`
(library/tabs/reference overrides), `gallery`, `battlemaps`, `party`,
`colony`, `guide`, `settings` (genre/ruleset/templates/UI state/faction
pacing/game-system activation flags), `drawers` (widths), `_legacy`. `trade`
and `mechanicsIndex` are added lazily by their own domain modules on first
touch rather than living in the default shape. Loading any partial or old
document deep-merges it onto `defaultCampaign()`, so most fields are added
"lazily" with no explicit migration step — a reader/writer backfills a
missing field the first time it's touched, and an explicit `null`/`0`/`''` a
GM already set is never overwritten by that backfill.

Every entity (`type` ∈ `npc | location | faction | asset | lore | item |
conflict`) carries relationships (`{to, label, type, strength}`, `type` ∈
`linked | member_of | owns | controls | located_at | contains | allied_with |
rival_of | bond | involves`) and zero or more statblock groups. Every
generated id is `<short-prefix>_<base36-timestamp>_<random-suffix>` —
roughly chronologically sortable, collision-resistant, no central counter
needed.

### The domain layer — what each module owns

Grouped by area (all 34 files, `src/domain/`):

- **Orchestration & context**: `session.js` (top-level user-facing
  operations — Continue Story, journal notes, field edits), `context.js`
  (the 17 named "Shift Story" reducers), `scenes.js` (scene generation +
  Phase 13's scene-scoped NPC state), `copilot.js` (`advise()`'s
  single-winner priority chains; `gatherSceneContext`/`buildStoryOptions`'s
  cumulative weighted ranking; `composeNarrativeDraft`), `recap.js`
  ("Previously on...").
- **Oracle engine**: `oracles.js` — nested-table rolling, campaign-layered
  content overrides, per-table tags with a locked-tag guarantee, the
  grouped/filterable tree the Oracle drawer renders.
- **Cast & world**: `entities.js` (CRUD, relationships, `@mention`
  parsing/linking, type-specific field provisioning), `statblocks.js` +
  `statblockTemplates.js` (per-ruleset stat blocks, click-to-roll dice),
  `dice.js` (the three roll models), `threads.js` (progress clocks, 7-state
  lifecycle), `graph.js` (deterministic force-directed layout),
  `worldFlags.js`, `foreshadowing.js`.
- **Factions** (three coexisting layers, deliberately): `factions.js`
  (the lightweight Pressure Track mini-game), `factionTurnEngine.js` (the
  full SWN-style propose-then-confirm Faction Turn Engine — the largest
  domain file), `factionConflicts.js` (Conflict-entity quick-start
  generator).
- **Economy & jobs**: `trade.js` (Merchant Rules Lens pricing + contracts),
  `missions.js`, `enhancements.js` (Strain/capacity augmentation),
  `expeditions.js`.
- **Content & reference**: `documents.js` (library, Reference Library
  overlay, the lightweight rich-text/mention markup engine), `guide.js`
  (the reference-document tree), `mechanicsIndex.js` + `toc.js` (pure
  storage for two PDF-scan features whose actual scanning lives in
  `src/ui/`), `worldbuilding.js` (creature/site/adventure-seed generators),
  `hostileLocations.js` (bulk gazetteer import).
- **Party/Colony/Visual**: `party.js`, `colony.js`, `gallery.js`,
  `battlemaps.js`.
- **Cross-cutting utility**: `search.js` (Universal Search across
  Cast/Journal/Oracle/Documents/Party/Colony), `activities.js` (Activity →
  Rules Lens suggestion), `contentPack.js` (inter-campaign portable
  export/import), `titleCase.js`.

Every one of these 34 modules has direct coverage in `tests/domain.test.js`
(436 tests) or `tests/migrate.test.js` (15 tests) — 451 total.

### The content layer

`src/data/` (28 files) is the entire "genre-aware, not genre-locked"
guarantee made concrete: oracle tables for 3 genre packs (~49 top-level
categories in the default Hostile pack alone), the Oracle drawer's grouping
scheme, per-ruleset character templates and Bestiary/gear statblock
templates, a cross-system gear catalog, the Rules Constitution provider
registry (9 named providers, 19 gameplay areas), two mechanically-identical
faction content catalogs (one real-sourcebook transcription behind an
explicit opt-in gate, one 100% original default), trade economy models and
commodities, biomes, UWP world-profile decode tables, suggestion lenses,
enhancement types, battlemap icons, and the Reference Library's committed
manifest (a permanent catalog independent of whether the PDF bytes are
actually present on disk).

### The UI layer

- **`src/ui/shell.js`** — `mountShell()`, every delegated handler, the
  single re-render loop.
- **`src/ui/workspace/index.js`** — the Story Dashboard: one consolidated
  workspace (the five WHO/WHERE/WHAT/WHY/HOW context areas as
  open-by-default collapsible sections, no longer five separate tabs) with
  a sticky Narrative Composer + pressure-dial sliders in the right column.
- **`src/ui/copilotPanel.js`** — the always-visible Co-Pilot: observation,
  Story Options, lens suggestion, consequence/opportunity, an inspiration
  generator, a suggested-oracle button, a Suggested Rules Lens block, Quick
  Apply actions, and conditional overlooked/flagged-relationship cards, in
  that fixed order.
- **`src/ui/drawers/index.js`** — every drawer's render function
  (Guide/Journal/Oracle/Party/Cast/Entity Detail/Colony/Trade/
  Documents/Gallery/Battlemap/Graph/Settings), dispatched through one
  `renderDrawer(id, doc, ui)` switch. `factionEvents.js` is split out
  separately only to avoid a circular import.
- **`src/ui/mentionEditor.js`, `searchPanel.js`, `imageResize.js`,
  `mechanicsScan.js`, `tocScan.js`, `hostileLocationsFetch.js`** — the rich
  text/mention editor, Universal Search's render, and the browser-only,
  impure edges (PDF scanning, image resizing, a gazetteer fetch) kept
  deliberately out of the pure domain layer.

**The drawer/panel model is a single visible panel with a tab strip**, not a
multi-slot layout. `openDrawers`/`activeDrawer` are ephemeral; when more than
one drawer is pinned open, a tab strip inside that one panel lets the GM
switch between them without losing each tab's scroll/filter state. The
document viewer and the drawer panel are mutually exclusive — at most one is
ever visible. Faction Events has one special case: it can dock as a second
column inside the WHERE dashboard section instead of living in the drawer tab
strip, GM-toggleable either direction — the one place two panels render
side by side today.

### The bundler

`file://` blocks `<script type="module">` via CORS, and the app is meant to
run by double-clicking `index.html` with no server — so `scripts/build.js` is
a hand-written, zero-dependency, regex-based bundler that inlines every
`src/` module into `dist/app.bundle.js` as one classic script, including
aggregate re-exports (`export { A, B }`). It also builds the gitignored
`src/data/docsManifest.js` at build time, mapping each Reference Library
entry to its local `assets/docs/` path (a prior GitHub-Release-hosting
fallback for entries missing locally has been reversed — docs map to
`assets/docs/` only now; a doc's own IndexedDB blob, when imported, is
what makes it portable to a machine that doesn't have the real file). `npm
run build` regenerates the bundle; `npm test` (`pretest` builds
first) runs `tests/domain.test.js` + `tests/migrate.test.js` explicitly
(never a bare `node --test`, which would recurse into unrelated content
under `requirements/`).

---

## Part III — What Exists

Organized by subsystem; every item below has a working, tested implementation
in the current codebase.

**Situation model & story shifts.** The WHO/WHERE/WHAT/WHY/HOW context object,
with 17 named pure reducers (Raise/Lower Threat, Deepen/Resolve Mystery,
Gain/Spend Resources, Raise/Lower Reputation, Raise/Ease Stress, Reveal Clue,
Complicate, Reward, Advance Time, Change Location, Introduce NPC, Set
Objective) and a fixed pacing ladder for Advance Time (Calm → Curious → Tense
→ Escalating → Dangerous → Aftermath).

**Oracle engine.** Nested category/table/entry rolling with full-replacement
content overrides and full-replacement tag overrides layered on shipped
genre-pack content; a per-table 🏷 tag editor with locked (unremovable) tags
where an entity field links to them; a filterable, groupable Oracle drawer
tree. Rolling by tag **filters the visible table tree to matching tables** —
it does not merge same-tagged tables into one combined weighted pool.

**Scene generation.** Continue Story / What Happens Next? — an oracle-driven
composer producing Action/Theme/Descriptor/Focus/sensory/Clue/Complication/
Driver/Pay-the-Price rolls into a Scene object with a derived `text` block
that is never independently editable. Scene-scoped NPC state (Phase 13b):
every in-scene NPC splits live into **Protagonists** (`#character`-tagged,
derived from WHO's mentioned text), **Antagonists** (every other mentioned
NPC, also derived live), and **Bystanders** (a GM-curated add/remove list,
since there's no reliable derived query for "nearby but unmentioned") — each
expandable to five oracle-seedable scene fields (Disposition, Motivation,
Threat Rank, Challenges, Opportunities) plus the NPC's one permanent Current
Goal field. Rolling a scene field records its source table entry; editing it
afterward writes the edit back to that exact oracle entry, so future rolls
produce the GM's own phrasing campaign-wide — a hand-typed value has no
source and is a plain edit.

**Session orchestration.** Continue Story's consequence escalation
(threat/mystery keyword matching bumping the matching dial), faction-pacing
bump, weighted Suggestion Lens draw, lens-guided scene generation, Apply
Story Shift (an omitted payload on Reveal Clue/Complicate/Reward triggers a
real oracle roll instead of a fixed sentence), Roll Oracle, journal note
CRUD with `@mention` auto-linking, capped 6-entry timeline breadcrumbs,
`generateNpc`/`deepenNpc`.

**Cast, relationships & mentions.** Full entity CRUD across 7 types; mirrored
but independently-typed relationships (a directional edge's reverse side
always starts `linked`, never mirrors the same directional type); "flag,
don't auto-correct" integrity checking for type-mismatched relationship
targets (dangling links to a deleted entity are the one case that IS
stripped outright); automatic Bond-track creation between eligible
npc/faction pairs; every entity resolves to a faction (real membership or a
synthetic non-persisted "Unaligned"); `@mention` parsing (bare `@Name` and
bracketed `@[Label|Name#Page]`) with pairwise auto-relate on auto-link; lazy,
additive, never-overwriting type-specific field provisioning for Faction
(HQ/Leadership/Agenda/Force-Cunning-Wealth/Fear-Need-Secret/the full SWN
Faction Turn Engine field set), Location (full UWP profile + development
level/biome/sensory fields), NPC (Current Goal), and Conflict
(status/hero-path fields/collapsed "add depth" bundle including an
append-only irreversible-facts list).

**Statblocks, templates & dice.** Four statblock kinds (npc/vehicle Bestiary,
character, additive gear); three field kinds (text, clamped track, unclamped
attribute); three dice models (`action` — Starforged-style d6+value vs two
d10 challenge dice; `flat` — 5PFH-style vs a target; `traveller` — 2d6-style
vs a target); click-to-set track behavior that counts a track down by one
when clicking its current value (a physical-clock feel, shared by Party
meters); additive auto-attaching statblocks that only ever fill a gap;
template resolution with a guaranteed hardcoded fallback for any
unrecognized ruleset id.

**Threads.** The general-purpose progress-clock primitive: segments clamped
2–12, a 7-state lifecycle (seeded/active/escalating/dormant/converging/
resolved/archived) with automatic resolved↔active transition on fill/unfill
only, a GM-set-only priority dial, and a `kind` tagging convention reused by
five other subsystems (faction-pressure, faction-goal, contract, expedition,
faction-conflict-escalation) without any generic Thread mutator needing to
change.

**Relationship graph.** A deterministic, seeded Fruchterman-Reingold
force-directed layout — the same campaign cast renders in the same positions
across reloads, with per-iteration bounds clamping and linear cooling.

**Co-Pilot.** `advise()`'s independently-computed first-match-wins priority
chains for observation/consequence/opportunity/suggested-oracle/quick-actions,
plus `gatherSceneContext`/`buildStoryOptions`' genuinely cumulative weighted
ranking (every currently-relevant signal contributes its own entry — faction
agenda, faction fear/need with a negotiate-activity reversal, in-scene NPC
goals, Conflict gaps, foreshadowing, world flags, high-fill threads) and
`composeNarrativeDraft`'s read-only live preview assembled from raw,
unstripped Focus text.

**Session Recap, Foreshadowing, World State Flags.** A pure "Previously
on..." composer; a private plant/pay-off to-do ledger (paid-off is an
in-place flag, deletion allowed since it's a GM to-do, not canon); a 4-state
(`unknown|suspected|confirmed|false`) fact ledger where updating in place is
the entire point.

**Party & Colony.** A live `#character`-tag roster plus free-form trackers
(immutable `meter`/`counter`/`currency` kind, Starforged-difficulty-aware
tick stepping); a fixed 22-field 5PFH Planetfall turn sheet with an
id-referencing crew roster and a `#lifeform` live filter.

**Guide, Documents, rich text.** A drag-and-drop-reparentable document tree
with cascading delete; a document library plus a build-time-scanned,
GM-overridable Reference Library (overrides keyed by stable file identity,
never array index); a deliberately-not-full-Markdown rich text engine
(bold/italic/underline/small/large, sanitized links, sanitized inline hex
color, one-level bullet/numbered lists, a minimal pipe table) where plain
text is always the one stored source of truth; PDF bookmark-outline scanning
into the Guide tree; PDF term-index scanning into the Guide.

**Gallery & Battlemap.** Pointer-based entity thumbnails; auto-generated
thumbnail/original pairs on oversized upload with a locked type tag; named
battlemaps with 0–1-fraction icon coordinates (annotation or entity-linked
token), an optional grid, and pan/zoom.

**Trade, Missions, Factions.** The full `priceAt` pricing formula (base ×
demand/supply × development-level bias × biome bias, floored at 1);
buy-drains/sell-floods supply-dial feedback; Contracts as tagged Threads with
route-driven payout; a pure danger-scaled Mission generator; the lightweight
Faction Pressure Track mini-game (d10+stat vs. a fixed band); the first-class
Conflict entity type with a permanent 6-segment escalation clock and a
one-click hero-path quick-start generator; the full SWN-style Faction Turn
Engine — propose-then-confirm drafting against a scratch clone, all 9 named
actions (Buy/Sell/Repair/Refit/Expand Influence/Remove Base/Change
Homeworld/Seize Planet/Attack/Use Asset Ability/Toggle Stealth), upkeep with
a two-consecutive-miss asset-loss rule, goal tracking sized to computed
difficulty, and content resolved through an interchangeable two-provider
catalog (one real-sourcebook-gated, one always-available original).

**Enhancements & Expeditions.** Genre-agnostic Strain/capacity augmentation
where exceeding capacity is a visible flag only, never an automatic penalty;
away-mission trackers reusing the Thread clock plus three additional 0–10
dials (Supplies/Exposure/Morale).

**Universal Search.** One free-text query across Cast/Journal/Oracle/
Documents/Party/Colony in a fixed category order, returning declarative
navigation targets rather than touching the DOM directly.

**Import/export.** Whole-campaign JSON export/import (always fully
replaces); Content Pack export/import (always additive between separate
campaigns, fresh ids, dangling-reference dropping); curated bulk catalog
import with name-collision skip (the HOSTILE Canon Locations gazetteer is
the one shipped example, ~54 worlds).

**Activities → Rules Lens suggestion.** A fixed activity catalog mapped to
gameplay areas via the Rules Constitution registry; resolving an
unrecognized activity id returns `null`, never throws.

**Reference tools.** An on-demand Game Mechanics Index PDF full-text scan and
a PDF bookmark/outline-to-Guide-tree scan — both browser-only, both requiring
an `http(s)` origin (`npm run serve`) rather than a `file://` double-click,
the one deliberate, narrowly-scoped exception to the app's offline-first
posture.

---

## Part IV — What Does Not Exist

Everything below is described in either `requirements/functional-requirements-v3.md`
(and the v2 spec it superseded) or the legacy design corpus, but has no working implementation in the current
codebase, as of this audit. This list states absence only — see
`deviations.md` for where each item originates.

**UI/workspace structure**
- A multi-slot, repositionable drawer layout (movable left/center/right
  positions, 2×/3× drawer widths, a drawer popping out into its own browser
  window). The current drawer system is a single visible panel with an
  internal tab strip.
- A dedicated "Storyboard" / "Story Navigator" / "Advisor" three-panel
  default workspace as its own named layout, distinct from today's
  Dashboard + sticky Composer + always-visible Co-Pilot arrangement.
- A location breadcrumb (Site → Region → System → Sector) rendered as a
  clickable trail at the top of the workspace.
- A Moves/Player Actions catalog: a browsable, collapsing tree of named
  Moves (Starforged-style) with a roll button per move, cross-links between
  moves (e.g. "Pay the Price" opening the specific move it references), and
  move suggestions surfaced after a roll completes. No move-catalog data
  file, no Moves UI, and no roll-button-per-move mechanism exist anywhere in
  the codebase. ("Pay the Price" today is a single oracle table entry, not a
  Move.)
- A whole-NPC "reroll to fit the scene, regenerate until suitable" generator
  distinct from the existing per-field scene-NPC oracle rolls, and a
  lock/unlock mechanic on individually-rerolled NPC fields.
- Small (48px) NPC thumbnail chips in the Composer with independent
  add-to-Storyboard/delete controls.

**Oracle engine**
- Rolling "by tag" as a single combined weighted table across every
  same-tagged table (today, a tag only filters which separate tables are
  shown — rolling still targets one table or one group at a time).

**Faction/world simulation depth**
- A faction-size field driving auto-generated FacCreds/stat scaling on
  faction creation.
- Automatic inclusion of every faction present in a location's full
  containment chain (system down to site) in every faction-turn calculation.

**Content pipeline**
- Battlemap encounter overlays (initiative/round tracking, spawn zones),
  room/asset templates with procedural room generation, manual-reveal fog of
  war, and multi-map "floors."
- A gridless vessel-deckplan builder (part library, icon rotation/flip) as
  its own tool.
- An Encounter Manager with per-ruleset initiative/attack resolvers.

**Platform**
- Multi-user access, authentication, or any cloud-hosted shared campaign
  database — the app is single-user and local-first with no accounts.
- A plugin/extension SDK — rules packs, oracle packs, entity templates, and
  UI themes are added by editing `src/data/`, not by installing a
  third-party package.
- A formal typed event bus — the app uses one global `store.subscribe()`
  triggering a full re-render, not a named-event publish/subscribe system.
- A branching, pre-authored scene graph with stable scene identity — scenes
  here are live, 100% oracle-driven improv; there is no `resolveScene()` or
  equivalent.

**Thread depth**
- Urgency and momentum dials on a Thread (today a Thread carries `status`
  and `priority` only).

**Search**
- A single unified "Knowledge Card" result surface with relevance ranking
  by relationship proximity/story importance/recency, and persistent saved
  dynamic queries. Universal Search today is a fixed-category-order,
  case-insensitive substring match with a hard result cap.
