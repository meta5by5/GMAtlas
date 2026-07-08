// battlemaps.js — the Planetfall Grid Battlemap's pure storage (Phase 11,
// docs/adr/0023-planetfall-grid-battlemap.md): named maps, each an
// optional background (a Gallery image id — gallery.js) plus freeform-
// placed icons. A placed icon is one of two kinds: 'annotation' (an
// iconKey from data/battlemapIcons.js plus a free-text note shown as a
// hover tooltip) or 'token' (a linked Party/NPC entity — its art is that
// entity's Gallery thumbnail, resolved by the caller, not stored here).
// x/y are 0-1 fractions of the rendered canvas, never pixels, so a map
// reads correctly at any window size. Same "store once, reference by id"
// shape gallery.js/the Colony crew roster already use for entities.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.battlemaps || typeof campaign.battlemaps !== 'object') campaign.battlemaps = {};
  if (!Array.isArray(campaign.battlemaps.maps)) campaign.battlemaps.maps = [];
  if (campaign.battlemaps.activeId === undefined) campaign.battlemaps.activeId = null;
  return campaign.battlemaps;
}

function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function listBattlemaps(campaign) {
  return ((campaign.battlemaps && campaign.battlemaps.maps) || []);
}

export function getBattlemap(campaign, id) {
  return listBattlemaps(campaign).find((m) => m.id === id) || null;
}

/** The active map, or the first map if none is explicitly active yet, or
 *  null if there are no maps at all — mirrors documents.js's activeTab
 *  fallback shape (never a dangling reference to a deleted map). */
export function getActiveBattlemap(campaign) {
  const maps = listBattlemaps(campaign);
  if (!maps.length) return null;
  const active = campaign.battlemaps && campaign.battlemaps.activeId;
  return maps.find((m) => m.id === active) || maps[0];
}

export function createBattlemap(campaign, name) {
  const next = clone(campaign);
  const battlemaps = ensure(next);
  const id = newId('bm');
  battlemaps.maps.push({
    id,
    name: (name || '').trim() || 'New Map',
    createdAt: new Date().toISOString(),
    backgroundImageId: null,
    gridEnabled: false,
    gridSize: 40,
    icons: [],
  });
  battlemaps.activeId = id;
  return { campaign: next, id };
}

export function renameBattlemap(campaign, id, name) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === id);
  if (m && (name || '').trim()) m.name = name.trim();
  return next;
}

export function removeBattlemap(campaign, id) {
  const next = clone(campaign);
  const battlemaps = ensure(next);
  battlemaps.maps = battlemaps.maps.filter((m) => m.id !== id);
  if (battlemaps.activeId === id) battlemaps.activeId = battlemaps.maps.length ? battlemaps.maps[0].id : null;
  return next;
}

export function setActiveBattlemap(campaign, id) {
  const next = clone(campaign);
  const battlemaps = ensure(next);
  if (battlemaps.maps.some((m) => m.id === id)) battlemaps.activeId = id;
  return next;
}

export function setBattlemapBackground(campaign, mapId, galleryImageId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (m) m.backgroundImageId = galleryImageId || null;
  return next;
}

export function setBattlemapGrid(campaign, mapId, { enabled, size } = {}) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  if (enabled !== undefined) m.gridEnabled = !!enabled;
  if (size !== undefined) m.gridSize = Math.max(10, Math.min(200, Number(size) || m.gridSize));
  return next;
}

/** Adds a placed icon — either kind: 'annotation' (iconKey + note) or
 *  kind: 'token' (entityId + a plain-text fallback label, used only if the
 *  entity has since been deleted). x/y default to dead center so an icon
 *  placed programmatically (not via a drop with real coordinates) still
 *  lands somewhere visible rather than at (0,0). */
export function addBattlemapIcon(campaign, mapId, { kind, iconKey = '', note = '', entityId = null, label = '', x = 0.5, y = 0.5 } = {}) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x2) => x2.id === mapId);
  if (!m || (kind !== 'annotation' && kind !== 'token')) return next;
  const id = newId('bmi');
  m.icons.push({
    id, kind,
    x: clampFraction(x), y: clampFraction(y),
    iconKey: kind === 'annotation' ? iconKey : '',
    note: kind === 'annotation' ? note : '',
    entityId: kind === 'token' ? entityId : null,
    label: kind === 'token' ? label : '',
  });
  return next;
}

export function moveBattlemapIcon(campaign, mapId, iconId, x, y) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x2) => x2.id === mapId);
  const icon = m && m.icons.find((i) => i.id === iconId);
  if (icon) { icon.x = clampFraction(x); icon.y = clampFraction(y); }
  return next;
}

/** Patches an icon's editable content (an annotation's note, a token's
 *  fallback label) — never its kind/entityId/iconKey, which are fixed at
 *  creation, same "shape is fixed, content is editable" posture as a
 *  statblock field's key/track-ness. */
export function updateBattlemapIcon(campaign, mapId, iconId, patch = {}) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  const icon = m && m.icons.find((i) => i.id === iconId);
  if (!icon) return next;
  if (icon.kind === 'annotation' && patch.note !== undefined) icon.note = patch.note;
  if (icon.kind === 'token' && patch.label !== undefined) icon.label = patch.label;
  return next;
}

export function removeBattlemapIcon(campaign, mapId, iconId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (m) m.icons = m.icons.filter((i) => i.id !== iconId);
  return next;
}

function clampFraction(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
