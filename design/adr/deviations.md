# Deviations

**Status note:** Part I documented conflicts in `Functional-Requirements-v2.md`,
which has since been superseded by `requirements/functional-requirements-v3.md`
and moved to `requirements/previous-design-principles/` as reference. Every
conflict Part I lists below was resolved in v3 (the Composer/Navigator naming
swap and the drawer-visibility contradiction — items 4–6 — by v3's
Terminology and Storyboard sections). Part I is kept as a historical record
of what was found and fixed, not a live issue list. Part II is unaffected —
it's still an accurate account of legacy-corpus concepts absent from the
codebase.

Companion to `GMAtlas-Design-Constitution.md`. Two kinds of finding live here:
**Part I** — internal conflicts or errors found within the now-superseded v2
spec. **Part II** — concepts described in the legacy design corpus
(`requirements/previous-design-principles/`) that have no equivalent
anywhere in the current codebase. Neither part explains *why* something is
missing or wrong — only that it is, and where it was found.

---

## Part I — Conflicts and errors within Functional-Requirements-v2.md

1. **Duplicate section numbering.** The document opens with a preamble block
   using headers `## 1.0 Terms`, `## 1.1 Frictionless Empowerment`,
   `## 1.2 Design Principles`, `## 1.3 Situation Model & Story Shifts`
   (lines 19–102). It then restarts numbering from the top under a second
   `#` heading, "GMAtlas — Functional Requirements," with `## 1. Product
   Overview` containing its own, unrelated `### 1.1 Design philosophy`,
   `### 1.2 Genre-aware, not genre-locked`, `### 1.3 Visual tiers` (lines
   104–160). The numbers 1.1/1.2/1.3 are each used twice for two entirely
   different sets of content within the same file.

2. **Two stub sections with no body.** `## 1.0 Terms` (line 19) has no
   content before the next header. `### 1.3 Visual tiers (UX contract, not
   a data model)` (line 156) likewise has no content — just the header and
   a horizontal rule. Both read as placeholders left in the shipped
   document.

3. **A dangling cross-reference to a path that doesn't exist in this repo's
   current layout.** Line 12: "Any inconsistencies must be logged in
   `/docs/design/inconsistencies_v2.md`." The `docs/` tree this instruction
   points into no longer exists in the working tree (superseded by
   `requirements/` and, as of this audit, `design/adr/`) — the instruction
   cannot currently be followed as literally written.

4. **§6.1 and §6.4 directly contradict each other on how many drawers can
   be visible at once.** §6.1 (Shell architecture, not marked `#### NEW!`,
   describing the shell as it currently stands) states: "The document
   viewer and the drawer panel are mutually exclusive — at most one side
   panel is ever visible." §6.4 (`#### NEW!`, a proposed redesign)
   states: "The default workspace has three drawers open by default:
   'Narrative Composer' (left), Story Navigator (middle) and Advisor
   (right)" and describes drawers occupying up to three simultaneous,
   independently repositionable screen slots. These are two different
   drawer models asserted as true in the same document without either
   section acknowledging the other.

5. **§6.2's own numbered list reuses "1." for two unrelated items.** Under
   "On first open, or after closing all drawers in the tab menu, there are
   two workspaces:" the list reads `1. "Storyboard" - ...` followed later
   by a second, unrelated `1. Tab Menu ("Sandbox") - ...` — both list items
   numbered "1," with no "2" anywhere, despite the surrounding sentence
   promising two distinct workspaces.

6. **"Composer" and "Navigator" are swapped mid-document relative to their
   use everywhere else in the file.** §6.2's `#### NEW!` block states: `"Narrative
   Composer" ("Composer") - left side (previously called "Story Dashboard"
   or "Storyboard")` and separately `Story Navigator ("Navigator") - Active
   scene beats - right side (previously called "Narrative Composer")` — i.e.
   this passage claims the thing formerly called "Narrative Composer" is
   now named "Navigator" and moved to the right, while a *new* left-side
   panel takes over the name "Composer." This directly conflicts with
   §5.9's own "Purpose" paragraph and §6.3's title, "The Composer Panel
   (always visible)," both of which describe — in the same document,
   without a `#### NEW!` marker — the existing always-visible right-side
   suggestion/oracle panel (the Co-Pilot in the current codebase) as "the
   Composer." The word "Composer" is used for two different panels in two
   different screen positions within the same document, without either
   passage flagging the other as superseded.

