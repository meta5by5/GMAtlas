// oracleGroups.js — parent-category grouping over SCENE_TABLES' top-level
// keys, purely for the Oracle drawer's collapsible tree UI. Ported concept
// from the old prototype's `layout` manifest (see PROGRESS.md
// ISSUES/FINDINGS #3) — any SCENE_TABLES key not listed here still shows up
// under an automatic "Other" category (see domain/oracles.js
// buildGroupedOracleTree), so a new table never disappears silently.
export const ORACLE_GROUPS = [
  { label: '⭐ Core Solo', children: ['Campaign', 'Core Oracles', 'Core Solo Engine', 'Campaign Intelligence Engine'] },
  { label: '☠ Threats & Conflict', children: ['Conflict', 'Conflict Architecture', 'Danger Situations', 'Fear and Dread', 'Horror Escalation', 'Miscellaneous'] },
  { label: '📚 Story Beats', children: ['Plot Engine', 'Story', 'Adventure', 'Adventure Seed', 'Missions', 'Mission Aftermath', 'Mysteries & Coverups', 'Scenario Framing'] },
  { label: '👥 Characters & Society', children: ['Characters', 'Factions', 'Frontier Society', 'Corporate Powers', 'Stars Without Number', 'Augmentation', 'Crew & NPCs', 'Law, Marshals & Crime', 'Marines & Security', 'Androids & AI'] },
  { label: '🌌 Locations', children: ['Planets', 'Settlements', 'Districts', 'Location Themes', 'Site Concept', 'Sector & System Creation', 'Worlds & Colonies', 'Colonies and Expeditions', 'Vaults / Ruins', 'Derelicts'] },
  { label: '🚀 Space Operations', children: ['Starships', 'Space Encounters', 'Space Operations', 'Trade & Cargo', 'Industrial Hazards', 'Exploration', 'Environmental Hazards'] },
  { label: '👹 Creatures & Xeno', children: ['Creatures', 'Xeno-Biology', 'Xenobestiary'] },
];
