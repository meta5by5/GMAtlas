# GMAtlas — New Functionality Design

*Companion to the Phase 0 foundation. Covers what the re-architecture now makes possible, what is already built, and what is proposed next.*

**A 77-document Design Constitution lives under `requirements/`** — a much
larger long-range vision than anything below. It was reviewed in full and
reconciled against this document in `docs/adr/0001-adopt-design-constitution.md`;
the "Proposed next" section below is this repo's own prioritization,
informed by (not a transcription of) that corpus. See `PROGRESS.md` for the
full phase-by-phase roadmap.

---

## Where we are

Phases 0–6 done, Phase 7 (Context Graph depth) in progress. That's the only
status fact stated here — the feature-by-feature detail this section used
to restate now lives in exactly one place each: **"Already built as new
functionality"** below (numbered items 1–12, phases 0 through the Rules
Constitution) and **"Proposed next"**'s Phase 6/7 entries (marked **Done**
where shipped). Two fixes worth knowing about either way: a field typed
into but never blurred could lose its edit on refresh (fixed,
`beforeunload`/`visibilitychange` flush — see `CLAUDE.md`'s "Known
non-issues"), and the 5PFH roll toast now shows the die+modifier breakdown.

The key unlock is that **everything now reads and writes one campaign model through pure functions.** New functionality is no longer a monkey-patch fighting previous layers; it's a new pure module plus a small view. The rest of this document is what that buys us.

---

## Already built as new functionality (beyond v0.53 parity)

### 1. The session loop as one integrated flow
In v0.53, scene generation, oracle rolls, journaling, and the cockpit were separate surfaces stitched together. Here, **Continue Story** generates a scene from the *current context*, escalates threat/mystery when the consequence warrants it, drops a breadcrumb, and files the scene to the Journal — in one action. The GM never leaves the workspace.

### 2. Story-shift reducers (the manual control layer)
The design chat asked for deliberate controls to "change WHO/WHERE/WHAT/WHY/HOW without hunting through tabs." Delivered as named, pure reducers — *Reveal Clue, Complicate, Reward, Raise/Lower Threat, Advance Time, Change Location, Introduce NPC, Set Objective* — each recorded on the timeline. The same reducers power the workspace chips **and** the Co-Pilot's Quick-Apply, because they're just functions.

### 3. A Co-Pilot that acts, not just talks
`advise(campaign)` is a pure function returning an observation, a consequence, an opportunity, a **clickable** suggested oracle (adapts to the active question and pressure), and quick-apply shifts. Because it's UI-free, it is independently testable today and swappable for an LLM-backed advisor later behind the exact same signature — no UI change.

### 4. Threads (progress clocks)
v0.53 had a single free-text "current thread." This branch adds first-class **progress clocks**: named threads with fillable segments, tracked in the WHY view, advanced/retired with one click, and — crucially — **read by the Co-Pilot**, which flags the clock nearest completion ("*'Escape the station' is 3/4 — one more push resolves it*"). This is the kind of at-a-glance decision support that makes the cockpit feel like an operating system rather than a generator. (The Design Constitution's pack 77 describes a much richer 7-state Thread lifecycle — see Phase 6 below.)

### 5. Entity Inspector + `@mention` auto-linking (Phase 3A)
WHO/WHERE cards populate from real entity records instead of free text. Typing `@Name` or `@[Multi Word]` in a journal note or a context field creates the entity if missing and links everyone co-mentioned. The inspector edits name, type, tags, a shared overview, and GM-only revealed/hidden notes.

### 6. Relationship graph (Phase 3B)
A deterministic, pure force-directed layout (`domain/graph.js`) renders entity relationships as an SVG graph in the Graph drawer — nodes colored/sized by type and connection count, click-through to the inspector, live badge counts on the edge tabs.

### 7. Statblocks + drag-and-drop (Phase 3C)
- **Statblocks:** NPC entities auto-attach a system-agnostic statblock (Role, Disposition, Health, Combat/Danger, Notable Gear, Motivation); asset entities tagged `#vehicle` auto-attach a vehicle statblock (Hull/Integrity, Speed, Armament, Crew Capacity, Condition). Both are ordered key/value fields you can rename, add to, or remove — deliberately not tied to one ruleset, matching "genre-aware, not genre-locked." Any entity can also have a statblock added manually.
- **Drag-and-drop entity linking:** drag an entity chip or Cast-drawer row onto another entity to create a relationship — the direct-manipulation counterpart to the existing dropdown-based Link control (kept as the accessible/keyboard/touch fallback).
- **Drag-and-drop into Journal and context fields:** drag an entity onto the Journal note composer or any WHO/WHERE/WHAT/WHY/HOW text field to insert an `@mention` at the cursor, which auto-links on save — the same mechanism `@`-typing uses, just via direct manipulation.
- **Build panel:** Settings now shows the current phase, version, and a running changelog, hand-maintained in `src/core/buildInfo.js` so a returning GM can see what changed without checking git history.

### 8. Statblock tracks + double-click-to-roll (Phase 3D)
Requested directly against the Crew Link Starforged character sheet as a visual/interaction reference. Any statblock field can now be a numeric **track** instead of free text — a row of click-to-set boxes (click box *n* to set the value to *n*; click the active box again to step it down, so a full track zeros out one click at a time), matching the Health/Spirit/Supply/Safety meter widgets in that sheet. Health and Hull/Integrity are tracks by default; any other field — including a brand-new one added via **+ Track** — converts between text and track with a single toggle (`#` / `Aa`), so this stays data-driven rather than hardcoding Starforged's specific stat names. Double-clicking a track's value badge rolls it: `domain/dice.js` implements the action-die-vs-two-challenge-dice mechanic (d6 + value vs 2d10, Strong Hit / Weak Hit / Miss, with matches flagged) as a pure, RNG-injectable function — the same reference mechanic v0.53's Starforged roller used, now testable and filed to the Journal like any other roll.

### 9. Document Library + Character Sheets (Phase 4)
`campaign.documents.library` (item A below) is built: `assets/docs/` is scanned at build time (`scripts/build.js` → `src/data/docsManifest.js`, gitignored/regenerated) into a read-only Reference Library section in the Docs drawer, and the library also accepts real file uploads (FileReader → data URL) alongside the existing text-note documents — both distinct from, and shown alongside, the auto-discovered reference PDFs. Separately, statblocks gained a third kind: `makeStatblock('character', rulesetId)` builds a full player-character sheet from ruleset data in `data/rulesets.js` (Starforged: Edge/Heart/Iron/Shadow/Wits + Health/Spirit/Supply/Momentum; 5PFH: Reaction/Speed/Combat/Savvy/Tough + Luck/XP) — every stat and resource is an ordinary click-to-set/roll track, so no new interaction code was needed, only new *data*. Switchable per entity between rulesets from the statblock header (rebuilds the sheet). A Crew Link new-tab link lives in Settings for character-building workflows this app doesn't replicate (item E, partial — no Shipyard link yet).

### 10. Party, Colony, Guide + Bestiary statblock templates (Phase 5)
A first real design-review pass (`docs/archive/progress-log-2026-07.md`'s USER NOTES) asked for six features the old `SagaAtlas-ChatGPT.zip` prototype had that hadn't been rebuilt yet, plus fixes for three reported bugs — all landed together as Phase 5:
- **Party drawer** (`domain/party.js`): the roster is a live filter over NPC entities tagged `#character` (no duplicate data store — matches the old prototype's later, better design), plus `campaign.party.trackers[]` for free-form party-wide resources (credits, supply, custom clocks) that don't belong to any one entity.
- **Colony drawer** (`domain/colony.js`): a flat 5PFH Planetfall turn-sheet (`COLONY_FIELDS`, ported field-for-field from the old prototype), a crew roster that references character/vehicle entities by id instead of duplicating stats, and a live filter over `#lifeform`-tagged entities for tracked encounters.
- **Guide drawer** (`domain/guide.js`): one freeform reference document — a table of contents using the existing `@mention`/`@[Doc Name]` conventions, simplified from the old prototype's rich-text+sanitizer version since this repo's mention/badge rendering already does the linking work.
- **Bestiary statblock templates** (`data/statblockTemplates.js` defaults + `domain/statblockTemplates.js` CRUD): the "future-state" field-manifest design from the original ChatGPT design chat, revived and extended — per-game-system NPC field lists, each field carrying a kind (text/attribute/track), a roll method (none/action-vs-2d10/flat-vs-target), and sort order, all editable in Settings. Genuinely new versus the old prototype: an NPC entity now picks *one* template (`entity.statblockTemplateId`) instead of always rendering every system, so a Bestiary can assign the right ruleset per creature. Attribute badges now format a signed value ("EDGE +3") per the reference image supplied for this pass.
- **Oracle drawer rebuilt**: a grouped, collapsible tree (`domain/oracles.js` `buildGroupedOracleTree`/`filterOracleTree`, categories in `data/oracleGroups.js`) replaces the old flat list — whose search box turned out to be silently non-functional (a stray unused parameter meant typed filter text was never applied). Search now force-opens matching branches; a "roll whole group" button rolls every table under a node at once.
- **Document Library**: multi-file upload (`<input multiple>`), tags with a filter-chip row and free-text search (`domain/documents.js` `filterDocuments`/`allDocumentTags`), each entry's name is now a link that opens an in-app PDF viewer panel (docked beside the Documents drawer, not a new tab or full-screen overlay) instead of an "Open" button, and a rename (✎) button edits only the display title, never the underlying file.
- **Entity relationships**: the label on a relationship chip is now an editable text input (`updateRelationshipLabel`), so a link created via drag-and-drop can get a note afterward — previously only the dropdown-based Link control could set a label, and only at creation time.
- **Bug fixes**: `sw.js` switched from cache-first (a never-bumped cache name could mask a rebuilt bundle indefinitely under a local dev server) to network-first; a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) now builds `dist/app.bundle.js` before a Pages deploy, since that gitignored artifact was simply absent from a plain checkout; and a missing `parseDocumentMentions` import that threw on every Journal render once an entry contained a `@[Document]` mention.

### 11. Statblocks: multi-group, attribute redesign, entity-type scoping (Phase 5 follow-up)
A follow-up review against a screenshot of the Phase 5 statblock UI asked for three changes, landed together since they touch the same rendering path:
- **Multiple simultaneous statblock groups**: `entity.statblock` (singular) became `entity.statblocks[]` — a character can carry both a Starforged and a 5PFH sheet, or an NPC two Bestiary templates, at once. Adding one is always additive (a "+ Add" chip row offers whichever rulesets/templates aren't already present); each group removes independently via its own 🗑. Every statblock mutator now takes a `groupIndex` before the field index.
- **Attribute fields redesigned** (superseded — see Phase 6 below, kept here only as the step this history built on): Edge/Heart/Combat/... moved off the 1-5 click-to-set meter to a single signed number with +/- steppers, matching how Starforged/5PFH sheets present a stat (the meter stays for genuine depleting resources like Health/Hull). The +/- steppers themselves didn't last either — Phase 6 replaced them with a directly-editable input; `stepStatblockFieldValue` no longer exists. Per the "newer wins" rule below, treat Phase 6's description as the only current one. Character-sheet stat fields (`group:'stat'`) carry `attribute:true` alongside `track:true` so they route to the same widget as Bestiary attribute-kind fields — that part is still accurate.
- **Bestiary is an NPC subtype, like Character**: statblock add-choices are now scoped by entity type — Character Sheet and Bestiary options only for `npc` entities, Vehicle Stats only for `asset` entities; other entity types (Faction, Location, Lore) get no statblock options at all.
- **Per-field controls removed**: the rename input and the ★ (attribute)/Aa (track)/✕ (remove) buttons are gone from every field row — a field's name and kind are fixed by its template (Settings' Bestiary template editor), not edited per-instance. Ad-hoc "+ Field"/"+ Track" additions are named via a one-time prompt instead of an inline-editable label.
- **Add row collapsed**: the "+ Add" chip row is now behind a ⚙ gear toggle so it doesn't dominate the inspector once a few groups already exist.

### 12. Rules Constitution reference (Settings)
`requirements/initial design inputs/gameplay-goals.md` sharpened "genre-aware, not genre-locked" into a concrete claim — every ruleset is a content provider, not the application — backed by a table naming six systems (Starforged, Traveller, Five Parsecs From Home, Hostile, Stars Without Number, Planetfall) as the intended provider for each gameplay area, plus four responsibilities (campaign memory, story continuity, rules switching, recommendations) reserved for Saga Atlas itself. `src/data/rulesConstitution.js` records this as data (`RULES_PROVIDERS`, `GAMEPLAY_AREAS`), each provider honestly status-tagged (`integrated` / `default genre` / `reference only` / `not yet integrated` / `core`) rather than presented as uniformly supported, and a read-only table surfaces it in Settings. See `docs/adr/0002-rules-constitution.md` — this is reference data for Phase 9 to consume, not an engine built ahead of its turn in the priority order.

---

## Proposed next (reprioritized against the Design Constitution, pack 66)

Pack 66's priority order is: campaign continuity > Mission Control workflow >
Context Graph > storage reliability > story recommendations > UX refinements >
integrations > new features. The phases below apply that ordering — Phase 6
is pure continuity work because that's what the Constitution (and this
project's own "Frictionless Empowerment" principle) ranks highest, not
because it's the easiest.

### Phase 6 — Campaign Continuity (complete, one candidate reopened below)
- **Session recap / "Narrative Recall"** — **Done.** `domain/recap.js` (`buildSessionRecap`/`formatSessionRecap`), one click in the Journal drawer ("▸ Previously on...") composes: what happened last time (excluding prior recaps from their own recap), open threads, the current objective, relevant WHO/WHERE entities, current threat/mystery pressure, and the Co-Pilot's recommendation — all read-only, plus an explicit "Save as Journal note" action. Pure function, fully tested.
- **Richer Thread lifecycle** (pack 77) — **Done.** `domain/threads.js` threads now carry a 7-state lifecycle (Seeded → Active → Escalating → Dormant → Converging → Resolved → Archived, `setThreadStatus`) and a priority dial (low/normal/high, `setThreadPriority`), both GM-set — filling a clock to full still auto-marks Resolved (unchanged prior behavior), but nothing else auto-transitions a status. Old threads (no status/priority in storage) normalize from `done` on read, no migration step or data loss. Workspace UI: a status + priority `<select>` per thread under the WHY question.
- **"What did I overlook?"** (pack 13/76) — **Partially done.** `overlookedThreads()` surfaces threads that are Dormant or untouched since creation, rendered as an observation-only Co-Pilot card (plain chips, no actions — explicit corpus rule: never auto-correct, only surface). Forgotten-NPC and unresolved-promise detection (also named in this pack) are NOT built — they need a data model (last-mentioned tracking, explicit promise records) that doesn't exist yet; left as a follow-up rather than half-built. *Remaining effort: medium* (needs the new data model first).
- **Narrative Trackers beyond threat/mystery** (pack 18) — **Done** for Resources/Reputation, one more candidate reopened. `context.what` gained Resources and Reputation as two more campaign-level dials, generalizing the existing threat/mystery pattern (same 0-10 range, same Shift-action shape, same neutral-midpoint-not-zero default for saves that predate the feature) rather than introducing a new mechanism. `domain/context.js` gained `Gain Resources`/`Spend Resources`/`Raise Reputation`/`Lower Reputation`; the WHAT workspace view gained two more sliders; `copilot.js`'s `advise()` reacts to both (scarcity/soured-reputation observations and consequences, abundance opportunities, a Trade & Cargo oracle suggestion when scarce). The Constitution's full list (Danger, Hope, Heat, Momentum, ...) still has more dials than these four — this note deliberately said "left for a future pass if a concrete use turns up, not built speculatively," and the 2026-07-03 ruleset library review turned one up: **a Stress/Tension dial**, drawn from Hostile's own horror-design essay (Setting pp.211-219: uncertainty/isolation/timing as the three horror levers) and the Repellant short's sanity-attrition mechanic. Same pattern as Resources/Reputation — a fifth `context.what` dial, a matching Shift action pair, and a `copilot.js` reaction (e.g. "Stress is high — a scene without combat should follow, or someone breaks"). *Effort: low*, since the mechanism already exists four times over; this is content-shaped work (deciding the semantics), not new architecture.

### Phase 7 — Context Graph depth
- **`@` pointers into documents with page anchors** (was item A's remainder). The one piece of "@ pointers... like the ChatGPT version did" not yet built — extend `parseMentions`/the `@`-autocomplete UX to offer documents alongside entities. *Effort: medium.*
- **Typed/weighted relationships**. Today a relationship is `{to, label}` with a free-text label; the Constitution's edge taxonomy (Member Of, Owns, Controls, Located At, Allied With, ...) plus weights (strength, confidence, story importance, last used) would make graph-driven recommendations meaningfully better. *Effort: medium* — additive schema change, existing free-text labels become the default/fallback edge type. **The 2026-07-03 ruleset review's "relationship/Bond progress track" suggestion belongs here, not as separate scope**: Starforged's Make a Connection → Forge a Bond chain (rulebook pp.163-166/233) is exactly a *weight* on a relationship edge (a `strength`/`stage` value that grows over time) — implement it as one of the weight fields this item already calls for, not a second relationship mechanism.
- **"Flag, don't delete" invalid relationships** (pack 9). When an entity's type/tags change in a way that invalidates a relationship, flag it for GM review instead of silently dropping it — currently relationships just persist unconditionally (fine, but not the same as an explicit review flag).
- **Tag fields as dropdowns** with a per-entity-type tag vocabulary — **Done.** The entity inspector's tags are now removable chips plus a dropdown of tags already used by other entities of the same type (`listTagVocabulary` in `domain/entities.js`, computed live off existing entities — no separate stored vocabulary, so it can't drift out of sync, and a tag drops back out of the dropdown on its own once no entity of that type uses it anymore). "+ New…" still takes a freeform tag via prompt.
- **Faction card template** (2026-07-03 ruleset review). Hostile's "Agencies & Corporations" pattern (Setting pp.79-111: HQ, leadership, related-business list, a one-paragraph scenario-seed hook) is a reusable structured-lore template for the existing `faction` entity type — a few new fields (`hq`, `leadership`, `scenarioSeed`) on the entity record, the same kind of entity-depth work the rest of this phase already does. *Effort: low.* Placed here rather than Phase 10 because it's enriching the existing Context Graph's entity model, not a new mechanism.

### Phase 8 — Unified Discovery
- **Universal Search** (pack 23) across entities, journal, oracle tables, documents, Party, and Colony in one search box — today each drawer has its own local search/filter. *Effort: medium-high* — needs a shared index/ranking function, but every source already exists.
- **Oracle table editor** (was item C). `oracles.overrides` and `tablesWithOverrides` already exist and are tested; add an in-drawer editor to add/rename/reweight entries. *Effort: low-medium.* **Two ready-made content additions for whenever this lands** (2026-07-03 ruleset review, both pure data — no engine work): a "Scenario Dilemma" oracle group (Hostile marinecorps8's genre-neutral Dilemma/Objective/NPCs/Map mission-framing template, pp.97-99, plus its 5 sample moral dilemmas) and an Environmental Hazard table (Hostile Explorers' ~25-entry Environmental Events glossary + Survey Problem table, pp.47-52) — both slot into `data/tables.js`/`data/oracleGroups.js` exactly like existing `SCENE_TABLES` content, so they don't need to wait for the editor itself; only need it if hand-tuning entries later is wanted.
- **Cast drawer: entity-type filter + name/tag search**. Today the Cast drawer always shows a row of "+ NPC / + Location / + Faction / + Asset / + Lore" add buttons above the list; add a filter (by type, and a text search on name/tags) to the left of that row instead of paging through the full entity list. A smaller, single-drawer precursor to Universal Search above. *Effort: low-medium.*
- **NPC generation oracle chain** (2026-07-03 ruleset review). Starforged's Character oracle (Role → Goal → Aspect → Disposition → Name, rulebook pp.170-175) is the most re-usable *procedure* the review found — designed to be re-rolled per NPC, which is exactly what the existing oracle-tree/`rollOracle` machinery already does for every other table. Add it as a "Characters" oracle group (data, `data/tables.js`/`data/oracleGroups.js`) plus a one-click "Generate NPC" action in `entities.js`'s NPC creation flow that rolls the chain and pre-fills `overview`; complement with 5PFH's Patron table (p.83: Benefits/Hazards/Danger Pay) as a second group for antagonist/patron NPCs. *Effort: low* — content plus one thin action, not a new subsystem. Like the two data additions above, this doesn't need to wait for the oracle table editor to land first.

### Phase 9 — Activity-driven gameplay
- **HOW workspace becomes Activity-driven** (pack 7/24, sharpened by `requirements/gameplay-goals.md`'s Rules Constitution — see `docs/adr/0002-rules-constitution.md`). Today HOW is a free-text summary field, and `src/data/rulesConstitution.js` is a read-only reference table (Settings). This phase turns it into an actual recommender: pick an Activity (Investigate, Negotiate, Travel, Trade, ...), get the gameplay-area's registered provider(s) as a suggested Rules Lens (e.g. Tactical Combat → Five Parsecs From Home, Exploration → Starforged + Traveller), extending the existing per-entity ruleset selector rather than replacing it. *Effort: medium.*
- **Genre packs** (was item D). `SCENE_TABLES` is data and `settings.genre` is a lens; package alternative table sets as selectable genre packs. *Effort: medium.*

### Phase 10 — Ecosystem & reach (lowest priority per pack 66 — "new features")

- **Trade & Logistics minigame** (user-requested, 2026-07-03; see
  `docs/adr/0003-trade-logistics.md` for the mechanics and **`docs/adr/
  0004-merchant-rules-lens.md`** for the framing, after three further
  design documents — `requirements/Saga_Atlas_Merchant_*.txt` — asked to
  be incorporated and consolidated). Supply/demand-driven buying, selling,
  and transporting of goods across multiple Locations — this is the
  concrete design the old one-line "automated trade" bullet below now
  expands into, promoted to the front of this phase given explicit user
  interest, but *not* moved out of Phase 10 itself: it's still new-feature
  work per pack 66's "continuity > workflow > graph > storage >
  recommendations > UX > integrations > new features" ordering, and
  Phase 6's Narrative Trackers item (Reputation/Heat) is a soft dependency
  this design leans on rather than duplicates. *Effort: medium-high.*
  **ADR 0004 reframes the headline loop as contracts, not commodity
  speculation** ("Key Innovation: replace buy-low/sell-high with living
  contracts") — a contract is a Thread with a few extra reference fields
  (`patronId`/`originId`/`destinationId`/`type`/`payout`), generated by
  rolling a new "Contract Type" Oracle table (Humanitarian/Corporate/
  Scientific/Military/Exploration/Diplomatic/Smuggling/Courier/Passenger/
  Recovery/Colonization/Mining/Research/Emergency/Escort), with `payout`
  priced by the same `priceAt()` this section already specifies. Everything
  below is unchanged; the contract layer sits on top of it, not instead.
  - **Data, not an engine**: `data/commodities.js` — a genre-swappable list
    of tradeable goods (Hostile-flavored default: Water, Fuel, Medical
    Supplies, Weapons, Salvage, Luxury Goods, ...), each just `{id, label,
    basePrice}`. Same posture as `data/tables.js`/`data/rulesets.js` — a
    genre pack can ship a different commodity list without touching code.
  - **New pure domain module `domain/trade.js`**, modeled directly on the
    existing `threads.js`/`colony.js` shape (`ensure()` normalizer,
    campaign-cloning mutators, no DOM): each Location entity gains an
    optional `market` — a per-commodity `{ supply, demand }` pair (simple
    0–100 dials, GM- or oracle-set, not a live simulation) that a
    `priceAt(location, commodityId)` pure function turns into a live price
    (`basePrice * demandFactor / supplyFactor`); `buy()`/`sell()` mutate a
    party cargo manifest *and* nudge that location's `supply` dial (buying
    drains supply and raises price locally, selling floods it and lowers
    price) — this is the whole "supply/demand across multiple locations"
    ask: prices only diverge, and trade routes only matter, because two
    Locations' markets aren't forced to agree.
  - **Transport as a Thread, not a new clock primitive.** A trade run
    (cargo + origin + destination) reuses `domain/threads.js`'s existing
    progress-clock mechanic instead of inventing a second one — "in
    transit" is exactly a Thread that resolves on arrival, and it already
    gets lifecycle states (Escalating if a route gets dangerous, Dormant if
    the GM parks it) and Co-Pilot surfacing for free.
  - **Risk vs. reward, resolved with tools that already exist**: a route's
    danger doesn't need a new resolution engine — advancing a transport
    Thread is a natural trigger for an Oracle roll (ambush/spoilage/customs
    complication) and a Co-Pilot recommendation, both existing systems.
    Reward scales with the *distance between two Locations' price deltas*
    for a commodity (buy low where supply is abundant, sell high where
    demand is high) crossed with route danger — the further apart the
    prices, the more worth the risk, which is the actual "supply/demand ...
    for planning" ask, not a flat profit-margin number.
  - **Cargo capacity lives on the existing Vehicle Stats statblock kind**
    (`kind: 'vehicle'` groups, already scoped to Asset-type entities) as one
    more track/attribute field via the existing Bestiary-template mechanism
    — no new entity subtype needed.
  - **UI**: a new tertiary drawer tab (`trade`), following the exact
    precedent of Party/Colony/Guide in Phase 5 — a market view per selected
    Location, a cargo/manifest view for the active party's transport(s),
    and buy/sell buttons wired through the one delegated `click` handler
    like every other control in this app (rule 4 in `CLAUDE.md`).
  - **Rules Constitution note**: `rulesConstitution.js` currently assigns
    Trade to `['traveller', 'hostile']`, but Traveller has zero authored
    mechanics *and no Traveller sourcebook exists anywhere in this repo's
    `assets/docs/` library* — confirmed by the 2026-07-03 ruleset review
    (see `docs/archive/progress-log-2026-07.md`). This design is therefore Hostile-flavored and
    original by necessity, not a transcription of Traveller's trade rules;
    if a Traveller sourcebook is ever added to the library, its trade
    tables become a second, swappable commodity/price data set rather than
    a redesign.
- **Mission/Job generator — new `domain/missions.js`** (2026-07-03 ruleset review; user priority: "robust missions with balanced risk vs reward"). The single best-supported gap the review found — nothing in `src/domain/` currently generates a job/contract with payout math. Borrows Hostile Crew Expendable's cargo-job formula (pp.20-24, 37-39: destination distance × a 2D6 payout-modifier table, explicit damage/lateness penalties) and 5PFH's danger-tier-scaled Deployment Conditions (pp.88-89): `generateMission(campaign, { danger })` returns `{payout, complications, deadline, penalties}`, with `danger` sourced from the existing `context.what.threat` Narrative Tracker so higher ambient threat produces higher-stakes, higher-payout missions automatically — risk and reward move together instead of being hand-tuned per mission. *Effort: medium* — new domain module, same "new feature" bucket as Trade above, not reordered ahead of it.
- **Faction Pressure Track — extend `domain/threads.js`'s clock onto faction entities** (2026-07-03 ruleset review; user priority: "deep faction... creation"). Hostile Colony Builder's Stability/Instability escalation ladder (pp.74-78: a quarterly roll against accumulating Instability, ending in a named consequence tier) and 5PFH Compendium's Power/Influence/Faction Activity table (pp.110-115) both reduce to the same shape Threads already model — a filling clock with GM-set state, not a live simulation. A faction entity gains a `pressure` clock (reusing `threads.js`'s existing segments/status machinery rather than a second implementation) plus a free-text `goal`/`agenda` field and an activity-table roll analogous to 5PFH's D100 table. *Effort: low-medium* — mostly wiring an existing mechanic onto a new entity type.
- **Faction Rumor → Mission seed link in `copilot.js`** (2026-07-03 ruleset review) — depends on both items above existing first. Starforged frames Faction Rumors explicitly as vow/mission seeds (reference guide p.79); once a faction has a pressure clock and missions can be generated, `advise()` crossing a faction's pressure threshold into "a mission tied to them would land now" is the natural link, the same way `copilot.js` already links `threadUnderPressure()` into its `observation` field. This is what turns faction depth and mission depth into a loop instead of two static features — the concrete answer to wanting both at once.
- **Shipyard companion link** (item E's remainder) — blocked on a known official URL, not effort.
- **Plugin-style rules-lens registration** — the Constitution's long-horizon "Ecosystem" milestone; not worth building until Phase 9 proves the Activity→Lens pattern with the two rulesets already shipped.
- **Sync adapter / Crew Log shared database** (was item F). Persistence is one module with a narrow interface, so this stays an *adapter*, not a rewrite, whenever it's prioritized.
- **Rules Constitution data for Traveller and Stars Without Number** — both are named providers in `rulesConstitution.js` with zero authored content today (both `status: 'not yet integrated'`, updated from the older `'reference only'` wording once the 2026-07-03 ruleset review confirmed neither has a source PDF in this repo's library at all). Sector generation and faction turns (SWN) and trade/vehicle/NPC tables (Traveller) are genuinely new data-authoring work, not a UI feature — lowest priority per pack 66, and gated on Phase 9 existing first (no point authoring provider data before there's an Activity system to serve it), *and* on the actual sourcebooks being added to `assets/docs/` if the intent is to transcribe them rather than author originals.
- **"Services to automate"** (`requirements/gameplay-goals.md`): faction turns, rumors, and reminders don't have a home yet (automated trade and faction pressure now have concrete designs above) — they map onto the original Constitution's Living World Engine (pack 38) and Scenario Engine (pack 36), both long-horizon. Heat/consequences/timers overlap with Phase 6's Narrative Trackers item instead of needing new scope here.

**Why these aren't all dumped in as one flat list**: the ruleset review produced ten suggestions; only three (missions.js, the faction pressure track, and the Co-Pilot link between them) are genuinely new mechanisms, so only those three sit in this new-features-last phase. The rest were mis-scoped as "new features" on first pass — a faction card template and the relationship/Bond weight are entity-model depth that belongs in Phase 7 (already in progress, ranked above this phase), the NPC oracle chain and two hazard/dilemma tables are pure content additions that don't need to wait for anything (see Phase 8's oracle-editor item), and the Stress/Tension tracker is a same-shaped continuation of a Phase 6 item that was deliberately left open. Sorting by *what a suggestion actually is* (data vs. entity-depth vs. new mechanism), not by which review produced it, is what "against the design constitution" means in practice here — pack 66's ordering is about mechanism/engine work competing for priority, not about content, which this repo has never gated behind phase order (`CLAUDE.md`: "keep statblocks, oracle tables ... data, not code").

---

## Explicitly not adopted (see `docs/adr/0001-adopt-design-constitution.md`)

A few corpus-proposed subsystems are deliberately **not** on this roadmap
yet, with reasoning recorded in the ADR rather than repeated here: a formal
typed Event Bus (the current `store.subscribe()` model hasn't hit a
Refactor Trigger), a split Context Graph / Knowledge Graph (merged is fine
at this maturity level), and a full Act/Mission/Objective/Scene/Beat/Moment
story hierarchy (the corpus itself doesn't agree on what that hierarchy is
across its own packs).

`requirements/gameplay-goals.md`'s Rules Constitution (see
`docs/adr/0002-rules-constitution.md`) is recorded as **reference data
only** (`src/data/rulesConstitution.js`, surfaced read-only in Settings) —
not yet built: the actual Activity → Rules Lens recommender (Phase 9), and
any Traveller/Stars Without Number mechanics content (both named providers
with zero authored data today). Neither jumps the priority order; this
document sharpened what Phase 9 will consume, not when it happens.

---

## UI/UX assumptions worth re-confirming (2026-07-03 review)

While revising the roadmap above, a few gaps surfaced between what the
*founding* design brief (`requirements/SagaAtlas-Design-Recommendations.md`,
§1.4/§3.5) promised and what's actually built, plus some interaction
patterns that have quietly accreted without ever being decided on purpose.
None of these are bugs — they're **assumptions worth the user explicitly
confirming or overriding**, since they're the kind of thing "common
industry tools" have converged on a default for, and GMAtlas's current
default may or may not be the intended one.

- **Only one drawer can be open at a time.** The founding brief was explicit:
  *"Drawers stack and are resizable — read the Journal and roll an Oracle
  side by side without leaving the workspace"* (§1.4), matching how VS Code,
  Figma, or Blender panels behave. The current `openDrawer` is a single
  value (`ui/shell.js`) — opening Oracle closes Journal. `drawers.widths`
  (per-drawer remembered width) already exists in the schema, so the data
  model doesn't block this; only the single-slot UI variable does. Worth
  confirming whether single-drawer-at-a-time is the actual intended
  simplification (fewer moving parts, matches "the workspace changes, not
  the app") or a gap against the original spec.
- **One responsive breakpoint, not three.** The brief specced distinct
  desktop/tablet/phone behaviors (§3.5: Co-Pilot becomes a tablet edge-tab,
  a phone bottom-sheet, WHO→WHERE swipe navigation). `styles/cockpit.css`
  today has exactly one breakpoint (1024px): above it, desktop; below it,
  a single "mobile" treatment (Co-Pilot becomes a bottom sheet). A tablet in
  portrait gets the phone treatment, not an intermediate one. Worth
  confirming this collapse to two states (rather than three) matches actual
  target devices.
- **No visible keyboard shortcuts or command palette.** Comparable GM/
  productivity tools this app is implicitly competing with (Notion,
  Obsidian, Roll20, Foundry VTT) all offer at least a few global shortcuts
  (search, new entity, quick-roll). Nothing here is bound beyond native
  browser behavior. Not necessarily wrong for a "frictionless" philosophy
  that leans on always-visible controls instead of memorized bindings — but
  worth an explicit yes/no rather than silence.
- **No in-session undo/redo.** Data safety today is export/import plus a
  one-slot `localStorage` backup key (`store.js`'s `BACKUP_KEY`, restores
  the previous save, not a history). A GM who fat-fingers a delete has no
  `Ctrl+Z`. Most tools users would compare this to have at least a
  single-level undo. Worth deciding whether the backup key is the
  deliberate substitute (simpler, matches "one store" architecture) or
  whether real undo is expected before this reads as "done."
- **Toasts are single-slot, last-write-wins** (`toast()` in `ui/shell.js`).
  A feature that already exists — multi-file Document upload — fires one
  toast per file as each `FileReader` resolves; in quick succession, each
  toast can clobber the previous one's message before it's readable. Most
  toast systems (Material, Chakra, etc.) queue/stack instead. Small, but
  worth fixing consistently rather than per-caller if it's confirmed as an
  actual UX priority.
- **Drag-and-drop as a primary interaction has no confirmed touch
  equivalent.** Entity linking and `@mention` insertion both lean on HTML5
  drag-and-drop, which is notoriously unreliable on mobile browsers. The
  dropdown-based Link control is the documented keyboard/accessible
  fallback (`CLAUDE.md`), but it hasn't been verified end-to-end on an
  actual touch device or emulation — worth doing before calling "mobile and
  desktop equal" (README.md) a verified claim rather than an aspiration.
- **Icon-only action buttons rely entirely on hover tooltips.** `title`
  attributes don't fire on touch — meaning every icon-only button added
  so far (🏷 tag toggle, ✎ rename, ✕ delete/close, ⚙ statblock-add toggle,
  🗑 remove-group) is effectively unlabeled on a phone, for a tool whose own
  goal is phone parity. `aria-label` covers screen readers but not a
  sighted touch user. Worth a deliberate pattern (e.g. a persistent
  compact text label, or confirming touch users are expected to use a
  different, more label-forward layout) before more icon-only controls
  accrete by precedent.
- **PWA installability hasn't been checked against a concrete checklist**
  (manifest icon sizes, `display: standalone`, service worker scope) since
  the original Phase 0 scaffold — worth a dedicated verification pass
  before "installable as PWA" is treated as a settled claim rather than a
  goal.

None of the above changes the phase priorities above — they're flagged
here, not scheduled, because each is a product decision (what should the
default be) rather than an obviously-correct fix.

---

## Testing posture

Every new capability lands as a pure domain function with unit tests first (as Threads did), then a thin view and a browser smoke check. The invariant: the risky logic never lives in the DOM, so "can a GM run a four-hour session without the software breaking" stays an assertion we actually run, not a hope.