7. **§5.9's "Location Tracker" note introduces a third, undefined mention
   syntax.** It uses `[[Site]]`, `[[Region]]`, `[[System]]`, `[[Sector]]`
   double-bracket notation. Every other part of the document (§5.5, §5.14,
   §6.5) defines exactly two supported mention forms — bare `@Name` and
   bracketed `@[Label|Name#Page]` — and states rich text is "deliberately
   NOT a full Markdown engine" with "a small, fixed set" of constructs.
   `[[...]]` matches neither defined form and is not declared anywhere
   (including the empty `1.0 Terms` stub, which is where such a definition
   would belong).

---

## Part II — Legacy architecture with no equivalent in the current codebase

Everything below is confirmed absent from `src/` by direct source audit.
Grouped by where it was found in the legacy corpus
(`requirements/previous-design-principles/`).

### From the 77-document "Saga Atlas" Design Constitution (`design-principles-pack-01.md` – `-77.md`, `design-principles-final-summary.md`)

Named engines and mechanisms with no built counterpart:

- **Event Bus** — a formal domain-event publish/subscribe system
  (`CampaignLoaded`, `EntityUpdated`, `RelationshipChanged`, etc., with
  ordered delivery, batching, and undo/redo checkpoints). The current app
  uses one global `store.subscribe()` callback triggering a full
  re-render.
- **Decision Engine** — a subsystem distinct from the Story Engine,
  reasoning specifically about which *assistance* (not narrative content)
  the GM needs next, with its own Confidence Score/Explanation/Impact
  Estimate output shape.
- **Campaign Intelligence Engine (CIE)** — continuously evaluates mission/
  threads/relationships/location/momentum/time to produce a prioritized
  recommendation set. A `settings.cie: {}` placeholder object exists in
  the schema, but nothing in `src/domain/` populates or reads it — no CIE
  logic exists downstream of that empty stub.
- **Scenario Engine** — structured-but-flexible adventure templates
  (Investigation, Frontier Exploration, Colony Crisis, etc.) progressing
  through named beat types (Introduction/Discovery/Escalation/
  Complication/Choice/Climax/Resolution/Aftermath).
- **Living World Engine** — background world-simulation turns across
  Factions/Colonies/Economies/Infrastructure/Politics/Ecology on a
  configurable cadence, contributing proposed (never automatic) world
  events.
- **Campaign Director** as a distinct engine — a unified rollup of
  narrative trackers (Danger/Hope/Heat/Resources/Momentum/Mystery/
  Pressure/Exposure/Reputation/Morale), scene trackers, threshold events,
  timers, and conditions. Only fragments survive today as the WHAT card's
  five dials (threat/mystery/resources/reputation/stress).
- **Knowledge Graph** as a structure distinct from the Context Graph —
  the current codebase deliberately merges the two.
- **Universal Search's full "Knowledge Graph" scope** — Knowledge Cards
  (contextual result summaries with relationship/recency/pin-weighted
  ranking) and Saved Views (persistent dynamic queries). The shipped
  Universal Search is a fixed-category-order substring match with no
  ranking beyond category order and no saved queries.
- **Plugin Architecture / Plugin SDK** — stable extension points for
  community-contributed rules plugins, oracle packs, entity templates, PDF
  indexes, activity packs, story-action plugins, and UI themes, each with
  a declared minimum-version/schema-version contract.
- **Workspace Federation / Reference Integration levels** — the
  four-level (Deep Link / Embedded View / Data Integration / Workflow
  Integration) model for external tool integration (VTT sync, cloud
  collaboration, a ship designer, etc.).
- **The Campaign Operating System Maturity Model** (Level 0 Repository
  through Level 5 Creative Partner) — not tracked or referenced anywhere
  in the current codebase.
- **Explainable AI assistance / predictive story guidance** — named as
  Horizon 3 / Level 5 aspirations; no AI-model integration exists in the
  app at all today.
- **The full Thread model's Urgency and Momentum dials**, and its richer
  attribute set (origin, related-entity list, possible-consequences list)
  beyond what the shipped `threads.js` carries (name, filled, segments,
  done, status, priority, kind).
- **Append-only/immutable revision history** for entity edits (the
  corpus's "Entity Lifecycle" describes edits as creating revisions rather
  than overwriting) — the shipped entity model overwrites field values in
  place; only a few specific records (Conflict irreversible facts,
  Foreshadowing pay-off notes) are append-only, not entities generally.
