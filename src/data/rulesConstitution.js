// rulesConstitution.js — the "Rules Constitution": which external ruleset
// (or Saga Atlas itself) is the content provider for each gameplay area.
// Source: requirements/initial design inputs/gameplay-goals.md, reconciled in
// docs/adr/0002-rules-constitution.md.
//
// This is a REFERENCE, not an engine yet — Phase 9 (Activity-driven
// gameplay, see DESIGN-NEW-FUNCTIONALITY.md) is where this becomes an
// actual Activity -> Rules Lens recommender. Until then it's read-only,
// surfaced in Settings so a GM can see the intended division of labor.
// Deliberately data, not code — same "genre-aware, not genre-locked"
// posture as data/rulesets.js and data/statblockTemplates.js.

// `rulesetId` (where present) is the matching id in data/rulesets.js — the
// join key the Phase 9 Activity -> Rules Lens recommender uses to offer
// "apply as default stat ruleset". Only providers with an actual character
// ruleset built get one; SWN/Hostile/Planetfall/Saga Atlas itself don't
// (see their status notes for why) — Traveller does now (2026-07-06,
// original content, no sourcebook — see its own note below).
export const RULES_PROVIDERS = {
  starforged: { label: 'Starforged', status: 'integrated', note: 'Character sheets (Phase 4); its oracle philosophy and Progress Track model shaped domain/oracles.js and domain/threads.js.', rulesetId: 'starforged' },
  fivepfh: { label: 'Five Parsecs From Home', status: 'integrated', note: 'Character sheets (Phase 4).', rulesetId: '5pfh' },
  traveller: { label: 'Traveller', status: 'character ruleset authored (original content)', note: 'No sourcebook exists in assets/docs — confirmed by the 2026-07-03 ruleset library review. The character ruleset (data/rulesets.js) is original content inspired by classic Traveller\'s six characteristics and its 2d6-vs-8 task resolution (domain/dice.js\'s rollTraveller), not a transcription; still no Trade/Vehicle/NPC-generation content of its own beyond what Hostile/SWN already provide for those areas.', rulesetId: 'traveller' },
  hostile: { label: 'Hostile', status: 'default genre', note: 'campaign.settings.genre default; the oracle tables in data/tables.js are Hostile-flavored.' },
  swn: { label: 'Stars Without Number', status: 'faction/world/bestiary content authored (original content)', note: 'The SWN Revised Deluxe PDF now lives in assets/docs (2026-07-06) as reference material — the content below is still an original re-implementation of SWN\'s well-known CONCEPTS, not a transcription of its text/tables (docs/adr/0011-swn-cwn-content.md). A "Stars Without Number" oracle group (data/tables.js) — Faction Action and World Tag. Faction depth (entities.js/domain/factions.js): Force/Cunning/Wealth stats plus a growing Assets list (the Faction card\'s Assets section, "Faction Asset" oracle table), and a stat-driven turn-resolution mini-game (resolveFactionTurn) layered onto the existing Pressure Track/Faction Turn automation. NPC deepening (domain/session.js\'s deepenNpc): Stereotype/Want/Complication tables roll onto an existing NPC\'s Overview. Bestiary styling: a Xenobestiary oracle group (Creature Origin/Method/Trait/Threat) and a Site Concept group (Feature/Danger/Wonder), both combinatorial "building block" generators in SWN\'s own well-documented style. Sector generation remains future work.' },
  planetfall: { label: 'Planetfall (5PFH)', status: 'integrated', note: 'Colony drawer (domain/colony.js).' },
  sagaatlas: { label: 'Saga Atlas itself', status: 'core', note: "Never delegated to a Rules Lens — campaign memory, continuity, rules switching, and recommendations are the platform's own job, not any single ruleset's." },
};

// Verbatim from the gameplay-goals.md "Recommended Rules Constitution" table,
// with the narrative section's fuller provider lists preferred over the
// table's abbreviations where the two differ (e.g. NPC generation lists all
// three sources the narrative section named, not just the table's two).
export const GAMEPLAY_AREAS = [
  { area: 'Story structure', providers: ['starforged'] },
  { area: 'Exploration', providers: ['starforged', 'traveller'] },
  { area: 'Tactical combat', providers: ['fivepfh'] },
  { area: 'Frontier setting', providers: ['hostile'] },
  { area: 'Sector generation', providers: ['swn'] },
  { area: 'World generation', providers: ['swn', 'hostile'] },
  { area: 'Trade', providers: ['traveller', 'hostile'] },
  { area: 'Colony management', providers: ['planetfall'] },
  { area: 'Factions', providers: ['swn'] },
  { area: 'NPC generation', providers: ['traveller', 'swn', 'hostile'] },
  { area: 'Discovery', providers: ['starforged'] },
  { area: 'Horror', providers: ['hostile'] },
  { area: 'Vehicle rules', providers: ['traveller'] },
  { area: 'Crew relationships', providers: ['starforged'] },
  { area: 'Reputation & Heat', providers: ['hostile', 'traveller'] },
  { area: 'Long-term campaign memory', providers: ['sagaatlas'] },
  { area: 'Story continuity', providers: ['sagaatlas'] },
  { area: 'Rules switching', providers: ['sagaatlas'] },
  { area: 'Recommendation engine', providers: ['sagaatlas'] },
];

export function providerLabel(id) {
  const p = RULES_PROVIDERS[id];
  return p ? p.label : id;
}
