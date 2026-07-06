// entities.js — the cast and the map, as pure functions. NPCs, locations,
// factions, assets, and lore, each an editable record with tags and
// bidirectional relationships. Includes @mention auto-linking so scenes and
// notes weave the world together instead of being cross-referenced by hand.
//
// The data shape (campaign.entities.items) has existed since Phase 0 and the
// v0.53 migration already fills it; this module gives it behavior.

import {
  ensureAutoStatblock, addStatblockGroup, removeStatblockGroup, setStatblockField, addStatblockField, removeStatblockField,
  toggleStatblockFieldTrack, setStatblockTrackValue, toggleStatblockFieldAttribute, setStatblockAttributeValue,
} from './statblocks.js';

// `item` (ADR 0012): gear/weapons/armor as first-class entities — tags,
// @mentions, relationships (`owns` now has a concrete use: "NPC X owns Item
// Y"), Cast listing, Graph nodes, and Universal Search all apply for free,
// the same way every other entity type already gets them without special
// casing. Stats live in `gear`-kind statblock groups (domain/statblocks.js),
// one per ruleset system, the same "carry several simultaneously" pattern
// `character` groups already established — see data/gearTemplates.js.
export const ENTITY_TYPES = ['npc', 'location', 'faction', 'asset', 'lore', 'item'];
export const TYPE_LABEL = { npc: 'NPC', location: 'Location', faction: 'Faction', asset: 'Asset', lore: 'Lore', item: 'Item' };

// Relationship edge taxonomy (Phase 7, Constitution pack 66's Context Graph
// depth item): a relationship now carries a semantic `type` alongside its
// free-text `label` note, plus a 0-10 `strength` weight. `linked` is the
// fallback/default — it's what every relationship made before this shipped
// normalizes to (see ensure() below), and what a GM can leave a relationship
// as when none of the named types fit; the free-text label still carries
// the meaning in that case, same as before this existed. `strength` is a
// single general-purpose weight rather than a second new mechanic — a
// Starforged Bond (Make a Connection -> Forge a Bond, rulebook pp.163-166/
// 233) is just a `bond`-typed relationship whose `strength` a GM raises as
// the connection deepens, not a separate progress-track data shape.
export const RELATIONSHIP_TYPES = ['linked', 'member_of', 'owns', 'controls', 'located_at', 'allied_with', 'rival_of', 'bond'];
export const RELATIONSHIP_TYPE_LABEL = {
  linked: 'Linked', member_of: 'Member Of', owns: 'Owns', controls: 'Controls',
  located_at: 'Located At', allied_with: 'Allied With', rival_of: 'Rival Of', bond: 'Bond',
};
// Which entity types a typed relationship's target is expected to be, for
// "flag, don't delete" (pack 9, below) — null means no constraint (allied_with/
// rival_of/bond/linked can point at anything). Deliberately a small, named
// set rather than every type implying a constraint: these four are the ones
// the Constitution's own edge taxonomy names as structurally directional
// (pack 66's Member Of/Owns/Controls/Located At examples).
const RELATIONSHIP_TYPE_TARGETS = {
  member_of: ['faction'], owns: ['asset'], controls: ['faction', 'location', 'asset'], located_at: ['location'],
};
// Rival Of/Allied With/Bond aren't directional (no single fixed target type
// the way Member Of always points at a faction), but they're still social
// relationships — a Starforged Bond, a rivalry between NPCs/factions (an
// asset or a location can't have a rivalry) — so BOTH sides are expected to
// be one of these types, not just the target. Same "flag, don't delete"
// treatment as RELATIONSHIP_TYPE_TARGETS above: this never blocks the
// dropdown choice or auto-corrects anything, it only marks the chip ⚠ for
// review.
const RELATIONSHIP_TYPE_MUTUAL = {
  allied_with: ['npc', 'faction'], rival_of: ['npc', 'faction'], bond: ['npc', 'faction'],
};

