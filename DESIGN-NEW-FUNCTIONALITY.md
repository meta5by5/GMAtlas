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

Phases 0–9 done, Phase 10 (Ecosystem & reach — lowest priority per pack 66)
begun (its first item, the Merchant Rules Lens, is done — see below). That's the only status fact stated here — the feature-by-feature
detail this section used to restate now lives in exactly one place each:
**"Already built as new functionality"** below (numbered items 1–12,
phases 0 through the Rules Constitution) and **"Proposed next"**'s Phase
6/7/8/9 entries (marked **Done** where shipped). Two fixes worth knowing
about either way: a field typed
into but never blurred could lose its edit on refresh (fixed,
`beforeunload`/`visibilitychange` flush — see `CLAUDE.md`'s "Known
non-issues"), and the 5PFH roll toast now shows the die+modifier breakdown.

The key unlock is that **everything now reads and writes one campaign model through pure functions.** New functionality is no longer a monkey-patch fighting previous layers; it's a new pure module plus a small view. The rest of this document is what that buys us.

---

## Already built as new functionality (beyond v0.53 parity)

### 1. The session loop as one integrated flow
In v0.53, scene generation, oracle rolls, journaling, and the cockpit were separate surfaces stitched together. Here, **Continue Story** generates a scene from the *current context*, escalates threat/mystery when the consequence warrants it, drops a breadcrumb, and files the scene to the Journal — in one action. The GM never leaves the workspace.

### 2. Story-shift reducers (the manual control layer)
The design chat asked for deliberate controls to "change WHO/WHERE/WHAT/WHY/HOW without hunting through tabs." Delivered as named, pure reducers — *Reveal Clue, Complicate, Reward, Raise/Lower Threat, Advance Time, Change Location, Introduce NPC, Set Objective* — each recorded on the timeline. The same reducers power the workspace chips **and** the Co-Pilot's Quick-Apply, because they're just functions. **Retroactively, this is this repo's "Situation Engine"**: `requirements/design-principles/gameplay-mechanics.md` proposes a State → Pressure → Choice → Consequence pattern and a GM Prompt Hierarchy (Situation/Complication/Decision/Consequence) that this card + these reducers already implement, arrived at independently — see `docs/adr/0008-situation-engine.md`.

### 3. A Co-Pilot that acts, not just talks
`advise(campaign)` is a pure function returning an observation, a consequence, an opportunity, a **clickable** suggested oracle (adapts to the active question and pressure), and quick-apply shifts. Because it's UI-free, it is independently testable today and swappable for an LLM-backed advisor later behind the exact same signature — no UI change. This observation/consequence/opportunity shape, plus Session Recap (item 10 below), is also what `gameplay-mechanics.md` calls "Campaign Momentum" (a session should surface a new ally/rival/knowledge/opportunity) — already built, see `docs/adr/0008`.

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
`requirements/initial design inputs/gameplay-goals.md` sharpened "genre-aware, not genre-locked" into a concrete claim — every ruleset is a content provider, not the application — backed by a table naming six systems (Starforged, Traveller, Five Parsecs From Home, Hostile, Stars Without Number, Planetfall) as the intended provider for each gameplay area, plus four responsibilities (campaign memory, story continuity, rules switching, recommendations) reserved for Saga Atlas itself. `src/data/rulesConstitution.js` records this as data (`RULES_PROVIDERS`, `GAMEPLAY_AREAS`), each provider honestly status-tagged (`integrated` / `default genre` / `not yet integrated` / `core` — `reference only` was retired 2026-07-03 once it turned out to mean the same thing as `not yet integrated` in every actual case) rather than presented as uniformly supported, and a read-only table surfaces it in Settings. See `docs/adr/0002-rules-constitution.md` — this is reference data for Phase 9 to consume, not an engine built ahead of its turn in the priority order.

---

## Proposed next (reprioritized against the Design Constitution, pack 66)

Pack 66's priority order is: campaign continuity > Mission Control workflow >
Context Graph > storage reliability > story recommendations > UX refinements >
integrations > new features. The phases below apply that ordering — Phase 6
is pure continuity work because that's what the Constitution (and this
project's own "Frictionless Empowerment" principle) ranks highest, not
because it's the easiest.

### Phase 6 — Campaign Continuity (complete)
- **Session recap / "Narrative Recall"** — **Done.** `domain/recap.js` (`buildSessionRecap`/`formatSessionRecap`), one click in the Journal drawer ("▸ Previously on...") composes: what happened last time (excluding prior recaps from their own recap), open threads, the current objective, relevant WHO/WHERE entities, current threat/mystery pressure, and the Co-Pilot's recommendation — all read-only, plus an explicit "Save as Journal note" action. Pure function, fully tested.
- **Richer Thread lifecycle** (pack 77) — **Done.** `domain/threads.js` threads now carry a 7-state lifecycle (Seeded → Active → Escalating → Dormant → Converging → Resolved → Archived, `setThreadStatus`) and a priority dial (low/normal/high, `setThreadPriority`), both GM-set — filling a clock to full still auto-marks Resolved (unchanged prior behavior), but nothing else auto-transitions a status. Old threads (no status/priority in storage) normalize from `done` on read, no migration step or data loss. Workspace UI: a status + priority `<select>` per thread under the WHY question.
- **"What did I overlook?"** (pack 13/76) — **Partially done.** `overlookedThreads()` surfaces threads that are Dormant or untouched since creation, rendered as an observation-only Co-Pilot card (plain chips, no actions — explicit corpus rule: never auto-correct, only surface). Forgotten-NPC and unresolved-promise detection (also named in this pack) are NOT built — they need a data model (last-mentioned tracking, explicit promise records) that doesn't exist yet; left as a follow-up rather than half-built. *Remaining effort: medium* (needs the new data model first).
- **Narrative Trackers beyond threat/mystery** (pack 18) — **Done** for Resources/Reputation, one more candidate reopened. `context.what` gained Resources and Reputation as two more campaign-level dials, generalizing the existing threat/mystery pattern (same 0-10 range, same Shift-action shape, same neutral-midpoint-not-zero default for saves that predate the feature) rather than introducing a new mechanism. `domain/context.js` gained `Gain Resources`/`Spend Resources`/`Raise Reputation`/`Lower Reputation`; the WHAT workspace view gained two more sliders; `copilot.js`'s `advise()` reacts to both (scarcity/soured-reputation observations and consequences, abundance opportunities, a Trade & Cargo oracle suggestion when scarce). The Constitution's full list (Danger, Hope, Heat, Momentum, ...) still has more dials than these four — this note deliberately said "left for a future pass if a concrete use turns up, not built speculatively," and the 2026-07-03 ruleset library review turned one up: **a Stress/Tension dial**, drawn from Hostile's own horror-design essay (Setting pp.211-219: uncertainty/isolation/timing as the three horror levers) and the Repellant short's sanity-attrition mechanic. — **Done.** A fifth `context.what` dial (`stress`, same 0-10 range and neutral-midpoint-5 default as Resources/Reputation), a matching `Raise Stress`/`Ease Stress` Shift action pair, and a third `field-row-3col` slider alongside Resources/Reputation on the WHAT view. `copilot.js`'s `advise()` reacts at both ends: high Stress (≥7) surfaces as an observation/consequence ("Stress is high — a scene without combat should follow, or someone breaks" / "Someone cracks under the pressure...") ranked just below Threat in priority, with a suggested Horror Escalation → Escalation Beat oracle roll and an Ease Stress quick-action; very low Stress (≤2) offers a calm-holds opportunity, the same shape as Resources/Reputation's abundance case.

### Phase 7 — Context Graph depth (complete)
- **`@` pointers into documents with page anchors** (was item A's remainder) — **Done.** `@[Doc Title#12]` or `@[Doc Title p.12]` (`domain/documents.js`'s `parseDocumentMentionRefs`/`splitPageAnchor`) names a page alongside the title; a document badge (Journal entries, Guide) that resolves to an openable PDF — either an uploaded/library file or a Reference Library entry, whichever matches the title first, via `findDocumentTabByTitle` — renders as a clickable button instead of a static label, opening the in-app viewer already built in Phase 5 and jumping straight to that page (`openDocumentTab`/`resolveDocumentTab` track a per-tab requested page and append a `#page=N` fragment, the same technique the old ChatGPT prototype's `makePdfSrc` used). A text-note document mention still renders as a plain, non-clickable badge — there's no PDF page for it to jump to. Re-focusing an already-open tab without a page anchor leaves whatever page it's already on alone, so switching drawers never resets a GM's place mid-read.
- **Typed/weighted relationships** — **Done.** A relationship now carries a `type` (`domain/entities.js`'s `RELATIONSHIP_TYPES`: Linked/Member Of/Owns/Controls/Located At/Allied With/Rival Of/Bond) alongside its free-text `label`, plus a 0-10 `strength` weight — `linked`/`0` is what every pre-existing relationship normalizes to on first touch (`normalizeRel`), so nothing needed migrating. The requested type only applies to the side that requested it (A "Member Of" B doesn't make B's mirrored edge back to A "Member Of" too — it starts `linked`), the same per-side scope `updateRelationshipLabel` already established. **The 2026-07-03 ruleset review's "relationship/Bond progress track" suggestion landed as planned**: Starforged's Make a Connection → Forge a Bond chain (rulebook pp.163-166/233) is just a `bond`-typed relationship whose `strength` a GM raises over time — no second mechanism. UI: a type `<select>` and a 0-10 strength `<input>` per relationship chip in the entity inspector, plus a type picker on the "add relationship" row.
- **"Flag, don't delete" invalid relationships** (pack 9) — **Done.** Four directional types (Member Of/Owns/Controls/Located At) imply a target entity type; `isRelationshipFlagged`/`listFlaggedRelationships` in `domain/entities.js` detect when a relationship's *current* target no longer matches (almost always because the target's own type was edited after the link was made) — Allied With/Rival Of/Bond/Linked are never flagged (no implied target type). Nothing is auto-corrected or removed: a flagged chip in the entity inspector gets a ⚠ with an explanatory tooltip, and the Co-Pilot gains a "Relationships to review" card (same observation-only posture as "What did I overlook?").
- **Tag fields as dropdowns** with a per-entity-type tag vocabulary — **Done.** The entity inspector's tags are now removable chips plus a dropdown of tags already used by other entities of the same type (`listTagVocabulary` in `domain/entities.js`, computed live off existing entities — no separate stored vocabulary, so it can't drift out of sync, and a tag drops back out of the dropdown on its own once no entity of that type uses it anymore). "+ New…" still takes a freeform tag via prompt.
- **Faction card template** (2026-07-03 ruleset review) — **Done.** Hostile's "Agencies & Corporations" pattern (Setting pp.79-111: HQ, leadership, related-business list, a one-paragraph scenario-seed hook) landed as three new fields (`hq`, `leadership`, `scenarioSeed`) on the `faction` entity type (`ensureFactionFields` in `domain/entities.js`, applied at creation and whenever an entity is retyped to faction) — a "Faction card" section in the entity inspector, shown only for faction-type entities.

### Phase 8 — Unified Discovery (complete)
- **Universal Search** (pack 23) — **Done.** A pure `domain/search.js` (`universalSearch(campaign, query)`) scans entities, journal, oracle tables (both table names and individual entries), documents (uploaded/text library + Reference Library), Party trackers, and Colony fields/crew in one pass, returning a flat, category-ordered list of `{category, label, sublabel, target}` results — `target` names a drawer plus any entity/filter/doc-tab to deep-link to, kept declarative so the domain layer never touches the DOM. `🔍 Search` in the header opens a modal overlay (`ui/searchPanel.js` for rendering); clicking a result closes the overlay and navigates straight there (selects the entity, opens the document tab, or pre-fills the Oracle drawer's own filter with the matched table).
- **Oracle table editor** (was item C) — **Done.** Each table row in the Oracle drawer gets an ✎ toggle exposing its entries as editable inputs (add/edit/remove), backed by the existing `oracles.overrides`/`tablesWithOverrides` mechanism (`domain/oracles.js`'s new `addOracleEntry`/`updateOracleEntry`/`removeOracleEntry`/`resetOracleTable` — no second data path). A "↺ Reset to default" button appears once a table actually has an override. The Oracle drawer's tree now reads through `tablesWithOverrides` too (previously it read raw `SCENE_TABLES`, so an override changed what you rolled but not what the tree displayed — fixed as part of this). **Both ready-made content additions landed**: a "Scenario Framing" oracle group (Dilemma/Objective/Framing NPCs/Map Feature, plus 5 sample dilemmas) and an "Environmental Hazards" group (25-entry Environmental Event table + a Survey Problem table) — both original content in this project's own voice, slotted into `data/tables.js`/`data/oracleGroups.js` exactly like existing `SCENE_TABLES` content.
- **Cast drawer: entity-type filter + name/tag search** — **Done.** A search box plus a row of type-filter chips (All/NPC/Location/Faction/Asset/Lore) sits above the entity list, filtering by name/tag substring and/or type; the list header shows "N of M entities" when a filter narrows the view.
- **NPC generation oracle chain** (2026-07-03 ruleset review) — **Done.** The existing "Characters" oracle group already had Role/Goal/Revealed Aspect/Disposition (and First Look); a "Name" table was added to complete the Starforged-pattern chain (rulebook pp.170-175), and `domain/session.js`'s `generateNpc(campaign, {rng})` rolls all five and creates an NPC in one action — pure/RNG-injectable like every other roll, wired to a "🎲 Generate NPC" button beside the Cast drawer's add-entity chips. `overview` gets the role/disposition/first-look composite; `revealed` (GM-only) gets the rolled aspect. **The 5PFH Patron table (Benefits/Hazards/Danger Pay) also landed**, as three new leaf tables under the existing "Missions" group (`Patron Benefit`/`Patron Hazard`/`Danger Pay Reason`) — a job-offer flavor generator distinct from the pre-existing "Patron" (who's offering) table.

Also fixed as part of this pass: the Cast drawer's entity rows were both the click target (select) and the drag source (`draggable="true"`) — for a real mouse, a few pixels of jitter between mousedown/mouseup was enough to trigger a native drag instead of a click, making selection feel broken. Dragging is now confined to a small ⠿ grip inside each row. The Relationships "Link" button is now icon-labeled (🔗 Link); the Cast drawer's entity list can be collapsed to just a header via a toggle, leaving the full inspector for more room.

### Phase 9 — Activity-driven gameplay (complete)
- **HOW workspace becomes Activity-driven** (pack 7/24, sharpened by `requirements/initial design inputs/gameplay-goals.md`'s Rules Constitution — see `docs/adr/0002-rules-constitution.md`). — **Done.** HOW keeps its free-text `summary` field (pacing notes) but gains an `activity` field (`context.how.activity`, `''` on old/fresh campaigns — no migration needed) picked from a new `Activity` <select> (`domain/activities.js`'s `ACTIVITIES`: Explore/Investigate/Negotiate/Travel/Trade/Combat/Faction dealings/Downtime/Horror/World-building). `suggestRulesLens(activityId)` looks up the Activity's gameplay area in the existing `GAMEPLAY_AREAS` table and returns its registered provider(s) — the HOW card renders these as a "Suggested Rules Lens" box (e.g. Combat → Five Parsecs From Home) with a "Use as default ▸" button that sets `settings.statRuleset` (only shown for providers with an actual character ruleset — `RULES_PROVIDERS[id].rulesetId`, new field, joins to `data/rulesets.js`'s ids; Traveller/SWN/Hostile/Planetfall/Saga Atlas itself don't get one). Suggestion only, never automatic — extends the existing per-entity ruleset selector rather than replacing it, exactly as scoped.
- **Genre packs** (was item D) — **Done.** `data/genrePacks.js`'s `GENRE_PACKS` registers three selectable oracle table sets — Hostile (sci-fi, the pre-existing default, unchanged), Cyberpunk/Shadowrun (`data/tables-cyberpunk.js`), and Fantasy/D&D-style (`data/tables-fantasy.js`), all original content in this project's own voice. A new Settings → "Genre Pack" dropdown sets `settings.genrePack` (defaults to `'hostile'`, so every pre-Phase-9 campaign is unaffected); `domain/oracles.js`'s `tablesWithOverrides(overrides, genrePackId)` picks the active pack's tables before layering the campaign's own `oracles.overrides` on top exactly as before, and every caller (`continueStory`, `rollOracle`, `generateNpc`, Universal Search, the Oracle drawer's tree and entry editor) now threads `campaign.settings.genrePack` through. The two new packs deliberately reuse the exact category names (`Characters`, `Location Themes`, `Plot Engine`, `Miscellaneous`, `Trade & Cargo`) that `copilot.js`'s suggested-oracle logic and `generateNpc`'s NPC chain reference by hardcoded path, so those features work unchanged regardless of which pack is active — only the content underneath carries genre flavor; genre packs are a data swap, not a new mechanism. Verified end to end in a browser: switching packs changes Generate NPC's name pool, the Oracle drawer's tree content, Continue Story's scene generation, and Universal Search results, all without touching anything else.

### Content addition (unphased) — Situation Engine oracle chains

`requirements/design-principles/gameplay-mechanics.md`, reconciled in
`docs/adr/0008-situation-engine.md`, turned out to already describe most of
what this repo built in Phases 2/6/8 (a GM Prompt Hierarchy = the WHAT card
+ Shift Story reducers; an "Oracle Prompt Chain" = `generateNpc`'s existing
five-table roll; "Campaign Momentum" = Session Recap + the Co-Pilot). What's
left is four small oracle-content additions — data, not a new mechanism, so
(per the same reasoning that already unblocked Phase 8's NPC chain and
hazard tables from waiting on phase order) these ship whenever authored,
not gated behind Phase 10:
- **"Salvage Investigation" chain** (`Derelicts` oracle group) — *What
  Happened* / *What Remains* / *Still Changing*, three tables turning the
  group's existing flavor tables into an actual mystery generator.
- **"Site Survey" chain** (`Exploration` oracle group) — *What's Normal* /
  *What's Strange* / *What's Dangerous* / *What's Valuable* / *What's
  Beautiful*, deliberately discovery-first (only one of five questions
  involves danger).
- **"Cargo Interest" table** (`Trade & Cargo` oracle group) — who
  unexpectedly wants this cargo and why; the concrete table ADR 0003
  gestured at ("advancing a transport Thread is a natural trigger for an
  Oracle roll") but never named.
- **"Anomaly Investigation" chain** (`Mysteries & Coverups` oracle group) —
  *Observation* / *Hypothesis* / *Contradiction* / *Discovery*.

*Effort: low* — ordinary tables rolled in sequence in the Oracle drawer,
same as most of this app's 100+ existing tables; no new domain code. A
one-click "Generate Salvage Site"-style composite action (mirroring
`generateNpc`) is a plausible low-effort follow-on once the tables exist,
not a prerequisite. See ADR 0008 for what this reconciliation explicitly
declined (an Expedition four-dial tracker, structured Diplomacy fields, a
Discovery-classification field, a Noncombat-approach taxonomy, and a
mechanized session-composition budget) and why.

### Phase 10 — Ecosystem & reach (lowest priority per pack 66 — "new features")

- **Trade & Logistics minigame / Merchant Rules Lens** (user-requested,
  2026-07-03; see `docs/adr/0003-trade-logistics.md` for the mechanics and
  **`docs/adr/0004-merchant-rules-lens.md`** for the framing, after three
  further design documents — `requirements/Saga_Atlas_Merchant_*.txt` —
  asked to be incorporated and consolidated). — **Done** (the concrete,
  buildable slice ADR 0004 scoped — "a contract is a Thread with a patron/
  type/route/payout, generated from a new Oracle table," not the full
  Merchant vision). `data/commodities.js` (a flat, genre-swappable goods
  list) + `domain/trade.js` (a Location's `market` — per-commodity
  `{supply, demand}` dials — and `priceAt()`, pure and stateless;
  `buyCommodity()`/`sellCommodity()` move goods into/out of the party's
  shared cargo manifest and nudge the local supply dial the direction a
  real transaction would, so two Locations' prices are never forced to
  agree) is the pricing engine; `createContract()`/`generateContract()` sit
  on top of it as ADR 0004 specified — a contract is `campaign.threads`'
  ordinary Thread shape plus `kind: 'contract'`/`type`/`patronId`/
  `originId`/`destinationId`/`payout`, so every existing thread control
  (clock, 7-state lifecycle, priority) works on one completely unchanged,
  with zero new state-machine code. A new "Contract Type" oracle table
  (Trade & Cargo group, ADR 0004's 15-type taxonomy) is what "🎲 Generate"
  rolls; payout prices itself from the real gap between two Locations'
  markets for a chosen commodity when a route is picked (falls back to a
  flat default otherwise, GM-editable). Cargo capacity is one more field on
  the existing Vehicle Bestiary template (`data/statblockTemplates.js`),
  not a new entity concept. UI: a new `trade` drawer tab (between Colony
  and Docs, following the Party/Colony/Guide precedent exactly) — a market
  view per selected Location, the cargo manifest, and a Contract board with
  an inline "+ Contract" name/type/patron/route/payout form (a text field,
  not a `window.prompt()` popup, matching the convention Party Trackers
  already established). Everything ADR 0004 explicitly deferred (ships/
  crew depth, faction politics/espionage, the 19-generator list beyond
  what's named, GM-less/VTT modes) stays deferred — see the ADR.
  **ADR 0004 reframes the headline loop as contracts, not commodity
  speculation** ("Key Innovation: replace buy-low/sell-high with living
  contracts") — a contract is a Thread with a few extra reference fields
  (`patronId`/`originId`/`destinationId`/`type`/`payout`), generated by
  rolling a new "Contract Type" Oracle table (Humanitarian/Corporate/
  Scientific/Military/Exploration/Diplomatic/Smuggling/Courier/Passenger/
  Recovery/Colonization/Mining/Research/Emergency/Escort), with `payout`
  priced by the same `priceAt()` this section already specifies. Everything
  below is unchanged; the contract layer sits on top of it, not instead.
  **A concrete complication hook for that contract layer** — the "Cargo
  Interest" oracle table (who unexpectedly wants this cargo, and why) —
  landed as one of the unphased Situation Engine content additions above
  (ADR 0008), rather than waiting for this phase.
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
- **Mission/Job generator — new `domain/missions.js`** (2026-07-03 ruleset review; user priority: "robust missions with balanced risk vs reward"). — **Done.** Borrows Hostile Crew Expendable's cargo-job formula and 5PFH's danger-tier-scaled Deployment Conditions, reduced to a single pure function since this app has no travel-distance mechanic of its own: `generateMission(campaign, { danger })` returns `{payout, deadlineDays, complication, penalty}`, with `danger` defaulting to the existing `context.what.threat` Narrative Tracker so higher ambient threat produces higher-stakes, higher-payout, tighter-deadline missions automatically — risk and reward move together instead of being hand-tuned per mission. The complication rolls from the existing Miscellaneous → Story Complication oracle table (no new table). A "🎲 Generate Mission" button in the Journal drawer rolls one straight into a Journal note (`formatMission()`) — distinct from a Trade contract (ADR 0004), since a mission has no route/patron/commodity, just payout math.
- **Faction Pressure Track — extend `domain/threads.js`'s clock onto faction entities** (2026-07-03 ruleset review; user priority: "deep faction... creation"). — **Done**, via the same pattern Contracts (ADR 0004) already established rather than a second implementation: a faction's pressure track is a Thread tagged `kind: 'faction-pressure'` plus a `factionId` reference (`domain/factions.js`'s `createPressureTrack`/`getPressureTrack`), so every existing Thread mutator (clock, 7-state lifecycle, priority) works on one completely unchanged. Opt-in per faction (a "+ Pressure Track" button in the Faction card) rather than auto-created, so a faction nobody's tracking doesn't clutter the WHY question's thread list. A free-text `agenda` field (Hostile Colony Builder's Stability/Instability ladder and 5PFH's Power/Influence/Faction Activity table both reduce to "a filling clock plus GM-set flavor") and a new "Faction Activity" oracle table (Corporate Powers group — a D100-style table reduced to this app's usual rollable-array convention) round out the card. **Reconciled against `gameplay-mechanics.md`'s four-dial Influence/Resources/Patience/Agenda-Progress proposal (ADR 0008)**: kept the single-clock design, exactly as scoped — no concrete mechanic yet distinguishes the four named dials from one pressure clock. Building this surfaced and fixed a real bug: `copilot.js`'s "hot thread" check read `campaign.threads` unfiltered, so a near-full Contract or Faction Pressure Track (both stored in that same array) got flagged using the wrong generic thread-name phrasing instead of their own subsystem's message — fixed by excluding any thread carrying a `kind` tag from that check.
- **Faction Rumor → Mission seed link in `copilot.js`** (2026-07-03 ruleset review) — **Done**, now that both items above exist. Starforged frames Faction Rumors explicitly as vow/mission seeds (reference guide p.79); `advise()` surfaces a faction whose pressure track is ≥75% full as "a mission tied to them would land naturally now," ranked just below a hot ordinary thread — the same "one more push" signal `threadUnderPressure()` already gives ordinary threads, in the same `observation` field. This is what turns faction depth and mission depth into a loop instead of two static features.
- **Shipyard companion link** (item E's remainder) — blocked on a known official URL, not effort.
- **Plugin-style rules-lens registration** — the Constitution's long-horizon "Ecosystem" milestone; not worth building until Phase 9 proves the Activity→Lens pattern with the two rulesets already shipped.
- **Sync adapter / Crew Log shared database** (was item F). Persistence is one module with a narrow interface, so this stays an *adapter*, not a rewrite, whenever it's prioritized.
- **Rules Constitution data for Traveller and Stars Without Number** — both are named providers in `rulesConstitution.js` with zero authored content today (both `status: 'not yet integrated'`, updated from the older `'reference only'` wording once the 2026-07-03 ruleset review confirmed neither has a source PDF in this repo's library at all). Sector generation and faction turns (SWN) and trade/vehicle/NPC tables (Traveller) are genuinely new data-authoring work, not a UI feature — lowest priority per pack 66, and gated on Phase 9 existing first (no point authoring provider data before there's an Activity system to serve it), *and* on the actual sourcebooks being added to `assets/docs/` if the intent is to transcribe them rather than author originals.
- **"Services to automate"** (`requirements/initial design inputs/gameplay-goals.md`): faction turns, rumors, and reminders don't have a home yet (automated trade and faction pressure now have concrete designs above) — they map onto the original Constitution's Living World Engine (pack 38) and Scenario Engine (pack 36), both long-horizon. Heat/consequences/timers overlap with Phase 6's Narrative Trackers item instead of needing new scope here.

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

`requirements/initial design inputs/gameplay-goals.md`'s Rules Constitution (see
`docs/adr/0002-rules-constitution.md`) is recorded as **reference data
only** (`src/data/rulesConstitution.js`, surfaced read-only in Settings) —
not yet built: the actual Activity → Rules Lens recommender (Phase 9), and
any Traveller/Stars Without Number mechanics content (both named providers
with zero authored data today). Neither jumps the priority order; this
document sharpened what Phase 9 will consume, not when it happens.

---

## UI/UX assumptions worth re-confirming (2026-07-03 review)

While revising the roadmap above, a few gaps surfaced between what the
*founding* design brief (`requirements/initial design inputs/SagaAtlas-Design-Recommendations.md`,
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
