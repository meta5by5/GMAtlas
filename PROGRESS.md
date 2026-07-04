# GMAtlas Progress

## Overview
This document tracks phase-level roadmap and current progress for the GMAtlas project (rebranded from Saga Atlas).

## Status Summary
- Core: Single-versioned campaign document, store, migration — Done
- Import persistence across builds — Done (runtime injection + store.load)
- Document mentions and linking — Done
- Statblock parsing and inspector badges — Done
- UI: per-campaign default stat system setting — Done (Settings selector + source rulebook references)
- Journal inline entity stat badges — Done (renders badges when mentions present)
- Phase 4: Document Library — Done. `assets/docs/` auto-scanned at build time into a Reference Library (`src/data/docsManifest.js`, gitignored/regenerated); real file uploads (data URL) alongside text notes.
- Phase 4: Character Sheets — Done. `makeStatblock('character', rulesetId)` builds a full ruleset-driven sheet (stat pills + resource tracks, all rollable via the existing d6-vs-2d10 engine); switchable between Starforged/5PFH per entity from the statblock header. Superseded the old text-only "Insert Stats" quick-insert.
- Companion tools: Crew Link new-tab link in Settings — Done (E from the roadmap, partial: no Shipyard link yet, no known URL to point it at)
- Phase 5 (design review pass, see USER NOTES/ISSUES below) — Done. Party, Colony, Guide drawers; Settings-editable Bestiary statblock templates with per-NPC template selection; grouped/collapsible/searchable Oracle tree; Document Library multi-upload/tags/search/rename/in-app PDF viewer; editable relationship notes; all three reported bugs fixed.
- Design Constitution review — Done. Read and digested all 77 `requirements/design-principles-pack-*.md` documents (a much larger long-range vision than anything built so far), reconciled against the current architecture, and recorded the reconciliation as `docs/adr/0001-adopt-design-constitution.md`. `CLAUDE.md` now cites the Constitution's ten Articles and carries a terminology map; `DESIGN-NEW-FUNCTIONALITY.md`'s "Proposed next" section is reordered using the Constitution's own backlog-prioritization framework (pack 66: continuity > workflow > Context Graph > storage > recommendations > UX > integrations > new features). See the "DESIGN CONSTITUTION REVIEW" section below for the full findings.
- Phase 5 browser audit — Done (2026-07-03). Every Phase 5 feature was launched in a real Chromium instance (Playwright) and driven end to end — see "PHASE 5 AUDIT" below. Everything held up except one confirmed bug, now fixed.
- Statblock redesign — Done (2026-07-03, follow-up from an annotated screenshot). `entity.statblock` (singular) → `entity.statblocks[]`: multiple rulesets/templates coexist per entity (add is additive, never a replace; each group removes independently). Per-field rename/format-toggle/remove controls removed from the entity view — a field's name/kind is template-driven now, edited only in Settings; ad-hoc fields are named via a prompt at creation instead. Browser-verified with Playwright (3+ simultaneous groups, no leftover per-field controls, track-set/roll/add-field/remove-group all functional, zero console errors).
- Statblock polish round 2 — Done (2026-07-03, same-day follow-up). Bestiary made an explicit NPC subtype (statblock add-choices scoped by entity type: Character/Bestiary → npc only, Vehicle → asset only, nothing for Faction/Location/Lore); attribute/stat fields (Edge, Combat, ...) redesigned from a 1-5 click-to-set meter to a single signed number with +/- steppers, matching how Starforged/5PFH sheets actually present a stat (`domain/statblocks.js` `stepStatblockFieldValue`, `ui/drawers/index.js` `attrRow`); the statblock "+ Add" chip row now collapses behind a ⚙ gear toggle. Browser-verified (0 track-boxes inside attribute rows, entity-type gating confirmed for npc/asset/faction).
- Phase 6 begun — Done (2026-07-03). Session Recap ("Previously on...", `domain/recap.js`) ships in the Journal drawer: one click composes last-time journal entries, open threads, objective, relevant entities, pressure, and a Co-Pilot recommendation, all read-only, with an explicit "Save as Journal note" action that excludes prior recaps from their own recap. Browser-verified end to end.
- Rules Constitution adopted — Done (2026-07-03). `requirements/gameplay-goals.md` (a saved ChatGPT discussion — the share link itself isn't fetchable, client-rendered) sharpened "genre-aware, not genre-locked" into a concrete claim: every ruleset is a content provider, not the application. Recorded as data (`src/data/rulesConstitution.js`: six named systems — Starforged, Traveller, Five Parsecs From Home, Hostile, Stars Without Number, Planetfall — mapped to gameplay areas, plus four responsibilities reserved for Saga Atlas itself) and surfaced read-only in Settings. Reconciled in `docs/adr/0002-rules-constitution.md`: this is reference data for Phase 9 to consume, not a new engine built ahead of the priority order — doesn't reorder the roadmap below.
- Attribute field format affix moved inside the input — Done (2026-07-03). The sign (`+3`)/inches (`3"`) display affix from the "ATTRIBUTE FIELD REDESIGN" entry below used to render as a separate `<span class="attr-affix">` beside the `<input>`; a user follow-up flagged that as non-standard/confusing versus how a real character sheet shows a modifier written right on the value. `attrRow` (`src/ui/drawers/index.js`) now renders `formatAttrValue(value, format)` as the input's own text (so the box literally reads `+3` or `3"`), and `.attr-affix`/`.attr-val-wrap` were removed from `styles/cockpit.css` as dead CSS. Purely cosmetic: `setStatblockAttributeValue` (`domain/statblocks.js`) already stripped non-digit/non-minus characters before storing, so the stored value and any dice roll were never affected, and still aren't. Browser-verified with Playwright: input displays `+1`, editing to `5` and tabbing away re-renders `+5`, and the roll-trigger label correctly computed `d6 + 5 vs 2d10` — the format string never leaks into the roll. Zero console errors. 113 tests still passing (unchanged — this was UI-only, no domain-layer behavior changed).
- Trade & Logistics minigame — designed, not yet built (2026-07-03, user-requested). Full design in `DESIGN-NEW-FUNCTIONALITY.md`'s Phase 10 and `docs/adr/0003-trade-logistics.md`: supply/demand markets per Location, buy/sell against a live price derived from each market's supply/demand dials, transport modeled as a Thread, route risk resolved via existing Oracle/Co-Pilot rather than a new engine. Placed in Phase 10 (not reordered ahead of Phase 6-9) per the pack-66 continuity-first priority framework already recorded in `docs/adr/0001`/`0002` — see the ADR's "Alternatives Considered" for why an earlier phase was rejected.
- Ruleset library review (faction/NPC/mission/non-combat design pass) — Done (2026-07-03, user-requested). Read the actual rulebook PDFs in `assets/docs/` (Starforged rulebook + reference guide + Starsmith oracle expansions; Five Parsecs From Home core + Compendium + Planetfall; the 12-file Hostile line) against the four named priorities — deep faction creation, deep NPC creation, risk/reward-balanced missions, non-combat options — with concrete page/chapter pointers per system. Confirmed and fixed a real data-integrity gap: `rulesConstitution.js`'s Traveller entry claimed "Bundled reference PDFs only," but no Traveller (or Stars Without Number) sourcebook exists anywhere in `assets/docs/` — the note now says so honestly (`status: 'not yet integrated'`). Ten concrete design suggestions produced, biased toward the stated priorities: a Faction Pressure Track reusing `threads.js`'s clock model, a structured faction-card template, a Starforged-style NPC oracle chain, a new `domain/missions.js` job/payout generator (the single best-supported gap — nothing today generates a job with payout math), a genre-neutral "Scenario Dilemma" oracle group, an Environmental Hazard oracle-table addition (cheapest win), a relationship/Bond progress track extending `entities.js`'s `{to, label}` edges, and a Stress/Tension Narrative Tracker alongside threat/mystery/resources/reputation. None implemented yet — this was a design-suggestions pass, not a build; see chat history for the full per-system source breakdown and page references.
- Document upload silent-vanishing bug found and fixed — Done (2026-07-03, user-reported: uploaded SWN/CWN rulebook PDFs never appeared). Root cause: the Documents drawer's "Upload file(s)" control embeds a file as a base64 data URL directly inside the single localStorage-persisted campaign document; `store.js`'s `persist()` only `console.warn`ed on a quota error instead of surfacing it, so a large PDF (SWN/CWN core books are tens of MB, like the ones already in `assets/docs/`) looked like it uploaded and then silently disappeared on the next reload — no repo file was ever missing, since real uploads never touch the filesystem. Two-part fix: `store.js`'s `update()` now rolls the in-memory doc back to the last-known-good state and re-throws on a persist failure (never leaves an unpersisted "phantom" change sitting in memory — Article VIII, campaign data is sacred); `ui/shell.js`'s upload handler now rejects anything over 5MB *before* attempting to read it, with a toast pointing at `assets/docs/` (the Reference Library path, which has no such limit and is where the other 21 large rulebooks already live) as the correct place for rulebook-sized PDFs. Browser-verified with Playwright: a 6MB dummy file is rejected with a clear message and never enters the library; zero console errors. **The actual SWN/CWN files still need to be located/re-added** — searched this repo, the sibling `saga-atlas_claude` archive copy, and common folders (Downloads/Desktop/Documents) with no match; see the open item below.
- Multi-tab PDF viewer — Done (2026-07-03, user-requested; this is old v0.53 functionality being rebuilt, not new scope — `migrate.js` already carried a legacy `sagaAtlasPdfOpenTabs` key into `documents.openTabs`, which sat unused until now). The single-document `docViewer` ephemeral variable in `shell.js` is gone; open documents are now a persisted list (`campaign.documents.openTabs` + `activeTab`, `domain/documents.js`'s `openDocumentTab`/`closeDocumentTab`/`setActiveDocumentTab`/`resolveDocumentTab`), rendered as a tab strip (one tab per open PDF, click to switch, ✕ to close) above the iframe. A tab whose file failed to save (the bug above, or an old campaign predating the fix) shows an inline explanatory message instead of a blank iframe. Browser-verified: 2 tabs open and switch correctly, closing one leaves the other, zero console errors.
- Reference Library rename/tag + compact tag editor — Done (2026-07-03, user-requested). Bundled `assets/docs/` entries (Reference Library) previously had no rename or tag ability at all — `campaign.documents.refOverrides` is a new persisted overlay keyed by each entry's stable manifest file path (same "don't touch the generated data, layer an override on top" pattern `oracles.overrides` already uses), giving Reference Library rows a rename (`renameRefDocument`) and tags (`addRefDocumentTag`/`removeRefDocumentTag`) without touching `docsManifest.js` itself. Both library and Reference Library cards now show a 🏷 tag-toggle icon to the left of the ✎ rename icon; the tag editor (chips + add box) is collapsed by default and only renders when toggled open (`ui.docTagEditorOpen`, ephemeral), and the chips themselves are smaller (0.65rem font, tighter padding) than a regular filter chip — a quieter footprint "for the record" per the request. Browser-verified: rename updates the display title in place, tag toggle is closed by default, opens on click, and a newly added tag renders as a compact chip. Zero console errors. 116 tests passing (includes 3 from concurrent entity-tag-vocabulary work, unrelated to this round).

## Next / To-do
Reordered per the Design Constitution review (pack 66's priority framework — see below). Full detail and rationale for each item lives in `DESIGN-NEW-FUNCTIONALITY.md`'s "Proposed next" section. Revised 2026-07-03 to fold in the ruleset library review's 10 design suggestions, sorted by *what each one actually is* rather than dumped in as one list — a faction-card-template and a relationship weight are Phase 7 entity depth, two oracle-table content additions and an NPC-generation oracle chain are Phase 8 content that doesn't need to wait on anything, a Stress/Tension tracker reopens a specific Phase 6 item that was deliberately left open, and only the three genuinely new mechanisms (a mission/job generator, a faction pressure track, and the Co-Pilot link between them) landed in Phase 10 alongside Trade & Logistics. Full reasoning in `DESIGN-NEW-FUNCTIONALITY.md`.

- **Phase 6 — Campaign Continuity** (complete, one candidate reopened): session recap, 7-state Thread lifecycle, "what did I overlook?", and Resources/Reputation Narrative Trackers are all **done**. Reopened: a **Stress/Tension** dial (2026-07-03 ruleset review, drawn from Hostile's horror-design material) as a fifth `context.what` dial, same shape as Resources/Reputation. *Effort: low.*
- **Phase 7 — Context Graph depth** (in progress): tag fields as dropdowns with a per-entity-type vocabulary — **done**. Still open: `@` pointers into documents with page anchors (item A remainder); typed/weighted relationships (today `{to, label}` only) — now explicitly scoped to include a Starforged-style Bond **strength/stage weight** (2026-07-03 ruleset review) as one of those weight fields, not separate scope; "flag, don't delete" invalid relationships (pack 9); a **Faction card template** (HQ/leadership/scenario-seed fields, 2026-07-03 ruleset review) as an entity-depth addition.
- **Phase 8 — Unified Discovery**: Universal Search across entities/journal/oracles/documents/Party/Colony (pack 23); an oracle table *entry* editor (item C — grouping/search/collapse is done, editing entries is not; two ready-made content additions — a Scenario Dilemma oracle group and an Environmental Hazard table, both 2026-07-03 ruleset review — don't need to wait for it); Cast drawer entity-type filter + name/tag search (from the second USER NOTES batch); an **NPC-generation oracle chain** (Starforged Role/Goal/Aspect/Disposition, 2026-07-03 ruleset review) plus a one-click "Generate NPC" action — also content-only, doesn't need the editor first.
- **Phase 9 — Activity-driven gameplay**: HOW workspace becomes Activity → Rules Lens driven (pack 7/24, now backed by the Rules Constitution reference — `src/data/rulesConstitution.js`) instead of free text; genre packs (item D).
- **Phase 10 — Ecosystem & reach** (lowest priority — "new features" ranked last): **Trade & Logistics minigame** (user-requested 2026-07-03, `docs/adr/0003-trade-logistics.md` — supply/demand-driven buy/sell/transport across Locations, new `data/commodities.js` + `domain/trade.js`, transport modeled as a Thread, reusing Oracle/Co-Pilot for route risk); a new **Mission/Job generator** (`domain/missions.js`, 2026-07-03 ruleset review — payout math scaled by the existing threat tracker, the single best-supported gap the review found); a **Faction Pressure Track** (extends `threads.js`'s clock onto faction entities, 2026-07-03 ruleset review) plus a Co-Pilot link tying faction pressure to generated missions once both exist; Shipyard companion link (item E remainder, blocked on a known URL not effort); sync adapter / Crew Log shared database (item F); Traveller/Stars Without Number mechanics content (both named Rules Constitution providers with zero authored data today, and — per the 2026-07-03 ruleset review below — neither has a source PDF in this repo's library at all); faction-turn/rumor automation ("services to automate," maps onto the original Constitution's Living World Engine/Scenario Engine, packs 36/38).
- **UI/UX assumptions flagged for explicit confirmation** (2026-07-03, see `DESIGN-NEW-FUNCTIONALITY.md`'s new section): only one drawer opens at a time versus the founding brief's "drawers stack, side by side"; one responsive breakpoint instead of the specced desktop/tablet/phone three-way split; no keyboard shortcuts/command palette; no in-session undo beyond a one-slot backup key; toasts are single-slot and can clobber each other during multi-file upload; drag-and-drop (the primary linking interaction) has no confirmed touch equivalent; icon-only buttons (🏷 ✎ ✕ ⚙ 🗑) rely on hover tooltips that don't fire on touch; PWA installability hasn't been checked against a concrete checklist since Phase 0. None of these are scheduled — each is a product decision to make explicitly, not an obvious bug.

## Notes
- Stat templates inserted by the inspector are created via `setEntityStatsTemplate()` (domain/entities.js).
- Inline journal badges render parsed Stats from mentioned entities' statblocks.

## USER NOTES [completed]

Notes for Phase 4 checkpoint...
Recheck phases 2-3d and redesign if needed. Most of that functionality is not finished. See below.

Because this is the first real design review in this VSCode / Claude approach, read GMAtlas-requirements.md to follow the journey thus far.

CURRENT BUGS
- When opening in a browser to test, it works from file:// but gives a blank screen for github. 
- When opening from VSCode Live Server in http://127.0.0.1:5500/index.html it fails to retain content upon page refresh.
- The document library doesn't read the files in the /assets/docs folder nor does it pop up a file explorer window to select a file for addition.

DESIGN CLARIFICATIONS
Read through code archive /SagaAtlas-ChatGPT.zip and note the functionality missing from v4.0
- Party tab that has trackers for various party resources; list of active party members with the #character tag.
- Colony tab that is a tracking sheet for 5PFH Planetfall
- Oracles tab grouping and sub-grouping (and collapsing groups) of random tables; Search capability; 
- Guide tab that is used as a central table of contents for links from PDFs for centralized quick access.
- Documents that upload files and multi-select upload files; allow rename of the label of the file for readability; add tags to the files; search files by name and tag
- Entities that allow drag-drop from the library to the active entity to create relationships; notes about the relationships
- statblocks stored in Settings with sorting, ruleset association, and calculation method that are then displayed on entities flagged as NPCs (note: 
    - I would like this to use the future-state design approach ChatGPT proposed about stats, rulesets, and entities. 
    - Also I would like NPC entities to be able to check a flag on the entity sheet which statblock to include so that a Bestiary can be defined that applies the rule system most likely to be used for that creature. 
    - within the settings for statblocks each should have an option for gamesystem, field type (such ass starforged stat roll, 5pfh attribute roll, D&D d4 through d100 rolls, and other game systems in the library), and sorting like indicated in the SagaAtlas code)
    statblock fields should be displayed by default as defined by the PC field in settings if the entity selects the tag #character. 
    The stat fields for attributes should only have the label and number, and be shaped per the picture/example uploaded. 
    The classification as an attribute vs progress bar should be set in settings.   
        
the document library should open each PDF file in an iframe over the left and middle sections adjacent left to the document library window, not into a separate window. The user experience should incorporate everything into one place. 
Each doc entry should have 
- a link on the name that opens it instead of an open button. 
- File info is not needed on display, but 
- an edit button should be added that allows renaming the entry (not the file itself). 

## ISSUES / FINDINGS (design review following USER NOTES)

**Status: implemented in Phase 5** (see buildInfo.js / DESIGN-NEW-FUNCTIONALITY.md item
10). All three bugs and all six design-clarification items below were built —
including the one open question (the picture at `assets/sample-statblock-field.png`,
which is the "EDGE +3" reference the attribute-badge formatting now matches). Findings
below are kept verbatim as the research record; treat them as history, not an open
punch list.

Investigated by reading `ChatGPT history.md`, `SagaAtlas-Design-Recommendations.md`,
`DESIGN-NEW-FUNCTIONALITY.md`, `README.md`, extracting `SagaAtlas-ChatGPT.zip` (the
old pre-rebrand "Hostile Sci-fi Worldbuilder" codebase referenced in CLAUDE.md), and
reading the current `src/` for each of the three CURRENT BUGS and six DESIGN
CLARIFICATIONS items. Findings below are verified against the current repo, not just
reported secondhand — where the research pass turned up a false lead it's noted and
corrected.

### Bug root causes

**A — blank screen on GitHub, works on `file://`.** `index.html` loads the app via a
single `<script src="./dist/app.bundle.js">`, but `dist/` is gitignored
(`.gitignore:2`) and there is no `.github/workflows/` in the repo — confirmed, no
workflow files exist. A plain GitHub Pages deploy of the committed tree simply doesn't
have `dist/app.bundle.js`; `#app` stays empty. Fix is either committing the built
bundle or adding a Pages workflow that runs `node scripts/build.js` before deploy.

**B — Live Server (`127.0.0.1:5500`) doesn't retain content across refresh.**
`src/core/store.js` itself is origin-agnostic and not the cause. Root cause is
`sw.js`: it registers only under `http(s)` (`src/main.js:13-14`,
`location.protocol.startsWith('http')` — never true under `file://`, which is why this
only shows up over Live Server), and does cache-first fetching of `index.html` and
`dist/app.bundle.js` under a static, never-bumped cache name (`sw.js:5`,
`CACHE = 'saga-atlas-v0'`). Once installed, every reload — including after a rebuild —
keeps serving the bundle/shell that existed at install time, so edits appear to "not
stick." Also note `127.0.0.1` and `localhost` are different storage origins, so
switching between them would independently look like lost data. Fix: bump `CACHE` per
build (e.g. derive from `buildInfo.js`), or unregister the SW / hard-reload when
testing via Live Server, or use network-first for the shell during development.

**C — Document library doesn't read `/assets/docs`; no native file picker.**
Mechanism is correctly wired in current source: `scripts/build.js` scans
`assets/docs/` into `src/data/docsManifest.js` (gitignored, build-only) before
bundling, and `src/ui/drawers/index.js:429-432` renders a "Reference Library" section
gated on `DOCS_MANIFEST.length`. (One reported issue — a malformed `<\div>` closing tag
— was checked directly and does **not** exist in the file; that lead was a false
positive, disregard it.) The far more likely explanation for both symptoms is the
same stale-bundle/stale-SW-cache problem as Bug B — `dist/` is gitignored and easy to
forget to rebuild, which is exactly the footgun CLAUDE.md's bundler section already
warns about. **Before changing any code here, rebuild (`npm run build`) and hard-reload
with the SW unregistered (or test in an incognito window) and re-check.** Two real gaps
found independent of that: the upload `<input type="file" data-doc-upload hidden>`
(`src/ui/drawers/index.js:422`) has no `multiple` attribute, so multi-select upload
isn't implemented yet; and uploaded files are stored as base64 data URLs inline in the
campaign JSON (`src/domain/documents.js`), which will make `store.export()` balloon and
should be reconsidered before multi-upload lands (see storage note below).

### Design clarifications — status against old code and current repo

None of the six items below are pre-scoped anywhere in `DESIGN-NEW-FUNCTIONALITY.md`'s
ranked backlog (A–F) — they're net-new asks from these USER NOTES, not de-scoped work
resurfacing. `SagaAtlas-Design-Recommendations.md` is a synthesis of `ChatGPT
history.md` (which itself is just a list of unfetchable `chatgpt.com/share/...` links)
and is architecture-level, already absorbed into CLAUDE.md — it doesn't cover any of
these six features directly.

1. **Party tab.** Old code (`js/sagaatlas_v0_40_entity_templates.js`) modeled party
   members as plain NPC entities tagged `#character` (no separate data structure),
   rendered as cards showing each member's compact stat block. A separate, coexisting
   layer (`mission_control_v0510.js`) held free-form party-wide resource
   trackers/timers/conditions not tied to any entity. Reimplementation should keep both:
   an entity filter view (NPC + `#character`) plus a small set of party-wide trackers.
   Nothing like this exists in the current repo yet.

2. **Colony tab (5PFH Planetfall).** Old code (`story_director_dashboard.js`) had a
   flat key/value stat sheet matching the Planetfall turn sheet (campaign turn,
   morale, integrity, build/research points, story points, etc. — full field list
   recoverable from the archive if needed), plus a `#Lifeform`-tagged entity filter
   view and an entity-referencing crew roster table. Not started in the current repo;
   would be a new ruleset-specific data module, consistent with "genre-aware, not
   genre-locked."

3. **Oracle grouping/collapsing/search.** Old code (`oracle_editor_scene_patch.js`)
   used a static two-level category manifest over the existing table keys, recursive
   native `<details>` elements for arbitrary-depth grouping (collapse/expand free from
   the browser), and a recursive substring filter that force-opens matching branches.
   This maps cleanly onto `domain/oracles.js`'s existing `SCENE_TABLES` shape and the
   already-present `oracles.overrides` field (DESIGN-NEW-FUNCTIONALITY.md item C) — but
   item C as currently scoped only covers entry editing, not grouping/search, so this
   is additional scope, not a redefinition.

4. **Guide tab.** Old code was strikingly simple: one sanitized `contenteditable`
   rich-text field (`state.documentGuideHtml`) with a basic formatting toolbar and
   inline image upload, using the convention `@filename.pdf p.44` as a page-anchored
   link into the document viewer. This is nearly free to build on the current repo's
   existing `@mention`/document infrastructure (`src/domain/documents.js`) plus one new
   rich-text field — no new data model needed beyond a single HTML string.

5. **Documents — multi-upload, rename, tags, search.** Old code stored PDF blobs in
   IndexedDB separately from the JSON campaign state, with only lightweight metadata
   (`{id, name, size, tags, fingerprint}`) in the document; the current repo instead
   embeds uploads as base64 data URLs inside the campaign JSON, which won't scale once
   multi-upload lands (see Bug C notes) — worth reconsidering the storage split before
   building this out. Rename-the-label-not-the-file, name-as-link, and file-info-hidden
   were all already deliberate choices in the old app (`app.js` comment: "URLs/paths
   are intentionally hidden in the compact Documents list") and match what USER NOTES
   asks for now — i.e. these are restorations of a prior explicit decision, not new
   ideas. Tags used a datalist/chip-based add+remove UI with an AND-filter chip row;
   worth reusing that pattern. Note the PDF-viewer-as-iframe request here does **not**
   conflict with the "companion tools must be new-tab, never iframe" rule elsewhere in
   this doc — that rule was specifically about third-party crew-builder tools (Android
   failure mode), not in-app PDF viewing.

6. **Entity relationships — drag-drop + notes.** Current repo already has drag-and-drop
   entity↔entity linking (`src/ui/shell.js:351`, `addRelationship(d, entityId,
   targetId, 'linked')`) and a dropdown Link control that accepts an optional label at
   creation time (`src/ui/shell.js:138`). Verified gap: relationship labels are
   rendered read-only after creation (`src/ui/drawers/index.js:63`, `(${esc(r.label)})`
   in a chip) and drag-and-drop always hardcodes the label to `'linked'` with no note
   prompt — there is no way to add or edit a free-text relationship description after
   the fact. This is the concrete piece to add: an editable note per relationship,
   matching `entity.relationships[]` in the old code (`{id, description}`) more closely
   than the current `{to, label}` shape's read-only label.

7. **Statblocks/rulesets/entities "future-state design."** Old code
   (`sagaatlas_v0_40_entity_templates.js`) had a full field-manifest engine living in
   Settings: per-system (`Starforged`/`5PFH`/extensible) field lists, each field
   carrying `rollMethod` (calculation method: none / starforged d6+stat-vs-2d10 /
   d6+attribute-vs-target6, extensible to d4–d100), `side`/`row`/`order` (sorting/
   layout), and `visible`/`visibleInCrew` (full sheet vs. compact crew-snapshot
   rendering) — edited live via a Settings UI with Add Field/Reset Templates. Values
   were stored per-entity per-system (`entity.systemStats[system][key]`) so switching
   or holding multiple systems never collides. Current repo's `src/data/rulesets.js`
   (`RULESETS`, `findRuleset(id)`) is a much simpler, partially-modernized version of
   this same idea — two hardcoded rulesets, no Settings editing UI, no per-field
   side/row/order, no roll-method choice beyond what's hardcoded. **Genuine gap not
   present even in the old code:** a per-NPC flag to pick *one* statblock/system to
   apply (old code always rendered every enabled system on any `#character` entity) —
   this needs a new field such as `entity.statblockSystem`, layered on top of the
   existing field-manifest structure, to support a Bestiary that assigns the right
   ruleset per creature. The "attribute vs. progress bar" classification the user
   wants is also not present in the old code as an explicit toggle; closest analog is
   `rollMethod:'none'` fields reading as trackers vs. rollable fields reading as
   attributes — would need to become an explicit `kind` field per the ask.

### Open question

The picture/example referenced for "shaped per the picture/example uploaded" (stat
field label+number layout) was not found anywhere in the repo, the requirements doc,
or the archive — if one exists it wasn't attached/committed where this review could
find it. Worth confirming where that reference lives before implementing the attribute
field layout.

## USER NOTES [completed]

- design docs moved to /requirements folder.
- open PDF viewer needs an X close option to remove the window and return to the previous view.
- The Cast window needs to have filters for the different entity types. Replace the button functionality for create new with a filter for the entity type of the button. 
- Add a search filter to Cast that filters on entity type, name and tags
- have all tag fields be dropdowns to add additional tags. Show any tags that are used by others of that entity type in the dropdown list. If a new freeform tag is created, add it to the list going forward for others of the same entity type. If a tag is remvoed from an entity and doesn't exist on other entities of that type, then remove it from dropdowns (i.e. remove it from the database of tags for the entity type).
-change the design of stat fields to only have the label and the value field. The stat doesn't need the ability to change format or be deleted. That is managed within the Settings.
- update the settings for statblocks to include the entity type as one of the attributes. Then only allow those statblock groups to be available for addition on the entity of the corresponding type.
- Allow multiple statblock types to be enabled for an entity. 
- Apply the sort order for statblock groups as defined in the settings. Each statblock group should occupy its own row. Multiple statblock groups need to be on separate rows.
- apply the prinicple suggested in the requirements about "everything is an entity"
- the who-what-etc fields for the scene need to display the selected results for their part in the story. Follow the legacy requirements and model the original functionality that works in the legacy SagaAtlas app. That working functionality should be in this version.
- The "Who is here" needs to have the selection of entities to add to the scene. The same goes for other scene elements (who-what-etc). It needs the dynamic story generation that the SagaAtlas aspired to form the ChatGPT legacy.

## DESIGN CONSTITUTION REVIEW (all 77 `requirements/design-principles-pack-*.md`)

Read and digested in full (four parallel passes, ~20 packs each) and reconciled
against the current codebase. Full reasoning and specific decisions are in
`docs/adr/0001-adopt-design-constitution.md`; `CLAUDE.md` now carries the ten
governing Articles (pack 50) and a terminology map; `DESIGN-NEW-FUNCTIONALITY.md`'s
backlog is reordered using the Constitution's own prioritization framework (pack
66). This section is the review's own findings record — not duplicated elsewhere.

**Headline finding:** the corpus describes a mature end-state product (its own
pack 39 "Level 4–5" on a 6-level maturity ladder) — named engines (Storage
Kernel, Context Graph, Story Engine, Decision Engine, Campaign Intelligence
Engine, Activity Engine, Event Bus, Campaign Director, Scenario Engine, Living
World Engine), a full domain object model, and deep narrative-design theory
(a 7-state Thread lifecycle, campaign memory model, narrative patterns). This
repo is at roughly Level 1–2. The gap is real and expected, not a defect —
the corpus itself argues against building it all at once (pack 58:
"architecture evolves by refinement... not replacement"; pack 66: continuity
work before new features). See the ADR for what was explicitly *not* adopted
yet and why (a typed Event Bus, a split Context/Knowledge Graph, a formal
Act/Mission/Objective/Scene/Beat/Moment hierarchy — the corpus doesn't even
agree with itself on that last one across packs 02/05/06/12).

**Corpus is internally inconsistent in places** (assembled across many
sessions — three different packs, 42/50/60, each read as an intended
capstone). The ADR resolves the ones that mattered for this codebase:
consequence-state naming, the Context Graph/Knowledge Graph split, and
clarifies that pack 35's general endorsement of iframes for tool integration
does *not* reopen the existing "Crew Link/Shipyard must be new-tab, never
iframe" rule (different surface — that rule is specifically about
third-party companion tools and their Android failure mode; the Constitution's
own PDF-iframe recommendation, pack 11, is what Phase 5's in-app PDF viewer
already implements).

### Response to the second USER NOTES batch above

These arrived after the Phase 5 build and are unimplemented — cross-referenced
here against the Constitution since several map directly onto specific packs.
**Not implemented yet** — this review was scoped to design/roadmap, not a build
pass; see the phase placement below and `DESIGN-NEW-FUNCTIONALITY.md` for effort
notes.

- *"design docs moved to /requirements folder"* — acknowledged; this is why
  root `CLAUDE.md`/`DESIGN-NEW-FUNCTIONALITY.md` were missing at the start of
  this review (found via `git status` showing them as deleted-but-uncommitted).
  Recreated both at root with updated content, since root `CLAUDE.md` is what
  Claude Code auto-loads as project instructions and `README.md` still points
  readers at `DESIGN-NEW-FUNCTIONALITY.md` by name — `requirements/` keeps its
  own (now slightly stale) copies as historical snapshots, untouched.
- *PDF viewer needs an X close* — **Done** (2026-07-03 audit). The button
  existed but was unclickable, not missing — the always-open Documents
  drawer physically overlapped it (see the "PHASE 5 AUDIT" section above).
  Fixed by insetting the viewer's right edge by the open drawer's width.
- *Cast entity-type filters, replacing "add new" buttons; search by
  type/name/tags* — a concrete Cast-drawer UX gap, not covered by the Phase
  6-10 plan below since it's pure UI polish on an existing drawer. Slot into
  Phase 8 (Unified Discovery) alongside Universal Search, since a per-drawer
  filter/search UI is a smaller, natural precursor to the cross-drawer
  version.
- *Tag fields as dropdowns, with a per-entity-type tag vocabulary that grows
  and shrinks as tags are added/removed* — new mechanism, not currently
  modeled (tags are free-text today). Fits Phase 7 (Context Graph depth)
  since it's a relationship/metadata quality improvement, not a new engine.
- *Simplify per-field statblock UI (label + value only; format/delete
  controls live in Settings only)* and *allow multiple statblock types
  enabled per entity, each on its own row* — **Done** (2026-07-03, per an
  explicit follow-up with an annotated screenshot). Matches pack 24's
  "Character Translation" claim almost exactly: *"a single entity holds
  multiple coexisting stat templates simultaneously."* `entity.statblock`
  (singular) became `entity.statblocks[]` — adding a ruleset/template is
  now always additive (a "+ Add" chip row offers whichever aren't already
  present), never a replace; each group removes independently via its own
  🗑. Per-field rename input and the ★ (attribute)/Aa (track)/✕ (remove)
  buttons are gone from the entity view — a field's name/kind is fixed by
  its template now; ad-hoc "+ Field"/"+ Track" additions are named via a
  one-time prompt instead. **Still open:** scoping which Bestiary templates
  are offered by the entity's *type* (e.g. only creature-shaped templates
  for non-character NPCs) — today every template is offered to every
  entity, unchanged from before this revision; wasn't part of this specific
  follow-up's three call-outs, so left alone rather than assumed.
- *"Everything is an entity"* — this is pack 3's Entity Philosophy verbatim:
  *"everything is an Entity — Character, NPC, Creature, Vehicle, Starship,
  Colony, Settlement, Planet, Location, Faction, Organization, Mission,
  Objective, Asset, Rulebook, PDF. Behavior determined by templates and
  relationships, not specialized classes."* Current `ENTITY_TYPES` has 5
  values (npc/location/faction/asset/lore); Party members are already
  entities (NPC + `#character` tag) but Colony crew rows, Documents, and
  Threads are still separate, non-entity data structures. This is the
  single largest structural idea in the whole review — deliberately **not**
  slotted into a specific phase number below; it's a candidate for its own
  ADR before any schema work starts, since collapsing Documents/Threads
  into the entity model is a bigger migration than any single phase above.
- *WHO/WHAT/etc. cards should show selected entities for the scene; dynamic,
  entity-driven scene generation like the legacy app aspired to* — this is
  the practical, UI-facing expression of the same "everything is an entity"
  idea, plus pack 22's Campaign Operating Workflow (`Orient → Decide →
  Experience → Resolve → Record → Advance`, where "Orient" explicitly
  surfaces Current Party/Location/Threads from graph state, not free text).
  Depends on the entity-model expansion above being decided first.

**Recommendation:** before touching code on the last three items, write a
short ADR (0002) deciding how far "everything is an entity" goes for this
codebase — a full literal reading (Documents, Threads, Colony crew rows all
become entities) is a bigger, riskier migration than the phased items above,
and deserves the same explicit alternatives-considered treatment ADR 0001
gave the rest of the corpus, rather than an ad hoc decision made mid-implementation.

## PHASE 5 AUDIT (browser-verified, 2026-07-03)

Requested explicitly: bring the design up to *this app's own* Phase 5 goal (not
a Constitution phase/milestone of the same number — confirmed with the user).
Rebuilt (`npm run build`), then launched the real bundle in headless Chromium
via Playwright (installed `--no-save`, not added to `package.json`) against a
throwaway static server, and drove every Phase 5 feature by hand: added
entities, linked and re-labeled a relationship, switched a Bestiary template,
added a Party tracker, filled a Colony field, saved a Guide note, expanded and
searched the Oracle tree, uploaded and tagged a document, and opened both an
uploaded file and a Reference Library PDF in the in-app viewer. Zero console
errors across the whole run.

**Confirmed working, matches the documented Phase 5 scope:** Party roster
(live `#character` filter) + trackers; Colony turn sheet + crew roster;
Guide free-text + `@`/`@[Doc]` badges; the grouped/collapsible/searchable
Oracle tree (group toggle, "Collapse all," search force-opening matches);
Bestiary template switching on an NPC statblock with correctly signed
attribute badges ("COMBAT +0"); editable relationship notes (both via the
dropdown Link control and after the fact); Document Library multi-upload,
tag add/remove, tag-filter chips, free-text search, and rename.

**One real bug found and fixed.** The USER NOTES complaint "PDF viewer needs
an X close option" turned out not to be a missing feature — the close button
(`data-doc-viewer-close`) existed and Playwright's CSS-only `isVisible()`
check even reported it as visible. Driving an actual `click()` against it
timed out: the Documents drawer (always open, since that's the only place a
document-open link exists) sits at a higher z-index than the PDF viewer and
was intercepting every click in the overlapping strip — the viewer's own
right edge and the drawer's left edge shared the same boundary, so the
drawer's footprint extended over the viewer's close button by exactly the
drawer's width (400px by default). The button was real, rendered, and
completely unclickable. Root-caused by comparing the click's bounding box
against the drawer's known width, not by guessing.

**Fix:** `styles/cockpit.css`'s `.mc-doc-viewer` now insets its right edge by
`calc(var(--edge-w) + var(--viewer-overlap, 0px))`; `src/ui/shell.js`'s
`render()` sets `--viewer-overlap` to the current drawer's width whenever one
is open (`doc.drawers.widths[openDrawer]`), so the viewer always stops short
of whatever drawer is showing rather than rendering underneath it. Re-verified
after the fix: the close button's bounding box shifted left by exactly the
drawer's width, and both the uploaded-file viewer and the Reference Library
viewer now close successfully via the button. Screenshots taken before/after
confirm the visual layout is correct (viewer panel now visibly stops before
the drawer, header bar and close button fully clear of it).

Not touched in this pass (out of scope — this was Phase 5 verification, not
the Phase 6+ backlog): the second USER NOTES batch (Cast filters, tag
dropdowns, multi-statblock support, "everything is an entity") remains as
scoped in the Design Constitution review above.

## ATTRIBUTE FIELD REDESIGN + PHASE 6 CONTINUATION (2026-07-03)

**Attribute fields (Edge, Combat, Speed, ...): +/- steppers replaced with a
directly-editable, numerically-validated input.** The prior turn's spinner
(`＋`/`−` buttons around a static value badge) is gone. Now:
- The value is a plain `<input>` (`data-statblock-attr-val`), parsed and
  clamped to a valid integer on change (`setStatblockAttributeValue` /
  `setEntityStatblockAttributeValue`, `domain/statblocks.js` /
  `domain/entities.js`) — no min/max clamp anymore, since a modifier can
  legitimately go negative or exceed an old 1-5 scale.
- **Three display formats**, per-field, editable in Settings' Bestiary
  template editor (`FIELD_FORMATS` in `ui/drawers/index.js`): `sign` (+3,
  Starforged-style, default), `inches` (3", 5PFH Speed-style), `plain` (3).
  Purely a display affix around the input — never changes the stored value.
- **The field's label is now the roll trigger** (click "EDGE" to roll it),
  replacing the old double-click-only interaction — a field with
  `rollMethod: 'none'` gets a plain, non-clickable label instead.
- **Four dice models** (`ROLL_METHODS`): `none`, `action` (Starforged, d6 +
  value vs 2d10), `flat` (5PFH, d6 + value vs target), and a new
  **`traveller`** (2d6 + value vs target, default 8 — `domain/dice.js`'s
  `rollTraveller`/`formatTravellerRollText`). Room is deliberately left to
  add more (5PFH Planetfall, Stars Without Number) as those systems get
  authored roll mechanics — nothing here hardcodes the list to four.
- The shipped 5PFH Bestiary template's Speed field is the concrete example
  the user named: `format: 'inches'`, `rollMethod: 'none'` (movement
  distance, not a dice stat) — same override available on the 5PFH
  character sheet's own Speed stat (`data/rulesets.js`).
- `performFieldRoll()` in `shell.js` is now shared between the track badge's
  double-click-to-roll and the attribute label's click-to-roll, so both
  entry points resolve identically regardless of dice model.
- Browser-verified via Playwright: no `+/-` buttons remain, the input
  commits and validates (garbage text coerces to 0, not `NaN`), the label
  click files a roll to the Journal, and the Speed field renders `3"` with
  a non-clickable label. Zero console errors.

**Phase 6 continued: richer Thread lifecycle + "what did I overlook?"**
(the roadmap's next items after Session Recap, per
`DESIGN-NEW-FUNCTIONALITY.md`'s Phase 6 list):
- `domain/threads.js` threads now carry a 7-state narrative lifecycle
  (`THREAD_STATUSES`: Seeded → Active → Escalating → Dormant → Converging →
  Resolved → Archived) and a `priority` dial (low/normal/high), both
  GM-set via `setThreadStatus`/`setThreadPriority` — never inferred, except
  that filling a clock to full still auto-marks it Resolved (and backing
  off a full clock reverts it to Active), matching the pre-existing `done`
  behavior exactly. Old threads (no `status`/`priority` in storage) are
  normalized on read from their `done` flag, without mutating the stored
  campaign — no migration step needed, no data loss.
- The Adaptive Workspace's Threads block (under the WHY question) gained a
  status `<select>` and a priority `<select>` per thread alongside the
  existing clock/advance/back/remove controls.
- **"What did I overlook?"** (pack 13/76): `overlookedThreads()` surfaces
  threads that are explicitly Dormant, or open with zero progress since
  creation — excluding Resolved/Archived (those aren't overlooked, they're
  finished). Wired into `copilot.js`'s `advise()` as a new `overlooked`
  field and rendered as an observation-only card in the Co-Pilot panel
  (plain name chips, no actions) — per the Constitution's explicit rule for
  this feature: surface, never auto-correct. NPC/"unresolved promise"
  detection (also named in the roadmap item) is NOT included — it needs a
  data model (last-mentioned tracking, explicit promise records) that
  doesn't exist yet; flagged here rather than half-built.
- Narrative Trackers beyond threat/mystery (Resources, Reputation) remain
  open — not part of this pass.
- Browser-verified: adding a thread, setting it Dormant, and seeing it
  appear in the Co-Pilot's "What did I overlook?" card, all via Playwright
  against the real bundle. Zero console errors.

Tests: 98 → 106 passing (`npm test`).

## PHASE 6 CLOSEOUT: NARRATIVE TRACKERS (2026-07-03)

Last open Phase 6 item, per `DESIGN-NEW-FUNCTIONALITY.md`'s pack 18 note:
`context.what` only tracked Threat and Mystery; the Constitution's longer
list of narrative dials (Danger, Hope, Heat, Resources, Momentum,
Reputation, ...) suggested at least Resources and Reputation were worth
adding, generalizing the existing pattern rather than inventing a new one.

- `core/schema.js`: `context.what` gains `resources: 5, reputation: 5`
  (neutral midpoint default, not 0 — a fresh campaign hasn't run out of
  supply or goodwill on day one).
- `domain/context.js`: four new Shift actions (`Gain Resources`,
  `Spend Resources`, `Raise Reputation`, `Lower Reputation`), same
  clamp-to-[0,10] shape as the existing Threat/Mystery shifts. A save from
  before this feature (missing `resources`/`reputation` in its stored
  `context.what`) defaults to 5 via a small `numOr` helper — no migration
  step, no schema version bump, same "undefined means the old default"
  posture as statblock fields' `rollMethod`.
- `ui/workspace/index.js`: two more range sliders on the WHAT view
  (`data-ctx-num="what.resources"`/`"what.reputation"`), reusing the
  already-generic `data-ctx-num` change/input handlers in `shell.js`
  unmodified — no new wiring needed there. New `.field-row-2col` CSS class
  for a balanced 2-up layout (the existing `.field-row` is a 3-up grid
  sized for Intent/Threat/Mystery, wrong proportions for a 2-item row).
- `domain/copilot.js`'s `advise()` now reads both dials (same
  neutral-midpoint fallback for old saves) and reacts: Resources ≤2 → a
  scarcity observation/consequence and a `Trade & Cargo > Cargo Problem`
  oracle suggestion; Reputation ≤2 → a soured-standing observation/
  consequence; Resources ≥8 or Reputation ≥8 → a new opportunity line
  (generosity/risk-taking or a favor/discount/introduction). Priority order
  keeps Threat and a near-complete Thread as the dominant signals — the new
  dials only surface when nothing louder is already flagged.
- Browser-verified via Playwright: dragging the Resources slider to 1
  updates the stored campaign and immediately changes the Co-Pilot's
  observation to the scarcity line. Zero console errors.

**Phase 6 (Campaign Continuity) is now complete**: Session Recap, attribute
redesign, Thread lifecycle, "What did I overlook?", and Narrative Trackers
all shipped. Next up per the roadmap: Phase 7 (Context Graph depth).

Tests: 106 → 113 passing (`npm test`).

## BUG FIX: EDITS LOST ON REFRESH + 5PFH ROLL TOAST BREAKDOWN (2026-07-03)

**Reported:** statblock groups/values added to a `#character`-tagged NPC
weren't retained across a code change (rebuild) or a plain browser refresh.

**Investigation.** Direct Playwright repro against the real bundle, not
guesswork — tried the reported flow across three environments before
finding the actual trigger:
- Plain refresh after tagging an NPC `#character` and adding a second
  Bestiary group, both under `http://localhost:8080` and `file://` — data
  persisted correctly both times.
- A real rebuild (`node scripts/build.js`) mid-session while the browser tab
  stayed open, then reload — also persisted correctly.
- The actual trigger: type a value into a field (e.g. a statblock attribute,
  or an entity's tags), then refresh/close/switch tabs **without clicking
  away from that field first**. Every field in this app only commits on the
  `change` event, which only fires on blur — a `beforeunload` refresh never
  gives that field a chance to blur, so the in-progress edit is silently
  discarded. Confirmed by typing into an attribute input, reloading without
  blurring, and watching the value revert to its pre-edit default.
- This also explains why it looked like whole "added statblocks" vanished:
  the GROUP itself (added via a button click) always saved instantly — but
  a value typed into one of its fields right after, without clicking
  elsewhere, could be lost, making the newly-added group look reset/empty.

**Fix:** `ui/shell.js`'s `mountShell()` gained one small addition — a
`beforeunload`/`visibilitychange` listener that blurs `document.activeElement`
before the page actually unloads/hides, firing that field's pending `change`
event through the *existing* delegated handler. No new commit path, no
per-element listeners, no architecture change — just makes sure a field
gets the blur it would otherwise be denied. Re-verified the exact reported
scenario end to end (tag an NPC `#character`, add a 5PFH Bestiary group,
edit the character sheet's Edge stat, reload without blurring): tags,
both statblock groups, and the edited value all survived.

**5PFH roll toast breakdown**, requested alongside the persistence fix: the
toast for a `flat`-method (5PFH) roll showed only the combined result
("Fail — 2 vs target 6"); it now shows the die-plus-modifier breakdown
("d6(2) + 0 = 2 vs target 6 → Fail"), matching what the Journal entry
already displayed via `formatFlatRollText`. Scoped to the `flat` branch of
`performFieldRoll` only, per the request — Starforged/Traveller toasts
weren't reported as an issue and were left unchanged.

Tests: 113 passing, unchanged (both fixes are UI/interaction-layer, no
domain-logic change). Browser-verified via Playwright for both.

## PHASE 7 BEGINS: TAG DROPDOWN + VOCABULARY (2026-07-03)

Next roadmap item after the two bug fixes above, per pack-66 ordering
(Phase 7 — Context Graph depth) and closing a loop from earlier in the
project (the tag dropdown/editing process the user asked for or roadmapped
back when the Bestiary/tag-filter work was being scoped).

- `domain/entities.js`: `addEntityTag`/`removeEntityTag` (single-tag,
  case-insensitively deduped) and `listTagVocabulary(campaign, entityType,
  excludeEntityId)` — every tag already used by OTHER entities of the same
  type, excluding ones the entity already carries, computed live off
  existing entities rather than a separately-stored/maintained list (so it
  can never drift out of sync with what's actually tagged).
- `ui/drawers/index.js`: the entity inspector's plain comma-separated tags
  `<input>` is replaced by `tagEditor()` — removable chips (✕ per tag) plus
  a dropdown of the type's tag vocabulary (selecting one adds it
  immediately) and a "+ New…" button for a freeform tag not seen before yet
  (one-time `prompt()`, same ad-hoc-naming convention as "+ Field"/"+
  Track"/"+ Game system" elsewhere in this app).
- `ui/shell.js`: `data-entity-tag-remove` (click), `data-entity-tag-new`
  (click + prompt), `data-entity-tag-select` (change) — all delegated,
  no per-element listeners. The now-dead `data-entity-field="tags"` branch
  (no such input exists anymore) was removed; `setEntityTags` (bulk
  comma-string setter) stays in `domain/entities.js` since existing tests
  exercise it directly and it's still a reasonable bulk API.
- Caught and fixed a variable-name collision during this work:
  `onClick`'s new `tagRemove`/`tagNew` locals collided with the Documents
  section's pre-existing `tagRemove` in the same function scope — a
  `SyntaxError` at parse time that silently prevented the ENTIRE app from
  booting (no cockpit, no drawers) until caught via a direct Playwright
  `pageerror` check and renamed to `entTagRemove`/`entTagNew`.
- Browser-verified: an NPC tagged via "+ New…" → `character`; a second NPC's
  dropdown then offers `character` (used by another same-type entity, not
  yet on this one); selecting it adds the tag; the chip's ✕ removes it.
  Combined smoke test also re-confirmed the two prior bug fixes still hold
  together with this change (persistence across an unblurred refresh,
  the 5PFH roll toast breakdown). Zero console errors throughout.

Tests: 113 → 116 passing (`npm test`).

Remaining Phase 7 items: `@` pointers into documents with page anchors,
typed/weighted relationships, "flag don't delete" invalid relationships.

