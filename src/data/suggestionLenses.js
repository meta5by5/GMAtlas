// suggestionLenses.js — the Discovery Lens and Approach Lens categories
// (docs/adr/0009-situation-engine-revisited.md, Decision item 3), plus a
// lens -> Oracle-category mapping, the same kind of lookup table
// data/rulesConstitution.js's GAMEPLAY_AREAS already established for
// Activities -> Rules Lens providers (Phase 9): data, not mechanism, so a
// GM can eventually re-map a lens to different tables without touching
// domain/session.js. Every path below is a REAL, already-shipped table
// (data/tables.js) — no new oracle content was authored for this feature,
// per the ADR's framing: lenses redirect which EXISTING content a scene
// pulls from, they don't invent new content.
//
// Discovery Quality's eight categories (what makes a discovery interesting)
// and Noncombat Resolution's eight approaches (how a scene gets handled) —
// both originally proposed as stored fields/resolution mechanics in
// `requirements/design-principles/gameplay-mechanics.md`, redirected by this
// ADR into "what does the GM get offered right now," not data stored
// afterward.
import { findGenrePack, isFantasyGenre } from './genrePacks.js';

export const DISCOVERY_LENSES = [
  { id: 'technology', label: 'Technology', kind: 'discovery' },
  { id: 'history', label: 'History', kind: 'discovery' },
  { id: 'politics', label: 'Politics', kind: 'discovery' },
  { id: 'religion', label: 'Religion', kind: 'discovery' },
  { id: 'biology', label: 'Biology', kind: 'discovery' },
  { id: 'physics', label: 'Physics', kind: 'discovery' },
  { id: 'trade', label: 'Trade', kind: 'discovery' },
  { id: 'culture', label: 'Culture', kind: 'discovery' },
];

export const APPROACH_LENSES = [
  { id: 'violence', label: 'Violence', kind: 'approach' },
  { id: 'negotiation', label: 'Negotiation', kind: 'approach' },
  { id: 'stealth', label: 'Stealth', kind: 'approach' },
  { id: 'science', label: 'Science', kind: 'approach' },
  { id: 'engineering', label: 'Engineering', kind: 'approach' },
  { id: 'economics', label: 'Economics', kind: 'approach' },
  { id: 'social-leverage', label: 'Social leverage', kind: 'approach' },
  { id: 'exploration', label: 'Exploration', kind: 'approach' },
];

export const SUGGESTION_LENSES = [...DISCOVERY_LENSES, ...APPROACH_LENSES];

// The fantasy packs read these lenses in their own vocabulary; the id, which
// is what's stored and routed on, stays the same.
const FANTASY_LENS_LABELS = { technology: 'Craft', biology: 'Nature', physics: 'Arcana', science: 'Scholarship', engineering: 'Artifice' };

export function lensLabel(lens, genrePackId) {
  return (isFantasyGenre(genrePackId) && FANTASY_LENS_LABELS[lens.id]) || lens.label;
}

export function findLens(id) {
  return SUGGESTION_LENSES.find((l) => l.id === id) || null;
}

/** lens id -> [ [group, table], ... ] — the real oracle categories
 *  suggestNextWithLens() (session.js) rolls a "Lens angle" from instead of
 *  the generic Plot Engine > Scene Driver a lens-less Continue Story uses.
 *  Picking among a short list (not always the same single table) keeps a
 *  repeatedly-picked lens from reading identically every time. */
export const LENS_ORACLE_CATEGORIES = {
  technology: [['Industrial Hazards', 'Worksite Failure'], ['Danger Situations', 'Industrial Hazards']],
  history: [['Mysteries & Coverups', 'Clue Type'], ['Scenario Framing', 'Objective']],
  politics: [['Frontier Society', 'Social Tension'], ['Corporate Powers', 'Hidden Agenda']],
  religion: [['Mysteries & Coverups', 'Hypothesis'], ['Crew & NPCs', 'NPC Secret']],
  biology: [['Xeno-Biology', 'Xeno Clue'], ['Xeno-Biology', 'Ecological Behavior']],
  physics: [['Exploration', 'Route Hazard'], ['Danger Situations', 'Space and Vacuum Dangers']],
  trade: [['Factions', 'Project'], ['Corporate Powers', 'Corporate Pressure']],
  culture: [['Frontier Society', 'Public Reaction'], ['Crew & NPCs', 'Relationship Spark']],
  violence: [['Conflict', 'Opposition Tactic'], ['Marines & Security', 'Tactical Twist']],
  negotiation: [['Frontier Society', 'Social Tension'], ['Factions', 'Relationship']],
  stealth: [['Law, Marshals & Crime', 'Criminal Angle'], ['Marines & Security', 'Security Operation']],
  science: [['Mysteries & Coverups', 'Observation'], ['Xeno-Biology', 'Xeno Clue']],
  engineering: [['Industrial Hazards', 'Worksite Failure'], ['Danger Situations', 'Industrial Hazards']],
  economics: [['Factions', 'Project'], ['Corporate Powers', 'Corporate Pressure']],
  'social-leverage': [['Corporate Powers', 'Hidden Agenda'], ['Crew & NPCs', 'NPC Secret']],
  exploration: [['Exploration', 'Discovery'], ['Exploration', 'Exploration Payoff']],
};

