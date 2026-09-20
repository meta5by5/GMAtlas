// hexcrawls.js — the Hexcrawl map's pure storage + hex geometry. Named
// maps (same {id,name,createdAt,...}-list-with-activeId shape
// battlemaps.js already uses) each own a SPARSE hex map keyed "q,r"
// (axial coordinates, pointy-top orientation — the classic hexcrawl/
// wilderness-map convention) — a coordinate with no entry yet reads
// (getHex) as a synthesized default, never written until something
// actually touches it, same additive-lazy-init posture worldTracker.js's
// getSector/defaultSector already uses, just generalized from a fixed
// square grid to an unbounded hex one.
//
// A hex carries three independent layers: `geography` (one background
// "paint" key, data/hexcrawlIcons.js's HEXCRAWL_GEOGRAPHY_ICONS), a
// linked `locationEntityId` (a real Cast Location entity — same "store
// the id, resolve art/name at render time" posture as Battlemap's own
// token icons), and `threats` (a fixed 6-element array, one per hex
// VERTEX — see hexVertexPoints below — each a HEXCRAWL_THREAT_ICONS key
// or null, addressed by plain array index like 5PFH's weapon table).

import { findHexcrawlGeography } from '../data/hexcrawlIcons.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.hexcrawls || typeof campaign.hexcrawls !== 'object') campaign.hexcrawls = {};
  if (!Array.isArray(campaign.hexcrawls.maps)) campaign.hexcrawls.maps = [];
  if (campaign.hexcrawls.activeId === undefined) campaign.hexcrawls.activeId = null;
  return campaign.hexcrawls;
}

function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function key(q, r) { return `${q},${r}`; }

function defaultHex() {
  return { geography: null, geoVariant: 0, locationEntityId: null, threats: [null, null, null, null, null, null], notes: '' };
}

// --- Map management (mirrors battlemaps.js's own createBattlemap/etc.) ----

export function listHexMaps(campaign) {
  return ((campaign.hexcrawls && campaign.hexcrawls.maps) || []);
}

export function getHexMap(campaign, id) {
  return listHexMaps(campaign).find((m) => m.id === id) || null;
}

/** The active map, or the first map if none is explicitly active yet, or
 *  null if there are no maps at all — mirrors getActiveBattlemap's own
 *  never-a-dangling-reference fallback shape. */
export function getActiveHexMap(campaign) {
  const maps = listHexMaps(campaign);
  if (!maps.length) return null;
  const active = campaign.hexcrawls && campaign.hexcrawls.activeId;
  return maps.find((m) => m.id === active) || maps[0];
}

export function createHexMap(campaign, name) {
  const next = clone(campaign);
  const hexcrawls = ensure(next);
  const id = newId('hex');
  hexcrawls.maps.push({ id, name: (name || '').trim() || 'New Map', createdAt: new Date().toISOString(), hexes: {} });
  hexcrawls.activeId = id;
  return { campaign: next, id };
}

export function renameHexMap(campaign, id, name) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === id);
  if (m && (name || '').trim()) m.name = name.trim();
  return next;
}

export function deleteHexMap(campaign, id) {
  const next = clone(campaign);
  const hexcrawls = ensure(next);
  hexcrawls.maps = hexcrawls.maps.filter((m) => m.id !== id);
  if (hexcrawls.activeId === id) hexcrawls.activeId = hexcrawls.maps.length ? hexcrawls.maps[0].id : null;
  return next;
}

export function setActiveHexMap(campaign, id) {
  const next = clone(campaign);
  const hexcrawls = ensure(next);
  if (hexcrawls.maps.some((m) => m.id === id)) hexcrawls.activeId = id;
  return next;
}

// --- Per-hex read/write (mirrors worldTracker.js's getSector/setters) -----

/** Read-only — the real hex record, or a synthesized default. Never
 *  mutates the campaign, so a render loop scanning many hexes doesn't
 *  need to clone anything itself. */
export function getHex(campaign, mapId, q, r) {
  const map = getHexMap(campaign, mapId);
  const rec = map && map.hexes[key(q, r)];
  return rec ? { ...rec, q, r } : { ...defaultHex(), q, r };
}

/** Every hex actually touched (present in the sparse map) so far, each
 *  tagged with its own {q,r} — mirrors listTouchedSectors. */
