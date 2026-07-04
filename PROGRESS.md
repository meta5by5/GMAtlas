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

**Phases 0–6: done. Phase 7 (Context Graph depth): in progress** (tag
dropdowns shipped; relationships/`@`-doc-pointers/Faction template still
open). Feature-by-feature detail lives in `DESIGN-NEW-FUNCTIONALITY.md`'s
"Already built" and "Proposed next" sections — this file doesn't keep a
second copy.

Two real bugs were found and fixed along the way (an unblurred field losing
its edit on refresh; a large document upload silently failing past
localStorage's quota) — both recorded in `CLAUDE.md`'s "Known non-issues"
so they don't get relitigated; root-cause writeups are in the archive.

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
- **Phase 7 (in progress)** — `@` pointers into documents; typed/weighted
  relationships (incl. a Bond strength/stage weight); "flag, don't delete"
  invalid relationships; a Faction card template.
- **Phase 8** — Universal Search across entities/journal/oracles/documents/
  Party/Colony; an oracle table entry editor (two ready-made content
  additions — Scenario Dilemma, Environmental Hazard — don't need to wait
  for it); Cast drawer entity-type filter + search; an NPC-generation oracle
  chain plus a one-click "Generate NPC" action.
- **Phase 9** — HOW workspace becomes Activity → Rules Lens driven instead
  of free text; genre packs.
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
