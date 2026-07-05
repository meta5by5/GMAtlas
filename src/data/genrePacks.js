// genrePacks.js — the registry of selectable oracle table sets (Phase 9,
// "genre-aware, not genre-locked" taken all the way to a real feature: a
// GM can swap the entire SCENE_TABLES set a campaign rolls against,
// instead of Hostile-flavored content being the only option). Each pack
// is just a SCENE_TABLES-shaped object — domain/oracles.js's
// tablesWithOverrides() picks the active one, then layers the campaign's
// own oracles.overrides on top exactly as before. No engine work, no new
// mechanism: this is data selection, the same posture as
// data/rulesets.js/data/statblockTemplates.js.

import { SCENE_TABLES } from './tables.js';
import { CYBERPUNK_TABLES } from './tables-cyberpunk.js';
import { FANTASY_TABLES } from './tables-fantasy.js';

export const GENRE_PACKS = [
  { id: 'hostile', label: 'Hostile (sci-fi, default)', tables: SCENE_TABLES },
  { id: 'cyberpunk', label: 'Cyberpunk / Shadowrun', tables: CYBERPUNK_TABLES },
  { id: 'fantasy', label: 'Fantasy (D&D-style)', tables: FANTASY_TABLES },
];

/** Falls back to the default ('hostile') pack for an unset or unknown id —
 *  an old campaign predating genre packs, or a genrePack value that no
 *  longer matches a registered pack, never ends up with no tables at all. */
export function findGenrePack(id) {
  return GENRE_PACKS.find((p) => p.id === id) || GENRE_PACKS[0];
}

// "Bestiary" is a fantasy-genre term (a monster manual); it reads oddly for
// Hostile's or Cyberpunk's own creatures/synthetics, which this repo (and
// most sci-fi/cyberpunk fiction) calls a "LifeForm" instead. The underlying
// mechanism (data/statblockTemplates.js's NPC field manifests) is unchanged
// either way — this only ever swaps the label a GM reads in the UI, driven
// by the same settings.genrePack Phase 9 already introduced.
const BESTIARY_TERM = { hostile: 'LifeForm', cyberpunk: 'LifeForm', fantasy: 'Bestiary' };
export function bestiaryTerm(genrePackId) {
  return BESTIARY_TERM[genrePackId] || 'Bestiary';
}