export function listTouchedHexes(campaign, mapId) {
  const map = getHexMap(campaign, mapId);
  if (!map) return [];
  return Object.entries(map.hexes).map(([k, rec]) => {
    const [q, r] = k.split(',').map(Number);
    return { ...rec, q, r };
  });
}

function touchHex(map, q, r) {
  const k = key(q, r);
  if (!map.hexes[k]) map.hexes[k] = defaultHex();
  return map.hexes[k];
}

// Direct follow-up request: "Add 3 variations of each geography biome icon
// that rotate when placed to create variety" — a random variant is picked
// at PAINT time (real randomness, same posture this app already uses for
// gameplay rolls — this is cosmetic, not gameplay-critical, so no rng
// injection needed) and stored on the hex itself, so it stays the same
// variant across re-renders until the hex is repainted.
export function setHexGeography(campaign, mapId, q, r, geographyKey) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  const hex = touchHex(m, q, r);
  hex.geography = geographyKey || null;
  const geo = geographyKey ? findHexcrawlGeography(geographyKey) : null;
  hex.geoVariant = geo && Array.isArray(geo.iconArt) && geo.iconArt.length
    ? Math.floor(Math.random() * geo.iconArt.length)
    : 0;
  return next;
}

export function setHexLocation(campaign, mapId, q, r, entityId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m || !entityId) return next;
  touchHex(m, q, r).locationEntityId = entityId;
  return next;
}

export function clearHexLocation(campaign, mapId, q, r) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  touchHex(m, q, r).locationEntityId = null;
  return next;
}

/** Sets (or, given a falsy threatKey, clears) one of a hex's 6 vertex
 *  slots — plain array index (vertexIndex, 0-5), no-op out of range, same
 *  "fixed-shape array, not a generated id" convention as 5PFH's weapon
 *  table / Battlemap's icon list addressing. */
export function setHexThreat(campaign, mapId, q, r, vertexIndex, threatKey) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m || vertexIndex < 0 || vertexIndex > 5) return next;
  touchHex(m, q, r).threats[vertexIndex] = threatKey || null;
  return next;
}

export function clearHexThreat(campaign, mapId, q, r, vertexIndex) {
  return setHexThreat(campaign, mapId, q, r, vertexIndex, null);
}

export function setHexNotes(campaign, mapId, q, r, notes) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  touchHex(m, q, r).notes = String(notes || '');
  return next;
}

// --- Pure hex geometry (pointy-top, axial q/r) -----------------------------
// Standard axial-hex formulas (redblobgames.com/grids/hexagons) — pure
// coordinate math, no campaign needed, same posture as worldTracker.js's
// adjacentSectors.

const SQRT3 = Math.sqrt(3);

/** Center-to-vertex pixel radius at camera scale 1 — the one shared
 *  constant both drawers/index.js (rendering) and shell.js (click/range
 *  math) import, so the two can never drift apart. Tuned so a typical
 *  drawer-body width shows roughly a 10-hex-wide view by default. */
export const HEX_SIZE = 44;

/** The pixel center of hex (q,r) for a given hex size (center-to-vertex
 *  radius), relative to axial-origin (0,0)'s own pixel origin (0,0). */
export function axialToPixel(q, r, size) {
  return { x: size * (SQRT3 * q + (SQRT3 / 2) * r), y: size * (1.5 * r) };
}

/** The 6 vertex points of a hex, as offsets from its own center — vertex
 *  index 0 points up-and-slightly-right, proceeding clockwise, fixed
 *  regardless of which hex it belongs to (only the center moves). */
export function hexVertexPoints(size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    points.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
  }
  return points;
}

/** Inverts axialToPixel, rounding to the nearest real hex (cube-coordinate
 *  rounding — the standard technique for "which hex contains this pixel,"
 *  since naive q/r rounding alone lands wrong near hex edges). Used for
 *  click hit-testing: a raw click's world-pixel position -> the (q,r) hex
 *  it fell inside. */
export function pixelToAxial(x, y, size) {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return cubeRoundToAxial(q, r);
}

function cubeRoundToAxial(q, r) {
  let x = q; let z = r; let y = -x - z;
  let rx = Math.round(x); let ry = Math.round(y); let rz = Math.round(z);
  const xDiff = Math.abs(rx - x); const yDiff = Math.abs(ry - y); const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  // Normalize away -0 (Math.round can produce it for a coordinate exactly
  // at an axis) — real callers only ever compare/store these as plain
  // integers, where -0 and 0 should read identically.
  return { q: rx || 0, r: rz || 0 };
}
