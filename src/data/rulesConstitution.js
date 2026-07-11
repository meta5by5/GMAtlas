// rulesConstitution.js — the "Rules Constitution": which external ruleset
// (or Saga Atlas itself) is the content provider for each gameplay area.
// Source: requirements/initial design inputs/gameplay-goals.md, reconciled in
// docs/adr/0002-rules-constitution.md.
//
// Settings now renders a real `<select>` per gameplay area (docs/adr/0032),
// not just a read-only table — but only the Factions row actually changes
// app behavior today (via data/factionRulesProviders.js); every other row
// just records the GM's stated preference for the still-future Phase 9
// Activity -> Rules Lens recommender. Deliberately data, not code — same
// "genre-aware, not genre-locked" posture as data/rulesets.js and
// data/statblockTemplates.js.

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
  swn: {
    label: 'Stars Without Number', status: 'faction/world/bestiary content authored (original content)', note: 'The SWN Revised Deluxe PDF now lives in assets/docs (2026-07-06) as reference material — the content below is still an original re-implementation of SWN\'s well-known CONCEPTS, not a transcription of its text/tables (docs/adr/0011-swn-cwn-content.md), EXCEPT the Faction Turn Engine (domain/factionTurnEngine.js, docs/adr/0031), which does transcribe SWN\'s real named assets/tags/goals in full and is why it alone sits behind the Game System Activation gate below. A "Stars Without Number" oracle group (data/tables.js) — Faction Action and World Tag. Faction depth (entities.js/domain/factions.js): Force/Cunning/Wealth stats plus a growing Assets list (the Faction card\'s Assets section, "Faction Asset" oracle table), and a stat-driven turn-resolution mini-game (resolveFactionTurn) layered onto the existing Pressure Track/Faction Turn automation. NPC deepening (domain/session.js\'s deepenNpc): Stereotype/Want/Complication tables roll onto an existing NPC\'s Overview. Bestiary styling: a Xenobestiary oracle group (Creature Origin/Method/Trait/Threat) and a Site Concept group (Feature/Danger/Wonder), both combinatorial "building block" generators in SWN\'s own well-documented style. Sector generation remains future work.',
    requiresActivation: true,
    activationText: 'Activate Stars Without Number faction content — I confirm I own a copy of Stars Without Number Revised (Deluxe Edition) and intend to use this transcribed content (data/swnFactionData.js) for my own personal GM reference, not for redistribution.',
  },
  gmatlascore: { label: 'GMAtlas Core', status: 'faction content authored (original, SWN-parallel mechanics)', note: 'A full parallel to the SWN Faction Turn Engine (docs/adr/0032-gmatlas-core-faction-provider.md, data/gmatlasFactionData.js): identical ratings/HP/cost/dice/difficulty formulas to SWN\'s own faction assets/tags/goals (mechanics and numbers aren\'t copyrightable expression) but every name and all flavor text is original writing. The ungated, safe-by-default provider — no Game System Activation needed.' },
  planetfall: { label: 'Planetfall (5PFH)', status: 'integrated', note: 'Colony drawer (domain/colony.js).' },
  sagaatlas: { label: 'Saga Atlas itself', status: 'core', note: "Never delegated to a Rules Lens — campaign memory, continuity, rules switching, and recommendations are the platform's own job, not any single ruleset's." },
};

/** Whether `systemId` (a RULES_PROVIDERS key) is usable right now. A
 *  provider with no `requiresActivation` flag is always activated — this
 *  gate exists only for content transcribed from a real, owned sourcebook
 *  (SWN's Faction Turn Engine today), because this app also deploys
 *  publicly (GitHub Pages), where "personal reference to a book you own"
 *  doesn't hold by default (docs/adr/0032). Deliberately a single function
 *  every call site goes through instead of reading `campaign.settings.
 *  gameSystemActivations` directly — the seam a real licensing check would
 *  replace this with later; nothing else in this app should assume a
 *  boolean flag is the permanent mechanism. */
export function isGameSystemActivated(campaign, systemId) {
  const provider = RULES_PROVIDERS[systemId];
  if (!provider || !provider.requiresActivation) return true;
  return !!(campaign && campaign.settings && campaign.settings.gameSystemActivations && campaign.settings.gameSystemActivations[systemId]);
}

// Verbatim from the gameplay-goals.md "Recommended Rules Constitution" table,
// with the narrative section's fuller provider lists preferred over the
// table's abbreviations where the two differ (e.g. NPC generation lists all
// three sources the narrative section named, not just the table's two).
export const GAMEPLAY_AREAS = [
  { id: 'story-structure', area: 'Story structure', providers: ['starforged'] },
  { id: 'exploration', area: 'Exploration', providers: ['starforged', 'traveller'] },
  { id: 'tactical-combat', area: 'Tactical combat', providers: ['fivepfh'] },
  { id: 'frontier-setting', area: 'Frontier setting', providers: ['hostile'] },
  { id: 'sector-generation', area: 'Sector generation', providers: ['swn'] },
  { id: 'world-generation', area: 'World generation', providers: ['swn', 'hostile'] },
  { id: 'trade', area: 'Trade', providers: ['traveller', 'hostile'] },
  { id: 'colony-management', area: 'Colony management', providers: ['planetfall'] },
  // The one gameplay area with two real, interchangeable providers today
  // (docs/adr/0032) — 'swn' listed first so an unset choice still defaults
  // to today's behavior for any campaign that predates this dropdown.
  { id: 'factions', area: 'Factions', providers: ['swn', 'gmatlascore'] },
  { id: 'npc-generation', area: 'NPC generation', providers: ['traveller', 'swn', 'hostile'] },
  { id: 'discovery', area: 'Discovery', providers: ['starforged'] },
  { id: 'horror', area: 'Horror', providers: ['hostile'] },
  { id: 'vehicle-rules', area: 'Vehicle rules', providers: ['traveller'] },
  { id: 'crew-relationships', area: 'Crew relationships', providers: ['starforged'] },
  { id: 'reputation-heat', area: 'Reputation & Heat', providers: ['hostile', 'traveller'] },
  { id: 'long-term-campaign-memory', area: 'Long-term campaign memory', providers: ['sagaatlas'] },
  { id: 'story-continuity', area: 'Story continuity', providers: ['sagaatlas'] },
  { id: 'rules-switching', area: 'Rules switching', providers: ['sagaatlas'] },
  { id: 'recommendation-engine', area: 'Recommendation engine', providers: ['sagaatlas'] },
];

export function providerLabel(id) {
  const p = RULES_PROVIDERS[id];
  return p ? p.label : id;
}

/** The GM's chosen provider for a gameplay area — `settings.
 *  rulesProviderChoices[areaId]` if explicitly set, else that area's own
 *  first-listed provider (preserves current behavior for a campaign that
 *  predates this dropdown, since `factions`'s own providers list keeps
 *  `'swn'` first). Only the `'factions'` area's resolved value actually
 *  changes app behavior right now (data/factionRulesProviders.js reads the
 *  same `settings.rulesProviderChoices.factions` key directly) — every
 *  other area is a recorded preference only (docs/adr/0032). */
export function resolveProviderChoice(settings, areaId) {
  const area = GAMEPLAY_AREAS.find((a) => a.id === areaId);
  if (!area) return null;
  const chosen = settings && settings.rulesProviderChoices && settings.rulesProviderChoices[areaId];
  return chosen || area.providers[0];
}
