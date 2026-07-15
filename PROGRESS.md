# GMAtlas Progress

## Overview

Phase-level roadmap and current status for GMAtlas (rebranded from Saga
Atlas). For the full per-phase design detail and rationale, see
`DESIGN-NEW-FUNCTIONALITY.md` — that's the canonical roadmap doc; this file
is the shorter status ledger plus the open backlog. Detailed investigation
notes, root-cause writeups, and superseded design discussion from earlier
in the project are archived in `docs/archive/progress-log-2026-07.md`
(nothing there is more current than this file, `DESIGN-NEW-FUNCTIONALITY.md`,
or the ADRs under `docs/adr/` — check those first). Full history is also in
`git log`.

## Status Summary

**2026-07-14 Reference Library → GitHub Releases (code side), WHY Story
Options** (`docs/adr/0039-reference-library-release-hosting-and-story-
options.md`): two direct requests landed together. **Part A**: diagnosed
`deploy-pages.yml` checking out with `lfs: true` on every push (pulling
~469MB of PDFs each run) as the actual cause of the reported 10GB LFS
bandwidth exhaustion. New committed `referenceLibraryManifest.js` +
`releaseConfig.js`; `scripts/build.js` now resolves each PDF to a local
path (real bytes present, incl. LFS-pointer-stub detection) or a GitHub
Release asset URL (`reference-library-v1`) otherwise — decided once per
build, per machine, zero runtime fallback logic needed. Workflow no
longer pulls LFS at all; verifies against the Release instead (soft-warns
until the Release actually exists). No `gh` CLI/token available in this
environment, so the actual Release creation/upload is a short manual
walkthrough the user still needs to run. **Part B**: WHY gained
`whyEntityPicker` (parity with WHO/WHERE, WHY previously had NO entity
picker) and a new "Story Options" block — `copilot.js`'s new
`gatherSceneContext`/`buildStoryOptions` combine WHO's in-scene cast,
WHERE's present factions/Conflicts, and WHY's own Threads/Foreshadowing/
World Flags into a genuinely cumulative ranked list (unlike `advise()`'s
single first-match-wins pick), each option linking a real Oracle table to
roll or a one-click Journal add. Finally realizes ADR 0009's
long-deferred "surface a faction's fear/need when negotiating" idea,
generalized to every in-scene faction. 6 new domain tests (439 total).

**2026-07-14 WHERE/WHO polish batch, no-viable-action diagnostics, Bases
of Influence cleanup, sticky Entity Editor header, Ctrl+arrow tab nav**
(same-day follow-up to `docs/adr/0038`, several direct requests): (1)
WHO's "Matching people" and WHERE's "Matching locations" candidate
panels are now `<select size>` listboxes, matching the adjacent tag
listbox's aesthetic instead of a chip cloud (consistency + less vertical
space, direct request). (2) `factionTurnEngine.js`'s "no viable action"
narrative now names a specific reason — no Homeworld set, not enough
FacCreds for a first asset, or (once assets exist) exactly which
specific action the heuristic tried and why it failed (e.g. "nothing to
attack or seize here") — instead of one generic message; diagnosed from
a real report of 13 stuck rounds, traced to a faction with no Homeworld
set (which blocks buyAsset/expandInfluence outright, and transitively
everything else). (3) WHERE gained a header-row quick-awareness summary
(System/Star/Colony-Base/District), a nearby-locations jump list, and
Site Concept/Adventure Seed inspiration buttons — see `docs/adr/0038`'s
same-day follow-up section for the full mapping. (4) A Faction's Bases
of Influence list now has a ✕ remove button (a plain list edit, no
FacCred refund) and collapses under its own toggle by default once any
exist (expanded by default when empty, so the "expand influence to"
picker is immediately visible) — new `removeFactionBase`. (5) The
Entity Editor's name/type header now stays visible ("freeze pane") while
the rest of a long entity form scrolls underneath it. (6) Ctrl+Left/
Right now cycles the WHO/WHERE/WHAT/WHY/HOW workspace tabs, skipped
while focus is in any text field (so it doesn't steal the OS/browser
"jump a word" shortcut from someone typing). 2 new domain tests (434
total).

**2026-07-14 Location ↔ Faction presence, Conflicts, and a Location
Story** (`docs/adr/0038-location-faction-story.md`): closed a direct
report that WHERE doesn't "select" a location and WHO can't associate
factions with one, with no digest of what's happening there. Mostly a
wiring job — `factionsInRegion` (the full location containment-tree
"who's active nearby," Living Faction Engine Phase C) existed but was
wired to no UI, and the generic relationship system's `located_at` type
was an already-correct, unused way for a GM to say "this faction
operates here." `factionsPresentAt`/`factionsInRegion` now recognize a
manual `located_at` link; WHO's "Factions active nearby" gained a
"+ faction operating here" picker (mirrors the Conflict card's existing
local-faction select) and a ✕ for manually-linked ones; WHERE gained a
persistent "current location" indicator, read-only Factions-here/
Conflicts-here digests, and a new per-location "Location Story"
free-text field. 1 new domain test (432 total).

**2026-07-14 Foreshadowing, World State Flags, NPC current goal**
(`docs/adr/0037-foreshadowing-worldflags-npc-goal.md`): reviewed an
external Scene & Story data-model spec against the actual architecture
(`docs/design/scene-story-integration-plan.md`) before building — most of
it already existed under different names, and its pre-authored branching
scene graph was flagged as a genuine philosophical mismatch (this app's
scene generation is 100% live/oracle-driven, no `resolveScene()`,
consistent with Article II) and deliberately not built. Shipped the three
genuinely-missing pieces instead: Foreshadowing (a GM's own plant/pay-off
to-do list, WHY tab), World State Flags (a lightweight fact ledger —
unknown/suspected/confirmed/false — WHAT tab), and an NPC `currentGoal`
field (mirrors Faction's `agenda`, Entity Editor). 4 new domain tests (431
total).

**2026-07-13 Faction Conflict: Location-scoped faction picker** (`docs/
adr/0036` second same-day follow-up): closed a real gap between the
design doc and the shipped build — `conflict.locationId` had a data slot
but no UI or filtering behavior. Added a "+ add a local faction" dropdown
(filtered by `factionsPresentAt`) to the Conflict card's Involved
section; per direct correction, the Location picker itself lives on the
WHO workspace tab (shown only while a Conflict is the active entity), not
the Conflict's own Entity Editor card.

**2026-07-13 Faction Conflict × Faction Turn Engine escalation
suggestions** (`docs/adr/0036` same-day follow-up): closed the one gap a
narrower SWN-specific research pass flagged as likely to read as
"bolted on" to that community — the escalation clock was entirely
GM-clicked, disconnected from the mechanically-resolved Faction Turn
Engine. A committed Attack/Expand Influence/Seize Planet event between
two factions both linked to the same tracked Conflict now surfaces a
dismissible "did this affect a tracked conflict?" suggestion right after
commit, with a one-click Escalate — never applied automatically (Article
II; the dice inform it, they don't decide it). 3 new domain tests (427
total).

**2026-07-13 Faction Conflict** (`docs/adr/0036-faction-conflict.md`):
an external subsystem spec (`docs/design/FACTION-CONFLICT.md`) validated
against real GM-community sentiment on faction/conflict tooling
complexity (SWN's own faction system reviewed as tolerated-not-loved;
Blades in the Dark's Progress Clock as the most consistently praised
"track pressure without homework" pattern; concrete devlog evidence of a
faction system redesigned twice for taking up too much headspace) before
being simplified and built. Conflict is a first-class entity type (an
escalation clock reusing the existing Thread/pip machinery, a stated-
vs-root-cause gap, a third-party-casualty line, session hooks — all
always visible and alone a usable conflict; deep history, irreversible
facts, per-faction posture, information asymmetry, and GM notes demoted
behind a collapsed-by-default "Add depth" toggle), with a single
one-click quick-start generator rather than a multi-table wizard. 8 new
domain tests (424 total).

**2026-07-13 Living Faction Engine Phases B/C/D** (`docs/adr/0035-faction-
engine-pacing-missions-turn-ui.md`): activity-based pacing (a scene-count
nudge, never auto-committing), faction-driven missions (`campaign.
missions[]`, a hot faction's activity becomes a real trackable job via a
new Co-Pilot button, with accept/decline/resolve controls in Faction
Events), and a clean turn-processing UI — structured "assets affected"
and a per-location recent-events panel on draft/committed turn cards,
every faction name a clickable link into the Entity Editor, a new "Turn
History" section there (campaign-wide, per faction, with the specific
turn clicked from highlighted and its impact shown), and a collapsed-by-
default Round History browser. Explicitly built WITHOUT the retcon/
replay concept originally sketched for Phase D — dropped per direct
request ("remove the retcon concept, keep it simple") in favor of a
much lighter permanent before/after `impact` diff computed once per
turn. 7 new domain tests (416 total).

**2026-07-13 Faction Events turn-heuristic fix + WHERE docking** (second
direct follow-up to Phase A): fixed a real bug where Step/Full Round could
get permanently stuck proposing a guaranteed-fail Repair action for a
resourceless faction (`candidateActions` now gates Repair on affordability
like every other action already does); Full Round now scopes to the
Active Location the same way Step already did (`advanceFactionTurnRound`'s
new `factionIds` param); the Roster card is now a genuinely narrow
"current activity + social/political ramifications" summary with full
editing moved to the Entity Editor exclusively; and the whole Faction
Events card can now relocate into the WHERE workspace tab as a docked
right column (new down-arrow) and pop back to the drawer tab group (new
up-arrow). 2 new domain tests (409 total).

