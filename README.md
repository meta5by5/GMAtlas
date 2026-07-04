# GMAtlas

A campaign operating system for solo and GM-run sci-fi tabletop play. Static, local-first, installable as an offline PWA. This is the clean re-architecture branched from the v0.53 prototype.

## Design philosophy — Frictionless Empowerment

The app exists to let a GM run a four-hour session without thinking about the software. Everything is organized into three visual tiers:

- **Primary (~85% of the screen):** Mission Control, the WHO / WHERE / WHAT / WHY / HOW context strip, the Adaptive Workspace, and the always-visible Co-Pilot.
- **Secondary:** current recommendation, breadcrumb timeline, story-shift actions.
- **Tertiary:** Journal, Oracle, Entity inspector, Graph, Documents, Settings — all edge-tab drawers, taking zero space until summoned.

The defining interaction: **the workspace changes, not the application.** Selecting a context question reshapes the center panel; it never navigates away.

## Architecture

One versioned campaign document is the single source of truth. There is exactly one module that touches `localStorage` (`src/core/store.js`); everything else reads and writes through it and subscribes to changes. No global function reassignment, no polling, no timing hacks — the failure modes of the v0.53 patch-on-patch build are structurally excluded.

```
src/
  core/     store.js · schema.js · migrate.js     ← data layer (single doc)
  domain/   copilot.js (+ context/scenes/oracles as phases land)   ← pure logic, testable
  ui/       shell.js · copilotPanel.js · workspace/ · drawers/      ← rendering
  main.js   boot: migrate → render → subscribe
styles/     tokens.css (the three tiers) · cockpit.css (layout)
tests/      migrate.test.js + fixtures
```

### Data safety

`src/core/migrate.js` was written before any UI. It absorbs all ~15 legacy v0.53 / pre-rebrand `hostile*` storage keys into one document and preserves anything it cannot map under `_legacy`, so the transformation provably drops nothing. Old *Hostile Sci-fi Worldbuilder* exports import forever.

## Develop

No build step is required to run it.

```bash
npm run serve     # serves at http://localhost:8080 (any static server works)
npm test          # runs the migration test suite (node --test)
```

Open the served URL. On first launch the store migrates any legacy data, then renders the empty cockpit shell.

## Status

- [x] **Phase 0** — single versioned campaign document + store + lossless migration (tested)
- [x] **Phase 0** — three-tier cockpit shell, context strip, adaptive workspace, PWA, file:// bundle
- [x] **Phase 1** — oracle roll engine, scene generation, context model ported as pure, tested modules
- [x] **Phase 2** — interactive cockpit: Continue Story, Shift Story reducers, Oracle + Journal drawers, live Co-Pilot, timeline
- [x] **New** — Threads (progress clocks) with Co-Pilot awareness
- [x] **Phase 3A** — entity inspector + `@mention` auto-linking; WHO/WHERE cards populate from real entities
- [x] **Phase 3B** — force-directed relationship graph over the entity links, click-through to the inspector, live badges
- [x] **Phase 3C** — NPC/vehicle statblocks (auto-attached, `#vehicle` tag aware), drag-and-drop entity↔entity linking, drag-and-drop entities into Journal/context fields as `@mentions`, a Build panel (phase/version/changelog) in Settings
- [x] **Phase 3D** — Crew-Link-style statblock tracks: any field can be a numeric click-to-set scale (row of boxes), with double-click-to-roll (d6 + value vs 2 challenge dice, filed to the Journal)
- [x] **Phase 4** — Document Library: auto-scanned Reference Library from `assets/docs/` (rebuilds with the folder) + real file uploads; ruleset-driven Character Sheets (Starforged/5PFH) as rollable stat/resource tracks, switchable per entity; Crew Link new-tab companion link in Settings
- [ ] **Phase 4 (remaining)** — `@` pointers into documents (page-anchored mention/autocomplete); Shipyard companion link; full responsive polish; retire legacy nav
- [x] **Phase 5** — design review pass (see PROGRESS.md USER NOTES / ISSUES FINDINGS): Party, Colony, and Guide drawers; Bestiary statblock templates (per-system, Settings-editable, per-NPC template selection); grouped/collapsible/searchable Oracle tree; Document Library multi-upload + tags + search + rename + in-app PDF viewer panel; editable relationship notes; three reported bugs fixed (stale service-worker cache, missing GitHub Pages build, a broken Journal render path)
- [x] **Phase 6** — Campaign Continuity: Session Recap ("Previously on..."); attribute fields redesigned as directly-editable, format-configurable, label-click-to-roll stats (sign/inches/plain; Starforged/5PFH/Traveller/none dice models); Thread lifecycle (7-state, priority); Co-Pilot "What did I overlook?" (dormant/untouched threads); Narrative Trackers (Resources/Reputation dials alongside threat/mystery, with matching Shift actions and Co-Pilot awareness).
- [x] **Phase 7 (in progress)** — Context Graph depth: tags are now removable chips + a per-entity-type vocabulary dropdown (was a plain comma-separated text field). Remaining: `@` pointers into documents with page anchors, typed/weighted relationships, "flag don't delete" invalid relationships.
- [ ] **Phase 8+** (future) — Universal Search/oracle editor, Activity-driven HOW workspace, Shipyard link + sync adapter — see `DESIGN-NEW-FUNCTIONALITY.md`.

See `DESIGN-NEW-FUNCTIONALITY.md` for the full plan and the current build/changelog in-app under Settings → Build.

116 unit tests (`npm test`) cover migration and the domain layer. Run `npm run build` after editing anything under `src/`.
