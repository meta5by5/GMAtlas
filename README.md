# GMAtlas

A campaign operating system for solo and GM-run sci-fi tabletop play. Static, local-first, installable as an offline PWA. This is the clean re-architecture branched from the v0.53 prototype.

## Design philosophy — Frictionless Empowerment

The app exists to let a GM run a four-hour session without thinking about the software. Everything is organized into three visual tiers:

- **Primary (~85% of the screen):** Mission Control, the WHO / WHERE / WHAT / WHY / HOW context strip, the Adaptive Workspace, and the always-visible Co-Pilot.
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
- [x] Phase 2 — the interactive cockpit (Continue Story, Shift Story, Co-Pilot, timeline)
- [x] Phase 3 (A–D) — entities, relationship graph, statblocks, drag-and-drop, numeric tracks
- [x] Phase 4 — Document Library, ruleset-driven Character Sheets
- [x] Phase 5 — Party/Colony/Guide drawers, Bestiary templates, Oracle tree, Document upload/tags/PDF viewer
- [x] Phase 6 — Campaign Continuity (Session Recap, Thread lifecycle, Narrative Trackers, Co-Pilot "what did I overlook?")
- [x] Phase 7 — Context Graph depth (tag dropdowns, `@`-doc-pointers-with-page-anchors, typed/weighted relationships, "flag don't delete", Faction card template)
- [x] Phase 8 — Unified Discovery (Universal Search, Oracle table editor, Cast filter/search, NPC-generation oracle chain)
- [x] Phase 9 — Activity-driven gameplay (HOW → Rules Lens recommender, genre packs: Hostile/Cyberpunk-Shadowrun/Fantasy)
- [ ] Phase 10 (in progress) — Merchant Rules Lens done (contract-driven trade, Trade drawer); Mission generator, Faction Pressure Track, sync adapter still open

Each phase's actual feature list, plus what's still open per phase, is in
`DESIGN-NEW-FUNCTIONALITY.md` — not repeated here to avoid two copies
drifting apart. The in-app Settings → Build panel carries the same
changelog. Run `npm run build` after editing anything under `src/`.