function clampStrength(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
}

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.entities || typeof campaign.entities !== 'object') campaign.entities = { items: [], activeId: null, history: [] };
  if (!Array.isArray(campaign.entities.items)) campaign.entities.items = [];
  if (!Array.isArray(campaign.entities.history)) campaign.entities.history = [];
  campaign.entities.items.forEach((e) => {
    if (!Array.isArray(e.relationships)) e.relationships = [];
    e.relationships.forEach(normalizeRel);
    if (!Array.isArray(e.tags)) e.tags = [];
  });
  return campaign.entities;
}

export function listEntities(campaign, types) {
  const items = (campaign.entities && campaign.entities.items) || [];
  return types ? items.filter((e) => types.includes(e.type)) : items;
}

export function getEntity(campaign, id) {
  return ((campaign.entities && campaign.entities.items) || []).find((e) => e.id === id) || null;
}

export function findByName(campaign, name) {
  const n = String(name || '').trim().toLowerCase();
  return ((campaign.entities && campaign.entities.items) || []).find((e) => (e.name || '').trim().toLowerCase() === n) || null;
}

// Faction card template (2026-07-03 ruleset review, Hostile's "Agencies &
// Corporations" pattern, Setting pp.79-111): HQ, leadership, and a one-
// paragraph scenario-seed hook — structured-lore fields for the existing
// `faction` entity type, not a new entity subtype or mechanism. `agenda`
// (Phase 10's Faction Pressure Track item) is the free-text "what is this
// faction actively pursuing right now" companion to its pressure clock
// (domain/factions.js) — a plain field here, same as the other three, not
// a new mechanism either. Applied at creation and whenever an entity's
// type changes to 'faction' (e.g. via the inspector's Type select) so the
// fields are always present once relevant; harmless no-op otherwise.
//
// force/cunning/wealth/assets (2026-07-06, docs/adr/0011-swn-cwn-content.md):
// a faction's three-stat capability profile — original re-implementation of
// the "a faction is Force/Cunning/Wealth plus a growing list of Assets"
// concept widely discussed by Stars Without Number's own community and
// reviewers as its standout subsystem, not a transcription of SWN's actual
// Asset catalog or faction-action list (which stay proprietary). 0-10 scale
// (clampFactionStat below), matching every other GM-set dial in this app
// (Resources/Reputation/Stress/relationship strength); default 3 so a new
// faction starts capable but unremarkable, not maxed or blank. `assets` is a
// plain string list the GM curates directly or seeds via the new "Faction
// Asset" oracle table (Corporate Powers group) — not a bonus-calculating
// sub-mechanism, matching this app's existing "reuse a plain field/list,
// don't invent a second state machine" discipline.
function ensureFactionFields(e) {
  if (e.type !== 'faction') return;
  if (e.hq === undefined) e.hq = '';
  if (e.leadership === undefined) e.leadership = '';
  if (e.scenarioSeed === undefined) e.scenarioSeed = '';
  if (e.agenda === undefined) e.agenda = '';
  if (e.force === undefined) e.force = 3;
  if (e.cunning === undefined) e.cunning = 3;
  if (e.wealth === undefined) e.wealth = 3;
  if (!Array.isArray(e.assets)) e.assets = [];
}

function clampFactionStat(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
}

/** Set one of a faction's three stats (force/cunning/wealth), clamped 0-10.
 *  No-op on a non-faction entity or an unrecognized stat name. */
export function setFactionStat(campaign, id, stat, value) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e || e.type !== 'faction' || !['force', 'cunning', 'wealth'].includes(stat)) return next;
  e[stat] = clampFactionStat(value);
  return next;
}

/** Append a free-text Asset to a faction's list. No-op on a non-faction
 *  entity or an empty/whitespace-only asset. */
export function addFactionAsset(campaign, id, asset) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  const clean = String(asset || '').trim();
  if (!e || e.type !== 'faction' || !clean) return next;
  ensureFactionFields(e);
  e.assets.push(clean);
  return next;
}

