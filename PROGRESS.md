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
- Tests: 65 domain tests passing locally — Passing

## Next / To-do
- Phase 4 remainder: `@` pointers into documents (page-anchored mention/autocomplete), Shipyard companion link, full responsive polish, retire legacy nav
- Genre packs (roadmap item D) and Oracle table editor (item C) remain unstarted

## Notes
- Stat templates inserted by the inspector are created via `setEntityStatsTemplate()` (domain/entities.js).
- Inline journal badges render parsed Stats from mentioned entities' statblocks.

