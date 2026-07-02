// entities.js — the cast and the map, as pure functions. NPCs, locations,
// factions, assets, and lore, each an editable record with tags and
// bidirectional relationships. Includes @mention auto-linking so scenes and
// notes weave the world together instead of being cross-referenced by hand.
//
// The data shape (campaign.entities.items) has existed since Phase 0 and the
// v0.53 migration already fills it; this module gives it behavior.

import { ensureAutoStatblock, makeStatblock, setStatblockField, addStatblockField, removeStatblockField, toggleStatblockFieldTrack, setStatblockTrackValue, toggleStatblockFieldAttribute } from './statblocks.js';

export const ENTITY_TYPES = ['npc', 'location', 'faction', 'asset', 'lore'];
export const TYPE_LABEL = { npc: 'NPC', location: 'Location', faction: 'Faction', asset: 'Asset', lore: 'Lore' };

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.entities || typeof campaign.entities !== 'object') campaign.entities = { items: [], activeId: null, history: [] };
  if (!Array.isArray(campaign.entities.items)) campaign.entities.items = [];
  if (!Array.isArray(campaign.entities.history)) campaign.entities.history = [];
  campaign.entities.items.forEach((e) => { if (!Array.isArray(e.relationships)) e.relationships = []; if (!Array.isArray(e.tags)) e.tags = []; });
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
  ensureAutoStatblock(rec);
  return rec;
}

function _link(campaign, aId, bId, label = 'linked') {
  if (aId === bId) return;
  const a = getEntity(campaign, aId); const b = getEntity(campaign, bId);
  if (!a || !b) return;
  if (!a.relationships.some((r) => r.to === bId)) a.relationships.push({ to: bId, label });
  if (!b.relationships.some((r) => r.to === aId)) b.relationships.push({ to: aId, label });
}

// --- public API (clone once, return new campaign) -------------------------
export function createEntity(campaign, opts) {
  const next = clone(campaign);
  const rec = _create(next, opts);
  return { campaign: next, id: rec.id };
}

export function updateEntity(campaign, id, patch) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) { Object.assign(e, patch); ensureAutoStatblock(e); }
  return next;
}

export function setEntityTags(campaign, id, tagsText) {
  const tags = String(tagsText || '').split(',').map((t) => t.trim()).filter(Boolean);
  return updateEntity(campaign, id, { tags });
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

export function addRelationship(campaign, aId, bId, label = 'linked') {
  const next = clone(campaign);
  _link(next, aId, bId, label);
  return next;
}

export function removeRelationship(campaign, aId, bId) {
  const next = clone(campaign);
  const a = getEntity(next, aId); const b = getEntity(next, bId);
  if (a) a.relationships = a.relationships.filter((r) => r.to !== bId);
  if (b) b.relationships = b.relationships.filter((r) => r.to !== aId);
  return next;
}

/** Parse @Name and @[Multi Word] tokens from free text. */
export function parseMentions(text) {
  const out = [];
  const re = /@\[([^\]]+)\]|@([A-Za-z0-9_''-]+)/g;
  let m;
  while ((m = re.exec(String(text || '')))) out.push((m[1] || m[2]).trim());
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
 */
export function linkMentions(campaign, text, { createType = 'npc', relate = true, label = 'appears with' } = {}) {
  const names = parseMentions(text);
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

// --- statblocks (manual add/remove; auto-attach happens in create/update) --
// `rulesetId` only matters for kind === 'character'; it defaults to the
// campaign's Settings > Stat system choice, so entities pick up whichever
// ruleset is active unless a specific one is passed (e.g. to rebuild a
// character sheet against a different ruleset — see data-statblock-ruleset).
export function setEntityStatblockKind(campaign, id, kind, rulesetId) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) e.statblock = makeStatblock(kind, rulesetId || next.settings.statRuleset);
  return next;
}

export function removeEntityStatblock(campaign, id) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) delete e.statblock;
  return next;
}

export function setEntityStatblockField(campaign, id, index, patch) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) setStatblockField(e, index, patch);
  return next;
}

export function addEntityStatblockField(campaign, id, opts) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) addStatblockField(e, opts);
  return next;
}

export function removeEntityStatblockField(campaign, id, index) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) removeStatblockField(e, index);
  return next;
}

export function toggleEntityStatblockFieldTrack(campaign, id, index) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) toggleStatblockFieldTrack(e, index);
  return next;
}

export function setEntityStatblockTrackValue(campaign, id, index, n) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) setStatblockTrackValue(e, index, n);
  return next;
}

export function toggleEntityStatblockFieldAttribute(campaign, id, index) {
  const next = clone(campaign);
  const e = getEntity(next, id);
  if (e) toggleStatblockFieldAttribute(e, index);
  return next;
}

