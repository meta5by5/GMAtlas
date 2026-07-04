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

**Phases 0–8: done. Phase 9 (Activity-driven gameplay) in progress:** the
HOW workspace question now has an Activity picker (`domain/activities.js`)
that looks up `data/rulesConstitution.js`'s registered Rules Lens
provider(s) for that Activity and offers a one-click "Use as default"
button (sets `settings.statRuleset`) — the Rules Constitution reference
table is now a live recommender, not just a read-only Settings page. Genre
packs (Phase 9's other item) is still open.

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

Two other real bugs were found and fixed earlier (an unblurred field
losing its edit on refresh; a large *single* document upload silently
failing past localStorage's quota) — both recorded in `CLAUDE.md`'s
"Known non-issues" so they don't get relitigated; root-cause writeups are
in the archive.

**Design-only, not yet built:** Trade & Logistics / Merchant Rules Lens
(`docs/adr/0003`, `docs/adr/0004`) — Phase 10. Ten ruleset-review design
suggestions sorted into whichever phase actually fits each — see
`DESIGN-NEW-FUNCTIONALITY.md`.

Tests: run `npm test` for the current count — not repeated here, goes
stale every session.

## Next / To-do

Ordered per the Design Constitution's pack-66 priority framework (continuity
> workflow > Context Graph > storage > recommendations > UX > integrations >
new features), already adopted in `docs/adr/0001`. Full detail and effort
estimates for every item below live in `DESIGN-NEW-FUNCTIONALITY.md`'s
"Proposed next" section — this is the short pointer, not a duplicate.

- **Phase 6** — complete; one candidate reopened: a **Stress/Tension**
  narrative dial (Hostile's horror-design material), same shape as
  Resources/Reputation. *Low effort.*
- **Phase 7** — complete: `@` pointers into documents, typed/weighted
  relationships (incl. a Bond strength/stage weight), "flag, don't delete"
  invalid relationships, tag dropdowns, and a Faction card template.
- **Phase 8** — complete: Universal Search across entities/journal/oracles/
  documents/Party/Colony; an oracle table entry editor plus two content
  additions (Scenario Framing, Environmental Hazards); Cast drawer
  entity-type filter + search; an NPC-generation oracle chain plus a
  one-click "Generate NPC" action (and the 5PFH Patron Benefit/Hazard/
  Danger Pay job-offer tables).
- **Phase 9 (in progress)** — HOW workspace Activity → Rules Lens
  recommender: **done** (`domain/activities.js`, wired into the HOW
  workspace card); genre packs: still open.
- **Phase 10 (lowest priority — new features)** — Trade & Logistics /
  Merchant Rules Lens (contracts as the primary loop, `docs/adr/0003` +
  `0004`); a Mission/Job generator (`domain/missions.js`, payout scaled by
  the existing threat tracker); a Faction Pressure Track (extends
  `threads.js` onto faction entities) plus a Co-Pilot link between it and
  generated missions; Shipyard companion link (blocked on a known URL, not
  effort); a sync adapter / shared campaign database; Traveller/Stars
  Without Number content (both named Rules Constitution providers with zero
  authored data and no sourcebook in this repo's library); faction-turn/
  rumor automation.
- **UI/UX assumptions flagged for explicit confirmation** (not scheduled,
  each a product decision rather than a bug): only one drawer opens at a
  time vs. a "drawers stack side by side" brief; one responsive breakpoint
  instead of a three-way desktop/tablet/phone split; no keyboard shortcuts
  or command palette; no in-session undo beyond a one-slot backup; toasts
  are single-slot and can clobber each other during multi-file upload;
  drag-and-drop (the primary linking interaction) has no confirmed touch
  equivalent; icon-only buttons rely on hover tooltips that don't fire on
  touch; PWA installability hasn't been checked against a concrete
  checklist since Phase 0.
