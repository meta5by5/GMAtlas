// entityFieldOracleLinks.js — which oracle tag(s) each entity field's 🔮
// link icon jumps to (docs/adr/0016-oracle-tags-and-field-links.md). Keyed
// "entityType.field"; every tag named here MUST have at least one seeded
// table in data/oracleTagSeeds.js (enforced by a data-integrity test in
// tests/domain.test.js) so a link can never open to an empty filtered
// view. Every tag referenced here is "locked" — domain/oracles.js's
// removeOracleTag() refuses to remove it from whichever table(s) carry it,
// so a GM can't silently break a field's link via the tag editor.
export const ENTITY_FIELD_ORACLE_LINKS = {
  'npc.overview': ['character'],
  'npc.revealed': ['secret'],
  'location.overview': ['setting'],
  'location.revealed': ['secret'],
  'faction.overview': ['faction'],
  'faction.revealed': ['secret'],
  'faction.hq': ['setting', 'leadership'],
  'faction.leadership': ['leadership'],
  'faction.scenarioSeed': ['hook'],
  'faction.agenda': ['agenda'],
  'faction.fear': ['fear'],
  'faction.need': ['agenda'],
  'faction.secret': ['secret'],
  'asset.overview': ['trade'],
  'asset.revealed': ['secret'],
  'item.overview': ['trade'],
  'item.revealed': ['secret'],
  'lore.overview': ['hook'],
  'lore.revealed': ['discovery'],
};

export function oracleLinkTagsFor(entityType, field) {
  return ENTITY_FIELD_ORACLE_LINKS[`${entityType}.${field}`] || null;
}
