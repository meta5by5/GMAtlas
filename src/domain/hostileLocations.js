// hostileLocations.js — the domain half of importing HOSTILE's own canon
// gazetteer (docs/adr/0026-hostile-canon-locations.md) into a live
// campaign as real, fully-editable Location entities. Pure and DOM-free,
// same "clone once, return new campaign" shape as every other domain
// mutator. Mirrors entities.js's createItemFromCatalog (a catalog entry
// in, one real entity out) but as a bulk loop, matching the shape of
// other bulk actions like factions.js's advanceFactionTurns.
//
// The catalog itself is no longer bundled JS — as of the JSON-pack
// conversion (docs/adr/0026 addendum) it lives in assets/data-packs/
// hostile-near-earth-zone.json, fetched at import-click time by
// ui/hostileLocationsFetch.js (fetch() isn't pure/synchronous, so it
// can't live here per rule 3) and handed to importHostileLocations below
// as a plain `{bases, zones, stars, locations}` object — this module
// stays exactly as pure/DOM-free/synchronous as before, just no longer
// importing its own data.
//
// Import order matters (2026-07-08 follow-ups): Bases, then Zones, then
// Stars, then the worlds themselves — each later pass references
// entities the earlier pass already created (a world's `bases`/
// `starSystem` values are real Location NAMES, matched against
// #base/#star-tagged entities the World Profile UI's dropdowns source
// from). A star's own `starSystem` field is set to its OWN name (the
// JSON pack's own `stars` entries already encode this) — that
// self-reference is what tells the UI "this Location IS the star, not a
// world orbiting one."
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

/** Creates one Location entity per entry in `pack` (the fetched JSON —
 *  see ui/hostileLocationsFetch.js — shaped `{bases, zones, stars,
 *  locations}`) not already present in the campaign, deduped by exact
 *  name match via findByName — safely re-runnable as later zones are
 *  appended to the pack; already-imported worlds/stars/zones/bases are
 *  skipped, not duplicated or overwritten, so a GM's own edits are never
 *  clobbered by a later import. Imports pack.bases, pack.zones,
 *  pack.stars, then pack.locations, in that order, then links the whole
 *  Zone > Star > World > Base containment chain as relationships.
 *  Returns {campaign, createdIds} (combined across all four catalogs —
 *  the relationship-linking pass creates no new entities, only edges).
 *  A missing/malformed section (not an array) is treated as empty rather
 *  than throwing, so a partial or hand-edited pack degrades gracefully. */
export function importHostileLocations(campaign, pack) {
  let next = campaign;
  let createdIds = [];
  const p = pack && typeof pack === 'object' ? pack : {};
  const packBases = Array.isArray(p.bases) ? p.bases : [];
  const packZones = Array.isArray(p.zones) ? p.zones : [];
  const packStars = Array.isArray(p.stars) ? p.stars : [];
  const packLocations = Array.isArray(p.locations) ? p.locations : [];

  const bases = importCatalog(next, packBases, (entry) => ({
    tags: ['hostile-canon', 'base'],
    overview: entry.summary,
  }));
  next = bases.campaign;
  createdIds = createdIds.concat(bases.createdIds);

  const zones = importCatalog(next, packZones, (entry) => ({
    tags: ['hostile-canon', 'zone'],
    overview: entry.summary,
  }));
  next = zones.campaign;
  createdIds = createdIds.concat(zones.createdIds);

  const stars = importCatalog(next, packStars, (entry) => ({
    tags: ['hostile-canon', 'star'],
    overview: entry.summary,
    hex: entry.hex,
    zone: entry.zone,
    starSystem: entry.starSystem,
  }));
  next = stars.campaign;
  createdIds = createdIds.concat(stars.createdIds);

  const worlds = importCatalog(next, packLocations, (entry) => ({
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

  for (const star of packStars) next = linkContains(next, star.zone, star.name);
  for (const world of packLocations) {
    next = linkContains(next, world.starSystem, world.name);
    for (const baseName of world.bases) next = linkContains(next, world.name, baseName);
  }

  return { campaign: next, createdIds };
}