**2026-07-13 Faction Events UI refinement** (direct follow-up to Phase A,
below): the shared Faction Turn card's per-faction Rules Provider selector
is gone — ruleset choice is Settings-only now — and its Homeworld field is
hidden specifically when the card renders inside Faction Events (still
shown in the Cast entity editor). The Faction Events panel's Step select
and Faction Roster now scope to `factionsPresentAt` WHERE's own Active
Location instead of listing every faction in the campaign, with a clear
prompt when no Location is set on WHERE yet; the committed Events feed's
location filter defaults to that Active Location (auto-following WHERE
until a GM explicitly overrides it) without narrowing which faction/
location history remains browsable. The Step select's chosen faction now
stays visibly labeled until changed. 1 new domain test (407 total).

**2026-07-13 Living Faction Engine, Phase A** (`docs/adr/0034-faction-
membership-and-region-depth.md`): first of a four-phase roadmap (A:
universal membership/conquest/region-depth, this pass; B: activity-based
pacing; C: faction-driven missions/encounters; D: retcon support) making
`docs/adr/0031`/`0032`'s SWN Faction Turn Engine behave as a fully
independent, living regional engine — factions with their own destiny,
territory that structurally changes hands on conquest, every entity
conceptually belonging to a faction (even a bystander), and location as
the central factor in regional faction activity. New `entities.js`
`getEntityFaction`/`setEntityFactionMembership`: a synthetic, non-persisted
"Unaligned" fallback for any entity with no real `member_of` edge (derived
on read, no forced migration), plus a general membership setter that
replaces rather than doubles an existing edge. `factionTurnEngine.js`'s
`seizePlanet` now flips the conquered location's own membership (not just
appending to the conquering faction's `governedLocationIds` array as
before), and the committed event narrative says so explicitly. New
`factionsInRegion` walks the FULL `contains`/`located_at` tree (the
existing `isSameDistrict`/`factionsAtLocation` are deliberately single-hop
only, untouched) — the backbone Phase C's faction-driven mission/encounter
generation will read from. New `getFactionDossier` rolls up a faction's
real members, governed locations, goal, allies/rivals, and event-log slice
into one read-only view. 6 new domain tests (406 total, all green);
`node scripts/build.js` rebuilt clean.

