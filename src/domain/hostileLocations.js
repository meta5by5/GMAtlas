// hostileLocations.js — the domain half of importing HOSTILE's own canon
// gazetteer (docs/adr/0026-hostile-canon-locations.md) into a live
// campaign as real, fully-editable Location entities. Pure and DOM-free,
// same "clone once, return new campaign" shape as every other domain
// mutator. Mirrors entities.js's createItemFromCatalog (a catalog entry
// in, one real entity out) but as a bulk loop, matching the shape of
// other bulk actions like factions.js's advanceFactionTurns.
//
// Import order matters (2026-07-08 follow-up): Bases first, then Stars,
// then the worlds themselves — each later pass references entities the
// earlier pass already created (a world's `bases`/`starSystem` values are
// real Location NAMES, matched against #base/#star-tagged entities the
// World Profile UI's dropdowns source from). A star's own `starSystem`
// field is set to its OWN name (data/hostileLocations.js's HOSTILE_STARS
// entries already encode this) — that self-reference is what tells the
// UI "this Location IS the star, not a world orbiting one." After all
// three catalogs land, every world is also linked to its star via a real
// `located_at`/"orbits" relationship (not just the starSystem field) —
// the star name is deliberately NOT duplicated as a tag on the world
// anymore now that this relationship exists; the relationship is the
// single source of truth for "which star does this world orbit."

import { createEntity, updateEntity, findByName, addRelationship } from './entities.js';
import { HOSTILE_BASES, HOSTILE_STARS, HOSTILE_LOCATIONS } from '../data/hostileLocations.js';

function importCatalog(campaign, entries, makeFields) {
  let next = campaign;
  const createdIds = [];
  for (const entry of entries) {
    if (findByName(next, entry.name)) continue;
    const { campaign: withEntity, id } = createEntity(next, { type: 'location', name: entry.name });
    next = updateEntity(withEntity, id, makeFields(entry));
    createdIds.push(id);
  }
  return { campaign: next, createdIds };
}

/** Creates one Location entity per data/hostileLocations.js entry not
 *  already present in the campaign (deduped by exact name match via
 *  findByName — safely re-runnable as later zones are appended to the
 *  data file; already-imported worlds/stars/bases are skipped, not
 *  duplicated or overwritten, so a GM's own edits are never clobbered by
 *  a later import). Imports HOSTILE_BASES, then HOSTILE_STARS, then
 *  HOSTILE_LOCATIONS, in that order, so every world's bases/starSystem
 *  references resolve to real entities that already exist. Returns
 *  {campaign, createdIds} (combined across all three catalogs). */
export function importHostileLocations(campaign) {
  let next = campaign;
  let createdIds = [];

  const bases = importCatalog(next, HOSTILE_BASES, (entry) => ({
    tags: ['hostile-canon', 'base'],
    overview: entry.summary,
  }));
  next = bases.campaign;
  createdIds = createdIds.concat(bases.createdIds);

  const stars = importCatalog(next, HOSTILE_STARS, (entry) => ({
    tags: ['hostile-canon', 'star', entry.zone],
    overview: entry.summary,
    hex: entry.hex,
    zone: entry.zone,
    starSystem: entry.starSystem,
  }));
  next = stars.campaign;
  createdIds = createdIds.concat(stars.createdIds);

  const worlds = importCatalog(next, HOSTILE_LOCATIONS, (entry) => ({
    tags: ['hostile-canon', entry.zone, entry.locationKind],
    overview: entry.summary,
    hex: entry.hex,
    zone: entry.zone,
    starport: entry.starport,
    worldSize: entry.worldSize,
    atmosphere: entry.atmosphere,
    hydrographics: entry.hydrographics,
    population: entry.population,
    government: entry.government,
    lawLevel: entry.lawLevel,
    techLevel: entry.techLevel,
    bases: [...entry.bases],
    tradeCodes: [...entry.tradeCodes],
    gasGiant: entry.gasGiant,
    starSystem: entry.starSystem,
  }));
  next = worlds.campaign;
  createdIds = createdIds.concat(worlds.createdIds);

  // Link each world to the star it orbits as a real relationship (not just
  // the starSystem field) — run unconditionally, not just for freshly
  // created worlds, so re-running the import after a GM has already
  // imported an earlier batch still backfills any relationship that's
  // missing. addRelationship (entities.js) is itself idempotent (a second
  // call between the same pair is a no-op), so this is always safe.
  for (const entry of HOSTILE_LOCATIONS) {
    const world = findByName(next, entry.name);
    const star = findByName(next, entry.starSystem);
    if (world && star && world.id !== star.id) next = addRelationship(next, world.id, star.id, 'orbits', 'located_at');
  }

  return { campaign: next, createdIds };
}
