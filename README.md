# GMAtlas

A campaign operating system for solo and GM-run sci-fi tabletop play. Static, local-first, installable as an offline PWA. This is the clean re-architecture branched from the v0.53 prototype.

## Design philosophy — Frictionless Empowerment

The app exists to let a GM run a four-hour session without thinking about the software. Everything is organized into three visual tiers:

- **Primary (~85% of the screen):** Storyboard, the WHO / WHERE / WHAT / WHY / HOW context strip, the Adaptive Workspace, and the always-visible Narrative Composer (or "Composer").
- **Secondary:** current recommendation, breadcrumb timeline, story-shift actions.
- **Tertiary:** Journal, Oracle, Entity inspector, Graph, Documents, Settings — all edge-tab drawers, taking zero space until summoned.

The defining interaction: **the workspace changes, not the application.** Selecting a context question reshapes the center panel; it never navigates away.

## Architecture

One versioned campaign document is the single source of truth. There is exactly one module that touches `localStorage` (`src/core/store.js`); everything else reads and writes through it and subscribes to changes. No global function reassignment, no polling, no timing hacks — the failure modes of the v0.53 patch-on-patch build are structurally excluded. `src/core/migrate.js` absorbs all ~15 legacy v0.53 / pre-rebrand `hostile*` storage keys into one document losslessly, so old *Hostile Sci-fi Worldbuilder* exports import forever.

The current file map and the full list of non-negotiable architectural rules (which this README doesn't duplicate, since it drifts if kept in two places) live in `CLAUDE.md`.

## Develop

No build step is required to run it over a static server (`file://` needs the bundle — see `CLAUDE.md`'s "The bundler" section).

```bash
npm run serve     # serves at http://localhost:8080 (any static server works)
npm test          # runs the domain-logic + migration test suites (node --test)
```

Open the served URL. On first launch the store migrates any legacy data, then renders the empty cockpit shell.

## Status

- [x] Phase 0 — foundation (single campaign document, three-tier shell, PWA)
- [x] Phase 1 — oracle/scene/context engine ported as pure, tested modules
- [x] Phase 2 — the interactive cockpit (Continue Story, Shift Story, Composer, timeline)
- [x] Phase 3 (A–D) — entities, relationship graph, statblocks, drag-and-drop, numeric tracks
- [x] Phase 4 — Document Library, ruleset-driven Character Sheets
- [x] Phase 5 — Party/Colony/Guide drawers, Bestiary templates, Oracle tree, Document upload/tags/PDF viewer
- [x] Phase 6 — Campaign Continuity (Session Recap, Thread lifecycle, Narrative Trackers, Composer "what did I overlook?")
- [x] Phase 7 — Context Graph depth (tag dropdowns, `@`-doc-pointers-with-page-anchors, typed/weighted relationships, "flag don't delete", Faction card template)
- [x] Phase 8 — Unified Discovery (Universal Search, Oracle table editor, Cast filter/search, NPC-generation oracle chain)
- [x] Phase 9 — Activity-driven gameplay (HOW → Rules Lens recommender, genre packs: Hostile/Cyberpunk-Shadowrun/Fantasy)
- [ ] Phase 10 — Merchant Rules Lens (contract-driven trade, Trade drawer, tag-driven Location economy types), Faction Pressure Track, Mission generator, Traveller/SWN/CWN content, Enhancements (renamed from Cybernetics), Game Mechanics Index, Expedition trackers, Diplomacy fields, Suggestion Lenses, lightweight rich text (toolbars everywhere, mention page-editing, tables, Journal editing), a WHERE tab tag-filter redesign, split Latest Scene fields, and Reference Library Table of Contents generation all done; Shipyard companion link and a sync adapter still open (both blocked on external input, not effort)
- [ ] Phase 11 (in progress) — Visual & Tactical Tools: Gallery (per-entity thumbnails + a tagged image collection), external rich-text links, and the Planetfall Grid Battlemap done; Planetfall Base Builder, Encounter Manager, and Interactive Maps still open
- [x] Phase 12 — Story Dashboard (`docs/adr/0040-story-dashboard.md`): the 5 WHO/WHERE/WHAT/WHY/HOW tabs are retired — a single consolidated Dashboard (open/collapsible sections + a top-right Narrative Composer) plus a Composer "decision sandbox" (Story Options, Suggestion Lenses, Rules Lens, oracle generators) done; the small remainder (dead-export housekeeping, 8 orphaned Shift reducers) folded into Phase 13's tracking
- [ ] Phase 13 (in progress) — Scene Operating Model: WHERE's Location Details hierarchy + WHO's three scene-scoped NPC groups (Protagonists/Antagonists/Bystanders, each with oracle-seeded Disposition/Motivation/Threat Rank/Challenges/Opportunities that remember GM edits via `oracles.overrides`) done; WHAT's News Events/Dangers/Shared Circumstances, WHY/HOW oracle work, a guided walkthrough mode, and manual-dice-result consequences still open
- [ ] Phase 14 (in progress) — Storyboard re-layout: the Story Dashboard/Narrative Composer/Co-Pilot trio renamed to Composer/Navigator/Advisor everywhere, split into real independently-scrolling sibling panels, the Advisor sharing the desktop drawer tab strip when a drawer is open, and — after real phone testing found the original stacked-column approach left Navigator unreachable — Composer/Navigator/Advisor now permanently pinned as unclosable tabs in a tab menu that's always open at every compact width (phone AND tablet, unified into one tier), with real drawers adding closable tabs alongside them (`design/UX-ROADMAP.md` Steps 1–5) done; a phone/tablet touch/gesture polish pass and the Moves-menu icon placement check still open

Each phase's actual feature list, plus what's still open per phase, is in
`requirements/functional-requirements-v3.md` — not repeated here to avoid
two copies drifting apart. The in-app Settings → Build panel carries the
same changelog. Run `npm run build` after editing anything under `src/`.