/** Remove one Asset by index. No-op on a non-faction entity or an
 *  out-of-range index. */
export function removeFactionAsset(campaign, id, index) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e || e.type !== 'faction' || !Array.isArray(e.assets)) return next;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= e.assets.length) return next;
  e.assets.splice(i, 1);
  return next;
}

// --- internal mutators (operate on an already-cloned campaign) ------------
function _create(campaign, { type = 'npc', name = '' } = {}) {
  const ents = ensure(campaign);
  const rec = {
    id: 'ent_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: ENTITY_TYPES.includes(type) ? type : 'npc',
    name: name || '',
    tags: [],
    overview: '',
    revealed: '',
    relationships: [],
    createdAt: new Date().toISOString(),
  };
  ents.items.push(rec);
  ents.activeId = rec.id;
  ensureAutoStatblock(rec, campaign.settings);
  ensureFactionFields(rec);
  return rec;
}

function _link(campaign, aId, bId, label = 'linked', type = 'linked') {
  if (aId === bId) return;
  const a = getEntity(campaign, aId); const b = getEntity(campaign, bId);
  if (!a || !b) return;
  const t = RELATIONSHIP_TYPES.includes(type) ? type : 'linked';
  // The requested type describes A's edge to B (e.g. "A is Member Of B") —
  // it does NOT mirror onto B's edge back to A, since a directional type's
  // target-type constraint (Member Of -> Faction) would otherwise almost
  // always mis-flag the reverse edge immediately at creation (B looking
  // back at A rarely satisfies the same constraint A->B does). B's mirrored
  // edge starts 'linked' (unconstrained) until the GM deliberately retypes
  // it from that side.
  if (!a.relationships.some((r) => r.to === bId)) a.relationships.push({ to: bId, label, type: t, strength: 0 });
  if (!b.relationships.some((r) => r.to === aId)) b.relationships.push({ to: aId, label, type: 'linked', strength: 0 });
  if (t === 'bond') ensureBondTrack(a, b);
}

// A Starforged Bond (Make a Connection -> Forge a Bond, rulebook pp.163-166/
// 233) is a 10-segment progress track a GM fills in as the relationship
// deepens — represented as a real track field on the entity's OWN
// Starforged character sheet rather than a second progress-track mechanic
// living on the relationship object itself (the relationship is just a
// pointer to who the bond is with; "no reference to the bond is needed in
// this link" — the strength/weight field stays general-purpose, not
// Bond-specific). Auto-created the moment a relationship becomes 'bond'
// typed (via _link above, on creation, or updateRelationshipType, on
// retyping) IF the entity has a Starforged character sheet to attach it to
// AND both sides are NPC/Faction (mirrors RELATIONSHIP_TYPE_MUTUAL's bond
// entry — an Asset/Location/Lore can't forge a Bond); does nothing
// otherwise, and never duplicates an existing track for the same target.
function ensureBondTrack(entity, other) {
  if (!entity || !other || !['npc', 'faction'].includes(entity.type) || !['npc', 'faction'].includes(other.type)) return;
  if (!Array.isArray(entity.statblocks)) return;
  const group = entity.statblocks.find((g) => g.kind === 'character' && g.ruleset === 'starforged');
  if (!group) return;
  const key = `Bond: ${other.name || 'Unnamed'}`;
  if (group.fields.some((f) => f.key === key)) return;
  group.fields.push({ key, value: 0, max: 10, track: true, rollMethod: 'none' });
}

// --- public API (clone once, return new campaign) -------------------------
export function createEntity(campaign, opts) {
  const next = clone(campaign);
  const rec = _create(next, opts);
  return { campaign: next, id: rec.id };
}

