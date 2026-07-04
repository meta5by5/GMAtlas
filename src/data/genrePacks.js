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
