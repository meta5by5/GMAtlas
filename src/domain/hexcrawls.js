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
  return {
    geography: null, geoVariant: 0, locationEntityId: null, threats: [null, null, null, null, null, null], notes: '',
    // Direct follow-up request: a 'river' feature that overlays the
    // terrain (independent of `geography`, which can still be repainted
    // underneath without disturbing these) — `rivers` is an array of
    // segments, each `{ from, to, seed }`: `from`/`to` are edge indices
    // (0-5, see hexEdgeMidpoints below) or the sentinel string 'lake' when
    // that end connects into this hex's own lake instead of exiting
    // through a border; `seed` (0-1, chosen once at creation) drives a
    // stable-across-renders meander so the same river doesn't redraw
    // itself differently every render. `lake` is null, or
    // `{ offsetAngle, offsetDist }` (also chosen once at creation) — see
    // setHexLake's own doc comment for what those mean.
    rivers: [],
    lake: null,
    // Direct follow-up request: "Create a road overlay that duplicates the
    // river functionality using a brown line for a road that connects to
    // locations, not lakes or oceans" — same shape/posture as `rivers`
    // above (an array of `{ from, to, seed }` segments, `from`/`to` each
    // an edge index 0-5 or a sentinel), just with 'location' standing in
    // for 'lake' as the one non-edge endpoint a segment can target — a
    // road connects into THIS hex's own linked Location (hex center)
    // instead of a lake, and has no ocean-mouth-widening equivalent since
    // roads never target Ocean geography the way rivers do.
    roads: [],
    // Direct follow-up request: "Revise the encounter buttons/icons to add
    // a clickable link to each encounter and map it to a Conflict entity
    // record (or option to add a new one) similar to how Location works"
    // — one Conflict entity id per vertex slot (or null), same "fixed
    // 6-element array, plain index addressing" convention `threats`
    // itself already uses; independent of WHICH encounter type occupies
    // that slot, so re-picking a different encounter icon there doesn't
    // disturb an existing Conflict link.
    vertexConflicts: [null, null, null, null, null, null],
  };
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
  // rivers/lake were added after this map's own earliest touched hexes may
  // have been created — backfilled defensively here (same additive-lazy
  // posture as the rest of this file) so an old hex record reads with
  // both fields present rather than undefined.
  return rec ? { rivers: [], lake: null, vertexConflicts: [null, null, null, null, null, null], roads: [], ...rec, q, r } : { ...defaultHex(), q, r };
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
  // Same defensive backfill getHex's own read path does, for an existing
  // hex record from before rivers/lake existed.
  else {
    if (!Array.isArray(map.hexes[k].rivers)) map.hexes[k].rivers = [];
    if (map.hexes[k].lake === undefined) map.hexes[k].lake = null;
    if (!Array.isArray(map.hexes[k].vertexConflicts)) map.hexes[k].vertexConflicts = [null, null, null, null, null, null];
    if (!Array.isArray(map.hexes[k].roads)) map.hexes[k].roads = [];
  }
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

/** Links (or, given a falsy entityId, unlinks) a Conflict entity to one of
 *  a hex's 6 vertex slots — direct follow-up request: "add a clickable
 *  link to each encounter and map it to a Conflict entity record... similar
 *  to how Location works." Independent of `threats` (which encounter TYPE
 *  occupies that slot) — re-picking a different encounter icon there
 *  never disturbs an existing Conflict link, same "separate concerns"
 *  posture setHexLocation/clearHexLocation already have relative to
 *  Geography. */
export function setHexVertexConflict(campaign, mapId, q, r, vertexIndex, entityId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m || vertexIndex < 0 || vertexIndex > 5) return next;
  touchHex(m, q, r).vertexConflicts[vertexIndex] = entityId || null;
  return next;
}

export function clearHexVertexConflict(campaign, mapId, q, r, vertexIndex) {
  return setHexVertexConflict(campaign, mapId, q, r, vertexIndex, null);
}

