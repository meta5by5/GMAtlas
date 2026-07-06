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
10. Everything else the document proposed (an Expedition four-dial tracker, structured
Diplomacy fields, a Discovery-classification field, a Noncombat taxonomy, a
mechanized session-composition budget) is explicitly declined, with
reasons, in the ADR.

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
    than contracts specifically.
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
  - **Remaining, not yet started (each blocked on external input, not
    effort):** Shipyard companion link (needs the tool's actual URL);
    a sync adapter / shared campaign database (needs a decision on what
    backend to sync to); Traveller/Stars Without Number content (both named
    Rules Constitution providers with zero authored data and no sourcebook
    in this repo's library — needs a call on original content vs. waiting
    for the real books).
- **UI/UX assumptions, resolved in the 2026-07-04 pass** (see Status
  Summary above): tabbed drawer switching replaced "only one drawer open at
  a time"; three real responsive tiers replaced one breakpoint; Escape and
  Ctrl/Cmd+K shortcuts landed; touch drag-and-drop covers the
  mobile/tablet gap (`docs/mobile-drag-drop-test-cases.md`); PWA
  installability was audited clean. **Still open**: no in-session undo
  beyond the one-slot backup; toasts are single-slot and can clobber each
  other during multi-file upload; icon-only buttons still rely on hover
  tooltips that don't fire on touch.
