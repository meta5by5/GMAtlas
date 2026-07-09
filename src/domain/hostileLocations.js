// hostileLocations.js — the domain half of importing HOSTILE's own canon
// gazetteer (docs/adr/0026-hostile-canon-locations.md) into a live
// campaign as real, fully-editable Location entities. Pure and DOM-free,
// same "clone once, return new campaign" shape as every other domain
// mutator. Mirrors entities.js's createItemFromCatalog (a catalog entry
// in, one real entity out) but as a bulk loop, matching the shape of
// other bulk actions like factions.js's advanceFactionTurns.
//
// Import order matters (2026-07-08 follow-ups): Bases, then Zones, then
// Stars, then the worlds themselves — each later pass references
// entities the earlier pass already created (a world's `bases`/
// `starSystem` values are real Location NAMES, matched against
// #base/#star-tagged entities the World Profile UI's dropdowns source
// from). A star's own `starSystem` field is set to its OWN name
// (data/hostileLocations.js's HOSTILE_STARS entries already encode
// this) — that self-reference is what tells the UI "this Location IS
// the star, not a world orbiting one."
//
// After all four catalogs land, linkHierarchy() builds the real
// Zone > Star > World > Base containment chain as relationships (not
// tags — the star name used to be duplicated as a tag on the world;
// that's gone now that the relationship exists as the single source of
// truth): the "downward" edge on each pair is typed/labeled Contains,
// the reverse "upward" edge is typed/labeled Located At — Zone
// -Contains-> Star -Contains-> World -Contains-> Base, with Star/World/
// Base's own edge back reading Located At. This is deliberately the
// same two relationship types across every pair (no separate "orbits"
// type) — it reuses the existing Relationships chip list and Graph
// rendering with zero new mechanism, and reads naturally in both
// directions ("Near Earth Zone Contains Wolf 359" / "Wolf 359 Located
// At Near Earth Zone").

import { createEntity, updateEntity, findByName, addRelationship, updateRelationshipType, updateRelationshipLabel } from './entities.js';
import { HOSTILE_BASES, HOSTILE_ZONES, HOSTILE_STARS, HOSTILE_LOCATIONS } from '../data/hostileLocations.js';

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

/** Links `parentName` --Contains--> `childName` and, symmetrically,
 *  `childName` --Located At--> `parentName`. Both entities must already
 *  exist (by exact name). Unconditional and idempotent — addRelationship
 *  no-ops if the edge already exists, and re-running updateRelationship*
 *  on an existing edge just re-asserts the same values, so this is safe
 *  to call on every import regardless of whether either side is new. */
function linkContains(campaign, parentName, childName) {
  const parent = findByName(campaign, parentName);
  const child = findByName(campaign, childName);
  if (!parent || !child || parent.id === child.id) return campaign;
  let next = addRelationship(campaign, parent.id, child.id, 'Contains', 'contains');
  next = updateRelationshipType(next, child.id, parent.id, 'located_at');
  next = updateRelationshipLabel(next, child.id, parent.id, 'Located At');
  return next;
}

/** Creates one Location entity per data/hostileLocations.js entry not
 *  already present in the campaign (deduped by exact name match via
 *  findByName — safely re-runnable as later zones are appended to the
 *  data file; already-imported worlds/stars/zones/bases are skipped, not
 *  duplicated or overwritten, so a GM's own edits are never clobbered by
 *  a later import). Imports HOSTILE_BASES, HOSTILE_ZONES, HOSTILE_STARS,
 *  then HOSTILE_LOCATIONS, in that order, then links the whole Zone >
 *  Star > World > Base containment chain as relationships. Returns
 *  {campaign, createdIds} (combined across all four catalogs — the
 *  relationship-linking pass creates no new entities, only edges). */
export function importHostileLocations(campaign) {
  let next = campaign;
  let createdIds = [];

  const bases = importCatalog(next, HOSTILE_BASES, (entry) => ({
    tags: ['hostile-canon', 'base'],
    overview: entry.summary,
  }));
  next = bases.campaign;
  createdIds = createdIds.concat(bases.createdIds);

  const zones = importCatalog(next, HOSTILE_ZONES, (entry) => ({
    tags: ['hostile-canon', 'zone'],
    overview: entry.summary,
  }));
  next = zones.campaign;
  createdIds = createdIds.concat(zones.createdIds);

  const stars = importCatalog(next, HOSTILE_STARS, (entry) => ({
    tags: ['hostile-canon', 'star'],
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

  for (const star of HOSTILE_STARS) next = linkContains(next, star.zone, star.name);
  for (const world of HOSTILE_LOCATIONS) {
    next = linkContains(next, world.starSystem, world.name);
    for (const baseName of world.bases) next = linkContains(next, world.name, baseName);
  }

  return { campaign: next, createdIds };
}
