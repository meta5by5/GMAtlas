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
  - **Remaining, not yet started (each blocked on external input, not
    effort):** Shipyard companion link (needs the tool's actual URL);
    a sync adapter / shared campaign database (needs a decision on what
    backend to sync to).
- **UI/UX assumptions, resolved in the 2026-07-04 pass** (see Status
  Summary above): tabbed drawer switching replaced "only one drawer open at
  a time"; three real responsive tiers replaced one breakpoint; Escape and
  Ctrl/Cmd+K shortcuts landed; touch drag-and-drop covers the
  mobile/tablet gap (`docs/mobile-drag-drop-test-cases.md`); PWA
  installability was audited clean. **Still open**: no in-session undo
  beyond the one-slot backup; toasts are single-slot and can clobber each
  other during multi-file upload; icon-only buttons still rely on hover
  tooltips that don't fire on touch.