**2026-07-10 Mobile-responsive UI** (`docs/adr/0033-mobile-responsive-tab-
unification.md`): the general-purpose drawer-anchor mechanism is gone —
Faction Events is now an ordinary drawer tab (partially superseding
`docs/adr/0031`'s left-anchored panel design), and the document viewer/
main drawer are mutually exclusive, so at most one side panel is ever on
screen, always full width. A new phone breakpoint (`@media (max-width:
480px)`) makes the remaining panel full-width, collapses several fixed-
column "table row" grids to one column (Colony/Party/Trade/Threads),
switches statblock fields to a compact multi-column badge layout (~5/row,
reusing the existing `.attr-badge` shape), and tightens spacing app-wide
via a denser `--sp-*` override. Rich-text toolbars default to collapsed
now. Cast's existing touch-drag system gained hover-to-switch-tab/hover-
to-reveal-Mission-Control mid-drag. UI/CSS-only — `npm test`'s 401 tests
are unaffected; verification also caught and fixed a real bundler-
compatibility bug (an `import * as X` style `scripts/build.js` doesn't
recognize, introduced the same day) that made a "successful" build
silently emit a broken bundle. A real narrow-viewport/touch-emulated
browser pass is recommended as a follow-up.

**2026-07-10 GMAtlas Core faction provider, Game System Activation,
event scope/regional responses, read-aloud narrative, WHAT-tab hook**
(`docs/adr/0032-gmatlas-core-faction-provider.md`, extending `docs/adr/
0031`): a second, original-content faction provider — `data/
gmatlasFactionData.js` mirrors SWN's 72 assets/20 tags/11 goals with
identical mechanics/numbers but original names/text — selectable per-
faction or campaign-wide via `data/factionRulesProviders.js`
(`factionProviderFor`), with `domain/factionTurnEngine.js`'s every catalog
lookup (including a mixed-provider `attack`) resolving through it. SWN's
transcribed content now sits behind a Game System Activation checkbox in
Settings (`settings.gameSystemActivations`, `isGameSystemActivated()`) —
gated OFF by default for a fresh campaign (GitHub Pages is public
distribution, not personal use), grandfathered ON by `migrate.js` for any
campaign that already has real SWN faction data. Committed Faction Events
now carry a `scope` (self/faction-vs-faction/faction-vs-world) and, for
world-scope events, `responses` — a logged reaction per co-located
faction (`generateFactionResponses`) — plus an on-demand, GM-editable
`readAloud` paragraph (`expandEventReadAloud`/`setEventReadAloud`). A
witnessed, non-failure world-scope event nudges `context.what.threat`
(mirroring `session.js`'s existing "consequences gently escalate"
heuristic); Co-Pilot surfaces the same signal. The Faction Turn card
(`factionTurnSectionHtml`, now exported) gained a Rules Provider selector
and previously-unreachable Refit/Change Homeworld/Stealth-toggle
controls plus Governed Worlds/Seize Progress/Busy status, and — since its
HP/FacCreds/XP/Homeworld fields moved off the "active entity"-only
mechanism onto an explicit-id one — now also renders inline inside
Faction Events' new "Faction Roster" section. Rules Constitution
(Settings) is real per-area `<select>`s now, not a static table — only
the Factions row is functional today, the rest record a stated
preference for the still-future Phase 9 Rules Lens. Verified via 20 new
tests (401 total).

**2026-07-09 Faction Events follow-up** (`docs/adr/0031` addendum):
renamed "Faction Log" → "Faction Events" throughout (schema field, files,
CSS, data attributes) per direct follow-up request reframing a faction
turn around WHO ("which factions are active nearby"), WHERE ("same or
different district than the party, witnessed vs. news"), and relationship
strength ("weight ally/opponent decisions on the existing Relationships
dial"). Every event is now a Faction-Location pair — `locationId`,
`coLocatedFactions` (every other faction present, tagged ally/rival/
neutral via new `relationshipStanceBetween`, which generalized
`rivalAssetsAt` into `factionsAtLocation` and stopped Attack/Seize Planet
from ever auto-targeting an allied co-located faction), and `witnessed`
(computed from Location `@mention`s in WHERE's own Focus text via new
`getCurrentWhereLocations`, per direct confirmation — no revived
structured "current location" pointer). District support reuses the
existing `contains`/`located_at` relationship pair (new
`getContainingLocation`/`getContainedLocations`/`isSameDistrict` — nothing
had ever walked that pair before). WHO/WHERE gained small "Factions active
nearby"/"Faction activity here" summaries with jump chips into the
Events panel (now with a second, location-based filter dimension
alongside the existing faction filter). The panel's trigger moved from a
header button to a new edge-nav slot between Cast and Trade that opens
both the Events panel AND Cast (anchored, filtered to Faction) together.
Verified via 8 new domain tests (380 total) plus a direct render-path
check (no browser) confirming witnessed/coLocated framing and the new
WHO/WHERE/panel sections against a real three-faction scenario.

**2026-07-09 SWN Faction Turn Engine** (`docs/adr/0031-swn-faction-turn-
engine.md`): a full, playable Stars Without Number faction-turn system,
distinct from `domain/factions.js`'s existing lighter-weight Force/
Cunning/Wealth mini-game (untouched, still available). Per direct
confirmation, this transcribes SWN's real content in full — all 72 named
assets across Force/Cunning/Wealth (ratings 1-8), 20 faction tags, 11
goals, the XP cost table — explicitly superseding ADR 0011's "stay
proprietary" stance for factions specifically (that ADR's Status line now
points here). New `src/data/swnFactionData.js` (the tables) and `src/
domain/factionTurnEngine.js` (all 9 SWN actions — Attack/Buy/Sell/Repair/
Refit/Expand Influence/Change Homeworld/Seize Planet/Use Asset Ability —
plus turn bookkeeping and goal tracking, which reuses Threads exactly like
the existing Pressure Track does). Automation is propose-then-confirm:
Step (one faction) or Full Round (every faction, chained) computes a full
draft — goal, action, targets, dice — that the GM reviews and commits,
never silently applied. The Faction Log surfaces as a left-anchored panel
that opens and resizes exactly like the in-app PDF viewer (a direct
follow-up request), not a normal drawer tab — modeled on `.mc-doc-viewer`'s
own fixed-panel mechanism. The Faction inspector gained a new "Faction
Turn (SWN)" card (HP/FacCreds/XP, Homeworld, Bases of Influence, Tags,
Goal + its Thread-backed clock, structured Assets). Scope explicitly
bounded in three places (see the ADR): Seize Planet is a single-turn
HP-pool approximation of the book's multi-turn siege; Change Homeworld
always takes one turn (no hex-distance modeling); Use Asset Ability
mechanically resolves only ~5 simple dice-for-FacCreds abilities, every
other asset's special text is surfaced for the GM to adjudicate directly.
Verified via 30 new domain tests (373 total) plus a direct, non-browser
render-path check (inspector card, Faction Log panel body, and the full
propose→review→commit→feed→filter pipeline against real domain data all
produce correct HTML with no thrown errors) — a full jsdom browser-boot
smoke test was attempted but abandoned as too slow/fragile for this pass
(external classic-script loading via jsdom proved unreliable); the
lighter, direct verification was judged sufficient given the 30 passing
domain tests already cover every mechanical edge case.

**2026-07-09 HOSTILE Canon Locations — Fomalhaut Settlement Zone**: the
second zone on ADR 0026's rollout checklist is authored and importable —
24 worlds, 24 stars, 1 zone entity, transcribed from the sourcebook's FOM
World Data table (p.29), star catalog (pp.50-53), and the "Outer Rim
Worlds - Highlights" page (p.75, which covers Fomalhaut, Medusa, LR210's
star 82 Eridani, and LR203's star EV Lacertae with real prose; the other
20 worlds get an honest "cataloged with minimal detail beyond its World
Data table entry" summary, same posture as the six sparse NEZ worlds).
No bases — FOM's zone map only shows generic base-type icons, not the
national USSC/JASDF/DRW/MRA assignments NEZ's per-world prose named, so
none were invented. New `assets/data-packs/hostile-fomalhaut-settlement-
zone.json`, same `{zones,bases,stars,locations}` shape as the Near Earth
Zone pack. `ui/hostileLocationsFetch.js` now fetches every zone file
listed in `PACK_URLS` and merges them before import, so Settings' single
"Import HOSTILE Canon Locations" button covers both zones at once and
needs no UI change as further zones land — `importHostileLocations()`
itself was already zone-agnostic. `HOSTILE_LOCATIONS_META` counts updated
(54 worlds, 54 stars, 4 bases). Verified via 4 new domain tests (358
total): FOM pack shape, no name collisions against the NEZ pack, a
FOM-only import, and a merged-pack import matching what the real fetch
produces. Capella Extraction Zone / New Concessions Zone / Extraction
Zones 6 & 9 remain queued next on the same checklist.

**2026-07-08 HOSTILE Canon Locations fourth follow-up**: the Zone >
Star > World > Base hierarchy is now real relationships, not just tags/
fields — a new `contains` relationship type plus the existing
`located_at`, applied consistently (Zone -Contains-> Star -Contains->
World -Contains-> Base, reverse edges Located At). New `HOSTILE_ZONES`
catalog (one entry: "Near Earth Zone"); import order is now Bases,
Zones, Stars, Worlds. The Relationships add-row now asks for type
before target entity. Verified via a rewritten domain test and a jsdom
smoke test (334 tests total).

**2026-07-08 HOSTILE Canon Locations third follow-up**: the Location
card layout got a full redesign into two purpose-named cards — World
Profile (UWP): Hex/Star System/Zone on one row, then World Size,
Atmosphere, Biome, Hydrographics, Gas Giant; World Demographics:
Starport, Bases, a divider, Tech Level + Law Level on one row, Trade
Codes, Economy (renamed from Development Level, same underlying field),
Population, Government. A self-referencing star now hides the entire
World Demographics card plus the remaining planet-only World Profile
fields. The canon import also now links every world to its star as a
real relationship (`located_at`/"orbits"), and no longer duplicates the
star name as a tag. Verified via an updated domain test and a jsdom
smoke test (334 tests total).

**2026-07-08 HOSTILE Canon Locations second follow-up**: the canon
import now recreates its own cross-references instead of leaving them
as descriptive text — two new catalogs, `HOSTILE_BASES` (4 entries,
`#base`) and `HOSTILE_STARS` (30 entries, `#star`, each self-referencing
its own name), imported before the 30 worlds so every world's
`bases`/`starSystem` resolve to real entities immediately. Every world
also gained a `#planet`/`#orbit`/`#deepspace` tag and a star tag
alongside its zone tag. Bases now works like Trade Codes (dropdown-add +
removable chips, sourced from `#base`-tagged entities). World Profile
field order is now Hex/Star System/Zone/Tech Level (Hex capped to 4
characters); a self-referencing Star System (i.e. this Location IS a
star) hides every planet-only field. Verified via 3 new/rewritten domain
tests (334 total, including a collision-free cross-reference check) and
a jsdom smoke test.

**2026-07-08 HOSTILE Canon Locations follow-up**: Star System is now a
`<select>` sourced from Locations tagged `#star` (label shows `(#star)`)
instead of free text; Trade Codes became a dropdown-add + removable-chip
list (no `#` prefix, two new domain functions
`addLocationTradeCode`/`removeLocationTradeCode` mirroring
`addFactionAsset`/`removeFactionAsset`); both the Location card and
World Profile card are now collapsible, collapsed by default. Verified
via 1 new domain test (332 total) and a jsdom smoke test.

**2026-07-08 HOSTILE Canon Locations** (`docs/adr/0026-hostile-canon-
locations.md`, extending ADR 0013/0025): close reading of `assets/docs/
Hostile setting.pdf` (321 pages) turned up a full Cepheus Engine/
Traveller-style gazetteer — 108 named worlds/stations, each with a UWP
(Universal World Profile) stat line and, for most, real "Planetology"/
"Development" prose. Locations gained a new "World Profile" card (13
optional fields — hex, zone, starport, size, atmosphere, hydrographics,
population, government, law level, tech level, bases, trade codes, gas
giant, star system — decoded against a new `data/hostileUwpTables.js`
reference), independent of the existing Development Level/Biome
Trade-bias fields. A new gated Settings button, "🌍 Import HOSTILE Canon
Locations," bulk-creates real, fully-editable Location entities from
`data/hostileLocations.js` via `domain/hostileLocations.js`'s
`importHostileLocations()` — idempotent (dedup by name), safe to re-run
as later zones are appended. This pass ships the Near Earth Zone in
full: all 30 worlds, each with a condensed GM-scannable summary and a
real page citation; Fomalhaut Settlement Zone and Capella Extraction
Zone/New Concessions Zone are queued next (tracked as a living checklist
in the data file). Verified via 4 new domain tests (331 total) and a
jsdom smoke test covering the World Profile card, the Settings legend +
genre-pack gating, and import idempotency.

**2026-07-08 Location Development Level + Biome, Trade "smart exchange
rates"** (`docs/adr/0025-location-biome-trade.md`, extending ADR 0013):
Development Level is now a real dropdown field on every Location
(previously tag-only, per ADR 0013's known UI gap), with the old tag
scan kept as an automatic fallback for backward compatibility. Biome is
a new, independent axis (`data/biomes.js`, 7/6/6 curated entries per
genre pack) that compounds with, rather than replaces, Development
Level when pricing Trade commodities — a Waterworld tagged Industrial
prices Water cheap AND manufactured goods cheap, both computed
independently and multiplied together in `priceAt()`. Commodities
gained a finer `resourceType` (water/fuel/food/ore/tech/luxury)
alongside their existing raw/manufactured `category` for biome to bias
against. New "Location card" inspector section needed zero new
event-handling code (the generic `data-entity-field` handler already
covers it); Settings' Trade Economy Model section gained a matching
biome reference list. Verified via 4 new domain tests (327 total) and a
jsdom smoke test through the real inspector and Settings render paths —
caught and fixed a real syntax-breaking bug (an unescaped apostrophe in
a new template string) that `npm test` alone would have missed, since
the domain suite never imports UI files.

**2026-07-08 Follow-up fixes**: the doc viewer now reclaims the main
drawer's width once it's collapsed (an anchored side panel, if any, still
counts — only the main drawer's own collapse state is dropped from the
`--viewer-overlap` calculation). Confirmed against the running app rather
than assumed: New Campaign already lived only in the Settings drawer, and
mention clicks in WHO/WHERE/WHAT already opened the entity editor / the
right PDF page. **Real bug fixed**: deleting the active entity while Cast
was filtered by type/tag/search fell back to the first entity in the
*whole* campaign, not the first one still visible in that filtered view —
a new pure `filterEntities()` (`domain/entities.js`, the Cast drawer's own
filter logic pulled out to one shared implementation) lets the delete
handler pick correctly. Verified via 2 new domain tests (323 total) and a
9-check jsdom smoke test.

**2026-07-08 UX batch, eight items**: Gallery gained its own "+ Upload"
(an inline friendly-name form after picking a file, not a popup —
previously the only way in was an entity's "+ Photo"); Battlemap
background uploads now auto-tag `battlemap` and the "pick existing"
picker filters to that tag; the header's Party/Colony/Journal buttons
always show their label now (matching the edge nav's own icon+label
buttons); "New Campaign" moved fully into the Settings drawer (out of the
⚙ quick-menu); the gear button moved to the header's far right, icon-only;
WHO's NPC/Faction list is now the same tag-listbox -> candidate-panel ->
click-to-mention picker WHERE already had (`entity-tag-picker`, generic
CSS shared by both); an NPC tagged `#character` no longer shows "Deepen"
or "Revealed/hidden" (both are for NPCs the GM is inventing/keeping
secrets about, not a player-controlled character); the drawer tab strip
gained a collapse arrow that hides the whole drawer (keeping every tab
open) behind a small floating ☰ icon. Also: Enhancement types split
"Wetware / Bio-Genetics" into two separate options and renamed
"Gene-Modification" to "Mutation" (label-only, id unchanged). Verified via
40 jsdom smoke checks across two scripts plus `npm test` (321/321,
unaffected — UI-only, no schema changes).

**2026-07-08 Planetfall Grid Battlemap** (`docs/adr/0023-planetfall-grid-
battlemap.md`), the first of Phase 11's tactical-tools items, scoped that
same session (four rounds of clarifying questions resolved what the
original one-line ask left open: no grid/spatial concept existed anywhere
in this app, no real Planetfall art exists in this repo, the existing
drag-and-drop system was entirely target-based with no continuous x/y
placement, and Gallery's image pipeline had exactly one call site tightly
coupled to an entity). **Fully implemented**: the schema section,
`data/battlemapIcons.js`'s built-in annotation set, `domain/
battlemaps.js`'s pure CRUD (mirrors `threads.js`'s shape, 14 tests), the
drawer's nav entry, its render function (`ui/drawers/index.js`'s
`battlemap()`), the click/drag handlers for placing and repositioning
icons/tokens (`completeBattlemapDrop` and friends, `ui/shell.js`), the
background-picker UI, and the canvas/grid CSS — verified via 31 jsdom
smoke-test checks across two scripts plus the full domain suite. A later
pass this same day incorrectly logged the UI/handlers/CSS as unbuilt and
marked this entry "in progress"; re-checked directly against the actual
source and test run (not assumed) and corrected back, per this file's own
"the code wins" rule — see ADR 0023's Status section for the fuller
correction note. `docs/adr/0024-battlemap-encounter-roadmap.md` sequences
what comes next regardless: encounter overlays (initiative/status,
folding in the old separate Encounter Manager item), room/asset
templates + procedural generation (folding in the old Base Builder item,
generalized to be genre-pack data rather than Planetfall-only), deeper
campaign-integration links, a manual-reveal-only fog of war, and
multi-map "floors" — with infinite canvas, dynamic lighting, VTT export
formats, and freehand drawing tools explicitly declined as
disproportionate to this app's zero-dependency DOM architecture.

**2026-07-07 A single standard for inline data entry** (`docs/adr/0022-
inline-prompt-standard.md`), on direct request: "do not have popup
windows for data entry... create a standard approach and assure all
similar inputs are done the same way" — named via WHY's "Set Objective"
(and WHO's "Introduce NPC"), which used to `window.prompt()` blindly. One
generic mechanism, `openInlinePrompt`/`commitInlinePrompt`/
`closeInlinePrompt` (`ui/shell.js`), now covers every remaining case: a
small floating field anchored to its trigger via `getBoundingClientRect()`
(the same technique the `@`-mention popup already used). Nine
`window.prompt()` sites converted — Introduce NPC/Set Objective, a
statblock's + Field/+ Track, a custom ruleset name, + Thread/+ Expedition,
the rich-text Link button (added this same session, needed
`wrapSelectionWithMarkup` to accept an explicit captured `Range` since
live selection is gone by submit time), and a document mention's page
number (three sites, one shared `applyMentionPage()` — a fresh drag-drop
or `@`-autocomplete pick now inserts the mention pageless immediately and
offers the page as an optional follow-up, instead of blocking insertion on
an answer first). No close-on-blur (would race the prompt's own ✓/✕
buttons) — only Escape/✕/✓ close it. `window.confirm()` is unaffected —
a different interaction the request didn't name. Verified via two jsdom
smoke tests (23 checks total) covering all four structurally distinct
conversion shapes.

**2026-07-07 External links in rich-text fields** (Phase 11 backlog): the
one backlog item small enough to build without the shared canvas-primitive
research the three tactical-tools items (Battlemap/Base Builder/Encounter
Manager/Interactive Maps) still need first. Extends ADR 0018's markup with
`[label](url)`, parsed/rendered/serialized the same "plain text is the
source of truth" way as bold/italic/underline. `domain/documents.js`'s new
`sanitizeExternalLinkUrl()` auto-prepends `https://` to a bare domain,
strips a `?` query string and everything after it entirely (the explicit
security ask), and rejects anything that isn't a real http(s) URL — a link
that fails this renders as literal bracket text, never a broken link. A
new 🔗 toolbar button wraps the current selection like Bold/Italic already
do; the rendered `<a class="ext-link" target="_blank" rel="noopener
noreferrer">` needed its own delegated-click handler (`data-ext-link`)
since a plain click on an anchor inside a contenteditable region only
places the caret by default. Verified via 8 new `npm test` cases plus
three angles of DOM-level verification (jsdom's toolbar-insertion flow,
and direct `buildMentionEditorHTML`/`serializeMentionEditor` calls,
working around jsdom's lack of `isContentEditable` support).

**2026-07-07 Latest Scene readability follow-up**: the 7 scene fields are
now single-column `<textarea rows="1">`s (not `<input>`) instead of a
multi-column grid — full-sentence fields read better in one legible
column than crammed side by side. Each auto-grows on typing up to a
CSS-capped ~4 rows (`autoGrowSceneField`, `ui/shell.js`), then scrolls
internally. The text/fields split moved from 60/40 to 70/30 and switched
from CSS grid to flex so the text panel could get a real `resize:
horizontal` handle — dragging it resizes the split by hand instead of
living with a fixed ratio; narrow viewports still stack and drop the
manual width. Verified via a jsdom structural smoke test (11 checks) plus
`npm test` (299/299, unaffected). jsdom has no real layout engine, so the
resize handle's drag behavior and live auto-grow height weren't visually
confirmed in an actual window — only the DOM/CSS structure driving them.

**2026-07-07 WHAT-tab tracker layout + Latest Scene 60/40 split**, a
direct follow-up on the batch below: the WHAT tab's two tracker rows
(Intent/Threat/Mystery, Resources/Reputation/Stress) now use
`repeat(auto-fit, minmax(10rem, 1fr))` instead of a fixed 3-column grid,
so they reflow to 3/2/1 per row as the window narrows instead of jumping
straight from 3 columns to 1. Latest Scene's combined text and its split
fields moved from stacked to a new `.last-scene-body` 60/40 grid (text
left, fields right — reading the text happens far more often than editing
a field, so the larger share goes to it), collapsing back to stacked
below 1023px. Found a real gap while checking that "everything the GM
sees can be edited": two of the combined text's sections had no field
behind them at all. "Decision point" was one fixed sentence hardcoded
into `recomposeSceneText()`, identical on every scene; promoted to a real
`decisionPoint` field (`domain/scenes.js`) like opening/driver/clue/
complication, its old wording surviving only as that field's default.
"Current thread" (`situationLine` — a frozen snapshot of the WHAT tab's
Situation text taken at scene-generation time) was already a real field
but had no UI control; it's now the Latest Scene grid's seventh field.
Verified via a jsdom smoke test (9 checks) plus `npm test` (299/299, two
new scene tests).

**2026-07-07 Eight-item follow-up batch** (submitted directly in chat, not
`docs/adr/next-request.md`): layout density, a Scene-field redesign, a
WHERE-tab simplification, an icon tweak, and three real regressions found
and fixed via direct code research. Latest Scene's split fields
(Opening/Driver/Clue/Complication/Likely consequence) gained a real
`.scene-fields` CSS grid (`repeat(auto-fit, minmax(9rem, 1fr))` — they'd
never had one, so five individually-editable fields still rendered
one-per-line). Scene's "Opening" field now stores the FULL generated
sentence (`domain/scenes.js`), not just the sensory-detail fragment the
previous split left editable inside a fixed template; "Likely consequence"
(already a real field on the scene object) is rendered as a UI field for
the first time. WHERE's "Present Here" curated list
(`context.where.entityIds`) was removed as duplicative of Focus — clicking
a matching Location candidate now inserts a real `@mention` at the end of
Focus directly (the same `insertMentionNode` path drag-and-drop mentions
already use); `addContextEntity`/`removeContextEntity` stay in
`session.js` (harmless, tested, generic) but are no longer driven from
this UI. The toolbar's small/large-text buttons now read as a small "a"
and bold "A" instead of plain "S"/"L". Three confirmed bugs: (1) a
`@media (max-width: 1023px) { .header-actions .btn.sm { display: none; }
}` rule, written back when "▶ Scene" was the only such button, was
blanket-hiding Party/Colony/Journal and the ⚙ gear menu on any viewport
≤1023px once the prior QoL batch put them in the same `.btn.sm` bucket —
fixed by wrapping each header tab's text in a `.btn-label` span and hiding
only that at narrow widths, leaving a compact icon-only button that stays
clickable ("New Campaign should move into the Settings dropdown" turned
out to already be true — it likely read as broken because this same bug
made the gear button itself invisible). (2) The anchor panel
(`.mc-drawer-anchor`) only ever had a ▶ "merge into tabs" button, no ✕ —
closing it when it was the ONLY thing open silently promoted it into the
main drawer instead (which alone had a ✕), forcing a confusing second
click; added a real `data-drawer-anchor-close` ✕ that closes it outright.
(3) The doc-viewer iframe reload guard compared the live DOM `frame.src`
(browser-normalized absolute URL) against a locally-computed relative
path for Reference Library docs — these could never match, so the guard
misfired on every render, and any unrelated `store.update()` elsewhere in
the app could reset the iframe to blank mid-load; fixed by tracking
`lastDocViewerSrc` ("the last src I set") instead of reading it back from
the DOM. Verified via a jsdom-driven smoke test against the built bundle
(17 checks covering all eight items) plus the full `npm test` suite
(297/297 passing).

**2026-07-07 Gallery** (`docs/adr/0021-gallery.md`, Phase 11's first
built item): a new top-level drawer — per-entity thumbnails (left-aligned
beside Type/Tags) plus a searchable, taggable image collection. An
upload ≤256px stores as one record; a larger one auto-resizes into a
linked thumbnail+original pair, both tagged with the entity's type and
that tag locked from removal (`domain/gallery.js`, a third copy of
`entities.js`'s plain-tags-array pattern — Oracle's own tag/lock
mechanism was confirmed hardcoded to oracle tables, not reusable here).
`ui/imageResize.js` is this app's first pixel-manipulation code — a
canvas-based client-side resize, no new dependency, mirroring the
`ui/`-vs-`domain/` split PDF.js scanning already established. Safe to
store both a full-resolution original and a thumbnail specifically
because of ADR 0015's IndexedDB migration. Verified end to end in a real
browser: a small upload creates one record, a large one creates a
correctly-linked pair, the locked tag genuinely can't be removed, and
deleting an image from the Gallery clears a dangling entity reference.

**2026-07-07 "USER CHANGES" QoL batch**: five small, independent UI edits
from `docs/adr/next-request.md` (the same batch's larger "Add to roadmap"
asks landed separately, as `DESIGN-NEW-FUNCTIONALITY.md`'s new Phase 11
backlog, not built). A Graph drawer filter highlights/dims matching nodes
by name instead of removing them (the force-directed layout needs the
whole node set to stay stable). Party/Colony/Journal moved from the edge
nav to their own tab group in the header, right-aligned, reusing the
existing `data-drawer-open` routing verbatim. 12 always-visible
instructional tips across Guide/Documents/eight Settings groups/the Graph
toolbar became collapsed-by-default "?" icons (new `helpToggle`/
`helpBody` helpers) — the HOW tab's transient lens-picker tip was
deliberately left alone, since it has no adjacent header to anchor an
icon to. The old click-the-campaign-title convention became a real ⚙
gear dropdown (New Campaign/Settings/About — About is genuinely new
content, a small overlay showing the real build version). The header's
"▶ Scene" button was removed and replaced with two copies: one in the
WHAT tab next to "What Happens Next?", one in the Co-Pilot panel's Quick
Apply row (unconditionally present, regardless of whether that panel's
own dynamic "Advance Time" chip happens to be showing). Two real bugs
were found and fixed during verification, not just planning: a z-index
tie between the new dropdown menu and the main drawer let an open drawer
silently eat clicks meant for the menu; and a missing `helpToggle` import
in `shell.js` threw inside `render()`, silently breaking the Guide and
Documents drawers' entire body — caught only by an actual browser check,
underscoring why this project always does one after a UI change.

**2026-07-06 "USER CHANGES" batch** (`docs/adr/0019-where-tab-and-scene-
fields.md`, `docs/adr/0020-reference-toc-generation.md`, an addendum on
`docs/adr/0018`): six follow-ups to the rich-text work below. The five
text fields ADR 0018 missed (Revealed/hidden, Faction Scenario seed/
Agenda, Colony's textareas, a Document note's content box) got the same
toolbar. Journal entries can now be edited in place (a new ✎ icon,
`domain/session.js`'s `editNote`). The WHERE tab replaced "every Location
in the campaign" with a Location-tag listbox filtering a candidate panel
that adds to a new curated "present here" list — finally using
`context.where.entityIds`, a schema field that existed since Phase 3A but
was dead in the UI (new `addContextEntity`/`removeContextEntity`); a real
pre-existing bug was found and fixed alongside it — WHO/WHY's own
"+ Type" buttons had never had a click handler at all. Verified (no code
needed) that a hand-typed `@[docname#page]` already becomes a real link.
A new Reference Library Table of Contents generator (`domain/toc.js`,
`ui/tocScan.js`) reads a PDF's real bookmarks via PDF.js's `getOutline()`
(new integration — never called in this app before) and writes a linked
TOC per document into the Guide, triggered from a Settings button or
(behind a `window.confirm`) right after an upload — same `file://`
restriction as the Mechanics Index scan it mirrors. The rich-text toolbar
gained Tab-indent, small/large text, and a table markup type (a
toolbar-inserted skeleton, left-aligned/thin-bordered by default, no
per-row/column UI). Latest Scene's `sensory`/`driver`/`clue`/
`complication` became real, individually 🔮-linked fields, with the
combined text view recomposed live from them (`recomposeSceneText`) as a
one-directional derivation, not a second editable copy. Verified
end-to-end via Playwright, including a real Reference Library scan
(15 of 27 PDFs had usable bookmarks) and the upload-time confirm flow.

**2026-07-06 Lightweight rich text + mention page-editing**
(`docs/adr/0018-lightweight-rich-text.md`): Journal, Guide, WHAT's
Situation, WHO/WHERE/WHY/HOW's Focus, and the shared "Overview (shared)"
field all gained a small toolbar (Bold/Italic/Underline/bullet-list/
numbered-list) that inserts lightweight `**bold**`/`*italic*`/`_underline_`/
`- `/`1. ` markup — stored as plain text and rendered richly, the same
model `@mentions` already used, not live `execCommand` formatting (the
user's explicit choice, given `execCommand`'s cross-browser quirks and its
mismatch with this app's plain-text storage). Overview converts from a
plain `<textarea>` to a real mention-editor, gaining `@mention` support for
the first time. A real bug was found and fixed while wiring this up: a
`<label>` containing both the new toolbar's `<button>`s (labelable) and a
mention-editor `<div>` (not labelable) made the browser silently redirect
every click meant for the field to the label's first labelable descendant
instead — Chromium's built-in "click label text, focus its control"
behavior misfiring once the actual intended target (the div) stopped
qualifying as a real form control. Fixed by dropping the `<label>` wrapper
for the three affected fields in favor of a plain `<div class="field-
label">` (same CSS, no label semantics were actually needed). Also fixed,
per the user's direct testing and clarification: the mention tooltip
claimed "Ctrl/Cmd+Click to open — click to edit," which was backwards and
non-functional — a plain click always opened and there was no edit gesture
at all. Ctrl/Cmd+Click on a document mention now really edits its page
(`ui/shell.js`'s `editMentionPage`), and the tooltip describes the real
behavior. `docs/guide-content/5pfh-campaign-turn-sequence.txt` holds the
fully cross-referenced, correctly-renumbered "5PFH Campaign Turn Sequence"
content (every page reference converted to a real `@[...]` mention,
resolved to the correct one of three source books) ready to paste into a
new Guide document — campaign data lives in each GM's own browser storage,
not this repo, so this is the durable, versioned, paste-once copy rather
than a hardcoded-content import button (which would have baked one
specific ruleset's procedural content into permanent app code). Verified
end to end via Playwright: all five fields' toolbars persist real
`<b>/<i>/<u>/<ul>/<ol>` through a save/reload cycle; a numbered list stays
one continuous 1-8 `<ol>` (not two lists each restarting at "1."); a
mention nests correctly inside bold text; Ctrl/Cmd+Click edits a mention's
page while a plain click still navigates; the fixed label bug was
confirmed broken-then-fixed via direct DOM/focus-event inspection, not
just a passing high-level check.

**2026-07-06 Multi-document Guide tree with drag-and-drop reparenting**
(`docs/adr/0017-multi-doc-guide-tree.md`): the Guide tab grows from one
freeform field into named, nested documents (`campaign.guide: {docs,
activeId}`) organized in a tree below the main editor, reorganizable via
drag-and-drop on both mouse and touch — extending this app's existing
entity-linking touch-drag system rather than building a second one.
Create/rename/delete (cascades to descendants, confirmed first, naming the
doc and count)/reparent (appended after the target's existing children,
refusing a cycle), plus a "Top level" drop zone to un-parent. A real,
previously-impossible-to-hit migration-ordering bug was found and fixed
before it ever shipped: a naive random bootstrap id for the very first
migration-created root doc would let a pure read (taken before any write
ever happens) disagree with what a real write's migration later generates
— fixed with one deterministic fixed id (`'gd_root'`) both the read and
write paths share, caught by the domain tests before the UI was even
wired up. `.guide-editor` also gained a resize handle (its scrollbar was
already there via `overflow-y:auto`, just not obviously so without one).
Verified end to end: a real legacy single-field campaign seeded into a
fresh browser profile shows its old content immediately and migrates
losslessly on first edit; mouse drag reparents and un-parents correctly;
a simulated touch drag (CDP touch events, not just mouse) reparents too.

Also fixed the same day: a document-viewer bug found while investigating
this — two mentions of the same document at different pages already
correctly carried their own distinct page, but clicking a second mention
to an already-open doc left the viewer stuck on the first page (reassigning
an iframe's `src` to a URL differing only by its `#page=N` fragment isn't
reliably treated as a real navigation by a browser's built-in PDF viewer).
Now forces a real reload whenever the resolved src actually changes.

**2026-07-06 Oracle tags + entity-field "jump to relevant Oracle" links**
(`docs/adr/0016-oracle-tags-and-field-links.md`): a small reusable tag
vocabulary (`character`/`secret`/`setting`/`leadership`/`hook`/`agenda`/
`fear`/`faction`/`trade`/`discovery`) seeded onto real oracle tables
(`data/oracleTagSeeds.js`), same seed-then-campaign-override shape
`campaign.oracles.overrides` already used for edited table content. 13
entity fields across all 6 entity types (Faction's `hq`/`leadership`/
`scenarioSeed`/`agenda`/`fear`/`need`/`secret`, plus the shared Overview/
Revealed pair every type has) gained a right-aligned 🔮 icon
(`data/entityFieldOracleLinks.js`) that jumps to the Oracle drawer
pre-filtered to every table carrying the field's linked tag(s), with a
"Filtered by: ..." clear-badge. Oracle drawer table rows gained a 🏷 icon
(right-aligned alongside the existing ✎/🎲) revealing a hidden-by-default
tag editor; any tag a field link depends on is locked (shown 🔒, not
removable) so a GM can't silently break the link via the tag editor.
Verified end to end in a real browser: Faction's Fear icon jumps to `Fear
Trigger`/`NPC Secret` (excluding unrelated tables), NPC's Overview icon
jumps to `First Look`, both icon clusters are pixel-exact right-aligned.
Caught and fixed a real bug during verification: `openDrawerTab()` never
re-renders itself — every other call site piggybacked on a subsequent
`store.update()`'s `notify()`; the new field-link jump has no campaign
mutation to piggyback on, so it needed its own explicit `render()` call.

**2026-07-06 persistence moved from localStorage to IndexedDB**
(`docs/adr/0015-indexeddb-persistence.md`), triggered by a real save
failure (a Suggestion Lens pick threw a localStorage quota-exceeded error —
a campaign with a few embedded uploaded documents can hit the ~5-10MB
per-origin ceiling). A full Postgres backend was considered and rejected
as disproportionate (would require a server, breaking "double-click
index.html, works offline"); IndexedDB keeps the exact same local-only
architecture with roughly 1000x the headroom, verified directly under both
`file://` and `http://` before committing to it. `store.js` stays the only
persistence module and keeps its synchronous call shape everywhere (~100
call sites in `ui/shell.js` untouched) via an optimistic-update-then-
background-persist design; only `import()`/`restoreBackup()`/
`newCampaign()` became real `async` functions. Existing campaigns migrate
in losslessly on first load, verified with a real legacy campaign seeded
into a fresh browser profile. A quick independent stopgap shipped
alongside it: the Documents drawer now shows each uploaded file's
estimated size, so a GM can spot the large one without waiting on the
migration.

**Phases 0–9: done. Phase 10 (Ecosystem & reach) begun** with the Merchant
Rules Lens (`docs/adr/0003-trade-logistics.md` + `docs/adr/0004-merchant-
rules-lens.md`): a new `trade` drawer tab (between Colony and Docs) holds a
per-Location commodity market (`data/commodities.js` + `domain/trade.js`'s
`priceAt()` — supply/demand dials drive price, buy/sell nudge the local
dial so two Locations' prices never agree), the party's shared cargo
manifest, and a Contract board. A contract is a Thread with a few extra
reference fields (`kind: 'contract'`, `type`, `patronId`/`originId`/
`destinationId`, `payout`) rather than a new state machine — every existing
Thread control (clock, status, priority) works on one unchanged. "🎲
Generate" rolls the new Contract Type oracle table (Trade & Cargo group,
ADR 0004's 15-type taxonomy) and prices the payout from the real gap
between two Locations' markets when a route is picked; "+ Contract" opens
an inline name/type/patron/route/payout form (no popup). Cargo capacity
rides the existing Vehicle Bestiary template as one more field. Deferred
per ADR 0004 (ships/crew depth, faction politics, the 19-generator list,
etc.) — see the ADR for the full list.

**Phase 10 continued** with the two items ADR 0004 named as depending on
each other: a **Faction Pressure Track** (`domain/factions.js` — a
faction's pressure clock is a Thread tagged `kind: 'faction-pressure'`,
the same "reuse Threads" pattern Contracts already established; opt-in
per faction, plus an `agenda` field and a Faction Activity oracle table)
and a **Mission/Job generator** (`domain/missions.js`'s `generateMission()`,
payout/deadline scaled by `context.what.threat`, rolled into the Journal
via a new button there) — followed by the **Faction Rumor → Mission seed
link** in `copilot.js` those two unlock: a faction whose pressure track is
nearly full now surfaces as "a mission tied to them would land now,"
ranked just below a hot ordinary thread. Building this also surfaced and
fixed a real bug: `copilot.js`'s hot-thread check read `campaign.threads`
unfiltered, so a near-full Contract or Faction Pressure Track (both stored
in that same array) got flagged with the wrong generic thread phrasing —
now excludes anything carrying a `kind` tag.

**2026-07-06 next-request.md batch** (six small-to-medium asks plus two
substantial new subsystems, each verified in a real browser before
committing): Cybernetics renamed to **Enhancements**
(`src/domain/enhancements.js`, replacing `cybernetics.js`, tolerant legacy
read of old `entity.cyberware` data) with a per-item `type` dropdown
(`data/enhancementTypes.js` — Cybernetics/Wetware-Bio-Genetics/Psionics/
Gene-Modification, always shown since Hostile's own Wetware framing always
applies), collapsed by default, moved to render under the statblock section,
and its 🎲 roll now lands in the add-form's name field (overwritten by each
reroll, not journaled) instead of a toast+Journal entry, until "Install"
commits it. `deepenNpc`'s Want/Complication now append to Revealed/hidden
(GM) instead of Overview (Stereotype stays in Overview); Revealed/hidden is
collapsed by default and persistently stays expanded
(`entity.revealedOpen`) once a GM opens it for a given entity. Changing an
entity's Type now confirms via `window.confirm` before applying, reverting
on cancel. Cast drawer search now matches entity type, not just name/tags.
Fixed a real, if minor, bug: the Oracle drawer's search couldn't find
"Creature Concept" (a composite-generator button label, not a literal table
name) — a small `GROUP_ALIASES` map in `data/oracleGroups.js` fixes this
and any future same-shaped generator.

Two bigger pieces landed as their own ADRs. **Tag-driven Location economy
types** (`docs/adr/0013-trade-economy-types.md`, extending ADR 0003/0004):
`data/economyTypes.js` defines a Hostile-native model and a
"(Traveller-style)"-labeled model (the copyright-bridge naming convention
the request asked for), each type carrying `scarcity`/`manufacturing` dials
(0-10) instead of a literal tech level — a Location's economy type is an
ordinary tag, not a new field, so `domain/trade.js`'s new `economyBiasAt()`
checks a Location's tags against BOTH models regardless of which is active
via `settings.tradeEconomyModel`, meaning switching models mid-campaign
never orphans an already-tagged Location. **Game Mechanics Index**
(`docs/adr/0014-mechanics-index-pdfjs.md`): after being asked directly
whether to build a hand-curated list or real PDF text/page scanning, the
user chose real scanning — `assets/vendor/pdfjs/` vendors PDF.js's legacy
UMD build (one explicit, version-pinned exception to the zero-dependency
policy, loaded as a plain `<script>` tag, not through the ES-module
bundler) to search the Reference Library's PDFs for curated mechanic terms
and link each to its page, from a new Settings "🔄 Refresh Mechanics Index"
button, surfaced as clickable links (reusing the existing document-viewer
tab mechanism) in the Guide drawer. Verifying this under both `file://` and
`http://` (mandatory for this feature, not optional) caught a real bug
before it shipped: Chromium blocks a `file://` page from reading another
`file://` resource's bytes at all — a different, more fundamental
restriction than the well-known "no Worker from file://" one — so this one
feature needs `npm run serve`; every other feature is unaffected, and
Settings' copy says so plainly. Also fixed a real `scripts/build.js`
bundler gap found in the process: its export-rewriting regex didn't
recognize `export async function` (only `export function`/`export const`),
which this module's `scanMechanicsIndex` was the first to need.

**2026-07-06 `docs/adr/0009-situation-engine-revisited.md` built** (all
three Decision items, previously design-only): **Expedition trackers**
(`domain/expeditions.js`) model an expedition as a Thread tagged
`kind: 'expedition'` — its own clock is the Progress dial — gaining three
additional 0-10 dials (Supplies/Exposure/Morale, neutral midpoint 5)
instead of folding into a lifecycle status, per the user's explicit
correction to ADR 0008's original alternative; a "+ Expedition" button and
compact 3-slider block live in the WHY workspace's Threads list, and
`copilot.js` surfaces an observation once Supplies ≤2 or Exposure ≥8, the
same threshold-signal shape Stress/Resources already use. **Diplomacy
Engine fields** (`fear`/`need`/`secret`) landed on the Faction card
alongside hq/leadership/agenda. **Suggestion Lenses** finally give *What
Happens Next?* its own identity — it was wired to the exact same handler
as Continue Story despite a separate label; it now opens a small chip
picker (a random draw of 4 across a new Discovery Lens and Approach Lens
list, `data/suggestionLenses.js`) instead of generating immediately, and
picking one calls the new `suggestNextWithLens()` — Continue Story's own
`generateScene()`, just handed that lens's mapped Oracle categories (every
mapped path is a real, already-shipped table — no new oracle content) so
its Driver line pulls different, lens-flavored content instead of the
generic Plot Engine > Scene Driver. Continue Story itself is unchanged.
Verified end to end: picking "Economics" produced a scene whose Driver line
pulled from Corporate Powers/Factions content and journaled with a
"Lens: Economics" marker.

Phase 9 (Activity-driven gameplay) closed out with
the HOW workspace's Activity picker (`domain/activities.js`, looks up
`data/rulesConstitution.js`'s registered Rules Lens provider(s) for the
chosen Activity and offers a one-click "Use as default" that sets
`settings.statRuleset` — the Rules Constitution reference table is now a
live recommender, not just a read-only Settings page) and **genre packs**:
`data/genrePacks.js` registers three selectable oracle table sets —
Hostile (sci-fi, the pre-existing default), Cyberpunk/Shadowrun, and
Fantasy (D&D-style) — switchable from a new Settings dropdown
(`settings.genrePack`, defaults to `'hostile'` so old campaigns are
unaffected). Every oracle-consuming feature (Continue Story, oracle
rolls, Generate NPC, Universal Search, the Oracle drawer) threads the
active pack through `domain/oracles.js`'s `tablesWithOverrides()`; the two
new packs deliberately reuse the same category names the app's Co-Pilot/
NPC-generation logic references by hardcoded path, so those features work
unchanged regardless of which pack is active.

**2026-07-04 reliability + UX pass** (after confirming the Activity picker
and everything before it via a full test + browser regression sweep):
storage usage visibility + a restore-from-backup button in Settings; a
post-deploy smoke check on the Pages workflow; the Reference Library's
PDFs moved to Git LFS (with a history rewrite, verified via a fresh
clone); tabbed drawer switching (multiple drawers can stay pinned open);
three real responsive tiers (tablet gets a Co-Pilot edge-panel, distinct
from phone's bottom sheet) instead of one; two keyboard shortcuts
(Escape, Ctrl/Cmd+K); touch drag-and-drop for entity linking/@mentions
(HTML5 DnD never fires on touch at all) — see
`docs/mobile-drag-drop-test-cases.md`; and a PWA installability audit via
Chrome DevTools Protocol (clean — zero errors, offline mode verified by
actually going offline) that caught one real bug: the app icon still read
"SA" (pre-rebrand branding), now "GM" in the same style.

Phase 8 (Unified Discovery) closed out with Universal
Search, an oracle table entry editor (plus two ready-made content additions),
a Cast drawer type filter + search, and an NPC-generation oracle chain with
a one-click "Generate NPC" action. Feature-by-feature detail lives in
`DESIGN-NEW-FUNCTIONALITY.md`'s "Already built" and "Proposed next"
sections — this file doesn't keep a second copy.

Also fixed while working the Cast drawer: entity rows were both the click
target and the drag source, so a real mouse's jitter between mousedown/
mouseup could trigger a native drag instead of a click, making selection
feel broken — dragging now happens from a small dedicated grip.

**A real, previously-undiagnosed data-safety bug was found and fixed**
(2026-07-04): `store.js`'s one-slot backup write (kept *before* every real
save, as a safety net nothing currently restores from) needed quota for
two full copies of the campaign at once — once a campaign crossed roughly
half of `localStorage`'s quota (typically from several embedded document
uploads), the backup write started failing and, being treated as fatal,
silently blocked *every* subsequent save, not just the backup — including
something as simple as clicking to select a Cast entity. Root-caused from
a live user report and confirmed via a deterministic repro; the backup
write is now best-effort (skipped, not fatal, if it can't fit) — see
`docs/adr/0005-best-effort-backup-write.md`. A related fix landed
alongside it: `ui/shell.js`'s delegated handlers now catch any failure and
show a toast instead of a click silently doing nothing, so a future
storage-adjacent failure (or any other handler exception) is visible
instead of looking like an unresponsive UI.

**The GitHub Pages deploy was broken in three compounding ways**
(2026-07-04, all found via direct `curl`/API checks against the live
site, not from the workflow's own "success" status): the deploy published
the entire repository publicly (`README.md`, `tests/`, `package.json` all
served 200); the built `dist/app.bundle.js` never actually reached the
deployed site because it's gitignored and the Pages artifact upload
silently excludes gitignored paths, producing a black screen (the
`<script>` tag 404'd) and a service-worker install that could never
succeed (stuck retrying — its precache list named the same missing file);
and — the one that made the first two fixes look like they'd done
nothing — the repo's Pages source was set to "Deploy from a branch," so
none of this workflow's output was ever actually being served in the
first place. All three fixed: see
`docs/adr/0006-pages-deploy-allowlist-and-actions-source.md`. Verified
end to end post-fix: the live site now serves only the intended app files
and none of the previously-public repo internals.

**The Reference Library's PDFs (~445MB) moved to Git LFS**, including a
history rewrite of the existing commits (`git lfs migrate import` +
force-push, backed by a mirror clone taken first and explicit
confirmation before the rewrite) — `.git/objects` dropped from ~323MB to
~532KB, verified via a fresh clone. This immediately surfaced a real
regression (`actions/checkout` doesn't fetch LFS content by default, so
the deploy briefly served unresolved LFS pointer text instead of real
PDFs), caught and fixed the same day — see
`docs/adr/0007-git-lfs-for-reference-library-pdfs.md`.

Two other real bugs were found and fixed earlier (an unblurred field
losing its edit on refresh; a large *single* document upload silently
failing past localStorage's quota) — both recorded in `CLAUDE.md`'s
"Known non-issues" so they don't get relitigated; root-cause writeups are
in the archive.

**Design-only, not yet built:** Trade & Logistics / Merchant Rules Lens
(`docs/adr/0003`, `docs/adr/0004`) — Phase 10. Ten ruleset-review design
suggestions sorted into whichever phase actually fits each — see
`DESIGN-NEW-FUNCTIONALITY.md`.

**`requirements/design-principles/gameplay-mechanics.md` evaluated and
reconciled** (`docs/adr/0008-situation-engine.md`): most of what it
proposes (a "GM Prompt Hierarchy," an "Oracle Prompt Chain" technique,
"Campaign Momentum") turned out to already be this repo's WHAT card + Shift
Story reducers, `generateNpc`'s multi-table roll, and Session Recap +
Co-Pilot, respectively — arrived at independently, now named and
cross-referenced rather than re-treated as gaps. The four small
oracle-content additions this reconciliation identified (Salvage
Investigation, Site Survey, Cargo Interest, Anomaly Investigation) have
since shipped — see the Content addition entry below, not gated to Phase
10. ADR 0008 also explicitly declined an Expedition four-dial tracker,
structured Diplomacy fields, a Discovery-classification field, a Noncombat
taxonomy, and a mechanized session-composition budget — each was then put
back to the user individually (non-binding, suggestive), and
**`docs/adr/0009-situation-engine-revisited.md` reversed or redirected
four of the five**: Expedition tracking and Diplomacy fields are now
scoped to be built (design only so far — see the new Phase 10 bullets
below); Discovery Quality and Noncombat Resolution were redirected into a
single new mechanism, "Suggestion Lenses" for *What Happens Next?* (which
today does nothing different from Continue Story — a real gap this also
fixes). Only the session-composition budget stayed declined.

Tests: run `npm test` for the current count — not repeated here, goes
stale every session.

## Next / To-do

Ordered per the Design Constitution's pack-66 priority framework (continuity
> workflow > Context Graph > storage > recommendations > UX > integrations >
new features), already adopted in `docs/adr/0001`. Full detail and effort
estimates for every item below live in `DESIGN-NEW-FUNCTIONALITY.md`'s
"Proposed next" section — this is the short pointer, not a duplicate.

- **Phase 6** — complete, including the reopened **Stress/Tension** dial
  (Hostile's horror-design material, `context.what.stress`, same shape as
  Resources/Reputation — a `Raise Stress`/`Ease Stress` shift pair and a
  Co-Pilot reaction at both the high and low end).
- **Phase 7** — complete: `@` pointers into documents, typed/weighted
  relationships (incl. a Bond strength/stage weight), "flag, don't delete"
  invalid relationships, tag dropdowns, and a Faction card template.
- **Phase 8** — complete: Universal Search across entities/journal/oracles/
  documents/Party/Colony; an oracle table entry editor plus two content
  additions (Scenario Framing, Environmental Hazards); Cast drawer
  entity-type filter + search; an NPC-generation oracle chain plus a
  one-click "Generate NPC" action (and the 5PFH Patron Benefit/Hazard/
  Danger Pay job-offer tables).
- **Phase 9** — complete: HOW workspace Activity → Rules Lens recommender
  (`domain/activities.js`, wired into the HOW workspace card); genre packs
  (`data/genrePacks.js` — Hostile/Cyberpunk-Shadowrun/Fantasy, switchable
  in Settings).
- **Content addition (unphased)** — complete: four small Situation Engine
  oracle chains reconciled from `gameplay-mechanics.md` (`docs/adr/0008`),
  added as ordinary tables (no new domain code) within their existing
  `data/tables.js` groups: Salvage Investigation — What Happened/What
  Remains/Still Changing (`Derelicts`); Site Survey — What's Normal/What's
  Strange/What's Dangerous/What's Valuable/What's Beautiful, deliberately
  discovery-first (`Exploration`); Cargo Interest (`Trade & Cargo`);
  Anomaly Investigation — Observation/Hypothesis/Contradiction/Discovery
  (`Mysteries & Coverups`).
- **Phase 10 (lowest priority — new features), begun:**
  - **Trade & Logistics / Merchant Rules Lens** — done (the MVP slice ADR
    0004 scoped): `data/commodities.js`, `domain/trade.js` (market dials,
    `priceAt()`, buy/sell + cargo manifest, contracts-as-Threads), the
    Contract Type oracle table, a Cargo Capacity Vehicle-template field, and
    the `trade` drawer (market/manifest/contracts). Still open, per ADR
    0004 (deliberately deferred, not forgotten): ships/crew as rich
    subsystems, and a Faction Standing tracker keyed to contract payout/
    availability — the Faction Rumor seed link itself has since landed
    (see Faction Pressure Track below), just pointed at missions rather
    than contracts specifically. Extended 2026-07-06 by **tag-driven
    Location economy types** (`docs/adr/0013-trade-economy-types.md`): a
    Location tag can now name an economy type (`data/economyTypes.js` — a
    Hostile-native model and a "(Traveller-style)"-labeled model, only one
    active at a time via `settings.tradeEconomyModel`) biasing
    `priceAt()` via scarcity/manufacturing dials instead of a literal tech
    level; switching models never orphans an already-tagged Location.
  - **Faction Pressure Track** — done: `domain/factions.js`'s
    `createPressureTrack`/`getPressureTrack`/`factionsUnderPressure` model a
    faction's pressure clock as a Thread tagged `kind: 'faction-pressure'`
    plus a `factionId` reference, exactly the pattern Contracts already
    established — every existing Thread mutator works on one unchanged.
    Opt-in per faction (a "+ Pressure Track" button in the Faction card, not
    auto-created). A new `agenda` field (free text) and a "Faction Activity"
    oracle table (Corporate Powers group) round out the card. Fixed a real
    bug found while wiring this in: `copilot.js`'s "hot thread" detection
    read `campaign.threads` unfiltered, so a near-full Contract or Faction
    Pressure Track (both stored there too) got flagged with the wrong
    generic thread-name phrasing instead of their own subsystem's message —
    now excludes any thread carrying a `kind` tag.
  - **Mission/Job generator** — done: `domain/missions.js`'s
    `generateMission()` returns `{payout, deadlineDays, complication,
    penalty}`, `danger` defaulting to `context.what.threat` so higher
    ambient threat produces higher-stakes, higher-payout missions
    automatically. The complication rolls from the existing Miscellaneous →
    Story Complication oracle table — no new table. A "🎲 Generate Mission"
    button in the Journal drawer rolls one straight into a Journal note
    (`formatMission()`), distinct from a Trade contract (no route/patron/
    commodity) since it's aimed at non-trade jobs.
  - **Faction Rumor → Mission seed link** — done: `copilot.js`'s `advise()`
    surfaces a faction whose pressure track is ≥75% full ("a mission tied to
    them would land naturally now"), ranked just below a hot ordinary
    thread — the same "one more push" signal `threadUnderPressure()` already
    gives ordinary threads, extended to factions now that both a pressure
    clock and a mission generator exist.
  - **Faction-turn/rumor automation** — done, scoped small per the
    2026-07-06 direction (user chose this over the other three remaining
    items, each of which needs external input first — see below):
    `domain/factions.js`'s `advanceFactionTurns()` is a GM-triggered bulk
    action, not a background scheduler (Article II) — every faction that
    already has a Pressure Track (skips ones nobody's tracking) advances by
    one deterministic tick and rolls a "rumor" from the existing Faction
    Activity oracle table. A "🎲 Advance Faction Turns" button in the
    Journal drawer rolls a turn for every tracked faction at once and
    journals the results (`formatFactionTurnRumors()`).
  - **Expedition trackers, Diplomacy fields, Suggestion Lenses** — done,
    per `docs/adr/0009-situation-engine-revisited.md` (all three Decision
    items). A Thread tagged `kind: 'expedition'` gains three 0–10 dials
    (`supplies`/`exposure`/`morale`, alongside its own clock as "progress")
    via `domain/expeditions.js`, with a "+ Expedition" button and a compact
    3-slider block in the WHY workspace's Threads list, plus a `copilot.js`
    threshold observation (Supplies ≤2 or Exposure ≥8). The Faction card
    gains `fear`/`need`/`secret` fields alongside hq/leadership/agenda.
    *What Happens Next?* (previously identical to Continue Story) now opens
    a Suggestion Lens chip picker instead — a random draw of 4 across a new
    Discovery Lens and Approach Lens list (`data/suggestionLenses.js`,
    `gameplay-mechanics.md`'s two eight-item taxonomies); picking one calls
    `suggestNextWithLens()`, which rolls the scene's Driver line from that
    lens's mapped real Oracle categories instead of the generic Plot Engine
    > Scene Driver. Continue Story itself is unchanged.
  - **Traveller / Stars Without Number content** — done, per
    `docs/adr/0010-traveller-swn-content.md` (which also records reversing
    one specific call from `docs/adr/0002` — giving Traveller a character
    template — on direct user request). Neither system has a sourcebook in
    this repo's library, so both are honestly-labeled **original content**,
    not a transcription: Traveller gets a `data/rulesets.js` character
    ruleset (STR/DEX/END/INT/EDU/SOC, collapsed to this app's usual small-
    modifier abstraction) finally giving `domain/dice.js`'s long-unused
    `rollTraveller` (2d6 vs 8) an actual character sheet to run on; SWN gets
    a new "Stars Without Number" oracle group (Faction Action, World Tag),
    with Faction Action reachable as a second 🎲 button on the Faction card
    alongside the existing Faction Activity roll. `rulesConstitution.js`'s
    status strings for both providers updated to reflect what's now
    authored.
  - **SWN content deepened, CWN cybernetics borrowed** — done, per
    `docs/adr/0011-swn-cwn-content.md` (extends `docs/adr/0010`, on direct
    user request, after the actual SWN Revised Deluxe and CWN Deluxe PDFs
    were added to `assets/docs/`). Still original content, not a
    transcription — reading the real books informed which CONCEPTS to
    reimplement, not what text to copy. Faction creation: `force`/`cunning`/
    `wealth` (0-10) plus a growing Assets list per faction
    (`entities.js`/`domain/factions.js`), with an original "Faction Asset"
    oracle table to roll-and-append one. Turn-based mini-game:
    `resolveFactionTurn` resolves a faction's turn as a d10 + its acting
    stat vs. a flat difficulty (a strong success raises that stat, a
    setback adds an extra Pressure Track tick) — wired into both the
    existing bulk "Advance Faction Turns" action and a new per-faction "▶
    Turn" button on the Faction card. Deepening NPCs: `domain/session.js`'s
    `deepenNpc` rolls new Stereotype/Want/Complication tables onto an
    EXISTING NPC's Overview (a "🎲 Deepen" button in Entity Detail), instead
    of only building brand-new NPCs. Styling creatures/places/adventure
    seeds: three new combinatorial oracle groups + `domain/worldbuilding.js`
    generators — Xenobestiary (Creature Origin/Method/Trait/Threat), Site
    Concept (Feature/Danger/Wonder), Adventure Seed (Hook/Twist, reusing the
    existing Story Complication table for its third beat) — each with its
    own Journal drawer roll button. CWN's cybernetics concept (Strain-vs-
    capacity augmentation) landed as a new `domain/cybernetics.js` module
    and a Cybernetics section in the NPC inspector, with an "Augmentation"
    oracle group for flavor — deliberately NOT a new `RULES_PROVIDERS` entry
    (CWN was never one of the six named systems; see the ADR's Alternatives
    Considered for why that line wasn't crossed). **Renamed to
    "Enhancements" 2026-07-06** (`domain/enhancements.js`, per
    `docs/adr/next-request.md`) — see the batch entry in Status Summary
    above; `domain/cybernetics.js` no longer exists.
  - **Enhancements rework, Revealed/hidden rework, Cast search, Oracle
    search alias fix, Game Mechanics Index** — all done 2026-07-06, per
    `docs/adr/next-request.md`'s batch described in the Status Summary
    above (not re-detailed here to avoid a third copy); the two
    substantial pieces have their own ADRs (`docs/adr/0013-trade-economy-
    types.md`, `docs/adr/0014-mechanics-index-pdfjs.md`).
  - **Remaining, not yet started:** Shipyard companion link — **scoped**
    (`docs/adr/0029-shipyard-deckplan-builder.md`) after reading the real
    GitLab source: a gridless Battlemap map plus a Gallery-style tagged
    part library (fixing the reference tool's own "scroll and hover, no
    filter" limitation) and one new capability, icon rotation/flip — not
    a new drawer, still not built. Sync adapter / shared campaign
    database — the backend choice is answered
    (Supabase, 2026-07-08), but see `docs/adr/0028-multiuser-access-and-
    cloud-sync.md`: it arrived bundled with a full multi-user/auth/
    membership-tier product ask, a genuine architectural fork from this
    app's local-first design, recorded as long-horizon and **not
    started** per the user's own explicit choice, pending a dedicated
    architecture-decision pass (source of truth, conflict resolution,
    dependency posture, tier gating — see the ADR).
  - **Phase 11 backlog added 2026-07-06** (`DESIGN-NEW-FUNCTIONALITY.md`'s
    new Phase 11 section, from `docs/adr/next-request.md`'s "Add to
    roadmap" ask): Gallery (per-entity thumbnails + a tagged image
    collection), a Planetfall Grid Battlemap and Base Builder, an
    Encounter Manager, an Owlbear-Rodeo-style Interactive Maps editor, and
    external links in rich-text fields — recorded at the ask's own level
    of detail, each expected to get its own research/ADR pass before
    starting, same as every other substantial addition in this file.
    **Gallery is now built** (2026-07-07, `docs/adr/0021-gallery.md`, see
    the Status Summary above) — the dependency-root item per this
    section's own ordering note. **External links in rich-text fields is
    now built too** (2026-07-07, see the Status Summary above) — it never
    needed the canvas-primitive research the other three do, so it didn't
    have to wait its turn in the dependency order. **Planetfall Grid
    Battlemap is in progress** (2026-07-08, `docs/adr/0023-planetfall-
    grid-battlemap.md`, see the Status Summary above for what's actually
    done vs. still open) — absolutely-positioned DOM elements plus this
    app's existing HTML5 drag-and-drop system, extended with a fourth
    custom MIME type, turned out not to need a genuinely new "canvas
    primitive" the way the original ordering note assumed.
    **Base Builder, Encounter Manager, and Interactive Maps are
    superseded**: a much larger VTT feature wishlist arrived 2026-07-08
    (`docs/adr/next-request.md`'s "Added 7/8" entry) asking these be
    reprioritized as "an encounter and gameplay tool, not a map designer."
    Reconciled in `docs/adr/0024-battlemap-encounter-roadmap.md`, which
    collapses all three into feature-flagged extensions of the one
    Battlemap subsystem above (11b encounter overlays, 11c room/asset
    templates + procedural generation, 11d deeper campaign-integration
    links, 11e manual-reveal fog of war, 11f multi-map floors) rather than
    three separate drawers — and explicitly declines infinite canvas,
    dynamic lighting/raycasting, VTT export formats, and freehand drawing
    tools as disproportionate to this app's zero-dependency DOM
    architecture. None of 11b–11f start before 11a (this section, above)
    is actually finished.
- **UI/UX assumptions, resolved in the 2026-07-04 pass** (see Status
  Summary above): tabbed drawer switching replaced "only one drawer open at
  a time"; three real responsive tiers replaced one breakpoint; Escape and
  Ctrl/Cmd+K shortcuts landed; touch drag-and-drop covers the
  mobile/tablet gap (`docs/mobile-drag-drop-test-cases.md`); PWA
  installability was audited clean. **Still open**: no in-session undo
  beyond the one-slot backup; toasts are single-slot and can clobber each
  other during multi-file upload; icon-only buttons still rely on hover
  tooltips that don't fire on touch; a direct 2026-07-08 ask ("more
  compact access to forms and tabs" on mobile) is unscoped — needs
  specifics on which screens feel cramped before it's actionable.