// Direct follow-up request: "change the hex corner functionality such that
// they are not selectable... The user adds encounters by clicking the
// encounter icon and then the hex, not the corner it would be placed. The
// encounter icon will populate the first open corner starting with the top
// right and going clockwise. Treat this as the sequence the encounters are
// experienced in the hex." hexVertexPoints' own index order (verified
// against its actual angle formula, 60*i-90°) is TOP(0), TOP-RIGHT(1),
// BOTTOM-RIGHT(2), BOTTOM(3), BOTTOM-LEFT(4), TOP-LEFT(5) — so "top-right,
// clockwise" as a PRIORITY search order is [1,2,3,4,5,0], not the raw
// index order. A fixed narrative sequence, not geometry that changes with
// hex size, so it lives here as a plain constant rather than being
// recomputed from angles every call.
export const ENCOUNTER_VERTEX_ORDER = [1, 2, 3, 4, 5, 0];

/** The first empty vertex slot, in ENCOUNTER_VERTEX_ORDER's own narrative
 *  sequence (top-right, clockwise) — or null once all 6 are full. Pure
 *  read, same "hex already resolved via getHex" posture as every other
 *  hex-shape helper here; callers pass the hex record itself, not
 *  campaign/mapId/q/r. */
export function nextOpenThreatVertex(hex) {
  const threats = (hex && hex.threats) || [];
  for (const i of ENCOUNTER_VERTEX_ORDER) {
    if (!threats[i]) return i;
  }
  return null;
}

export function setHexNotes(campaign, mapId, q, r, notes) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  touchHex(m, q, r).notes = String(notes || '');
  return next;
}

// --- Rivers + lakes (direct follow-up request) -----------------------------
// A river SEGMENT lives on the one hex it crosses, addressed by the two
// edges (or edge + 'lake') it connects — not a separate top-level object,
// same "the hex owns everything about itself" posture as threats/
// geography. Continuing a river across multiple hexes (drawn as separate
// clicks per hex in the UI, shell.js) just means each hex along the way
// gets its own segment whose `from` is the mirrored edge of the PREVIOUS
// hex's `to` — see edgeNeighbor below for the mapping between "this hex's
// edge N" and "the neighboring hex's own edge for that same border."

/** Adds one river segment to a hex — `from`/`to` are each either an edge
 *  index (0-5) or the string 'lake'. No validation beyond that both ends
 *  are present (a UI mistake here is a UI bug, not bad data to defend
 *  against at this layer — same posture as setHexGeography's plain string
 *  write). `seed` (0-1) is chosen once here and stays fixed for this
 *  segment's whole life, so its rendered meander (drawers/index.js) never
 *  changes shape on a later re-render. */
export function addHexRiverSegment(campaign, mapId, q, r, from, to) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m || from == null || to == null) return next;
  touchHex(m, q, r).rivers.push({ from, to, seed: Math.random() });
  return next;
}

/** Removes every river segment on this ONE hex (a simple "clear rivers
 *  here" action, Hex Detail panel) — does not touch adjacent hexes' own
 *  segments even if they visually connected to this one; a GM undoing a
 *  river through several hexes clears each hex individually, same as
 *  painting one was several individual clicks. */
export function clearHexRivers(campaign, mapId, q, r) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  touchHex(m, q, r).rivers = [];
  return next;
}

/** Removes just ONE river segment by its plain array index (direct
 *  follow-up request: "when the river icon is selected, any river lines
 *  already placed should be selectable and clicking a line should prompt
 *  to remove it") — bounds-checked no-op out of range, same "fixed-shape/
 *  plain-index addressing" convention as setHexThreat. */
export function removeHexRiverSegment(campaign, mapId, q, r, index) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  const hex = touchHex(m, q, r);
  if (index >= 0 && index < hex.rivers.length) hex.rivers.splice(index, 1);
  return next;
}

// --- Roads (direct follow-up request: "duplicates the river functionality
// using a brown line for a road that connects to locations, not lakes or
// oceans") ----------------------------------------------------------------
// Same per-hex-segment shape/posture as rivers just above; the only real
// difference lives in drawers/index.js's rendering (brown stroke, 'location'
// sentinel resolves to the hex's own center point instead of an offset lake
// blob, no ocean-mouth funnel) and shell.js's placement flow (auto-connects
// on reaching a hex with a linked Location instead of one with a lake).

/** Adds one road segment to a hex — `from`/`to` are each either an edge
 *  index (0-5) or the string 'location'. Mirrors addHexRiverSegment
 *  exactly; see its own doc comment for the general shape. */
export function addHexRoadSegment(campaign, mapId, q, r, from, to) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m || from == null || to == null) return next;
  touchHex(m, q, r).roads.push({ from, to, seed: Math.random() });
  return next;
}