/** Create an Item entity from a gear/weapon/armor catalog entry (ADR 0012,
 *  data/gearCatalog.js): sets name/tags from the entry, then adds one
 *  `gear` statblock group PER SYSTEM the entry has stats for, pre-filled by
 *  matching each field's `key` against that system's stats object — additive
 *  only (never replaces), same posture as every other statblock-group
 *  creation in this app. No-op (returns the campaign unchanged) if the
 *  catalog id isn't found. */
export function createItemFromCatalog(campaign, catalogEntry) {
  if (!catalogEntry) return { campaign, id: null };
  let next = clone(campaign);
  const rec = _create(next, { type: 'item', name: catalogEntry.name });
  rec.tags = [...(catalogEntry.tags || [])];
  for (const systemId of Object.keys(catalogEntry.stats || {})) {
    const values = catalogEntry.stats[systemId];
    addStatblockGroup(rec, 'gear', systemId, next.settings);
    const group = rec.statblocks[rec.statblocks.length - 1];
    for (const field of group.fields) {
      if (Object.prototype.hasOwnProperty.call(values, field.key)) field.value = values[field.key];
    }
  }
  return { campaign: next, id: rec.id };
}

export function updateEntity(campaign, id, patch) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) { Object.assign(e, patch); ensureAutoStatblock(e, next.settings); ensureFactionFields(e); }
  return next;
}

export function setEntityTags(campaign, id, tagsText) {
  const tags = String(tagsText || '').split(',').map((t) => t.trim()).filter(Boolean);
  return updateEntity(campaign, id, { tags });
}

/** Add one tag to an entity, case-insensitively deduped against its existing
 *  tags (adding "Character" when "character" is already present is a no-op).
 *  Powers the tag dropdown selector's "add existing/new tag" actions. */
export function addEntityTag(campaign, id, tag) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  const clean = String(tag || '').trim();
  if (!e || !clean) return next;
  if (!e.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) e.tags.push(clean);
  ensureAutoStatblock(e, next.settings);
  return next;
}

export function removeEntityTag(campaign, id, tag) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e) return next;
  e.tags = e.tags.filter((t) => t.toLowerCase() !== String(tag || '').toLowerCase());
  return next;
}

/** Every tag already used by other entities of `entityType`, excluding ones
 *  `excludeEntityId` already carries — the per-entity-type vocabulary a tag
 *  dropdown offers so a GM reuses "veteran"/"hostile" consistently instead of
 *  retyping near-duplicates. Sorted case-insensitively; first-seen casing
 *  wins (so "Character" and "character" don't both appear separately). */
