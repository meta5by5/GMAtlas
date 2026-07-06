// oracleTagSeeds.js — default tags for specific oracle tables (docs/adr/
// 0016-oracle-tags-and-field-links.md). A small, reusable vocabulary (not
// one bespoke tag per field) seeded onto real, already-shipped tables — no
// invented content, every path here resolves in data/tables.js (see the
// data-integrity test in tests/domain.test.js). A GM can add more tags to
// any table (or more tables to a tag) via the Oracle drawer's own tag
// editor; this is only the starting point, read by domain/oracles.js's
// getOracleTags() as the seed a campaign hasn't touched yet — the exact
// same "seed until overridden" shape campaign.oracles.overrides already
// uses for edited table content.
export const ORACLE_TAG_SEEDS = {
  'Characters>First Look': ['character'],
  'Characters>Role': ['character', 'leadership'],
  'Crew & NPCs>NPC Drive': ['character'],
  'Crew & NPCs>NPC Secret': ['secret', 'fear'],
  'Mysteries & Coverups>Clue Type': ['secret'],
  'Corporate Powers>Hidden Agenda': ['secret', 'agenda'],
  'Location Themes>Theme Detail': ['setting'],
  'Settlements>Settlement Type': ['setting'],
  'Settlements>Authority': ['leadership'],
  'Scenario Framing>Dilemma': ['hook'],
  'Plot Engine>Plot Target': ['hook'],
  'Adventure Seed>Hook': ['hook'],
  'Factions>Project': ['agenda'],
  'Factions>Faction Type': ['faction'],
  'Fear and Dread>Fear Trigger': ['fear'],
  'Trade & Cargo>Trade Opportunity': ['trade'],
  'Trade & Cargo>Cargo Interest': ['trade'],
  'Miscellaneous>Item of Narrative Significance': ['trade'],
  'Mysteries & Coverups>Discovery': ['discovery'],
  'Derelicts>What Happened': ['discovery'],
};