/** Removes every road segment on this ONE hex — mirrors clearHexRivers. */
export function clearHexRoads(campaign, mapId, q, r) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  touchHex(m, q, r).roads = [];
  return next;
}

/** Removes just ONE road segment by its plain array index — mirrors
 *  removeHexRiverSegment. */
export function removeHexRoadSegment(campaign, mapId, q, r, index) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  const hex = touchHex(m, q, r);
  if (index >= 0 && index < hex.roads.length) hex.roads.splice(index, 1);
  return next;
}

/** Places (or removes) this hex's lake — direct follow-up request: "for
 *  each lake, offset it from the center and fill 30% of the hex so that
 *  it is visible when a location icon is placed... The lakes must be
 *  irregular shaped blobs... Each lake should be a different shape.
 *  clicking the hex when the lake button is active should replace the
 *  current lake with a new shape." `offsetAngle`/`offsetDist` (position)
 *  and `seed` (drives the irregular blob outline itself, drawers/
 *  index.js's hexLakeSvgHtml) are rolled fresh EVERY time `present` is
 *  true — including when a lake already exists here, which is what makes
 *  a repeat click "replace with a new shape" rather than a no-op. A river
 *  segment connecting to 'lake' (domain field, not a fixed coordinate)
 *  automatically stays connected to wherever the re-rolled lake now sits
 *  — it's resolved fresh at render time, never a stored position of its
 *  own. Removing (`present: false`) does NOT clear this hex's own river
 *  segments that connect to 'lake' — they simply stop rendering their
 *  lake endpoint until a lake exists here again, same "the data GM
 *  already made stays, only what points at it changes meaning" posture as
 *  removeGalleryImage clearing a dangling thumbnailId rather than
 *  deleting the entity. */
export function setHexLake(campaign, mapId, q, r, present) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (!m) return next;
  const hex = touchHex(m, q, r);
  if (present) {
    hex.lake = { offsetAngle: Math.random() * 360, offsetDist: 0.16 + Math.random() * 0.12, seed: Math.random() };
  } else {
    hex.lake = null;
  }
  return next;
}

/** The 6 edge MIDPOINTS of a hex, as offsets from its own center — edge
 *  index i connects hexVertexPoints' own vertex i and vertex (i+1)%6 (so
 *  edge 0 = the upper-right border, between the top and top-right
 *  vertices; edge 1 = due-right/east; 2 = lower-right; 3 = lower-left; 4 =
 *  due-left/west; 5 = upper-left — verified against axialToPixel's own
 *  neighbor-hex positions, see EDGE_NEIGHBOR_OFFSETS below). */
export function hexEdgeMidpoints(size) {
  const verts = hexVertexPoints(size);
  return verts.map((v, i) => {
    const v2 = verts[(i + 1) % 6];
    return { x: (v.x + v2.x) / 2, y: (v.y + v2.y) / 2 };
  });
}

/** Which neighboring hex (as a {dq,dr} axial offset) sits across each of
 *  the 6 edges — numerically verified against axialToPixel's own pixel
 *  math (edge i's outward direction from center matches exactly one
 *  neighbor's own center direction), not hand-derived. Index-aligned with
 *  hexEdgeMidpoints/hexVertexPoints. */
export const EDGE_NEIGHBOR_OFFSETS = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

/** Given a hex and one of its own edges, returns the NEIGHBORING hex's
 *  coordinate and which of ITS OWN edges is that exact same physical
 *  border (always the opposite edge, `(edge+3)%6` — walking 3 steps
 *  around a hexagon's 6 edges always lands on the far side). This is what
 *  lets a river segment "continue" into the next hex (shell.js's
 *  data-hex-edge handler): hex A's segment ending at edge E continues as
 *  hex B's own segment STARTING at edgeNeighbor(A.q,A.r,E).edge. */
export function edgeNeighbor(q, r, edge) {
  const [dq, dr] = EDGE_NEIGHBOR_OFFSETS[edge];
  return { q: q + dq, r: r + dr, edge: (edge + 3) % 6 };
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
 *  index 0 points straight up (12 o'clock), proceeding clockwise (index 1
 *  = top-right, 2 = bottom-right, 3 = bottom, 4 = bottom-left, 5 =
 *  top-left — see ENCOUNTER_VERTEX_ORDER above, which starts its own
 *  search at index 1 for exactly this reason), fixed regardless of which
 *  hex it belongs to (only the center moves). */
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
