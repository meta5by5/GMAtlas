// hostileLocations.js — the domain half of importing HOSTILE's own canon
// gazetteer (docs/adr/0026-hostile-canon-locations.md) into a live
// campaign as real, fully-editable Location entities. Pure and DOM-free,
// same "clone once, return new campaign" shape as every other domain
// mutator. Mirrors entities.js's createItemFromCatalog (a catalog entry
// in, one real entity out) but as a bulk loop, matching the shape of
// other bulk actions like factions.js's advanceFactionTurns.

import { createEntity, updateEntity, findByName } from './entities.js';
import { HOSTILE_LOCATIONS } from '../data/hostileLocations.js';

/** Creates one Location entity per data/hostileLocations.js entry not
 *  already present in the campaign (deduped by exact name match via
 *  findByName — safely re-runnable as later zones are appended to the
 *  data file; already-imported worlds are skipped, not duplicated or
 *  overwritten, so a GM's own edits to an already-imported world are
 *  never clobbered by a later import). Returns {campaign, createdIds}. */
export function importHostileLocations(campaign) {
  let next = campaign;
  const createdIds = [];
  for (const entry of HOSTILE_LOCATIONS) {
    if (findByName(next, entry.name)) continue;
    const { campaign: withEntity, id } = createEntity(next, { type: 'location', name: entry.name });
    next = updateEntity(withEntity, id, {
      tags: ['hostile-canon', entry.zone],
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
    });
    createdIds.push(id);
  }
  return { campaign: next, createdIds };
}
