// contentPack.js — a GM's own ad-hoc content transfer between campaigns:
// export/import just Entities, Guide docs, or Journal entries as a portable
// JSON file, so a custom set (a homebrew Bestiary, a written Guide section,
// a batch of session logs) can be carried into another campaign. Distinct
// from core/store.js's export()/import() (whole-campaign, REPLACING) and
// from domain/hostileLocations.js's importHostileLocations() (a curated
// catalog with name-dedup, safe to re-run) — this one is always additive,
// no dedup, and generates a fresh id for every record on import: two
// independently-created campaigns' ids (Date.now()+random, no campaign
// namespace baked in) are not guaranteed unique against each other.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
function freshId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

const PACK_APP = 'GMAtlas';
const PACK_KIND = 'content-pack';

/** Serializes whole sections of a campaign into a portable, additive pack.
 *  A section key is entirely ABSENT (not an empty array) when its flag is
 *  false, so importContentPack can tell "nothing to import here" apart
 *  from "import this empty list" (the latter never happens from this
 *  export path, but importContentPack is defensive about it regardless).
 *  An entity's thumbnailId is stripped — a Gallery image reference that
 *  won't resolve in the destination campaign, since Gallery isn't part of
 *  this export. */
export function exportContentPack(campaign, { entities = false, guide = false, journal = false } = {}) {
  const pack = { app: PACK_APP, kind: PACK_KIND, schemaVersion: campaign.schemaVersion };
  if (entities) {
    pack.entities = (campaign.entities?.items || []).map((e) => {
      const copy = clone(e);
      delete copy.thumbnailId;
      return copy;
    });
  }
  if (guide) pack.guide = clone(campaign.guide?.docs || []);
  if (journal) pack.journal = clone(campaign.journal || []);
  return pack;
}

/** Imports a pack additively into campaign. Entities dedup by exact name
 *  match (case-insensitive, trimmed — same convention
 *  domain/hostileLocations.js's own importer already uses for this same
 *  overlapping-catalog problem via entities.js's findByName), direct
 *  follow-up request: "allow all content packs to be uploaded into one
 *  campaign without overwrite... re-import will just skip those
 *  entities" — so importing the same pack twice, or two packs that happen
 *  to share a named entity, is safe to repeat. Guide docs/Journal entries
 *  are unaffected by this — still always-fresh-id, no dedup, matching
 *  store.import()'s "GM knows what they're doing" posture (a Journal
 *  entry has no natural dedup key that couldn't also wrongly discard a
 *  genuinely new entry that happens to read the same). Every entity/
 *  guide-doc gets a fresh id (or, for a deduped entity, resolves to the
 *  ALREADY-existing match's real id instead), remapped through an old->new
 *  map so the pack's own internal structure survives even across a
 *  skipped duplicate: an entity relationship whose target isn't also in
 *  the pack (and isn't a dedup match either) is dropped; a guide doc whose
 *  parent isn't also in the pack becomes a new root instead of pointing at
 *  nothing. Journal entries have no internal refs and are appended as-is
 *  aside from a fresh id. Silently no-ops on a missing/malformed pack (a
 *  null pack passed in) or a mismatched section shape (nothing happens for
 *  that section) rather than throwing — a bad file picked at the
 *  file-input level is the UI's job to reject with a toast before this
 *  ever runs. */
export function importContentPack(campaign, pack) {
  const next = clone(campaign);
  if (!pack || typeof pack !== 'object') return next;

  if (Array.isArray(pack.entities)) {
    if (!next.entities || typeof next.entities !== 'object') next.entities = { items: [], activeId: null, history: [] };
    if (!Array.isArray(next.entities.items)) next.entities.items = [];
    const nameKey = (n) => String(n || '').trim().toLowerCase();
    const existingByName = new Map(next.entities.items.map((e) => [nameKey(e.name), e.id]));
    const idMap = new Map();
    const toCreate = [];
    for (const e of pack.entities) {
      const existingId = existingByName.get(nameKey(e.name));
      if (existingId) { idMap.set(e.id, existingId); continue; }
      idMap.set(e.id, freshId('ent_'));
      toCreate.push(e);
    }
    for (const e of toCreate) {
      const copy = clone(e);
      copy.id = idMap.get(e.id);
      copy.relationships = (Array.isArray(copy.relationships) ? copy.relationships : [])
        .filter((r) => idMap.has(r.to))
        .map((r) => ({ ...r, to: idMap.get(r.to) }));
      next.entities.items.push(copy);
    }
  }

  if (Array.isArray(pack.guide)) {
    const idMap = new Map(pack.guide.map((d) => [d.id, freshId('gd_')]));
    if (!next.guide || typeof next.guide !== 'object') next.guide = { docs: [], activeId: null };
    if (!Array.isArray(next.guide.docs)) next.guide.docs = [];
    for (const d of pack.guide) {
      const copy = clone(d);
      copy.id = idMap.get(d.id);
      copy.parentId = (d.parentId && idMap.has(d.parentId)) ? idMap.get(d.parentId) : null;
      next.guide.docs.push(copy);
    }
  }

  if (Array.isArray(pack.journal)) {
    if (!Array.isArray(next.journal)) next.journal = [];
    for (const j of pack.journal) {
      const copy = clone(j);
      copy.id = freshId('j');
      next.journal.push(copy);
    }
  }

  return next;
}