- **A formal Consequence Engine / consequence state machine** (the corpus
  itself gives two different state lists across two packs — Pending→
  Escalating→Active→Resolved→Forgotten in one pack, Dormant→Building→
  Active→Escalated→Resolved in another) — the shipped app's consequence
  handling is an inline heuristic inside `continueStory()`, not a modeled
  state machine.
- **Six-level story hierarchy** (Act/Mission/Objective/Scene/Beat/Moment)
  — the shipped schema has only `scenes[]`, no Act/Mission/Objective/Beat/
  Moment records.

### From the legacy `functional-requirements.md` (v1, superseded by Functional-Requirements-v2.md) and `gameplay-mechanics.md`

- **Story Director** — referenced twice in the legacy v1 spec only as
  inert carried-over state (`context.director: {}}`,
  `settings.form: {}`, both still present in the current schema, both
  still described as "preserved verbatim" legacy weight) — the engine
  itself that produced this state is not described anywhere and has no
  live counterpart; it was a predecessor to the current Situation Model /
  Co-Pilot.
- **"Mission Control" as the primary-workspace name** — used once in the
  v1 spec's design-philosophy tenets, never again in that document. The
  shipped app's equivalent surface is named the Story Dashboard.
- The twelve numbered "engines" sketched conversationally in
  `gameplay-mechanics.md` (Trading-as-Story-Generation, Salvage Engine,
  Exploration Engine, Science Engine, Diplomacy Engine, Discovery Quality,
  Noncombat Resolution's 8-category framework, Campaign Momentum's
  "≥1 new ally/rival/knowledge/opportunity per session" rule, the GM
  Prompt Hierarchy) exist only as that document's brainstorming — none is
  implemented as a named module. The one exception: this brainstorm's
  closing "Situation Engine" concept (Objective/Pressure/Unknown/Decision/
  Consequence) was formally adopted by name in the legacy ADR set as a
  *retroactive label* for existing WHAT-card/Shift-Story behavior, not as
  new code — see below.

### From the legacy ADR set (`requirements/previous-design-principles/adr/`)

These are recorded, in the ADRs' own text, as scoped-but-not-built,
roadmap-only, or explicitly deferred — distinct from the rest of the ADR
set, which mostly documents features that did ship:

- **Battlemap/Encounter roadmap items 11b–11f**: encounter overlays
  (initiative/round tracker, spawn zones), room/asset templates with
  procedural room generation, deeper campaign-integration links on
  battlemap annotations, manual-reveal fog of war, multi-map "floors."
  Only 11a (the base Battlemap primitive) is built.
- **An Encounter Manager** with a per-ruleset initiative/attack-resolution
  registry, and a Planetfall Buildings icon set — both explicitly recorded
  as scoped/researched but not authored or built.
- **Multi-user public access and cloud sync** (Google auth, a membership/
  tier-gated dashboard, a Supabase-backed shared campaign database) —
  recorded as a genuine architectural fork from the app's single-user,
  local-first model, explicitly not started, with five unresolved
  architecture questions blocking any start.
- **A Shipyard-style gridless vessel-deckplan builder** with a
  Gallery-style tagged part library and icon rotation/flip — scoped only,
  no code.
- **Eight of the Situation Model's 17 `SHIFTS` reducers** (Deepen/Resolve
  Mystery, Gain/Spend Resources, Raise/Lower Reputation, Raise Stress,
  Change Location) have no UI control anywhere that invokes them, despite
  `applyShift` handling all 17 uniformly — reachable only by calling the
  domain function directly.
- **A named set of confirmed-dead exports** flagged in the ADR set itself
  as an open, not-yet-acted-on cleanup item: `getFactionDossier`,
  `relationshipCount`, `toggleEntityStatblockFieldAttribute`,
  `setEntityTags`, `oraclePathsWithAnyTag` (the last of these is in fact
  used, by the Oracle drawer's tag-filter feature — the ADR's own
  dead-export list may be stale on this point).
- **Scene Operating Model items 13c–13k**: WHAT News Events/Dangers/Shared
  Circumstances tracking, WHY oracle filtering by carried-over
  threads/foreshadowing/world-flags, HOW role-play suggestions plus
  asset/gear associations, a guided step-by-step scene walkthrough mode
  (recorded in the ADR itself as "the biggest open design question
  left"), manual physical-dice-result-to-consequence calculation, folding
  the Co-Pilot into the drawer tab-group system as a real architectural
  change, a responsive 3-column layout paired with that change, and a
  small 5-W jump-button row. Only 13a (Location Details) and 13b
  (scene-scoped NPC groups) of this roadmap are built.
