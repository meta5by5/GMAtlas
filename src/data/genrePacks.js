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
import { DND5E_TABLES } from './tables-dnd5e.js';

// Phase A audit (A4): "the Hostile (sci-fi, default) Genre Pack becomes
// the Hostile Game System (not renamed as a pack — restructured as a
// child entity). A new Sci-Fi (generic) Genre Pack is created, containing
// Hostile, Starforged, and Traveller 2e as sibling Game Systems" — per the
// audit's own instruction to confirm full membership rather than assuming
// just those three, this pack's gameSystemIds lists every sci-fi-genre
// system currently in data/rulesConstitution.js's RULES_PROVIDERS
// (starforged/fivepfh/traveller/hostile/swn/planetfall/gmatlascore) — the
// dnd5e system stays under its own dedicated 'dnd5e' pack below, not
// folded in here, since it's a different genre entirely. Cyberpunk and the
// generic Fantasy pack have no dedicated Game System of their own yet
// (their gameSystemIds stay empty) — this restructuring only touches what
// A4 actually asked for, not an invented System for every existing pack.
export const GENRE_PACKS = [
  {
    id: 'sci-fi-generic', label: 'Sci-Fi (generic)', tables: SCENE_TABLES,
    // sagaatlas included alongside gmatlascore — both are "the platform
    // itself" providers (see rulesConstitution.js's own comment on why
    // they're two records, not one) and A4 says GMAtlas Core specifically
    // "is linked into Sci-Fi (generic) alongside the others".
    gameSystemIds: ['hostile', 'starforged', 'fivepfh', 'traveller', 'swn', 'planetfall', 'gmatlascore', 'sagaatlas'],
  },
  { id: 'cyberpunk', label: 'Cyberpunk / Shadowrun', tables: CYBERPUNK_TABLES, gameSystemIds: [] },
  { id: 'fantasy', label: 'Fantasy (D&D-style)', tables: FANTASY_TABLES, gameSystemIds: [] },
  // Direct request: "associating all of this to the 'Fantasy (D&D-style)'
  // genre pack... everything including the oracles must be independent or
  // a copy allocated to this version so it can be customized to D&D game
  // system" — forked from FANTASY_TABLES as its starting content
  // (tables-dnd5e.js), its own file/export/id from this point on so
  // customizing it (directly, or per-campaign via oracles.overrides) never
  // touches the original 'fantasy' pack or anything else using it.
  { id: 'dnd5e', label: 'D&D 5e', tables: DND5E_TABLES, gameSystemIds: ['dnd5e'] },
];

// The old 'hostile' pack id, aliased forever (not just for one migration
// pass) rather than requiring every already-stored campaign/profile value
// to be rewritten — a real migrate.js backfill DOES rewrite it forward for
// data cleanliness (see migrateDocument's own genrePack backfill), but
// this alias means a value that somehow slips past that backfill (an old
// export re-imported later, a hand-edited file) still resolves correctly
// forever, not just falls through to "unknown, use the default."
const LEGACY_GENRE_PACK_IDS = { hostile: 'sci-fi-generic' };

/** Falls back to the default ('sci-fi-generic') pack for an unset or
 *  unknown id — an old campaign predating genre packs, or a genrePack
 *  value that no longer matches a registered pack, never ends up with no
 *  tables at all. */
export function findGenrePack(id) {
  const resolvedId = LEGACY_GENRE_PACK_IDS[id] || id;
  return GENRE_PACKS.find((p) => p.id === resolvedId) || GENRE_PACKS[0];
}

// "Bestiary" is a fantasy-genre term (a monster manual); it reads oddly for
// Hostile's or Cyberpunk's own creatures/synthetics, which this repo (and
// most sci-fi/cyberpunk fiction) calls a "LifeForm" instead. The underlying
// mechanism (data/statblockTemplates.js's NPC field manifests) is unchanged
// either way — this only ever swaps the label a GM reads in the UI, driven
// by the same settings.genrePack Phase 9 already introduced.
const BESTIARY_TERM = { 'sci-fi-generic': 'LifeForm', hostile: 'LifeForm', cyberpunk: 'LifeForm', fantasy: 'Bestiary', dnd5e: 'Bestiary' };
export function bestiaryTerm(genrePackId) {
  return BESTIARY_TERM[genrePackId] || 'Bestiary';
}
