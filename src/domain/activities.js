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

// Each Activity carries its own suggested providers (the same lists the old
// 18-row Rules Constitution held for these areas). Decoupled from
// GAMEPLAY_AREAS when the Rules Constitution was trimmed to areas that switch
// real functionality (design/adr/licenses-and-rules-constitution.md) — this
// recommender only suggests a Module, it doesn't switch anything itself.
import { RULES_PROVIDERS } from '../data/rulesConstitution.js';

export const ACTIVITIES = [
  { id: 'explore', label: 'Explore', area: 'Exploration', providers: ['starforged', 'traveller'] },
  { id: 'investigate', label: 'Investigate', area: 'Discovery', providers: ['starforged'] },
  { id: 'negotiate', label: 'Negotiate', area: 'Crew relationships', providers: ['starforged'] },
  { id: 'travel', label: 'Travel', area: 'Vehicle rules', providers: ['traveller'] },
  { id: 'trade', label: 'Trade', area: 'Trade', providers: ['traveller', 'hostile'] },
  { id: 'combat', label: 'Combat', area: 'Tactical combat', providers: ['fivepfh'] },
  { id: 'faction', label: 'Faction dealings', area: 'Factions', providers: ['swn', 'gmatlascore'] },
  { id: 'downtime', label: 'Downtime / Colony', area: 'Colony management', providers: ['planetfall'] },
  { id: 'horror', label: 'Horror encounter', area: 'Horror', providers: ['hostile'] },
  { id: 'worldbuild', label: 'World / Setting', area: 'Frontier setting', providers: ['hostile'] },
];

export function findActivity(id) {
  return ACTIVITIES.find((a) => a.id === id) || null;
}

/**
 * Look up the suggested Rules Lens provider(s) for an Activity.
 * @returns {{area: string, providers: Array<{id: string, label: string, status: string, note: string, rulesetId?: string}>}|null}
 */
export function suggestRulesLens(activityId) {
  const activity = findActivity(activityId);
  if (!activity) return null;
  return {
    area: activity.area,
    providers: activity.providers.map((id) => ({ id, ...RULES_PROVIDERS[id] })),
  };
}
