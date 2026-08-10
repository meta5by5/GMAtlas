# GMAtlas — Functional Requirements

This document specifies GMAtlas's behavior completely enough to rebuild the
application from scratch without access to the original source. It describes
**what the system does and the exact rules that govern it**, not how the
current codebase is organized — though the grouping below mirrors the
existing `src/domain/*.js` module boundaries because that decomposition has
proven sound. Where a rule is subtle or easy to get wrong, it is called out
explicitly.

This is a functional spec, not a UI style guide: layout/CSS is described only
where it encodes a functional rule (e.g. "zero space until opened").

---

## 1. Product Overview

GMAtlas is a **campaign operating system** for solo and GM-run sci-fi tabletop
RPG play: a static, local-first, installable-as-PWA web app with **no
backend** — a single HTML document, a bundled JS file, and browser storage.
It helps a GM run a session by tracking one evolving campaign state (a
"situation"), generating oracle-driven narrative content on demand, and
surfacing proactive suggestions — but it never plays the game for the GM.

### 1.1 Design philosophy

1. **The campaign is the primary product.** Everything else (rules, dice,
   tables) serves recording and advancing an ongoing campaign.
2. **The GM always retains creative authority.** The system never silently
   auto-applies a consequence to persistent state — every mechanical
   suggestion (a faction's turn, an escalation) is proposed and requires an
   explicit commit. Random generation produces *suggestions*, never facts,
   until a GM accepts them (by rolling them into a field, or leaving a
   generated field untouched).
3. **Story is permanent; mechanics are interchangeable lenses.** Which
   ruleset supplies stat blocks, dice mechanics, or oracle content is a
   swappable data choice (a "Rules Lens" / "genre pack"), never hardcoded
   into the narrative/engine layer.
4. **Context is the foundation of every recommendation.** Suggestions read
   from the live WHO/WHERE/WHAT/WHY/HOW situation model plus the wider
   campaign graph — not from a canned script.
5. **Mission Control is the primary workspace.** One consolidated dashboard
   view is the default, not a maze of screens.
6. **Relationships create meaning.** Entities are meaningfully connected via
   typed, weighted relationships and free-text @mentions, not siloed
   records.
7. **Everything important should be connected.** Any GM-visible piece of
   text (Journal, entity fields, oracle output) can reference any entity or
   document via `@mention` syntax, and that reference is live/navigable.
8. **Campaign data is sacred.** Nothing the GM has entered is ever silently
   dropped by an import/migration/upgrade. Certain records (irreversible
   facts, foreshadowing history) are append-only by design — "flag, don't
   delete."
9. **The platform extends via engines/templates/activities/plugins, not
   parallel systems.** A new game system or genre is added as a data file
   (a new ruleset/genre-pack/statblock-template/faction-provider), not a
   parallel copy of the app's logic.
10. **Frictionless Empowerment.** Reduce the GM's cognitive/mechanical
    overhead; increase their meaningful creative control. When two designs
    are otherwise equal, prefer the one that keeps the GM improvising
    instead of filling out forms.

### 1.2 Genre-aware, not genre-locked

No part of the core engine hardcodes one ruleset's stat names, dice
mechanic, or table content. Statblock fields, oracle tables, gear catalogs,
faction content, and economy models are all **data**, resolved through a
small set of lookup/fallback functions (`findX(id)` patterns, see §7) that
never throw on an unrecognized id — they degrade to a safe default. A new
genre pack or ruleset is added by writing a new data file, not by touching
engine code.

### 1.3 Visual tiers (UX contract, not a data model)

- **Primary (~85% of the screen):** the Story Dashboard (WHO/WHERE/WHAT/
  WHY/HOW, consolidated) and the always-visible Co-Pilot panel.
- **Secondary:** current recommendation, breadcrumb timeline, story-shift
  actions.
- **Tertiary:** every other feature (Journal, Oracle, Cast, Graph,
  Documents, Settings, Party, Colony, Guide, Trade, Gallery, Battlemap,
  Faction Events, ...) lives in an edge-tab **drawer** — zero screen space
  until opened, opened as a side panel, never a full navigation away from
  the workspace.
- The defining interaction: **the workspace changes, not the application.**
  A new feature area is a drawer, not a new top-level screen, with one
  recorded, deliberate exception: the Story Dashboard itself replaced five
  separate context tabs with one consolidated always-shown view (§6.2) —
  every suggestion/oracle-generating control that used to live on those
  tabs was relocated into the Co-Pilot panel, which became "the app's one
  active decision sandbox."

---

## 2. Architectural Requirements (non-negotiable)

These rules exist to structurally prevent the specific failure modes of an
earlier prototype (patch-on-patch scripts, 15 scattered storage keys, global
function reassignment, per-element listeners). A rebuild must preserve all
five:

1. **One versioned campaign document is the single source of truth.** A
   schema module defines its exact shape and a version number; every
   feature reads/writes through it. No feature keeps its own separate
   storage.
2. **Exactly one module touches persistence.** All reads/writes to durable
   storage (IndexedDB, with a one-time legacy localStorage migration
   fallback) go through one storage module. It exposes: a synchronous
   `get()` (always the in-memory doc), a synchronous-call-shape `update(fn)`
   (persists in the background; rolls back + reports via an error callback
   on failure), `subscribe(fn)`, an error-callback registration, `export()`
   (synchronous serialize), and real `async` `import()`/`newCampaign()`/
   `bindFile()`. Nothing else touches the storage API directly.
3. **The domain/business-logic layer is pure and DOM-free.** Every mutator
   takes a campaign object and returns a **new** one (clone, never mutate
   the input). No side effects, no DOM access. This is what makes the
   business logic runnable/testable headlessly, and is what makes
   `store.update()`'s optimistic-then-rollback persistence model safe.
4. **Exactly one delegated event listener per browser event type**,
   registered once on the application root: `click`, `dblclick`, `change`,
   `input`, plus drag-and-drop events. All interaction routing goes through
   `data-*` attributes read via "closest matching ancestor" lookups inside
   those handlers — never a per-element listener, never global function
   reassignment, never polling/timing hacks. Adding a new interactive
   control means adding a `data-*` attribute to rendered markup and a
   branch in the relevant handler.
5. **Migration never drops data.** Absorbing a legacy save format must
   losslessly preserve anything a mapping rule doesn't explicitly
   understand, parked under a clearly-marked catch-all bucket on the
   resulting document. A schema change must keep old exports importable
   forever.

A wrapper around every delegated handler must catch any thrown exception
(most commonly a failed persist) and surface it as a visible, non-blocking
notification instead of letting the interaction silently do nothing —
never leave the user wondering whether a click "did nothing."

---

## 3. Data Model — the Campaign Document

One JSON-serializable object is the entire application state. Top-level
shape (`defaultCampaign()`):

```
{
  schemaVersion: <int>,
  app: "GMAtlas",
  meta: { id, title, createdAt, updatedAt },

  context: {
    active: "what",                     // vestigial; UI no longer branches on it
    who:   { summary: "", entityIds: [] },
    where: { summary: "", entityIds: [] },
    what:  { situation: "", intent: "Discovery",
             threat: 2, mystery: 2,      // scene-immediate pressure, 0-10, default 2
             resources: 5, reputation: 5, stress: 5 },  // campaign-level dials, 0-10, default 5 (neutral midpoint)
    why:   { summary: "" },
    how:   { summary: "Exploration", activity: "" },
  },

  entities: { items: [], activeId: null, history: [] },
  scenes: [],
  journal: [],
  timeline: [],               // last 6 breadcrumbs only, oldest dropped
  threads: [],                 // progress clocks — generic + several repurposed "kind"s (see §5.7)
  foreshadowing: [],
  worldFlags: [],
  factionEvents: [],
  factionTurnNumber: 0,
  missions: [],
  director: {},                 // legacy Story Director cascade state, preserved verbatim
  oracles: { overrides: {}, usage: {}, tags: {} },
  documents: { library: [], openTabs: [], activeTab: null, refOverrides: {}, tabPages: {} },
  gallery: { images: [] },
  battlemaps: { maps: [], activeId: null },
  party: { trackers: [], sharedGear: "", sharedAssets: [] },
  colony: { fields: {}, crew: [] },
  guide: { docs: [], activeId: null },
  trade: { manifest: [] },
  mechanicsIndex: [],

  settings: {
    genre: "Hostile", genrePack: "hostile", tradeEconomyModel: "hostile", tone: "",
    statRuleset: "starforged",
    cie: {}, entityTemplates: {}, statblockTemplates: {},
    toolbarCollapsedByDefault: true,
    rulesProviderChoices: {},
    gameSystemActivations: { swn: false },
    factionPacing: { scenesPerRound: 3, scenesSinceLastRound: 0 },
    form: {},                    // legacy Story Director form fields, preserved verbatim
    ui: { activeCenterTab, activeLeftTab, oracleFilter, entityFilter, docFilter, docTagFilter },
  },

  drawers: { widths: { journal, oracle, entities, graph, documents, settings }, open: [] },
  _legacy: {},                   // anything migration couldn't confidently map
}
```

**Merge/default rule:** loading any partial/old document deep-merges it onto
`defaultCampaign()` so a document missing newer fields is always valid —
this is how most features are added "lazily" with no explicit migration
step: a reader/writer backfills a missing field the first time it's
touched, using `if (field === undefined) field = default` (an explicit
`null`/`0`/`''` a GM already set is never overwritten).

**Entity record shape** (`entities.items[]`):
```
{ id, type, name, tags: [], overview, revealed, relationships: [], createdAt,
  statblocks: [ group, ... ], ...type-specific fields (see §5.5) }
```
`type` ∈ `npc | location | faction | asset | lore | item | conflict`.
Relationship: `{ to: entityId, label, type, strength (0-10) }`; `type` ∈
`linked | member_of | owns | controls | located_at | contains | allied_with
| rival_of | bond | involves` (default/unknown falls back to `linked`).

**ID convention:** every generated id is `<short-prefix>_<base36-timestamp>_<random-suffix>`,
guaranteeing rough chronological sortability plus collision resistance
without a central counter.

---

## 4. Persistence & Migration Requirements

### 4.1 Storage engine

- Primary store: IndexedDB, one database, one key/value object store, two
  keys used: the live campaign document, and a **one-slot backup** — the
  document as it was immediately before the most recent write. Writing the
  backup happens first and is best-effort (a failed backup write is logged
  and swallowed, never fatal); writing the real document is what must
  succeed, and its failure is what triggers rollback.
- `update(mutator)` behavior: clone current doc → run mutator → stamp
  `meta.updatedAt` → notify all subscribers **immediately** (synchronous,
  instant UI feedback, before persistence has actually happened) → persist
  in the background → on failure, roll back the in-memory doc and notify
  again, **unless** a newer edit has already landed on top of this one (in
  which case the newer edit wins rather than a stale rollback clobbering
  it). Failures surface via a registered error callback, not a thrown
  exception (there is no synchronous outcome to throw from).
- A storage-usage readout is available synchronously (byte sizes via a
  UTF-8-correct measurement, not raw string length) without an async
  IndexedDB read on every render — cache it and refresh on writes.
- A backup-restore action replaces the live document with the one-slot
  backup; on failure it rolls back to whatever was current rather than
  leaving state half-replaced.
- Optional: a native "bind to a file on disk" flow (where supported by the
  browser) that re-writes a chosen file with the current export on demand.

### 4.2 Legacy absorption (first boot only)

If the IndexedDB store is empty (fresh browser, or a browser that predates
IndexedDB adoption), fall back — once — to reading a fixed list of legacy
`localStorage` keys from an earlier version of the app (main state,
"Story Director" state across several generations — newest present
generation wins, deep-merged not replaced — oracle table overrides, entity
templates, misc settings blobs, document-viewer session state). Map known
fields into their new homes in the unified document (see the field-by-field
mapping table below); **anything not explicitly mapped is preserved
verbatim** under a clearly-namespaced catch-all bucket, keyed by its
original key name, so nothing is silently lost even from keys the mapping
logic doesn't recognize at all. Set a one-time "already migrated" flag so
this fallback path never re-runs. The original legacy keys themselves are
**never deleted** — migration only ever adds a new interpretation, never
removes the old data.

Known field mappings from the legacy main-state object: campaign
title/timestamp carry over directly; a free-text "current thread" becomes
the WHAT question's situation text; intent/threat/mystery map into the WHAT
sub-object; location type + surroundings join into one WHERE summary
string; pacing becomes the HOW summary; scene log, journal, and entities
carry over verbatim (entities deep-merged so new default fields still
apply); oracle usage stats carry over; a fixed list of old form fields is
preserved losslessly even though the current UI doesn't read most of them
directly; anything else lands in the catch-all bucket.

### 4.3 Schema-version upgrade (every load)

Every loaded document — freshly migrated or not — passes through a
version-upgrade step that deep-merges it against current defaults
(backfilling any newly-added field) and stamps the current schema version.
One specific **grandfather rule**: any gated/opt-in content provider
(currently: a real-sourcebook-transcribing faction-data provider) defaults
to OFF for a brand-new campaign (since the app deploys publicly), but is
force-activated for a document that already shows real evidence of having
used it (a committed event log entry from it, or faction fields only that
provider's engine would populate) — **but only if the incoming document had
no explicit activation setting already**, so this never overrides a GM's
own toggle on a later reload.

### 4.4 Export/import

- **Whole-campaign export/import**: the entire document, serialized as
  indented JSON. Import always fully replaces the current campaign after
  validating/migrating it. This is the lossless, canonical backup format.
- **Content-pack export/import** (§5.24): a smaller, portable, always-
  *additive* transfer of just entities/guide-docs/journal between two
  *separate* campaigns — never replaces anything, generates fresh ids on
  import, remaps or drops any reference that would point outside the
  transferred set.

---

## 5. Domain Functional Requirements

Every mutator in this layer is a pure function of `(campaign, ...args) →
newCampaign` (or `{campaign, ...extra}`); every generator is RNG-injectable
(`{ rng = Math.random }`) so it is deterministically testable but uses real
randomness in play.

### 5.1 Situation Model & Story Shifts

**Purpose:** the WHO/WHERE/WHAT/WHY/HOW model plus "Shift Story" — named,
one-click GM actions that intentionally move story state, as an alternative
to hand-editing fields.

- Five named reducers act on `context.who/where/what/why/how`, keyed by a
  shift name; applying an unknown name is a no-op with no event produced.
  Every shift is pure and returns a short human-readable event label.
- Named shifts: Raise/Lower Threat, Deepen/Resolve Mystery, Gain/Spend
  Resources, Raise/Lower Reputation, Raise/Ease Stress, Reveal Clue,
  Complicate, Reward, Advance Time, Change Location, Introduce NPC, Set
  Objective.
- All five numeric dials (threat, mystery, resources, reputation, stress)
  are clamped to **0–10**. Threat/mystery default to 0 if unset; resources/
  reputation/stress default to **5** (neutral midpoint) if unset — old
  saves predating these dials must read as neutral, not as "0/out of
  everything."
- `Complicate` both appends a note to the situation text AND raises threat
  by 1 — one shift, two effects.
- `Reveal Clue` / `Complicate` / `Reward` append a note to the situation
  text (bulleted, new line); given no explicit payload they use a fixed
  generic sentence *unless* the orchestration layer (§5.4) intercepts and
  rolls a real oracle entry instead.
- `Advance Time` steps `how.summary` forward through a fixed pacing ladder
  `Calm → Curious → Tense → Escalating → Dangerous → Aftermath`; an
  unrecognized current value jumps to `Tense`; already at `Aftermath`
  never wraps around.
- `Introduce NPC` merges its payload into `who.summary` as a deduplicated
  comma-separated list (never replaces the summary).
- `Change Location` / `Set Objective` replace `where.summary` /
  `why.summary` outright; a falsy payload is a no-op on the text itself but
  still reports what would have happened in the event label.

### 5.2 Oracle Engine

**Purpose:** the random-table roll engine underlying nearly every
generative feature — nested-table lookup, rolling, GM-editable overrides
layered on shipped content, tagging tables for cross-linking with entity
fields, and building the collapsible category tree the Oracle drawer
renders.

- Tables are a nested object: `Category → TableName → [entry, entry, ...]`
  (one level deeper in a few cases: `Category → SubKind → TableName →
  [...]`). Rolling walks the path and picks a uniformly random entry;
  rolling a *group* (any non-leaf node) rolls every leaf table beneath it
  at once, one output line per leaf, labeled by its path relative to the
  group.
- **Override mechanism:** editing a table's entries does not diff — it
  stores a **full replacement array** keyed by the table's `>`-joined path.
  "Reset" simply deletes that override key, reverting to the shipped
  content. There is no partial patch.
- **Tag mechanism (identical shape):** a table's current tags are its
  stored override if that key exists at all (even an empty array), else a
  shipped seed list, else empty. Any add/remove writes the **full**
  replacement tag list, same "seed until overridden" pattern as content
  overrides.
- **Locked tags:** a tag referenced by any entity-field→oracle-tag link
  (§7) cannot be removed from a table via the tag editor — the removal
  silently no-ops. This guarantees an entity field's "roll related oracle"
  shortcut can never be broken by editing a table's tags.
- The active table set is resolved per-campaign: pick the active genre
  pack's base tables, then layer per-path content overrides on top (a
  non-array override value is ignored).
- **Usage tracking:** every real roll increments a per-top-level-table-
  group usage counter. This is read later purely as a tie-breaker (§5.9),
  never as a primary ranking signal.
- The Oracle drawer's tree groups top-level table categories into a fixed
  set of named, emoji-labeled parent groups (content data, see §7); any
  category not claimed by a group falls into an automatic catch-all
  "Other" bucket so nothing can silently disappear from the UI. Text
  filtering does a case-insensitive substring match against a node's own
  label or its entries, keeping a matching group's entire subtree if the
  group name itself matches, else recursively pruning to just matching
  descendants. Tag filtering follows the identical prune shape, keyed on
  tag membership.
- A deterministic seeded PRNG variant must exist (same algorithm class
  guarantees repeatable sequences for a given seed) for automated testing;
  real play always uses true randomness by default.

### 5.3 Scene Generation

**Purpose:** "Continue Story" / "What Happens Next?" — the oracle-driven
scene generator that turns current context into a structured Scene object,
plus small Mission/World seed generators and per-scene NPC/location state.

- A generated Scene is **not** auto-appended to the campaign — the caller
  decides. Scene `number` = current scene count + 1 at generation time.
- Composition rolls (each independently, missing/empty table → `null`,
  never throws): Action / Theme / Descriptor / Focus / a sensory detail /
  a Story Clue / a Story Complication / a Scene Driver (or, if a
  "Suggestion Lens" is supplied, a single randomly-chosen table from that
  lens's own oracle-category mapping instead of the generic Driver table)
  / a "Pay the Price" line.
- `threat`/`mystery` are copied from the current context dials and frozen
  as a snapshot on the scene at generation time (a later dial change never
  retroactively rewrites an old scene).
- `location` resolves from WHERE's summary, else legacy location-type
  fields, else a fixed fallback string. `opening` is the FULL composed
  sentence (descriptor + sensory detail + a mood aside chosen by a
  threat/mystery-tiered priority chain — highest threat wins, then
  mystery, else a neutral "room to observe" line) — computed once at
  generation, then a freely-editable field afterward that is **never**
  regenerated from context on subsequent edits. `driver`/`clue`/
  `complication`/`consequence` each fall back to a fixed sentence if their
  oracle roll comes back empty. `decisionPoint` is a fixed sentence at
  generation but, like every other split field, freely editable afterward.
- **`text` is always a pure derivation of the current field values, never
  independently editable** — recomputing it after any field edit rebuilds
  the exact same labeled multi-line block (Scene header → Location/dials →
  Oracle spine → Opening → Driver/Clue/Complication → Decision point/
  Likely consequence → optional "Current thread" trailer if the WHAT
  situation has text). This exact layout is treated as load-bearing (it's
  parsed/copy-pasted elsewhere), so a rebuild must reproduce it precisely,
  not just "something similar."
- A scene carries `npcStates` (scene-scoped, per-NPC field data — see
  below) and a `bystanderIds` list, both starting empty and never a
  permanent entity mutation.
- **Scene-scoped NPC fields** (Phase 13): five fields per NPC-in-scene —
  Disposition, Motivation, Threat Rank, Challenges, Opportunities — each
  mapped to its own oracle table path (distinct from the NPC's permanent
  `currentGoal` field, which is NOT scene-scoped). Reading a field for an
  NPC with no recorded state returns an all-blank default without
  mutating; writing lazily creates the per-NPC state object.
- **Location sensory fields** (Sights/Smells/Sounds) follow the identical
  roll pattern but target permanent Location entity fields instead of
  scene state.
- **"Roll, then remember my edits" mechanism** (shared by scene-NPC fields
  and location-sensory fields, orchestrated in §5.4): rolling a field
  records which oracle table + entry index it came from. Editing that
  field's value afterward writes the new text back to that *exact* oracle
  entry — so the same future roll produces the GM's own rewording,
  campaign-wide, from then on. A value that was hand-typed (never rolled)
  has no source to write back to, so editing it is a plain update with no
  side effect. This distinction is tracked purely by the presence/absence
  of a recorded source, not a separate flag.
- Mission-seed / World-seed generators: several independent oracle rolls
  each formatted as `"Label: value"`; any line whose roll came back null is
  dropped entirely (a genre pack missing a given table quietly omits that
  line rather than showing a broken placeholder).
- Bystander add/remove on a scene are idempotent no-ops on a duplicate/
  missing entry.

### 5.4 Session Orchestration

**Purpose:** the top-level, UI-facing operations that compose the context,
scene, oracle, and entity layers into complete user actions.

- **Continue Story**: generates a scene, appends it, optionally journals
  its full text, pushes a timeline breadcrumb, and bumps the faction-
  pacing counter (see below). **Consequence escalation:** if the scene's
  `consequence` text matches a threat-flavored keyword pattern
  (threat/danger/hostile/attack), raise context threat by 1 (capped at
  10); *independently*, if it matches a mystery-flavored pattern
  (mystery/unknown/hidden/strange), raise context mystery by 1 (capped at
  10) — both can fire from the same consequence text.
- **Faction pacing bump**: every scene generated (via Continue Story or a
  lens-guided variant) increments a "scenes since last faction round"
  counter, defaulting the whole pacing structure if absent. This is a pure
  reminder counter — it never auto-triggers a faction turn; a faction round
  is only "due" as a derived boolean the Co-Pilot can nudge about.
- **Suggestion Lens draw**: draw N distinct lenses (no replacement) from a
  fixed lens catalog (§7). Optionally weighted by current scene context: an
  active "negotiate" Activity triples the odds of negotiation/social-
  leverage lenses; any Conflict present triples violence/politics; any
  faction present triples trade/economics/politics. Omitting scene context
  falls back to a pure unweighted draw.
- **Lens-guided scene generation**: identical to Continue Story but passes
  the chosen lens's oracle-category mapping into scene generation so the
  Driver line draws from that lens's content instead of the generic Driver
  table; an unrecognized lens id silently falls back to ordinary
  lens-less generation (never an error).
- **Apply Story Shift**: wraps the context reducer (§5.1). An explicit
  payload always wins. For `Reveal Clue`/`Complicate`/`Reward` specifically,
  an *omitted* payload triggers a **real oracle roll** (Story Clue / Story
  Complication / Reward table respectively) wrapped in a shift-specific
  sentence template, instead of falling through to the reducer's one fixed
  generic sentence — every other shift is unaffected. Pushes a timeline
  breadcrumb if an event resulted.
- **Roll Oracle**: rolls a single table or a whole group; tracks usage on
  the top-level table-group key on every roll; optionally journals the
  formatted result.
- **Add/Edit Journal Note**: appends (or overwrites) a journal entry, then
  auto-links @mentions in the text — auto-creating/relating any mentioned
  name that doesn't already resolve to an entity or a document, computed
  in that priority order so a document mention is never also spawned as a
  duplicate phantom entity.
- **Timeline breadcrumbs**: capped at the most recent **6** entries; older
  ones are dropped, not archived.
- **Field edits**: generic per-scene-field and per-context-field editors
  that write the value then (for scene fields) recompose the derived
  `text`, and (for context text fields) re-run @mention auto-linking.
- **NPC generation**: rolls a Name/Role/Goal/Revealed-Aspect/Disposition/
  First-Look oracle chain, creates a new NPC entity, composes a public
  Overview summary from role/disposition/first-look/goal, sets the private
  Revealed field to the rolled aspect, journals a summary line.
- **NPC deepening** (existing NPC only): rolls Stereotype/Want/
  Complication; Stereotype appends to the *public* Overview, Want and
  Complication append to the *private* Revealed field (secrets, not shared
  with players); a no-op if the entity isn't an NPC or nothing rolled.

### 5.5 Entities — Cast, Relationships & Mentions

**Purpose:** CRUD, tagging, and bidirectional relationship management for
every game-world entity; @mention parsing/auto-linking; type-specific field
provisioning; "flag, don't auto-correct" data-integrity checks.

- Entity types: `npc, location, faction, asset, lore, item, conflict`.
- **Relationship storage is mirrored but independently typed**: creating a
  relationship from A→B with a directional type (e.g. `member_of`) sets
  A's edge to that type, but **B's mirrored edge back to A always starts
  as the untyped `linked`** — a directional constraint like "Member Of →
  Faction" would almost always mis-flag the reverse direction immediately
  if mirrored verbatim. Re-adding a relationship that already exists on a
  given side is a no-op (no duplicates); a self-link is always a no-op.
  Editing a relationship's label/type/strength only ever touches the one
  side being edited (each side is edited independently, never both at
  once).
- **"Flag, don't auto-correct" relationship integrity**: a directional
  relationship type implies its target should be a specific entity type
  (e.g. `owns` should point at an asset). If the current target's type no
  longer matches — because the target entity was retyped, not because the
  edge was ever validated at creation — the relationship is **flagged**,
  never auto-fixed or auto-deleted. Mutual types (`allied_with`/`rival_of`/
  `bond`) are flagged if *either* side's type is wrong. Not deduplicated
  across a mirrored pair — both sides are reported independently. A
  dangling link to a fully-deleted entity is a separate case (relationships
  pointing at a deleted entity are stripped outright when that entity is
  removed).
- **Bond tracking**: the moment a relationship is (re)typed as `bond`
  between two eligible entities (npc/faction, both must already carry a
  character-sheet statblock group), a dedicated 10-segment progress-track
  field is auto-created on that statblock group (named for the bonded
  entity) — but only if no track for that exact target already exists.
  Silently does nothing if any precondition fails (no error).
- **Every entity conceptually belongs to a faction**, even one with no
  explicit membership — resolving an entity's faction returns its real
  `member_of` target if one resolves to an actual faction, else a
  synthetic, non-persisted `"Unaligned"` placeholder. Setting membership
  always **replaces** any prior `member_of` edge outright (never allows
  two).
- **@mention parsing** has two forms sharing identical semantics between
  document mentions and entity mentions (the punctuation alone can't
  distinguish the two — resolution order decides): a bare `@Name` form
  (whitespace-tolerant multi-word scan that stops at another `@`,
  punctuation, or a small set of stop-words like "and/or/the/a/an/to/for/
  with/from/in/on" — so "@Captain Reyes and the crew" parses just "Captain
  Reyes"), and a bracketed `@[Label|Name#Page]` form supporting an
  optional custom display label and an optional page anchor (only the
  bracketed form can carry either). Auto-linking finds-or-creates an
  entity of a caller-specified default type for every mentioned name not
  already resolving to something, then — if requested — relates **every
  pairwise combination** of the mentioned names to each other (not just
  adjacent pairs).
- **Type-specific field provisioning** is lazy and additive: creating or
  retyping an entity ensures the fields relevant to its current type exist
  (never removes fields from a type it's no longer, and never overwrites a
  value already explicitly set — only backfills what's truly missing).
  - **Faction**: HQ, Leadership, Scenario Seed, Agenda (free text); Force/
    Cunning/Wealth stats defaulting to **3** each ("capable but
    unremarkable," not 0 or a max); an asset free-text list; Fear/Need/
    Secret (diplomacy fields); plus the full SWN-style Faction Turn Engine
    field set (HP — computed once from stats at first touch, then a real
    independently-adjustable value; FacCreds; XP; Homeworld; Bases of
    Influence list; structured faction assets; faction tags; governed-
    locations list; current goal id; siege progress; busy-until-turn;
    per-faction rules-provider override).
  - **Location**: a full World Profile / UWP field set (hex, zone,
    starport class, world size, atmosphere, hydrographics, population,
    government, law level, tech level, bases, trade codes, gas-giant flag,
    star system, sector, object type); plus development level, biome,
    a free-text Location Story field, and Sights/Smells/Sounds sensory
    fields with their oracle-source tracking.
  - **NPC**: a single persistent Current Goal field (scene-scoped fields
    live on the scene, not here — see §5.3).
  - **Conflict**: a lifecycle status (cold/simmering/active/escalated/
    open_war/resolved, defaulting to cold), several "hero path"
    stated-vs-root-cause fields, a session-hooks list, and a
    collapsed-by-default "add depth" bundle: deep-root summary,
    precipitating incident, last de-escalation attempt, party leverage, GM
    notes, an **append-only** irreversible-facts list (never removed —
    Article VIII), per-involved-faction posture (cohesion dial + notes,
    scoped to *this* conflict so the same faction can hold a different
    posture in a different simultaneous conflict), and an information-
    asymmetry record (who holds it / what they know / impact if revealed /
    a revealed flag set in place, distinct from clearing it outright).
- Computed faction max-HP is **always derived from current stats**, never
  independently stored, so it can never drift out of sync with the base
  stats.
- Deleting an entity strips every relationship pointing at it from every
  other entity, and if it was the active entity, falls back to the first
  remaining entity (or none).
- A recently-active-entity history is tracked (deduplicated,
  most-recent-first, capped at 12).
- A shared, reusable entity filter (type list + free-text search across
  name/type-label/tags + AND-semantics tag list) backs both the Cast
  drawer's own filtering and any other feature that needs "find the entity
  matching X" (e.g. correctly picking the next entity to show after
  deleting the currently-filtered one).

### 5.6 Statblocks, Templates & Dice

**Purpose:** structured, per-ruleset stat blocks attachable to any entity
(an entity can carry several simultaneously — e.g. two rulesets' character
sheets at once, or a Bestiary template plus a vehicle stat block), with
click-to-roll mechanics matched to whichever dice model a field declares.

- A statblock is one of: `npc`/`vehicle` (a "Bestiary" template, exclusive
  — an entity gets at most the auto-assigned default unless the GM adds
  more), `character` (a ruleset's PC sheet), or `gear` (additive — several
  ruleset-specific gear stat groups can coexist on one Item).
- A field is one of three kinds: plain **text**; a numeric **track**
  (`value/max`, click-to-set, clamped to `[0, max]`, default max 5); an
  **attribute** (freely editable signed integer, rollable via its own
  label, no clamp — legitimately can go negative or past any nominal
  scale).
- **Dice models** (`rollMethod`): `none` (not rollable), `action`
  (Starforged/Ironsworn-style), `flat` (5PFH-style, default target 6),
  `traveller` (2d6-style, default target 8). This list is meant to grow
  as more systems get authored mechanics — never treat it as closed.
  - **Action roll**: 1d6 + field value + situational adds, compared
    against **two separate d10 challenge dice**. Hits = how many challenge
    dice the total *strictly* exceeds (0, 1, or 2). 2 hits = strong hit; 1
    = weak hit; 0 = miss. A tie between the two challenge dice is flagged
    (`match`) but left for the GM to interpret — no automatic mechanical
    effect.
  - **Flat roll**: 1d6 + value + adds vs. a target; success is
    meet-or-beat (`>= target`).
  - **Traveller roll**: 2d6 + value + adds vs. a target; same
    meet-or-beat rule.
  - Every roll result must be formattable both as a one-line toast/label
    string and as a longer, exact, tab-indented plain-text block suitable
    for clipboard copy (consumers may depend on this exact text shape).
- **Click-to-set track behavior**: clicking the box matching the field's
  *current* value counts it **down by one** instead of leaving it
  unchanged — this lets repeatedly clicking the currently-filled box count
  down one segment at a time, matching a physical clock/tracker's feel.
  The identical toggle-down convention applies to Party meter trackers.
- **Auto-attaching statblocks** happens additively and only fills a gap —
  never replaces or removes an existing group: an Asset tagged `#vehicle`
  with no vehicle group gets one; an NPC tagged `#character` with no
  character group gets one (using the campaign's default ruleset); a plain
  NPC with *zero* statblock groups at all gets a default Bestiary group
  (an NPC that already has some other group, e.g. manually given a
  character sheet without the tag, does not additionally get an auto npc
  group).
- **Template resolution has a guaranteed fallback chain**: requested
  template id → the generic/default template for that kind → a small
  hardcoded field set — a statblock group can always be built, even for an
  unrecognized ruleset id (which silently degrades rather than erroring).
- **Template editing (Settings)** is separate from editing an individual
  entity's field *values* — this is "author the shape" (key, kind, roll
  method, sort order — array position **is** the sort order, no separate
  order field) vs. "fill in the numbers." The first edit to any given
  system's template must copy the current *merged* (shipped defaults +
  any prior overrides) field list into the override before applying the
  new change, so subsequent edits are always additive against what was
  already there — never silently reverting to just the shipped defaults.
- Display sort order for a mixed set of statblock groups on one entity:
  character sheets first, then Bestiary/npc, then vehicle — sorted for
  *display* only; every mutator still addresses a group by its original,
  unsorted array index so sorting never disturbs edit addressing.

### 5.7 Threads — Progress Clocks

**Purpose:** the app's general-purpose "progress clock" primitive — a
segmented dial the GM fills in as a plotline develops — with a lightweight
narrative lifecycle layered on top. Reused, not reimplemented, by several
other subsystems (see the `kind` tagging convention below).

- A thread: `{ name, filled, segments, done, status, priority, kind? }`.
  `status` ∈ `seeded | active | escalating | dormant | converging |
  resolved | archived`. `priority` ∈ `low | normal | high`.
- Reading any thread list backfills a missing `priority` (`normal`) and a
  missing `status` (derived from `done`) on the fly, non-destructively —
  this is a read-time view, not a stored guarantee.
- Adding a thread clamps its segment count to **[2, 12]**; a falsy/zero
  segment count falls back to 4 first, then is clamped.
- Advancing/retreating a clock clamps `filled` to `[0, segments]` and
  derives `done` from the clamp result. **Automatic status transition**:
  filling a clock completely flips status to `resolved`, *unless* it's
  already `archived` (archived stays archived even when filled); pulling a
  full clock back below full while status is `resolved` reverts it to
  `active`. Every *other* status (escalating/dormant/seeded/converging) is
  left completely alone by clock movement — only the resolved↔active
  transition is automatic; anything else requires an explicit GM status
  change.
- Priority is **never** auto-computed — purely a GM-set dial ("flag, don't
  auto-correct").
- "Under pressure" = the open thread with the highest fill ratio.
  "Overlooked" = open threads that are either explicitly Dormant, or still
  at zero progress since creation regardless of status — purely
  observational, surfaced (e.g. by Co-Pilot) and never auto-modified.
- **The `kind` tag convention**: setting an optional `kind` field
  repurposes a thread for a specific subsystem while every generic Thread
  mutator (advance/status/priority/remove) keeps working on it unchanged.
  Consumers of the *generic* thread list must exclude tagged threads.
  Known kinds: `faction-pressure` (§5.18), `faction-goal` (§5.20),
  `contract` (§5.16), `expedition` (§5.22), `faction-conflict-escalation`
  (§5.19).

### 5.8 Relationship Graph

**Purpose:** turns entity relationships into a visual node/edge graph with
a deterministic, legible layout.

- Node color is fixed per entity type; an unrecognized type (e.g. `item`)
  gets a neutral fallback color.
- Building the graph deduplicates the mirrored relationship pair into a
  single edge per unordered `{A,B}` pair (relationships are stored on both
  ends); edges pointing at a nonexistent entity are silently dropped.
- **Deterministic layout**: a classic force-directed (Fruchterman-Reingold
  style) algorithm — nodes repel each other, connected nodes attract along
  a target edge length, a strong center-pulling gravity term counteracts
  the (deliberately boosted) repulsion so the graph doesn't over-spread,
  and movement is clamped to the visible bounds **every iteration** (not
  just at the end — clamping only once would let outer nodes wildly
  overshoot and then collapse onto the same corner once finally clamped).
  Temperature/step-size cools linearly toward zero.
  - The layout seed is derived purely from the **set** of node ids
    (order-independent), so the same campaign cast always renders in the
    same positions across reloads — no jitter between re-renders as long
    as the set of entities is unchanged.
  - A single-node graph is special-cased to dead center; an empty graph
    returns immediately.

### 5.9 Co-Pilot (`advise`, Story Options, Narrative Composer)

**Purpose:** the app's proactive "GM assistant" — a pure, deterministic-
given-state heuristic (explicitly designed to be swappable for an LLM
later without changing its contract) that reads the whole campaign and
surfaces prioritized suggestions. Never mutates anything.

**`advise(campaign)`** produces one bundle with several **independently
computed** fields — they are not all derived from the same winning
condition:

- **`observation`** — a single, strict, **first-match-wins** priority
  chain (only one fires), checked in this exact order: (1) a generic
  thread at ≥75% fill, (2) a faction close to acting on its agenda
  (pressure track ≥75%), (3) a faction close to completing its goal, (4)
  an expedition low on supplies or dangerously exposed, (5) a witnessed
  faction-vs-world event at the party's current location, (6) a faction
  round overdue, (7) threat ≥7, (8) stress ≥7, (9) resources ≤2, (10)
  threat ≥4, (11) mystery ≥6, (12) reputation ≤2, (13) any open generic
  thread exists at all, (14) a calm fallback message.
- **`consequence`** — a *separate* independent priority chain (not tied to
  which observation fired): threat≥6 → a hard choice is forced; else
  stress≥6 → someone cracks; else resources≤2 → a shortage bites; else
  reputation≤2 → a contact refuses; else a generic "cools, something
  advances offscreen" line.
- **`opportunity`** — a *third* independent priority chain: mystery≥4 → a
  clue can connect scene to entity/thread; else reputation≥8 → a favor
  opens; else resources≥8 → surplus enables risk; else stress≤2 → calm
  holds, room to set up the next scare; else a generic alternate-route
  line.
- **`suggestedOraclePath`** and **`quickActions`** — each their own
  dial-tiered chain pointing at one relevant oracle table / a pair of
  relevant quick-shift buttons.
- **`overlooked`** / **`flaggedRelationships`** — pass through the raw
  observational lists from §5.7/§5.5, formatted for display; never
  auto-corrected.

**`buildStoryOptions(campaign, {limit})`** — a **genuinely cumulative**
ranked list, unlike `advise`'s single-winner chain: *every* currently-
relevant signal contributes its own entry, each with a fixed weight:
faction agenda (5, or 9 if the current Activity is "negotiate"); faction
fear/need (4, or **10** if negotiating — fear/need deliberately outranks
agenda specifically while negotiating, the reverse of the default order);
an in-scene NPC's current goal (6); a present Conflict's stated-vs-root
gap (7); an open foreshadowing plant (6); a surfaced (non-confirmed,
non-false) world flag (5); an open thread at ≥60% fill (8). Sorted by
weight descending; an *exact* tie is broken by which oracle group's tables
the GM has rolled more often historically (never overrides a real weight
difference). Truncated to `limit`.

**`composeNarrativeDraft(campaign, {selectedOptionIds})`** — assembles one
plain-text paragraph from: the raw WHERE Focus text, the raw WHO Focus
text, the WHAT situation text, the detail line of every currently-selected
Story Option, and (if set) a trailing "party's aim right now" sentence from
WHY. Uses the **raw, hand-typed Focus text verbatim** (not a synthesized
"X is present" sentence re-derived from parsed mentions) so free prose the
GM actually wrote is never silently dropped from the draft, and preserves
raw markup unstripped since downstream consumers (a rich preview, and the
Journal's own auto-linking) both expect that exact format.

**`gatherSceneContext(campaign)`** — the shared read-only snapshot behind
both of the above: in-scene NPCs/factions (derived from parsing WHO/WHERE's
*current text*, not a separate stored id list — deliberately the single
source of truth), present Conflicts, open generic threads, open
foreshadowing, surfaceable world flags, and the raw dial values.

### 5.10 Session Recap

**Purpose:** a pure, read-only "previously on..." composer for quick
re-orientation — no new storage, entirely derived from existing data.

- Composes: the most recent 8 journal entries (excluding any entry that is
  itself a saved recap, so recaps never recursively nest), the list of
  open threads plus whichever is under the most pressure, the entities
  currently referenced by WHO/WHERE, the current objective (WHY summary),
  current threat/mystery, and a recommended next action pulled straight
  from `advise()`.
- Must render as one fixed-shape plain-text block with clearly labeled
  sections, each section omitted entirely if empty (except the pressure
  and recommendation lines, which always print).

### 5.11 Foreshadowing & World State Flags

**Foreshadowing** — a GM's private plant/pay-off to-do list, deliberately
freestanding (not linked to a specific scene/thread id, since scenes have
no stable pre-authored identity to point at): `{ text, payoffNote,
paidOff, paidOffNote, plantedAt, paidOffAt }`. Marking something paid off
is an in-place flag (never delete — consistent with the app's
"flag/append, don't delete" posture elsewhere), records how it *actually*
resolved (which may differ from the originally planned note — "improv rarely
goes exactly as planned"), and is idempotent (re-marking an already-paid-
off entry is a no-op). Outright removal is allowed (unlike an Irreversible
Fact) since this is the GM's own private to-do, not campaign canon.
"Open" = not yet paid off, sorted oldest-planted-first.

**World State Flags** — a discrete, **4-state** (not boolean) fact ledger:
`unknown | suspected | confirmed | false`. New flags default to
`unknown` — a fact that exists but isn't yet known either way, not
`suspected` and not null. Updating a flag's value in place *is* the
meaningful event the whole design exists to capture — never modeled as
delete-and-recreate. An invalid value on creation silently falls back to
`unknown`; an invalid value on update is rejected outright (flag left
unchanged). Genuine deletion is allowed (a flag can simply be a mistaken
entry, unlike Foreshadowing there's no "private to-do" framing making
deletion sensitive).

### 5.12 Party & Colony

**Party** — the party roster is a **live filter**, not stored data: every
NPC entity tagged `#character`. Separately, `party.trackers[]` covers
free-form resources not tied to any one entity (credits, custom clocks,
timers): each tracker has an immutable `kind` ∈ `meter | counter |
currency` fixed at creation (never editable afterward, along with `max`
and, for Starforged progress-difficulty-linked counters, `difficulty`).
- A `meter` is click-to-set only (with the same toggle-down-on-current-
  value behavior as a statblock track) and never steps by delta.
- A `counter`/`currency` steps by an explicit delta, UNLESS it's tagged
  with a Starforged progress-difficulty rank, in which case it steps by
  that rank's fixed tick count (e.g. Troublesome moves 12 ticks,
  Epic moves 1, out of a shared 40-tick track) rather than a plain ±1.
  Non-difficulty counters clamp to a floor of 0 only (no upper cap);
  difficulty-linked ones clamp to the shared track's fixed max.
- Also tracks one free-text Shared Gear field and a Shared Assets chip
  list.

**Colony** — a fixed, ruleset-specific (5PFH Planetfall-style) flat "turn
sheet" of ~21 named fields (turn number, milestones, roster size, morale,
integrity, build/research points, story points, ancient signs, repair
capacity, augmentation points, defenses, raw materials, calamity points,
grunts, enemy info, mission data, condition notes, notes), each typed
text/number/textarea for rendering purposes; a number-typed field coerces
non-numeric input to 0. A separate crew roster references character/
vehicle entity ids by id rather than duplicating their stats. A
"lifeform encounters" list is a live filter over entities tagged
`#lifeform`/`#lifeforms` (singular or plural).

### 5.13 Guide & Reference Table of Contents

**Purpose:** a GM's own freeform reference material, organized as a tree of
named documents (not a single blob), each supporting the same @mention/
rich-text syntax as everywhere else.

- A doc: `{ title, text, parentId, order }`. Building the display tree
  nests by `parentId`, sorting each level by `order`.
- **Legacy single-doc migration**: an old campaign's single `{text}` guide
  is folded into a real tree the first time it's *written to* — seeded
  with one root doc carrying the old text, using a **fixed, non-random id**
  so that a pure read taken *before* any write (which must independently
  synthesize the same placeholder) always agrees with what the eventual
  real write produces — no UI action taken before the first write can ever
  reference an id that later becomes invalid.
- Creating a doc appends it as the next sibling under its resolved parent
  (or top-level if the requested parent doesn't resolve); order = 1 + the
  max existing sibling order (0 if none).
- **Deleting a doc cascades to its entire subtree.** There must always be
  at least one doc — deleting the last one is a no-op, and deleting the
  active doc's subtree falls the active pointer back to the first
  remaining doc. If deletion would empty the whole list, a fresh blank
  root doc is auto-created.
- **Reparenting (drag-and-drop)** refuses a cycle (a doc can never become
  its own descendant's child) and refuses a no-op reparent onto itself;
  does not currently support reordering among existing siblings, only
  changing parent.
- **Reference Table of Contents generation**: given already-scanned PDF
  outline data (title + nested entries with page numbers, produced by an
  outside PDF-scanning step — kept out of this pure layer), find-or-create
  one shared top-level "Table of Contents" doc, then one child doc per
  scanned source titled after that source, and overwrite its text with a
  bullet list of page-linked mentions (nesting depth conveyed as a
  repeated em-dash prefix within a flat bullet list, not true nested
  indentation). Idempotent — rerunning updates existing children in place
  rather than duplicating them. A source with zero usable entries is
  skipped, not written as an empty doc.

### 5.14 Documents, @Mentions & Rich Text

**Purpose:** the uploaded/note document library, a read-only auto-scanned
"Reference Library" of bundled reference PDFs with a persisted GM override
overlay, a multi-tab document viewer, and a shared lightweight rich-text/
mention markup engine used by every editable text field app-wide.

- **Library entry**: `{ title, content, kind: 'file'|'note', tags,
  createdAt, updatedAt }`; a file-kind entry additionally carries a
  filename, mime type, and embedded data. Tags are normalized (lowercased,
  leading `#` stripped).
- **Reference Library overlay**: a build-time-scanned, read-only manifest
  of bundled reference PDFs, layered with a persisted per-file override
  (`{title?, tags?, hidden?}`) keyed by a stable file-path identity (never
  by array index, since the list is filterable/reorderable) — a GM can
  rename/tag/hide a bundled reference document without ever mutating the
  underlying manifest. "Delete" on a Reference Library entry only ever
  means hiding it from the overlay — the bundled file itself is untouched.
- **Mention syntax** (identical for document mentions and entity mentions
  — see §5.5 for the parsing rules): a bare `@Name` or a bracketed
  `@[Label|Name#Page]`. Only the bracketed form can carry a page anchor
  or a custom display label.
- **Auto-linking priority**: when linking @mentions found in freshly-typed
  text, entity auto-linking runs first; document auto-linking then only
  creates a blank note for a name that resolves to **neither** an existing
  document, an existing/just-created entity, nor a Reference Library
  entry — this ordering prevents a mention meant for an NPC/faction from
  also spawning a same-named phantom empty document.
- **Resolving a mention to an openable tab** has a specific precedence: an
  openable match (an uploaded PDF, or any Reference Library entry — always
  a real PDF) always wins over a same-titled uploaded *text note*,
  regardless of which list happens to be checked first — a stray text note
  can never permanently shadow a same-titled real PDF.
- **Document viewer tabs**: multiple can be open at once; re-focusing an
  already-open tab without specifying a page must never reset a
  previously-recorded reading position for that tab. Closing the active
  tab falls back to whichever tab was opened most recently among the
  survivors.
- **Rich text is deliberately NOT a full Markdown engine** — a small,
  fixed set of inline/block constructs, parsed from plain text (plain text
  remains the one source of truth, never a separate rich representation):
  bold/italic/underline/small/large spans, a link `[label](url)`, an
  inline color span `[label](color:#hex)`, bullet/numbered lists (grouped
  consecutive `- `/`N. ` lines), and a minimal pipe-table block. No
  delimiter ever matches across a line break — an unclosed marker at a
  paragraph's end renders as literal characters, never swallowing
  everything after it. A mention is always an atomic leaf (formatting
  markers can wrap around one, never split it), but formatting **can**
  nest (a mention inside bold text; bold inside a link label).
- **Link URL sanitization**: auto-prepend `https://` if no scheme is
  given; **strip the entire query string** (an explicit anti-tracking/
  anti-injection requirement); reject anything that doesn't parse as a
  real `http(s)` URL afterward (this is also what blocks `javascript:`/
  `data:` URIs from ever reaching a rendered link) — a link that fails
  sanitization renders as literal bracket text, never a broken/unsafe
  link.
- **Inline color sanitization**: accept only a native-color-input-shaped
  hex value (3/6/8 digit `#...`); anything else is rejected outright —
  narrow enough that no CSS injection can ever reach a rendered style
  attribute.

### 5.15 Gallery & Battlemaps

**Gallery** — a tagged image collection, separate from Documents. An
entity's thumbnail is a *pointer* to a gallery record, never a duplicated
copy. Uploading an oversized image produces **two** linked records (a
`thumbnail` and a full-resolution `original`, cross-referenced), both
auto-tagged with a caller-supplied "locked" tag (typically the owning
entity's type) that can never be removed via the tag editor — every other
tag can be freely added/removed (case-insensitive dedup). Removing an
image clears any entity's thumbnail pointer that referenced it (never left
dangling) and clears its sibling's cross-reference if it was part of a
resize pair. Setting an entity's thumbnail only accepts a `thumbnail`-kind
record, never an `original`.

**Battlemaps** — named maps, each with an optional background (a Gallery
image reference) and freeform-placed icons. Icon coordinates are **0–1
fractions of the canvas, never raw pixels**, so a map renders correctly at
any window size. An icon is either an `annotation` (a built-in icon-key
plus a free-text tooltip note) or a `token` (a link to a real Party/NPC
entity — its visual art resolves at render time from that entity's Gallery
thumbnail, never stored on the icon itself). Placing an icon without
explicit coordinates defaults to dead-center so it's always visible.
Editing an icon after creation is restricted to its kind-appropriate
mutable field only (note for annotations, label for tokens) — kind/entity
link/icon-key are fixed forever at creation. A grid overlay is optional,
toggleable, with a clamped cell-size.

### 5.16 Trade — Merchant Rules Lens

**Purpose:** a contract-driven trade minigame on top of a per-Location
commodity pricing engine.

- **Pricing** (`priceAt`): `basePrice × demandFactor / supplyFactor ×
  developmentLevelBias × biomeBias`, rounded, floored at a minimum of 1
  (price can never reach zero). `demandFactor`/`supplyFactor` are each
  `0.5 + dial/100`, so a fresh, untouched 50/50 market with no location
  bias prices exactly at `basePrice`.
- A Location's market defaults every commodity to a neutral 50/50 dial
  pair if untouched — a fresh market never reads as artificially scarce.
- **Two independent, compounding bias axes**, both a 0.6×–1.4× multiplier:
  (1) the Location's development-level/economy-type field (falling back to
  a legacy tag-scan for a Location set up before the real field existed),
  biasing raw commodities off a scarcity dial and manufactured commodities
  off `(10 - manufacturing)`; (2) the Location's biome field, biasing off
  a *finer* per-commodity resource type (water/fuel/food/ore/tech/luxury)
  independent of the raw/manufactured split — so e.g. a waterworld prices
  water cheap regardless of its development level. These two dials are
  checked against **both** possible economy models regardless of which
  model is campaign-wide "active," so switching the active model never
  orphans a GM's already-tagged Locations.
- **Buying** adds to a single party-wide cargo manifest (not tied to any
  one vehicle) and **drains** the Location's supply dial by the same
  amount (buying scarcity scarcer raises the *next* price there).
  **Selling** removes from the manifest — clamped to what the party
  actually holds, a no-op if they hold none — and **floods** the supply
  dial (lowering the next price). This divergence (buy-here drains,
  sell-there floods) is the entire "buy low here, sell high there" trade
  loop.
- **Contracts are Threads** carrying `kind: 'contract'` plus trade-specific
  fields (type, patron, origin, destination, payout, description,
  conflict, opportunity) — every clock/status/priority control is the
  ordinary Thread UI, reused wholesale. Patron/origin/destination are all
  optional (a GM may roll a contract's type before deciding who's
  offering it). Creating one also auto-logs a journal summary.
- **Generated payout** is real, route-driven when possible: if both a real
  origin and destination Location and a commodity are picked, payout =
  `max(20, |priceAt(destination) − priceAt(origin)| × 10)`; otherwise a
  flat fallback (50).

### 5.17 Missions

**Purpose:** a general job/mission generator, distinct from a Trade
Contract (no route/commodity/patron requirement) — one pure function of a
"danger" input (defaulting to the campaign's current threat dial, or, if
sourced from a specific faction, that faction's current-goal-urgency
instead — risk and reward move together automatically).

- `payout = round(100 × (1 + danger × 0.2))` — 1× at danger 0 up to 3× at
  danger 10.
- `deadlineDays = max(1, 7 − round(danger × 0.5))` — tightens from 7 days
  down to 2 as danger rises.
- Penalty text has three danger tiers: ≥6 → late/damaged delivery voids
  the payout entirely; ≥3 → halves it; else → a modest, negotiable
  penalty.
- A generated mission can be journaled once as flavor text (unreferenceable
  afterward), or **persisted** as a real trackable record with a status
  lifecycle (`open → accepted/declined`, or `→ resolved`) — a faction-
  sourced mission additionally records which faction it came from so a
  hot faction's activity can surface as something the party can formally
  accept.

### 5.18 Factions — Pressure Track & Simple Turn Mini-game

**Purpose:** a lightweight, always-available faction mechanic — distinct
from and coexisting with the much deeper Living Faction Engine (§5.20).

- A faction's **pressure track** is an ordinary Thread tagged
  `kind: 'faction-pressure'` — at most one per faction. "Under pressure" =
  every such track at ≥75% fill (the same threshold used elsewhere in the
  app for "one more push").
- `resolveFactionTurn`: picks (or is given) an action type — Attack
  (force), Scheme (cunning), or Expand (wealth) — weighted-random by
  `max(1, statValue)` per stat if not specified (a weak stat still has a
  nonzero chance, never zero). Rolls `1d10 + statValue`; total ≥12 =
  strong success, 8–11 = partial, <8 = setback. A strong success raises
  the acting stat by 1 (capped at 10) — this module never lowers a stat. A
  setback advances the faction's pressure track by one *extra* tick if it
  has one (no effect if untracked). A partial success has no numeric
  side effect.
- A bulk "advance all tracked factions" action: for every faction with a
  pressure track, always advances it by a flat +1 tick (deterministic),
  rolls a flavor "rumor" line, and separately resolves+applies a turn
  result (which may add yet another tick on a setback) — journaled as one
  combined block, with an explicit message if no factions are being
  tracked yet.

### 5.19 Faction Conflict

**Purpose:** a first-class Conflict entity type (see §5.5's field list) —
an escalation clock plus a stated-cause/root-cause narrative gap,
deliberately scoped down from a fuller design after reviewing real
GM-community sentiment: an always-visible core (clock, gap, third-party-
casualty line, session hooks) is by itself a usable conflict; deep
history/irreversible facts/per-faction posture/information asymmetry are
demoted behind a collapsed "add depth" toggle so the feature doesn't read
as homework.

- **Escalation clock**: a Thread tagged `kind: 'faction-conflict-
  escalation'`, one per conflict, default 6 segments (Cold → Simmering →
  Skirmish → Active → Escalated → Open War), **permanent** for the
  conflict's whole lifetime (unlike a faction's goal track, never
  replaced/swapped).
- **One-click quick-start generator**: rolls a Root Cause Category / Cause
  Gap Flavor / Third-Party Casualty / Starter Session Hook oracle chain
  into templated sentences (`statedCause`/`rootCause` are built *around*
  the raw rolls, not the raw rolls themselves; the framing line connecting
  the two — "if the party surfaces the gap, both sides' public stories
  stop holding up" — is a fixed sentence, never rolled).
- **Escalation suggestions from committed Faction Events** (Living Faction
  Engine tie-in, §5.20): given a just-committed event, find every Conflict
  whose Involved factions cover both sides of it (the acting faction, plus
  either the Attack's specific named defender, or any rival co-located
  faction for a faction-vs-world event with no single named opponent).
  Suggestions never advance anything themselves — the GM must explicitly
  accept (which then just calls the ordinary clock-advance) or dismiss
  each one.

### 5.20 Living Faction Engine — SWN-style Faction Turn Engine

**Purpose:** a full, deep faction-turn economy (HP/FacCreds/XP, a Homeworld
plus Bases of Influence, purchasable structured assets, faction tags, a
tracked current Goal) modeling every location's regional political
activity, distinct from and layered above §5.18's lightweight mini-game.
Content (which assets/tags/goals/costs exist) is resolved through a
provider-indirection layer (§7) so a faction can draw from either of two
interchangeable, mechanically-identical catalogs — one that transcribes a
real published sourcebook (gated behind explicit opt-in, since this app
deploys publicly) and one that is 100% original content (the safe
default).

**Core design pattern — propose then confirm (Article II made concrete)**:
nothing in the action layer mutates the real campaign directly. Proposing
a turn (for one faction, or a whole round) computes a full draft — which
action was chosen, every target, every die roll, the resulting campaign —
against a scratch clone, for GM review. A draft carries its own
fully-resolved result state, so committing it is trivial (no separate
replay step that could re-roll dice). Proposing a *round* chains each
faction's proposal against the *previous* faction's already-resolved
result, so later factions' drafts already reflect earlier ones — this
makes a round an all-or-nothing batch (only the final draft's result,
which cumulatively carries every prior faction's effects, is committed;
there is no partial per-faction accept within one proposed round).

**Faction presence & relationship queries:**
- Relationship stance between two factions: an explicit `allied_with`/
  `rival_of` relationship *type* always wins outright over the numeric
  strength dial; otherwise the dial decides (≥7 ally, ≤3 rival, else —
  including no relationship at all — neutral: strangers, not enemies, by
  default).
- Presence at one location: via an active/unstealthed asset there, its
  Homeworld, or a Base of Influence there. A faction with multiple assets
  at one location gets one entry per asset (so an attack can target a
  specific asset); presence via Homeworld/Base alone (no asset) yields a
  single non-attackable entry.
- Presence across a whole **region**: walks up the location-containment
  chain to a bounded depth, then down every descendant from each ancestor
  plus the origin — the "location is the central determining factor" query
  with no separate Region entity type; computed on read.
- "Where is the party right now": derived from which Location entities are
  currently @mentioned in WHERE's own Focus text — deliberately not a
  separate structured pointer (a prior design that had one was removed as
  duplicative). "Witnessed" = an event at a location that is (or shares an
  immediate parent/child with) one of those current locations.

**Events**: every committed action produces an Event record —
`{action, location, targets, rolls, outcome, narrative, scope,
coLocatedFactions, witnessed}` — with `coLocatedFactions`/`witnessed`
computed and **frozen at creation time** (a later relationship change never
rewrites recorded history). `scope` ∈ `self` (most actions), `faction-vs-
faction` (Attack), `faction-vs-world` (Expand Influence, Seize Planet —
the only scope that generates regional faction *responses* and can nudge
the world-pressure dial). A `faction-vs-world` event that is both witnessed
and not a failure nudges context threat up by 1 (capped at 10) — the same
"consequences gently escalate" heuristic used elsewhere, keyed off scope/
outcome instead of text-sniffing this time. Reputation is deliberately
left untouched (no defensible per-outcome rule yet).

**Regional responses & read-aloud**: for a `faction-vs-world` event only,
every co-located faction gets one logged, stance-appropriate reaction line
(ally/rival/neutral, drawn from a small fixed template pool). A committed
event can be expanded, on demand, into a 2–4 sentence GM read-aloud
paragraph composed purely from its own already-known fields (witnessed vs.
news framing, outcome qualifiers, named rivals/allies, logged responses) —
no new randomness — and that text is then freely hand-editable afterward
through the same setter used to generate it initially.

**Goal tracking**: a faction's current goal is a Thread tagged
`kind: 'faction-goal'`, sized to the goal's own computed difficulty
(rounded, clamped ≥1, further clamped 2–12 by the generic Thread rule).
Assigning a *different* goal replaces (doesn't stack) the track; assigning
the *same* goal already tracked is a no-op. Progress advances via
goal-specific countable criteria (a specific stat-type destroyed, HP
damage dealt, FacCreds spent, expand/seize actions taken, a rival faction
destroyed — matched by shape, only the relevant criterion for the current
goal fires per event). Completing a goal awards XP equal to its difficulty
and clears the current goal so a fresh one is picked next turn.

**Turn bookkeeping (upkeep, per faction per round):**
- Income = a fixed formula on Wealth/Force/Cunning (per the sourcebook
  this engine mirrors).
- Maintenance = the sum of every active asset's per-turn cost, plus a
  surcharge for every asset held past that stat's current rating cap.
- If total available FacCreds can't cover maintenance: FacCreds are zeroed
  (partial upkeep), every costing asset's missed-maintenance counter
  increments, and an asset that hits **two consecutive misses is lost**
  entirely. If maintenance *is* covered, every active asset's
  missed-maintenance counter fully resets (not merely decrements) —
  a covered turn is a clean slate.
- Assets bought the *previous* turn come online (flip from "assembling" to
  active) as the very last step of upkeep, never immediately on purchase.

**Actions** (each validated independently; a failed validation returns a
`'failure'`-outcome event with the campaign left **unchanged**, never a
thrown error): Buy Asset (requires sufficient stat rating, FacCreds, and a
valid location — Homeworld or an existing Base — new asset starts
"assembling," not usable until next turn), Sell Asset (refunds half cost,
rounded down), Repair (an asset heals at a triangular FacCred cost scaling
with increments requested; repairing the faction itself, with no asset
specified, is a flat 1-FacCred heal to the rounded average of its
highest/lowest stat), Refit (swap to a same-track asset, pay only a price
*increase*, never refund a decrease; resets to "assembling"), Expand
Influence (plant a new Base at an unoccupied location, budgeted FacCreds/
HP; every non-allied co-located faction gets a contested roll — a tie
favors the attacker here specifically, unlike the general Attack action —
that can damage or destroy the new base before it's even created), Remove
Base (a pure GM-correction tool — no cost, no dice, **no event logged at
all**; explicitly does not touch Homeworld even if it points at the
removed base), Change Homeworld (requires an existing Base at the
destination; always exactly one turn regardless of distance; swaps HP
between old and new homeworld bases per the sourcebook's rule), Seize
Planet (a multi-turn siege approximation tracked as a remaining-HP pool
against total opposing unstealthed asset HP at the location; each of the
attacker's assets with an attack stat rolls per turn, a high-enough roll
chips the pool; completing it flips the location's own faction membership
to the conqueror, not merely appending to a display list), Attack
(attacker rolls stat vs. a defender stat *named by the attacker's own
weapon*, not fixed per faction; a hit that would destroy an asset with a
Base at that same location auto-redirects to the Base instead per an
optional sourcebook rule applied automatically; a tie applies **both**
sides' effects — the attacker's hit AND the defender's counter, if it has
one), Use Asset Ability (a small fixed set of assets resolve automatically
via a die-roll-driven effect table; every other asset just surfaces its
raw special-ability text flagged for GM adjudication before the draft can
be committed), Toggle Asset Stealth (a plain flag flip — no dice, no cost,
**no event logged**).

**Heuristic proposal**: which action is "candidate-eligible" for a faction
is judged conservatively — e.g. Repair is only offered if the faction can
actually afford it AND has something that needs it, specifically to avoid
a faction getting stuck proposing a guaranteed-failing action forever. If
literally nothing is eligible, a guaranteed non-empty fallback is offered
(which may still itself fail). The actual pick among eligible candidates is
weighted-random, with a bonus weight toward whichever action counts toward
the faction's current goal. When no viable action exists at all, the
surfaced reason must be **specific** (no Homeworld set / insufficient
FacCreds / nothing valid to target — not one generic message) — diagnosed
originally from a real "stuck with no explanation" bug and treated as a
hard requirement for any rebuild.

**Turn numbering**: a single global counter increments once per proposed
round OR once per single-faction "Step" (so events from either mode stay
chronologically ordered against each other). A round's faction order is a
random *cyclic rotation* of whichever factions are included (relative
order preserved, only the starting point randomized) — not a full shuffle.

### 5.21 Enhancements

**Purpose:** a genre-agnostic augmentation mechanic (renamed from
"Cybernetics" so Wetware/psionics/gene-mods can share it) — installing an
item costs Strain against a limited capacity; **exceeding capacity is a
GM-visible flag only, never an automatic penalty** (the GM decides
consequences).

- Default capacity 8 (overridable per-entity, clamped [1, 30] on set,
  invalid input resets to the default); "over-strained" is strictly
  `used > capacity` (exactly at capacity is fine).
- Installing requires a non-blank name; strain coerces to a positive
  integer (invalid/zero/negative input defaults to 1).
- A legacy differently-named field on old entities is read as a fallback
  (never migrated in place — the next install/remove naturally moves data
  onto the current field name).

### 5.22 Expeditions

**Purpose:** trackers for an away-mission/journey, reusing the Thread
mechanism (tagged `kind: 'expedition'`) for its clock, plus three
additional independent 0–10 dials (Supplies, Exposure, Morale) layered on
top — the clock itself doubles as a fourth "Progress" dial.

- New dials default to 5 (neutral); setting one clamps [0, 10], rounds,
  and resets to the default on invalid input; setting an unrecognized
  dial name or targeting a non-expedition thread is a no-op.
- "In danger" = not done, and (supplies ≤2 OR exposure ≥8) — the same
  "one clear signal" shape used by other danger checks in the app, applied
  per-expedition since several can run concurrently.

### 5.23 Universal Search

**Purpose:** one free-text query across every searchable surface, so a GM
never has to remember which drawer something lives in.

- Searches, in a fixed category order: Cast (name/tags/overview/revealed
  text), Journal (stripped-of-markup text, results shown as a short
  ellipsized snippet), Oracle (both table names and individual entry
  values — a table-name match takes display priority over an entry
  match), Documents (both the uploaded library and the Reference Library),
  Party trackers, Colony fields/crew.
- Matching is a simple case-insensitive substring test — no fuzzy
  matching or ranking/scoring beyond category order.
- Results are declarative navigation targets (which drawer, which entity,
  what to pre-filter, which document tab) — the search layer itself never
  touches the UI directly, it only describes where a result should lead.
- The result list is capped at a fixed limit (e.g. 40) applied to the
  *whole* combined list, in category order — a category earlier in the
  fixed order can crowd out later categories once the cap is hit.

### 5.24 Content Pack Import/Export

**Purpose:** ad-hoc content transfer *between separate campaigns* — export
just Entities and/or Guide docs and/or Journal entries as a small portable
file. Distinct from a whole-campaign export (which replaces everything)
and from the curated-catalog import in §5.25 (which dedupes by name and is
safely re-runnable).

- Export: each of the three sections is **entirely absent** from the
  output (not present as an empty array) if its flag wasn't checked — this
  lets import tell "nothing was exported here" apart from "an empty list
  was exported." Exported entities have any Gallery thumbnail reference
  stripped (it wouldn't resolve in the destination campaign).
- Import is **always additive, never deduplicated**, and always mints
  fresh ids for everything (two independently-created campaigns' ids
  aren't guaranteed unique against each other): builds an old→new id map
  up front, remaps every entity relationship to drop (not error on) any
  target outside the imported set, and promotes any guide doc whose
  original parent isn't in the imported set to a new root rather than
  pointing at a nonexistent parent. Journal entries have no internal
  references, so they're appended as-is except for a fresh id. A
  malformed/mismatched pack (wrong shape, not this app's format) is a
  silent no-op per section, never a thrown error.

### 5.25 Curated Catalog Import (HOSTILE Canon Locations, example)

**Purpose:** the pattern for bulk-importing a large curated content pack
(a real-sourcebook gazetteer, in this app's one shipped example) as real,
fully-editable entities, wiring up their containment hierarchy as actual
relationships — not tags, so the relationship graph reflects it directly.

- Importing an entry that would collide by exact name with an existing
  entity **skips it** — never duplicates or overwrites a GM's own prior
  edits. Safe to re-run indefinitely as more content is added to the
  catalog.
- Import proceeds in dependency order (broadest containers first) so each
  later pass can link against entities the earlier passes just created.
  Linking uses a fixed bidirectional relationship-type pair
  (`Contains`/`Located At`) applied consistently at every level of the
  hierarchy, idempotently (re-asserting an already-existing edge is
  harmless).
- The fetch of the actual bulk data is treated as an impure, UI-layer
  concern (network fetch isn't synchronous/pure) — the import function
  itself takes already-fetched, already-parsed data and degrades
  gracefully (treats a missing/malformed section as empty) rather than
  throwing on a partial or hand-edited pack.

### 5.26 Activities → Rules Lens Recommender

**Purpose:** lets a GM name what's currently happening (an "Activity") and
get pointed at whichever content provider(s) are registered to cover that
gameplay area — a suggestion only; applying it (e.g. switching the active
character-sheet ruleset) is always a separate, explicit GM action.

- A fixed catalog of named activities, each mapped to one gameplay area
  (§7's Rules Constitution). Resolving an activity to its suggested
  provider(s) returns `null` for an unrecognized activity id, never
  throws.

### 5.27 Reference Tools — Mechanics Index & TOC Scan

**Purpose:** two on-demand, async, browser-only scans over the bundled
reference PDFs (kept out of the pure domain layer entirely — this is
explicitly impure/DOM-dependent work, only the *storage* of their results
is a pure domain concern):

- **Game Mechanics Index**: full-text search a curated term list against
  whichever PDFs are relevant to the campaign's active ruleset (plus a
  default core set always in scope), recording the first page each term
  is found on. A fresh scan **fully replaces** the prior index — no
  merge/dedup.
- **Table of Contents generation**: reads each PDF's real bookmark/outline
  tree (not full-text search) and writes it into the Guide (§5.13) as a
  structured, page-linked document. Can target one just-uploaded document
  or the whole library at once.
- Both must produce a clear, actionable error (not a silent failure) when
  run in an environment that structurally can't support them (see §8).

---

## 6. UI/UX Functional Requirements

### 6.1 Shell architecture

- A single mount call builds the entire static page skeleton **once**:
  header, breadcrumb, the Story Dashboard region, the always-visible
  Co-Pilot aside, a document-viewer overlay panel, a search overlay, a
  mention-autocomplete popup, a generic inline-data-entry popup, a
  dice-roll result overlay, an edge-tab navigation strip, one drawer
  panel, and a toast/notification area.
- **All interaction is delegated** per Rule 4 (§2): one `click`, one
  `dblclick`, one `change`, one `input` handler on the root, plus drag-
  and-drop event handlers, plus a touch-gesture re-implementation of the
  same drag-and-drop for real mobile touch (HTML5 DnD events don't fire on
  touch — hover-dragging over a different drawer tab or the header for
  ~500ms switches to it mid-drag without ending the drag, so a source and
  target that aren't simultaneously visible can still be connected). A
  `focusout` listener commits any pending edit in a rich-text field (which
  has no native `change` event). A global `keydown` listener (bound to the
  document, not the root, so it fires regardless of focus) handles a
  small, deliberately limited set of shortcuts (see §6.5). A
  `beforeunload`/visibility-change listener force-blurs the focused field
  so a not-yet-committed edit is never silently lost on refresh/close.
- Every handler is wrapped in a shared error boundary: any thrown
  exception is caught, logged, and turned into a visible toast instead of
  the interaction silently doing nothing.
- **Render loop**: a single re-render function runs on every store
  notification (and directly after any UI-only ephemeral-state change that
  doesn't touch the store). It must: refresh the header/breadcrumb; render
  the Story Dashboard and the Co-Pilot panel from the *same* gathered
  ephemeral-UI-state bag (computed once, not twice); resize any
  auto-growing text field once per render (input events already handle
  live typing); rebuild the edge-nav and header tab strips; show/hide the
  Settings/About overlays; render the active drawer's tab strip and body.
  **The document viewer and the drawer panel are mutually exclusive** — at
  most one side panel is ever visible; opening any document tab hides the
  drawer entirely.
- Ephemeral UI state (open drawers, filters, collapse/expand sets, in-
  progress creation-form drafts, camera/pan/zoom state, etc.) is **never
  persisted** to the campaign document and resets on reload — it exists
  purely to drive rendering.

### 6.2 The Story Dashboard (primary workspace)

The single workspace view (the recorded, deliberate exception to "the
workspace changes, not the application" — see §1.3). Two-column layout:

- **Left column**: a current-location banner, a shared Activity picker
  (drives the Co-Pilot's Rules Lens suggestion), then five independently
  collapsible sections — WHO, WHERE, WHAT, WHY, HOW — default all
  expanded. A collapsed section still shows a truncated summary of its own
  content next to its toggle, so nothing looks like it vanished.
  - **WHO**: a Focus field; scene-scoped NPC groups — Protagonists
    (in-scene NPCs tagged as party-facing characters, derived live),
    Antagonists (every other in-scene NPC, derived live), Bystanders (a
    GM-curated add/remove list, since there's no reliable derived query
    for "nearby but unmentioned") — each NPC expandable to its persistent
    goal plus the five scene-scoped oracle-seedable fields (§5.3); an
    entity picker; a "factions active nearby" digest (region-wide).
  - **WHERE**: an optional docked Faction Events panel; a read-only
    location-summary header; a collapsible Location Details expander
    (object type / star system / sector / sensory fields); a Focus field;
    an entity picker; a read-only "current location" chip display (purely
    derived from Focus's own @mentions — no separate stored pointer, by
    design); read-only Factions-here/Conflicts-here/nearby-locations/
    recent-faction-activity digests; a per-location free-text Location
    Story field.
  - **WHAT**: a Situation field; an Intent picker; the Latest Scene block
    (composed text plus every individually-editable split field); a
    World State Flags list.
  - **WHY**: a Focus field; an entity picker (pooling NPCs, Factions, and
    — uniquely — Conflicts); the Threads list; the Foreshadowing list.
  - **HOW**: a Focus field only (the Activity picker and its Rules Lens
    suggestion live in the shared header / Co-Pilot respectively, not
    duplicated here).
- **Right column** (sticky): the **Narrative Composer** — a deliberately
  **read-only** live preview of `composeNarrativeDraft()`, recomputed
  fresh on every render, with only Copy and "Send to Journal" actions. It
  must stay read-only: a live-recomputed *editable* field would silently
  clobber a hand-edit the moment anything else on the dashboard changed;
  hand-polishing happens after sending, inside the resulting (genuinely
  editable) Journal note. Below it, the five 0–10 pressure-dial sliders
  (Threat/Mystery/Stress/Resources/Reputation), each with a live-updating
  numeric label as it's dragged.

### 6.3 The Co-Pilot Panel (always visible)

Rendered in its own persistent region (collapsible only on narrow/mobile
viewports), never a drawer. Absorbed every suggestion/oracle-generating
control formerly spread across the five context tabs — "the app's one
active decision sandbox," while the Dashboard stays pure data display/
entry. Top to bottom:
1. A free-text observation from `advise()`, with a one-click "generate a
   mission from this faction" action when the observation names one.
2. The full ranked **Story Options** list (§5.9) — each option a
   checkbox (include in the Narrative Composer), its detail text, and
   roll/journal/dismiss actions; a dismissed or acted-on option is
   immediately backfilled from a deeper pool so the visible list doesn't
   shrink.
3. A "Suggest a Lens" action drawing a scene-context-*weighted* lens
   picker (distinct from a second, blind/unweighted lens-draw entry point
   elsewhere in this panel — both funnel into the same generate-scene
   flow).
4. Two more independent `advise()` fields: "if nothing changes..." and
   "opportunity."
5. An inspiration block: roll a Site Concept or Adventure Seed into an
   ephemeral, **editable draft** (never straight to Journal) with copy/
   send/discard — a deliberate preview-before-commit step.
6. A single "suggested oracle" roll button (the one table `advise()`
   currently considers most relevant).
7. A "Suggested Rules Lens" block — only shown once an Activity is set —
   offering a one-click "use as default" per recommended provider.
8. "Quick apply": the primary Continue Story action, a blind "What
   Happens Next?" lens picker, `advise()`'s two dynamic dial-driven quick-
   shift chips, and a fixed row of the six most common shift actions
   (Reveal Clue / Complicate / Reward / Raise Threat / Lower Threat /
   Advance Time).
9. A conditional "what did I overlook?" card (overlooked threads).
10. A conditional "relationships to review" card (flagged relationships).

### 6.4 Drawers (tertiary tier)

Each drawer is a pure `(campaign, uiState) → markup` render function,
opened via the edge-nav strip or a contextual jump-chip elsewhere in the
app, taking zero layout space until opened. At most one drawer panel (or
the document viewer, mutually exclusive with it) is visible at a time; a
GM can pin several drawer *tabs* open simultaneously and switch between
them without losing each one's scroll position or in-progress state.
Required drawers and their core capabilities:

- **Cast** — list-only browse/filter/search over all entities (type chips,
  cumulative AND-tag filter scoped to the current type/search, a "+ item
  from catalog" picker); clicking an entity opens...
- **Entity Detail** — the full per-entity editor: identity (name/type/
  tags/photo), Overview (public) and Revealed (GM-only secret) fields,
  every type-specific card from §5.5, the statblock section (one block per
  carried group, each independently collapsible, with an additive
  "+ add a statblock" picker offering only what isn't already present),
  Enhancements (NPCs only), and the Relationships editor.
- **Journal** — a collapsible "previously on..." recap panel with a
  one-click save-as-note; a compose box; a collapsible actions row
  (defaults open, unlike most collapsibles, since adding a note is the
  single most common action) with auto-journaling generators; a
  reverse-chronological entry list, each entry toggleable between
  read-only and live-edit.
- **Oracle** — a searchable, collapsible category tree (forced open while
  a filter is active); per-table entry count, a tag-editor toggle (locked
  tags shown distinctly, un-removable), an entries editor (add/remove,
  "reset to default" once overridden), and roll buttons at both the
  single-table and whole-group level.
- **Settings** — topical, lazily-rendered sub-tabs covering: campaign
  title, data management (export/import/bind-file/new-campaign/storage
  usage/backup restore), content-pack export/import, editor preferences,
  a companion-tool external link, build/changelog info; genre + rules
  (genre pack, default character ruleset, the statblock-template editor,
  the Rules Constitution provider table plus Game System Activation
  toggles, faction-pacing tuning, a read-only sourcebook-inventory list);
  trade & economy (active economy model, reference legends, a curated-
  catalog-import trigger gated to the relevant genre pack); reference
  tools (mechanics-index scan, TOC-scan triggers with clear
  environment-restriction messaging).
- **Party** — roster (+ quick-create), trackers (+ inline creation form,
  no popup), shared gear/assets, and (shared markup with Trade) the cargo
  manifest and contracts board.
- **Colony** — the fixed turn-sheet fields, crew roster, and the
  lifeform-encounters live filter.
- **Trade** — a Location picker (tag-filterable), a per-commodity market
  table (editable supply/demand, computed price, buy/sell), plus the same
  cargo-manifest/contracts board Party shares.
- **Guide** — the reference-document tree (draggable-to-reparent,
  expand/rename/add-child/delete-with-descendant-count-confirmation), the
  active doc's editable body, and any generated Mechanics Index results as
  clickable page-linked entries.
- **Graph** — the force-directed relationship visualization, pan/zoom,
  a type-color legend, and text filtering that **dims non-matching nodes
  rather than removing them** (removing would reshuffle the whole
  deterministic layout on every keystroke).
- **Documents** — one shared search+tag-filter row covering both the
  uploaded library and the Reference Library beneath it; per-entry
  rename/tag/delete; a free-text note gets an inline rich editor with an
  explicit Save button (the one deliberate exception to "everything
  autosaves" elsewhere); a "mentioned in" cross-reference summary.
- **Gallery** — search/tag-filter (same shape as Documents); an upload
  flow that client-resizes then shows a preview + friendly-name field
  before committing (no immediate save); visually distinct thumbnail vs.
  original cards.
- **Battlemap** — named-map tabs; per-map toolbar (rename/delete/
  background/grid/zoom); an icon palette (click to arm, click canvas to
  place, click again to disarm); a pannable/zoomable canvas where
  placed markers are draggable to reposition and clickable to
  edit/open.
- **Faction Events** — Step/Full-Round proposal controls scoped to
  whoever is present at the party's current location; a draft-review UI
  (per-draft narrative, structured before/after asset summary, co-located
  stance chips, faction responses, a local recent-events mini-log) with
  all-or-nothing commit/discard; post-commit conflict-escalation
  suggestions; a compact faction roster (deliberately **not** a full
  stat-editing surface — that's Entity Detail's job exclusively); a
  missions list with accept/decline/resolve/remove; a compact conflicts
  list; a collapsed-by-default round history; a filterable committed-
  events feed with on-demand read-aloud expansion. This drawer can
  alternatively **dock as a side panel inside the WHERE dashboard
  section** — mutually exclusive with being an ordinary drawer tab, GM-
  toggleable either direction.

### 6.5 Cross-cutting interaction systems

- **No native browser `prompt()`/blocking dialogs for data entry.** A
  single generic **inline-prompt** mechanism replaces every "click a
  button, type one short value, go" case: a small floating field anchored
  next to whatever triggered it, closable only via Escape, an explicit
  cancel, or a successful submit (deliberately no close-on-blur, to avoid
  a race between the field's blur and a click on its own submit button).
  Supports both single-field and explicit multi-field forms. A genuinely
  multi-field creation flow (e.g. a new Party Tracker, a Trade Contract)
  instead gets its own small bespoke inline form matching this same
  no-popup posture — the inline-prompt mechanism specifically covers the
  single-string case. Plain yes/no confirmation dialogs (delete
  confirmations) are a different interaction and are unaffected by this
  rule.
- **Keyboard shortcuts** (deliberately minimal, added only where clearly
  non-disruptive): a shortcut to cycle which dashboard section is expanded
  (skipped while focus is in any text field, so it never steals a
  common OS text-navigation shortcut); Escape closes, in priority order,
  whichever of [a result overlay, universal search, the active drawer, a
  mobile-only panel] is currently open; a global "open search" shortcut;
  Enter/Escape submit/cancel any open inline prompt or rename field.
- **Drag-and-drop** (native, with a from-scratch touch-gesture
  equivalent feeding the *same* completion logic so the two input methods
  can never drift out of sync): dragging one entity onto another creates a
  relationship between them; dragging an entity or a document onto any
  mention-capable text field inserts a real inline mention at the exact
  drop position and auto-commits the field (a document drop follows up
  with an optional "which page?" prompt *after* insertion, never
  blocking); dragging a reference-tree row onto another row (or a
  top-level drop target) reparents it; dragging an entity or an existing
  map icon onto a battlemap places/repositions it, converting screen
  coordinates through the current pan/zoom transform into the map's 0–1
  fraction space.
- **Mention-aware rich-text fields** render stored plain text (with its
  `@mention`/lightweight-markup syntax) into live, clickable DOM on
  display, and serialize the live DOM back into that exact same plain-text
  format on commit — the stored data model never becomes rich/structured
  itself. A mention is click-to-open (not click-to-place-caret, the
  browser's native behavior must be suppressed); its underlying target is
  read from a fixed, non-editable attribute rather than its
  (separately-editable) visible label, so relabeling a mention never
  breaks what it points to.

---

## 7. Content / Data Requirements

All game content is data, loaded through small, never-throwing `findX(id)`
lookup helpers with a documented safe fallback (typically the first/
default entry in the same list) — this is the mechanism that makes "add a
new genre/ruleset/provider without touching engine code" actually true.
Every content file that draws on a real published sourcebook must record,
honestly, which parts are verbatim/mechanical (game numbers/formulas
aren't copyrightable) versus original prose — and files with no sourcebook
backing must say so explicitly rather than imply a transcription. A
rebuild must include, at minimum, the following catalogs:

| Catalog | Shape | Scale (reference implementation) |
|---|---|---|
| **Oracle tables** (default + alternate genre packs) | `Category → TableName → [entries]`, one nested exception (`Category → SubKind → TableName → [...]`) | Default pack: ~51 categories / ~184 leaf tables. 2+ alternate genre packs, smaller, reusing the same top-level category names so genre-swapping code needs no changes. |
| **Genre packs registry** | `{id, label, tables}` + a genre-specific vocabulary override (e.g. "creature catalog" is labeled differently per pack) | 3+ packs; unknown/unset id falls back to the first (default) pack. |
| **Oracle category groups** (UI tree) | named group → member category-key list, plus a small alias map and an optional source-attribution suffix | ~7 groups; any category not claimed lands in an automatic "Other" bucket. |
| **Oracle tag seeds** | `"Category>Table"` path → tag list | ~19 seeded mappings; every path must resolve in the tables catalog (enforced by an automated consistency check). |
| **Entity-field → oracle-tag links** | `"entityType.field"` → tag list | ~22 mappings; every referenced tag must be seeded somewhere (automated check) and is "locked" against removal via the tag editor. |
| **Character-sheet rulesets** | `{id, label, sourcebookRef?, characterTemplate: {attributeRollMethod, attributeFormat, stats[], tracks[]}}` | 3 rulesets; a ruleset with no real transcribed sourcebook must say so (`sourcebookRef: null`) rather than imply one. |
| **Bestiary/vehicle statblock templates** | `{system: {label, fields: [{key, kind, rollMethod, max, target, format}]}}` | 4 systems (a generic system-agnostic one plus 3 ruleset-specific). |
| **Gear statblock templates** (additive, per-item) | same field shape as above, keyed by ruleset | 5 systems. |
| **Gear/weapon/armor/consumable catalog** | `{id, name, category, tags[], stats: {system: {field: value, ...}, ...}}` — only includes the systems that actually define that item | ~48 curated entries, each citing a real sourcebook page where applicable. |
| **Economy types** (Trade) | `{id, label, model, scarcity(0-10), manufacturing(0-10)}` | 2 models, ~11 types total; checked against both models regardless of the active one. |
| **Commodities** (Trade) | `{id, label, basePrice, category: raw|manufactured, resourceType}` | ~8 entries. |
| **Biomes** (Trade, per genre pack) | `{id, label, genrePack, resourceScarcity: {per resourceType, 0-10}}` | ~20 entries across 3 packs. |
| **World-Profile / UWP decode tables** | one array of `{code, label, description}` per axis (starport class, world size, atmosphere, hydrographics, population, government, law level, bases, trade codes) | 9 tables. |
| **Faction content providers** (interchangeable) | matched pairs of `{XP table, base-of-influence, assets (Force/Cunning/Wealth), automatic-ability effects, tags, goals, maintenance costs}` | 2 providers, mechanically identical (same ratings/costs/formulas — not copyrightable), one gated behind explicit opt-in (real sourcebook transcription), one always-available (original content). Resolution order: per-faction override → campaign default → hardcoded fallback. |
| **Rules Constitution** (provider registry + area map) | providers: `{id, label, status, requiresActivation?, activationText?}`; areas: `{id, label, providers: [providerId,...]}` | ~10 providers, ~18 gameplay areas; only one area actually gates real behavior today, the rest are recorded preference for a future recommender. A gated provider's activation flag lives per-campaign and is never read directly — always through one resolver function so it stays swappable for a real licensing check later. |
| **Suggestion lenses** (Discovery/Approach) | `{id, label, kind}` + a lens→`[category,table]` oracle-mapping | 16 lenses total, each mapped to 2 real oracle table paths (no new content authored for this feature — pure redirection). |
| **Enhancement types** | `{id, label}` | 5 entries. |
| **Battlemap annotation icons** | `{key, label, glyph}` | ~11 entries, original iconography (no licensed art bundled). |
| **Mechanics-index seed terms** | flat string list | ~20 terms, explicitly a starting set, not exhaustive. |
| **Sourcebook inventory** (hand-maintained provenance ledger) | `{file, status, note?}` per real reference PDF | One entry per bundled PDF, honestly describing what's actually been mined from it. |
| **Reference Library manifest** (committed) + **build-time scan** (generated) | `{file, title, ext, sizeBytes, releaseAsset|src}` | Must ship two layers: a permanent committed catalog (so the library's identity survives even without the real PDF bytes present) and a build-time scan of whatever's actually on disk. The committed `file` identity key must never be repointed once assigned — every per-campaign override (title/tags/hidden) is keyed by it. |

**Content-integrity requirement**: automated tests must assert (a) every
oracle-tag seed path resolves to a real table, and (b) every entity-field
oracle link's tag has at least one seeding table — so a link or a filter
can never silently point at nothing.

---

## 8. Non-Functional Requirements

- **Zero required backend, zero required build step to run.** The shipped
  artifact is a single HTML document plus one bundled classic-script JS
  file (ES module `import`/`export`, including aggregate re-exports, must
  be resolved/inlined at build time) — because `file://` blocks
  `<script type="module">` via CORS, and double-click-to-run with no
  server is a hard requirement. A build step regenerates the bundle from
  source; the bundle itself is a disposable artifact, never hand-edited or
  treated as source of truth.
- **Installable as an offline-first PWA.** Works fully offline after first
  load for every feature except the two explicitly network-dependent ones
  below.
- **Local-first storage**, per §4: IndexedDB with a large practical quota
  (a large fraction of free disk space, not a small fixed ceiling), a
  one-time legacy-localStorage absorption path, and a one-slot automatic
  backup taken before every write.
- **A small number of features are allowed to require an HTTP(S) origin**
  (not `file://`) because the underlying browser security model
  structurally forbids them otherwise: reading bytes from a sibling local
  resource for in-app PDF text-scanning, and fetching a bundled JSON data
  pack. Every such feature must detect a `file://` context and produce a
  clear, actionable error rather than fail silently or crash. Every other
  feature must work identically under a plain `file://` double-click.
- **Deterministic testability of all business logic.** Every generator/
  mutator in the domain layer must accept an injectable RNG so its output
  is reproducible under test, while defaulting to genuine randomness in
  real play — gameplay dice rolls must never be made deterministic by
  default.
- **No required third-party network services** for core functionality.
  Any vendored third-party library (e.g. a PDF-rendering/scanning engine)
  should be bundled locally, version-pinned, and loaded without a runtime
  fetch to an external CDN. Optional convenience content (a large
  reference-document library) may be hosted externally and fetched
  on-demand, but its absence must never break any core feature — a
  document that fails to load should degrade to "unavailable," not break
  the page.
- **Responsive, touch-capable UI** down to a phone-width viewport: layouts
  must reflow (not just shrink), and every drag-and-drop interaction must
  have a working touch-gesture equivalent, not just a mouse path.