// The same lenses over each fantasy pack's own tables (data/tables-fantasy-full.js,
// data/tables-dnd5e.js), which share few group names with data/tables.js.
const LENS_ORACLE_CATEGORIES_FANTASY = {
  technology: [['Workshop & Mine Hazards', 'Worksite Failure'], ['Danger Situations', 'Castle & Workshop Hazards']],
  history: [['Mysteries & Coverups', 'Clue Type'], ['Scenario Framing', 'Objective']],
  politics: [['Frontier Society', 'Social Tension'], ['Noble Houses & Guilds', 'Hidden Agenda']],
  religion: [['Mysteries & Coverups', 'Hypothesis'], ['Party & NPCs', 'NPC Secret']],
  biology: [['Monster Biology', 'Monster Clue'], ['Monster Biology', 'Ecological Behavior']],
  physics: [['Exploration', 'Route Hazard'], ['Danger Situations', 'Environmental Dangers']],
  trade: [['Factions', 'Project'], ['Noble Houses & Guilds', 'House Pressure']],
  culture: [['Frontier Society', 'Public Reaction'], ['Party & NPCs', 'Relationship Spark']],
  violence: [['Conflict', 'Opposition Tactic'], ['Guards & Soldiers', 'Tactical Twist']],
  negotiation: [['Frontier Society', 'Social Tension'], ['Factions', 'Relationship']],
  stealth: [['Law, Marshals & Crime', 'Criminal Angle'], ['Guards & Soldiers', 'Watch Operation']],
  science: [['Mysteries & Coverups', 'Observation'], ['Monster Biology', 'Monster Clue']],
  engineering: [['Workshop & Mine Hazards', 'Worksite Failure'], ['Danger Situations', 'Castle & Workshop Hazards']],
  economics: [['Factions', 'Project'], ['Noble Houses & Guilds', 'House Pressure']],
  'social-leverage': [['Noble Houses & Guilds', 'Hidden Agenda'], ['Party & NPCs', 'NPC Secret']],
  exploration: [['Exploration', 'Discovery'], ['Exploration', 'Exploration Payoff']],
};
const LENS_ORACLE_CATEGORIES_DND5E = {
  technology: [['Scenario Framing', 'Map Feature'], ['Environmental Hazards', 'Environmental Event']],
  history: [['Miscellaneous', 'Story Clue'], ['Scenario Framing', 'Objective']],
  politics: [['Factions', 'Faction Goal'], ['Noble Houses & Guilds', 'Hidden Agenda']],
  religion: [['Plot Engine', 'Plot Target'], ['Miscellaneous', 'Story Clue']],
  biology: [['Environmental Hazards', 'Environmental Event'], ['Threats', 'Enemy Encounter']],
  physics: [['Environmental Hazards', 'Survey Problem'], ['Environmental Hazards', 'Environmental Event']],
  trade: [['Trade & Cargo', 'Trade Opportunity'], ['Noble Houses & Guilds', 'House Pressure']],
  culture: [['Characters', 'Disposition'], ['Scenario Framing', 'Framing NPCs']],
  violence: [['Threats', 'Enemy Encounter'], ['Threats', 'Watch Response']],
  negotiation: [['Factions', 'Faction Goal'], ['Scenario Framing', 'Dilemma']],
  stealth: [['Plot Engine', 'Plot Method'], ['Threats', 'Watch Response']],
  science: [['Miscellaneous', 'Story Clue'], ['Environmental Hazards', 'Survey Problem']],
  engineering: [['Scenario Framing', 'Map Feature'], ['Trade & Cargo', 'Cargo Problem']],
  economics: [['Trade & Cargo', 'Trade Opportunity'], ['Noble Houses & Guilds', 'House Pressure']],
  'social-leverage': [['Noble Houses & Guilds', 'Hidden Agenda'], ['Characters', 'Revealed Aspect']],
  exploration: [['Environmental Hazards', 'Survey Problem'], ['Scenario Framing', 'Map Feature']],
};
const LENS_ORACLE_CATEGORIES_BY_PACK = { fantasy: LENS_ORACLE_CATEGORIES_FANTASY, dnd5e: LENS_ORACLE_CATEGORIES_DND5E };

export function lensOracleCategories(lensId, genrePackId) {
  const byPack = LENS_ORACLE_CATEGORIES_BY_PACK[findGenrePack(genrePackId).id] || LENS_ORACLE_CATEGORIES;
  return byPack[lensId] || [];
}
