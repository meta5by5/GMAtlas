// sourcebookInventory.js — "what third-party content is actually available
// for use in the Core," a curated status blurb per real PDF already sitting
// in assets/docs/ (auto-scanned into data/docsManifest.js's DOCS_MANIFEST at
// build time). Mirrors data/rulesConstitution.js's RULES_PROVIDERS shape
// (label/status/note) but is keyed by file path, one entry per sourcebook,
// not one per gameplay-area provider — a PDF can sit in the library for a
// long time before (or without ever) becoming authored content, and this is
// the place a GM checks which is which. Hand-maintained: update a `status`/
// `note` here whenever a new pass mines a sourcebook for real content (same
// discipline buildInfo.js's changelog already requires elsewhere).
export const SOURCEBOOK_INVENTORY = [
  { file: 'assets/docs/Ironsworn-Starforged-rulebook.pdf', status: 'integrated', note: 'Character sheets (Phase 4), the Progress Track model, Bond tracker. The Starforged Oracles group (ADR 0030) is inspired by this book\'s oracle philosophy — original phrasing, not transcribed.' },
  { file: 'assets/docs/Starforged-reference-guide.pdf', status: 'integrated', note: 'Same content lineage as the full rulebook above — used alongside it for the Gear Catalog research pass (ADR 0012).' },
  { file: 'assets/docs/Starsmith-Assets-Mar-5-23.pdf', status: 'inspiration only', note: 'Cited alongside Starforged for the Starforged Oracles group\'s tone (ADR 0030) — its own Asset content not yet mined.' },
  { file: 'assets/docs/Starsmith-Expanded-Oracles-May-15-23.pdf', status: 'inspiration only', note: 'Same as above — cited, not yet mined for its own expanded-oracle content.' },
  { file: 'assets/docs/5PFH-Five-Parsecs-From-Home-v3.pdf', status: 'integrated', note: 'Character sheets (Phase 4), combat dice model (domain/dice.js rollFlat), Trade contract taxonomy (ADR 0004).' },
  { file: 'assets/docs/5PFH-3e-Compendium-Includes-Bug-Hunt.pdf', status: 'integrated', note: 'Gear Catalog research pass (ADR 0012, "5PFH core + Compendium").' },
  { file: 'assets/docs/5PFH Planetfall 1.2.pdf', status: 'integrated', note: 'Colony drawer turn sheet (domain/colony.js), Planetfall Grid Battlemap (ADR 0023).' },
  { file: 'assets/docs/Stars Without Number Revised - Deluxe Edition.pdf', status: 'faction/world/bestiary content authored (original)', note: 'Faction stats/Assets/turn resolution, NPC deepening, Xenobestiary/Site Concept oracle groups (ADR 0010/0011) — original re-implementation of SWN\'s concepts, not a transcription. Sector generation remains future work.' },
  { file: 'assets/docs/CitiesWithoutNumber_Deluxe.pdf', status: 'cybernetics concept borrowed (original)', note: 'Strain/cyberware model (ADR 0011) — not a full CWN content pack, and not a Rules Constitution provider on the strength of one subsystem.' },
  { file: 'assets/docs/Hostile setting.pdf', status: 'integrated — default genre source', note: 'data/tables.js\'s Hostile-flavored oracle content; HOSTILE Canon Locations gazetteer (ADR 0026) extracted from this book\'s own worlds/UWP tables (pp.38-49, 321 pages read in full).' },
  { file: 'assets/docs/HOSTILE-TECH2.pdf', status: 'integrated', note: 'Gear Catalog research pass (ADR 0012, weapons/armor/gear stats).' },
  { file: 'assets/docs/Hostile_marinecorps8.pdf', status: 'integrated', note: 'Gear Catalog research pass (ADR 0012, alongside HOSTILE-TECH2/Tool Kit).' },
  { file: 'assets/docs/Hostile_tool-kit9.pdf', status: 'integrated', note: 'Gear Catalog research pass (ADR 0012).' },
  { file: 'assets/docs/Hostile_colony-builder4.pdf', status: 'cited, not yet mined', note: 'Corroborates Hostile as a real source for colony/frontier Trade flavor (ADR 0004) — no specific content pulled from it yet.' },
  { file: 'assets/docs/Hostile_Alien-Breeds3.pdf', status: 'in library, not yet used', note: 'A candidate source for a future Xenobestiary deepening pass.' },
  { file: 'assets/docs/Hostile_Crew_Expendable3.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Hostile_EXPLORERS-2.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Hostile_Introduction_to_HOSTILE3.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Hostile_marine-sheet.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/HOSTILE_SHORTS-001GhostShip.pdf', status: 'in library, not yet used', note: 'One-shot scenario flavor — a candidate source for future Adventure Seed content.' },
  { file: 'assets/docs/HOSTILE_SHORTS-002Snakehead.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/HOSTILE_SHORTS-003Repellant.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/HOSTILE_SHORTS-005OneOfUs.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Traveller-2e-Core-Rulebook.pdf', status: 'integrated', note: 'Gear Catalog research pass (ADR 0012). The Traveller character ruleset itself (data/rulesets.js) is original content inspired by classic Traveller, not transcribed from this 2e edition — see its own Rules Constitution note.' },
  { file: 'assets/docs/Traveller-2e-high-guard-2022-update.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf', status: 'in library, not yet used' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 01_PlanetEconomy.pdf', status: 'cited, not yet mined', note: 'Workflow inspiration for the Merchant Rules Lens design (ADR 0004) — planet-scanning/procedural-market concepts, no in-app data authored from it yet.' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 02 Travel.pdf', status: 'cited, not yet mined', note: 'Same IST inspiration as above (ADR 0004).' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 03_Trade.pdf', status: 'cited, not yet mined', note: 'Same IST inspiration as above (ADR 0004).' },
];