export function listTagVocabulary(campaign, entityType, excludeEntityId) {
  const own = new Set((getEntity(campaign, excludeEntityId)?.tags || []).map((t) => t.toLowerCase()));
  const seen = new Map(); // lowercase -> first-seen original casing
  for (const e of listEntities(campaign, [entityType])) {
    for (const t of e.tags || []) {
      const low = t.toLowerCase();
      if (!own.has(low) && !seen.has(low)) seen.set(low, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** The tag vocabulary for the Cast drawer's tag sub-filter (ADR 0012) —
 *  cumulative and live off whichever entities the type filter/search box
 *  already narrowed to, not a static global list: filtering by `item` shows
 *  only tags Item entities actually carry (handgun/rifle/armor/...);
 *  filtering by `npc` shows NPC tags instead; no type filter (`types` empty/
 *  omitted) shows the union across every entity. `search` (optional) applies
 *  the same name/tag substring match the entity list itself uses, so the
 *  chip row never offers a tag that couldn't possibly narrow the current
 *  result set any further. Sorted case-insensitively, first-seen casing wins
 *  — same convention as listTagVocabulary above. */
export function listEntityTagVocabulary(campaign, { types, search } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const pool = listEntities(campaign, types && types.length ? types : undefined);
  const seen = new Map();
  for (const e of pool) {
    if (q && !([e.name, ...(e.tags || [])].join(' ').toLowerCase().includes(q))) continue;
    for (const t of e.tags || []) {
      const low = t.toLowerCase();
      if (!seen.has(low)) seen.set(low, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function removeEntity(campaign, id) {
  const next = clone(campaign);
  const ents = ensure(next);
  ents.items = ents.items.filter((e) => e.id !== id);
  ents.items.forEach((e) => { e.relationships = e.relationships.filter((r) => r.to !== id); });
  if (ents.activeId === id) ents.activeId = ents.items[0] ? ents.items[0].id : null;
  return next;
}

export function setActiveEntity(campaign, id) {
  const next = clone(campaign);
  const ents = ensure(next);
  ents.activeId = id;
  ents.history = [id, ...ents.history.filter((h) => h !== id)].slice(0, 12);
  return next;
}

export function addRelationship(campaign, aId, bId, label = 'linked', type = 'linked') {
  const next = clone(campaign);
  _link(next, aId, bId, label, type);
  return next;
}

export function removeRelationship(campaign, aId, bId) {
  const next = clone(campaign);
  const a = getEntity(next, aId); const b = getEntity(next, bId);
  if (a) a.relationships = a.relationships.filter((r) => r.to !== bId);
  if (b) b.relationships = b.relationships.filter((r) => r.to !== aId);
  return next;
}

// A bracketed mention may carry a custom display label ahead of the actual
// entity name, separated by "|" — @[old friend|Captain Reyes] still links
// entity "Captain Reyes", it just displays as "old friend" (see
// documents.js's splitLabel, which parses this same syntax; the two mention
// kinds share it since @Name/@[Name] is otherwise identical either way) —
// and/or a trailing page anchor ("#12"/"p.12"/"p12", meaningful only for a
// document mention, see documents.js's splitPageAnchor). Both are stripped
// back out so auto-link/auto-create always keys off the real name, never a
// label or a page number — @[Title#12] must resolve/auto-create "Title", not
// literally create a new NPC named "Title#12" (a real reported bug: asking
// a document mention for a page, then having it silently spawn a same-named
// entity instead of linking the document).
function stripLabel(raw) {
  const i = raw.indexOf('|');
  const target = i < 0 ? raw : raw.slice(i + 1).trim();
  const m = target.match(/^(.*?)\s*(?:#|p\.?)\s*(\d+)$/i);
  return (m && m[1].trim()) ? m[1].trim() : target;
}

/** Parse @Name and @[Multi Word] tokens from free text — just the resolved
 *  entity names, with any @[Label|Name] label and/or #Page anchor already
 *  stripped back out. */
export function parseMentions(text) {
  const out = [];
  const re = /@\[([^\]]+)\]|@([A-Za-z0-9_''-]+)/g;
  let m;
  while ((m = re.exec(String(text || '')))) out.push(stripLabel((m[1] || m[2]).trim()));
  return out;
}

// Convenience: parse mentions and return entity objects for each found name
export function findMentions(campaign, text) {
  const names = parseMentions(text);
  return names.map((n) => findByName(campaign, n)).filter(Boolean);
}

/**
 * Ensure every @mention in `text` maps to an entity (creating missing ones),
 * then link co-mentioned entities to each other. Returns a new campaign.
 * `skip` (a Set of lowercased names) excludes mentions the caller already
 * knows resolve to a document, not an entity — session.js's addNote/
 * editContextText pass documents.js's resolvedDocumentMentionNames here so
 * a mention of an existing document (uploaded or Reference Library) never
 * spawns a same-named phantom entity just because linkMentions doesn't know
 * about the document library (a bare @Name/@[Name] is otherwise ambiguous
 * between the two — see documentBadges' history of this exact ambiguity).
 */
export function linkMentions(campaign, text, { createType = 'npc', relate = true, label = 'appears with', skip } = {}) {
  const skipSet = skip || null;
  const names = parseMentions(text).filter((n) => !skipSet || !skipSet.has(n.trim().toLowerCase()));
  if (!names.length) return campaign;
  const next = clone(campaign);
  const ids = [];
  for (const name of names) {
    let e = findByName(next, name);
    if (!e) e = _create(next, { type: createType, name });
    if (!ids.includes(e.id)) ids.push(e.id);
  }
  if (relate) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) _link(next, ids[i], ids[j], label);
  return next;
}

/** How many relationships an entity has — used for graph/inspector display. */
export function relationshipCount(entity) {
  return entity && Array.isArray(entity.relationships) ? entity.relationships.length : 0;
}

// --- statblocks: an entity can hold several groups at once (a character
// with both a Starforged and a 5PFH sheet, a Bestiary NPC with two active
// templates) — adding one never replaces or "toggles off" another; removing
// one is a separate, explicit action targeting that group's index. Auto-
// attach (on create/type/tag change) happens in ensureAutoStatblock.
// `rulesetOrTemplateId` is a ruleset id for kind === 'character', a Bestiary
// template id for kind === 'npc', and ignored for kind === 'vehicle'.
export function addEntityStatblockGroup(campaign, id, kind, rulesetOrTemplateId) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (!e) return next;
  if (!Array.isArray(e.statblocks)) e.statblocks = [];
  // 'gear' groups (ADR 0012, Item entities) are discriminated by `ruleset`
  // like 'character' — an item can carry several systems' stats at once —
  // so it shares 'character''s dedup/lookup branch rather than 'npc''s.
  const rulesetId = (kind === 'character' || kind === 'gear') ? (rulesetOrTemplateId || next.settings.statRuleset) : null;
  const templateId = kind === 'npc' ? rulesetOrTemplateId : (kind === 'vehicle' ? 'vehicle' : undefined);
  const alreadyPresent = e.statblocks.some((g) => g.kind === kind
    && (kind !== 'character' && kind !== 'gear' || g.ruleset === rulesetId)
    && (kind !== 'npc' || g.templateId === templateId));
  if (alreadyPresent) return next;
  addStatblockGroup(e, kind, (kind === 'character' || kind === 'gear') ? rulesetId : templateId, next.settings);
  return next;
}

export function removeEntityStatblockGroup(campaign, id, groupIndex) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) removeStatblockGroup(e, groupIndex);
  return next;
}

// A relationship from before Phase 7 carries no type/strength — normalize
// it to the fallback type and a neutral 0 weight the moment any setter
// touches it (same posture as ensure()'s bulk normalization, but reliable
// even for a single relationship a bulk pass hasn't reached yet).
function normalizeRel(r) {
  if (!RELATIONSHIP_TYPES.includes(r.type)) r.type = 'linked';
  if (typeof r.strength !== 'number' || !Number.isFinite(r.strength)) r.strength = 0;
  return r;
}

/** Set/replace the free-text note on one side of a relationship (the label
 *  shown on the chip — "ally", "rival", or any longer description). */
export function updateRelationshipLabel(campaign, aId, bId, label) {
  const next = clone(campaign);
  const a = getEntity(next, aId);
  const r = a && a.relationships.find((rel) => rel.to === bId);
  if (r) { normalizeRel(r); r.label = label; }
  return next;
}

/** Set the semantic edge type on one side of a relationship — same
 *  per-side scope as updateRelationshipLabel (a directional type like
 *  Member Of legitimately differs per side: A is Member Of B doesn't mean
 *  B is Member Of A). Falls back to 'linked' for an unrecognized id. */
export function updateRelationshipType(campaign, aId, bId, type) {
  const next = clone(campaign);
  const a = getEntity(next, aId);
  const r = a && a.relationships.find((rel) => rel.to === bId);
  if (r) {
    normalizeRel(r);
    r.type = RELATIONSHIP_TYPES.includes(type) ? type : 'linked';
    if (r.type === 'bond') ensureBondTrack(a, getEntity(next, bId));
  }
  return next;
}

/** Set the 0-10 weight on one side of a relationship — general-purpose
 *  (graph-driven recommendations, or any other free-form "how strong is
 *  this link" note a GM wants). A `bond`-typed relationship's actual
 *  progress lives on a dedicated statblock track field instead (see
 *  ensureBondTrack above) — this field is never bond-specific. */
export function updateRelationshipStrength(campaign, aId, bId, strength) {
  const next = clone(campaign);
  const a = getEntity(next, aId);
  const r = a && a.relationships.find((rel) => rel.to === bId);
  if (r) { normalizeRel(r); r.strength = clampStrength(strength); }
  return next;
}

/** Pack 9's "flag, don't delete": a relationship whose type implies a target
 *  entity type (Member Of -> Faction, Owns -> Asset, Controls -> Faction/
 *  Location/Asset, Located At -> Location) is flagged when the *current*
 *  target entity no longer matches — almost always because the target's own
 *  type was edited after the link was made. Rival Of/Allied With/Bond use
 *  RELATIONSHIP_TYPE_MUTUAL instead, checking BOTH sides (`sourceType` — the
 *  type of the entity this relationship belongs to, since a bare `rel` only
 *  knows its target). Never auto-corrects or removes anything; a dangling
 *  link (target entity deleted) is a separate, pre-existing case and isn't
 *  flagged here. */
export function isRelationshipFlagged(campaign, rel, sourceType) {
  const target = getEntity(campaign, rel.to);
  if (!target) return false;
  const validTargets = RELATIONSHIP_TYPE_TARGETS[rel.type];
  if (validTargets) return !validTargets.includes(target.type);
  const mutual = RELATIONSHIP_TYPE_MUTUAL[rel.type];
  if (mutual) return !mutual.includes(target.type) || (sourceType != null && !mutual.includes(sourceType));
  return false;
}

/** Every flagged relationship across the whole campaign, for the Co-Pilot's
 *  "what did I overlook?"-style review card — one entry per relationship
 *  chip that's flagged (not deduplicated across the mirrored pair, since a
 *  GM reviews and fixes each chip independently, same as the label/type
 *  setters above already treat each side as independent). */
export function listFlaggedRelationships(campaign) {
  const out = [];
  for (const e of listEntities(campaign)) {
    for (const r of e.relationships || []) {
      if (isRelationshipFlagged(campaign, r, e.type)) {
        const target = getEntity(campaign, r.to);
        out.push({
          entityId: e.id, entityName: e.name, to: r.to, toName: target ? target.name : 'Unknown',
          type: r.type, label: r.label, expected: RELATIONSHIP_TYPE_TARGETS[r.type] || RELATIONSHIP_TYPE_MUTUAL[r.type],
        });
      }
    }
  }
  return out;
}

export function setEntityStatblockField(campaign, id, groupIndex, fieldIndex, patch) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) setStatblockField(e, groupIndex, fieldIndex, patch);
  return next;
}

export function addEntityStatblockField(campaign, id, groupIndex, opts) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) addStatblockField(e, groupIndex, opts);
  return next;
}

export function removeEntityStatblockField(campaign, id, groupIndex, fieldIndex) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) removeStatblockField(e, groupIndex, fieldIndex);
  return next;
}

export function toggleEntityStatblockFieldTrack(campaign, id, groupIndex, fieldIndex) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) toggleStatblockFieldTrack(e, groupIndex, fieldIndex);
  return next;
}

export function setEntityStatblockTrackValue(campaign, id, groupIndex, fieldIndex, n) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) setStatblockTrackValue(e, groupIndex, fieldIndex, n);
  return next;
}

export function setEntityStatblockAttributeValue(campaign, id, groupIndex, fieldIndex, rawValue) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) setStatblockAttributeValue(e, groupIndex, fieldIndex, rawValue);
  return next;
}

export function toggleEntityStatblockFieldAttribute(campaign, id, groupIndex, fieldIndex) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) toggleStatblockFieldAttribute(e, groupIndex, fieldIndex);
  return next;
}

