## USER NOTES and CHANGE REQUESTS

Empty — ready for the next batch. Drop new asks here and say "process
requests in docs/adr/next-request.md" (or similar) to have them picked up.

<!-- Processed 2026-07-03:
- requirements/ reorg (subfolders + extracted zips) — acknowledged, CLAUDE.md
  updated to match (see "The Design Constitution" section).
- Merchant trade concepts (Saga_Atlas_Merchant_*.txt) incorporated and
  consolidated into docs/adr/0004-merchant-rules-lens.md (reconciled with
  docs/adr/0003-trade-logistics.md); the three source .txt files were removed
  from requirements/ per the request, content fully captured in the ADR.
- CLAUDE.md / PROGRESS.md cleanup — done. Stale references fixed (requirements/
  paths, test count, phase status), PROGRESS.md's historical narrative moved to
  docs/archive/progress-log-2026-07.md, roadmap/design content preserved.
- Cheaper-model question — answered directly in-conversation, not written to
  a file (it's a judgment call for the user, not a design decision to record).
-->

<!-- Processed 2026-07-06 (the "Add 7/5/26" batch below):
- Cybernetics section: collapsed by default, moved under the statblock
  section, renamed "Enhancements" with a per-item type dropdown (Cybernetics/
  Wetware-Bio-Genetics/Psionics/Gene-Modification — always shown, since
  Hostile's own Wetware framing always applies), and its 🎲 roll now lands in
  the add-form's name field (overwritten by each reroll) instead of a
  toast+Journal entry, until "Install" commits it. domain/cybernetics.js
  renamed to domain/enhancements.js (tolerant legacy read of old `cyberware`
  data). See the 2026-07-06 commits and CLAUDE.md/PROGRESS.md.
- Deepen's Want/Complication now append to Revealed/hidden (GM) instead of
  Overview (Stereotype stays in Overview); Revealed/hidden is now collapsed
  by default and stays expanded (entity.revealedOpen, persisted) once a GM
  opens it for a given entity.
- Changing an entity's Type now asks for Y/N confirmation (window.confirm,
  this app's existing pattern) before applying; canceling reverts the select.
- Cast drawer search now matches entity type too, not just name/tags.
- Fixed: the Oracle drawer's search couldn't find "Creature Concept" (a
  composite-generator button label, not a literal table name) — a small
  GROUP_ALIASES map in data/oracleGroups.js fixes this and any future
  same-shaped generator.
- Trade economy types (docs/adr/0013-trade-economy-types.md): Location tags
  now double as an economy type (data/economyTypes.js — a Hostile-native
  model and a "(Traveller-style)"-labeled model, only one active at a time
  via settings.tradeEconomyModel) biasing domain/trade.js's priceAt() via two
  dials (scarcity/manufacturing) instead of a literal tech level, exactly as
  requested. Switching the active model never breaks an already-tagged
  Location. ADR 0003/0004 updated to point at ADR 0013 for this gap.
- Game Mechanics Index (docs/adr/0014-mechanics-index-pdfjs.md): a real
  PDF.js-backed scan (per the user's explicit choice over a hand-curated
  list) links game-mechanic terms to their page in the Reference Library,
  from a new Settings "🔄 Refresh Mechanics Index" button, surfaced as
  clickable links in the Guide drawer. Found and fixed a real bug during
  verification: this specific feature needs the app served over http(s)
  (`npm run serve`) — file:// blocks reading a local PDF's bytes entirely;
  every other feature is unaffected. Also fixed a real scripts/build.js
  bundler gap (didn't recognize `export async function`).
- Intergalactic Space Trader PDFs used only as flavor inspiration for the
  Trade Economy Model above, per the request's explicit priority (Hostile's
  own lore wins any conflict) — no direct mechanic/table was transcribed.
-->
