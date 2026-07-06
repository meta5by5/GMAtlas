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

export function lensOracleCategories(lensId) {
  return LENS_ORACLE_CATEGORIES[lensId] || [];
}
