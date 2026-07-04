// activities.js — Activity -> Rules Lens recommender (Phase 9).
//
// Turns data/rulesConstitution.js from a read-only reference into an actual
// suggestion: the GM names what's happening right now (an Activity — pick
// one in the HOW workspace view) and this looks up the registered content
// provider(s) for that Activity's gameplay area. Suggestion only — applying
// one to settings.statRuleset is a separate, explicit GM action (Phase 9's
// "extending the existing per-entity ruleset selector rather than replacing
// it" — see DESIGN-NEW-FUNCTIONALITY.md).
//
// Deliberately data, not code, same "genre-aware, not genre-locked" posture
// as data/rulesets.js and data/statblockTemplates.js: a genre pack could
// ship a different Activity list without touching domain logic.

import { GAMEPLAY_AREAS, RULES_PROVIDERS } from '../data/rulesConstitution.js';

export const ACTIVITIES = [
  { id: 'explore', label: 'Explore', area: 'Exploration' },
  { id: 'investigate', label: 'Investigate', area: 'Discovery' },
  { id: 'negotiate', label: 'Negotiate', area: 'Crew relationships' },
  { id: 'travel', label: 'Travel', area: 'Vehicle rules' },
  { id: 'trade', label: 'Trade', area: 'Trade' },
  { id: 'combat', label: 'Combat', area: 'Tactical combat' },
  { id: 'faction', label: 'Faction dealings', area: 'Factions' },
  { id: 'downtime', label: 'Downtime / Colony', area: 'Colony management' },
  { id: 'horror', label: 'Horror encounter', area: 'Horror' },
  { id: 'worldbuild', label: 'World / Setting', area: 'Frontier setting' },
];

export function findActivity(id) {
  return ACTIVITIES.find((a) => a.id === id) || null;
}

/**
 * Look up the registered Rules Lens provider(s) for an Activity.
 * @returns {{area: string, providers: Array<{id: string, label: string, status: string, note: string, rulesetId?: string}>}|null}
 */
export function suggestRulesLens(activityId) {
  const activity = findActivity(activityId);
  if (!activity) return null;
  const gameplayArea = GAMEPLAY_AREAS.find((g) => g.area === activity.area);
  if (!gameplayArea) return null;
  return {
    area: gameplayArea.area,
    providers: gameplayArea.providers.map((id) => ({ id, ...RULES_PROVIDERS[id] })),
  };
}
