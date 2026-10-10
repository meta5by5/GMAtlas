// dungeonCrawls.js — the Dungeon Crawl module's pure storage + tile-grid
// math. Named maps (same {id,name,createdAt,...}-list-with-activeId shape
// battlemaps.js/hexcrawls.js already use) each own a FIXED 6x6 square grid
// (DUNGEON_GRID_SIZE) — unlike Hexcrawl's unbounded hex map, a Dungeon
// Crawl map cannot grow past its own 36 cells, matching the direct
// follow-up request's own "6x6 tile grid" wording. `tiles` is a SPARSE map
// keyed "x,y" (plain grid column/row, 0-5) — a cell with no entry simply
// has no Tile placed there yet; there is no synthesized default the way
// hexcrawls.js's getHex has one (getDungeonTile below returns null).

import { DUNGEON_CRAWL_ARCHETYPES, findDungeonCrawlArchetype } from '../data/dungeonCrawlTiles.js';
import { DUNGEON_TILE_GRID_SIZE } from '../data/dungeonCrawlDressing.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.dungeonCrawls || typeof campaign.dungeonCrawls !== 'object') campaign.dungeonCrawls = {};
  if (!Array.isArray(campaign.dungeonCrawls.maps)) campaign.dungeonCrawls.maps = [];
  if (campaign.dungeonCrawls.activeId === undefined) campaign.dungeonCrawls.activeId = null;
  return campaign.dungeonCrawls;
}

function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function newRoomId() { return newId('room'); }

function key(x, y) { return `${x},${y}`; }

export const DUNGEON_GRID_SIZE = 6;

// Where the very first Tile of a brand-new map goes — picked once, by
// computeDungeonAppendCells, whenever a map has zero placed Tiles yet. Any
// in-bounds cell would do; the near-center one reads best on screen.
export const DUNGEON_START_CELL = { x: 2, y: 2 };

// --- Map management (mirrors battlemaps.js/hexcrawls.js's own create/etc.) -

export function listDungeonMaps(campaign) {
  return ((campaign.dungeonCrawls && campaign.dungeonCrawls.maps) || []);
}

export function getDungeonMap(campaign, id) {
  return listDungeonMaps(campaign).find((m) => m.id === id) || null;
}

/** The active map, or the first map if none is explicitly active yet, or
 *  null if there are no maps at all — mirrors getActiveHexMap's own
 *  never-a-dangling-reference fallback shape. */
export function getActiveDungeonMap(campaign) {
  const maps = listDungeonMaps(campaign);
  if (!maps.length) return null;
  const active = campaign.dungeonCrawls && campaign.dungeonCrawls.activeId;
  return maps.find((m) => m.id === active) || maps[0];
}

export function createDungeonMap(campaign, name, pack) {
  const next = clone(campaign);
  const d = ensure(next);
  const id = newId('dun');
  d.maps.push({
    id,
    name: (name || '').trim() || 'New Map',
    createdAt: new Date().toISOString(),
    pack: pack || 'dungeon',
    tiles: {},
    // Direct follow-up request: "link map records to a location... allow
    // multiple map grids as different floors related to the same map."
    // `locationEntityId` is this map's own linked Cast Location (null =
    // unlinked), same "store the id, resolve the real entity at render
    // time" posture as Hexcrawl's own hex-center Location link. A brand
    // new map is its OWN floor group (floorGroupId: itself, floorIndex: 0)
    // — createDungeonFloorBelowStairs below is what actually grows a group
    // past one map, sharing this same floorGroupId across every floor of
    // one dungeon.
    locationEntityId: null,
    floorGroupId: id,
    floorIndex: 0,
  });
  d.activeId = id;
  return { campaign: next, id };
}

export function renameDungeonMap(campaign, id, name) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === id);
  if (m && (name || '').trim()) m.name = name.trim();
  return next;
}

export function deleteDungeonMap(campaign, id) {
  const next = clone(campaign);
  const d = ensure(next);
  d.maps = d.maps.filter((m) => m.id !== id);
  if (d.activeId === id) d.activeId = d.maps.length ? d.maps[0].id : null;
  return next;
}

export function setActiveDungeonMap(campaign, id) {
  const next = clone(campaign);
  const d = ensure(next);
  if (d.maps.some((m) => m.id === id)) d.activeId = id;
  return next;
}

/** Re-skins every already-placed Tile on this map at once — the Tile
 *  layouts/connectivity never change, only which pack's art renders them
 *  (data/dungeonCrawlTiles.js's DUNGEON_CRAWL_PACKS). */
export function setDungeonMapPack(campaign, mapId, pack) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (m) m.pack = pack;
  return next;
}

// --- Location link + multi-floor dungeons -----------------------------------
// Direct follow-up request: "link map records to a location using the look
// up feature with create a location if needed... allow multiple map grids
// as different floors related to the same map that you can select from a
// drop down and create on the fly when selecting yes when promoted after
// clicking on a tile that has a down staircase." The actual lookup/create-
// a-Location UI reuses the existing entityPicker overlay (shell.js's
// 'dungeoncrawl-location' entityType, same "search existing, or Create New"
// shape every other picker already has) — these two functions are just the
// plain link/unlink write, same posture as hexcrawls.js's setHexLocation/
// clearHexLocation.

export function setDungeonMapLocation(campaign, mapId, entityId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (m && entityId) m.locationEntityId = entityId;
  return next;
}

export function clearDungeonMapLocation(campaign, mapId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((x) => x.id === mapId);
  if (m) m.locationEntityId = null;
  return next;
}

/** Every map sharing one `floorGroupId` ("floors of the same dungeon"),
 *  deepest basement last — real-world building-directory order (any
 *  above-ground floors first, Ground Floor, then B1/B2/...), matching
 *  floorLabel's own naming below. A brand-new map (createDungeonMap) is
 *  always alone in its own group until createDungeonFloorBelowStairs (or a
 *  future "add floor above") grows it. */
export function listDungeonFloors(campaign, floorGroupId) {
  return listDungeonMaps(campaign)
    .filter((m) => m.floorGroupId === floorGroupId)
    .sort((a, b) => b.floorIndex - a.floorIndex);
}

/** Ground Floor (0), Floor N (positive, above ground), or B-N (negative,
 *  below ground — "B1"/"B2"/...) — real building-directory convention, not
 *  invented for this app. Pure formatting only; a floor's actual identity
 *  is still its own map id, never this label. */
export function floorLabel(floorIndex) {
  const n = Number(floorIndex) || 0;
  if (n === 0) return 'Ground Floor';
  if (n > 0) return `Floor ${n}`;
  return `B${-n}`;
}

/** The "create on the fly when selecting yes" flow (direct follow-up
 *  request) — called when a GM confirms creating a new floor BELOW the one
 *  they're on, from a specific Stairs Down Tile. Idempotent: if that exact
 *  Tile already has a linked floor (`linkedFloorMapId`), returns it instead
 *  of creating a duplicate (so a GM re-opening the same stairs Tile's
 *  detail panel later just navigates back to the same floor, never spawns
 *  a second one) — same defensive "a floor already exists at that index"
 *  fallback the own-tile check would otherwise need. The new floor inherits
 *  its parent's `pack` (visual consistency within one dungeon) and
 *  `locationEntityId` (same real place, just another level of it) and
 *  shares the parent's `floorGroupId` so listDungeonFloors finds it
 *  immediately. No-op (a null `id`) if the map or that exact Tile doesn't
 *  exist. */
export function createDungeonFloorBelowStairs(campaign, mapId, x, y) {
  const next = clone(campaign);
  const d = ensure(next);
  const parent = d.maps.find((m) => m.id === mapId);
  const tile = parent && parent.tiles[key(x, y)];
  if (!parent || !tile) return { campaign: next, id: null };
  if (tile.linkedFloorMapId) return { campaign: next, id: tile.linkedFloorMapId };
  const newIndex = (parent.floorIndex || 0) - 1;
  const already = d.maps.find((m) => m.floorGroupId === parent.floorGroupId && m.floorIndex === newIndex);
  if (already) { tile.linkedFloorMapId = already.id; return { campaign: next, id: already.id }; }
  const id = newId('dun');
  d.maps.push({
    id,
    name: `${parent.name} — ${floorLabel(newIndex)}`,
    createdAt: new Date().toISOString(),
    pack: parent.pack,
    tiles: {},
    locationEntityId: parent.locationEntityId,
    floorGroupId: parent.floorGroupId,
    floorIndex: newIndex,
  });
  tile.linkedFloorMapId = id;
  return { campaign: next, id };
}

// --- Per-cell read/write ----------------------------------------------------

export function inDungeonBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < DUNGEON_GRID_SIZE && y >= 0 && y < DUNGEON_GRID_SIZE;
}

/** Read-only — the real Tile record ({archetypeKey, rotation, notes}), or
 *  null if nothing has been placed in this cell yet. Never synthesizes a
 *  default (an empty Dungeon Crawl cell genuinely has no Tile, unlike a
 *  Hexcrawl hex which always has at least default terrain/notes). */
export function getDungeonTile(campaign, mapId, x, y) {
  const map = getDungeonMap(campaign, mapId);
  return (map && map.tiles[key(x, y)]) || null;
}

function normalizeRotation(rotation) {
  const steps = (((Math.round((Number(rotation) || 0) / 90)) % 4) + 4) % 4;
  return steps * 90;
}

/** Commits a Tile into one cell — used both for a brand-new cell (the
 *  initial placement flow) and for RE-committing an already-placed cell
 *  (the double-click/long-press "reactivate placement" flow, shell.js) —
 *  overwrites whatever was there, preserving that cell's own `notes` and
 *  `dressing` (direct follow-up request's grid-snap decorations) since
 *  reactivating a Tile to fix its rotation — or even rerolling it to a
 *  different Archetype — shouldn't lose a GM's own annotations/placed
 *  objects there. `linkedFloorMapId` (the "create a floor on the fly from
 *  a Stairs Down Tile" link) is narrower: only carried over if the NEW
 *  Archetype is ALSO a Stairs Down type (`arch.stairs`) — rerolling a
 *  staircase into, say, a Four-Way makes the old floor link semantically
 *  orphaned, so it's dropped rather than silently kept pointing at a floor
 *  this cell no longer represents. No-op if the archetype key is unknown,
 *  or the cell is out of bounds. */
export function placeDungeonTile(campaign, mapId, x, y, archetypeKey, rotation) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const arch = findDungeonCrawlArchetype(archetypeKey);
  if (!m || !inDungeonBounds(x, y) || !arch) return next;
  const existing = m.tiles[key(x, y)];
  m.tiles[key(x, y)] = {
    archetypeKey,
    rotation: normalizeRotation(rotation),
    notes: (existing && existing.notes) || '',
    dressing: (existing && Array.isArray(existing.dressing)) ? existing.dressing : [],
    linkedFloorMapId: (existing && arch.stairs) ? (existing.linkedFloorMapId || null) : null,
  };
  return next;
}

export function removeDungeonTile(campaign, mapId, x, y) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  if (m) delete m.tiles[key(x, y)];
  return next;
}

export function setDungeonTileNotes(campaign, mapId, x, y, notes) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const t = m && m.tiles[key(x, y)];
  if (t) t.notes = String(notes || '');
  return next;
}

// --- Dungeon dressing (direct follow-up request: "treat each tile as
// 12"x12"... an invisible 1" grid overlay... graphic objects to snap to the
// grid... doors, secret doors, porcullis, stairs up or down, pillars, tree
// trunks, chests, campfires") ------------------------------------------------
// A placed instance lives on the Tile it decorates (`tile.dressing`, a
// plain array — a Tile can hold any number of dressing objects, same
// "owns everything about itself" posture as a Hexcrawl hex's own rivers/
// roads arrays), each `{id, iconKey, gx, gy}` — gx/gy (data/
// dungeonCrawlDressing.js's DUNGEON_TILE_GRID_SIZE, 0-11) are which of the
// 12x12 grid's own cells it's centered in, never a pixel/fractional
// position, so it reads correctly at the small grid cell's size AND the
// Tile Detail panel's big zoomed view from the exact same stored data.

/** Adds one dressing object to a Tile at grid cell (gx,gy) — no-op if the
 *  Tile doesn't exist yet, or (gx,gy) falls outside the 12x12 grid. */
export function addDungeonTileDressing(campaign, mapId, x, y, iconKey, gx, gy) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const tile = m && m.tiles[key(x, y)];
  if (!tile || !iconKey) return next;
  if (!Number.isInteger(gx) || !Number.isInteger(gy) || gx < 0 || gx >= DUNGEON_TILE_GRID_SIZE || gy < 0 || gy >= DUNGEON_TILE_GRID_SIZE) return next;
  if (!Array.isArray(tile.dressing)) tile.dressing = [];
  tile.dressing.push({ id: newId('dr'), iconKey, gx, gy });
  return next;
}

/** Removes one dressing object by its own id — no-op if the Tile or that
 *  particular dressing object doesn't exist. */
export function removeDungeonTileDressing(campaign, mapId, x, y, dressingId) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const tile = m && m.tiles[key(x, y)];
  if (tile && Array.isArray(tile.dressing)) tile.dressing = tile.dressing.filter((dd) => dd.id !== dressingId);
  return next;
}

// --- Merging multiple Tiles into one bigger Room ---------------------------
// Direct follow-up request: "Allow selection of multiple adjacent tiles and
// replace them with a larger tile that gives a bigger room." A merged Room
// is NOT a new Archetype — there's no single Tile image for an arbitrary
// w x h footprint — it's a shared `room` tag ({id,x,y,w,h}, the literal
// SAME object reference-equal-by-value on every covered cell) added
// alongside each cell's own EXISTING archetypeKey/rotation/notes, which
// are deliberately left untouched. Two things fall out of that for free:
// - computeDungeonAppendCells below never needed to change at all — it
//   only ever proposes EMPTY neighbor cells, and merging only ever touches
//   cells that were already filled, so a Room's true outer perimeter
//   openings (whichever covered cell's own rotated edge happens to face
//   outward) keep working exactly as before.
// - unmergeDungeonRoom can restore the original individual Tiles later
//   with zero data loss, since nothing about them was ever overwritten.
// drawers/index.js's dungeoncrawlCells reads `room` to render ONE big
// spanning cell at the room's own top-left (anchor) corner and skip every
// other covered cell entirely (CSS Grid's own auto-placement algorithm
// then naturally flows the REST of the board around that span — no
// placeholder elements needed for the skipped cells).

/** Validates that `cells` ({x,y} pairs, however given) exactly tile a
 *  solid axis-aligned rectangle with no gaps and no stray outliers —
 *  returns that rectangle as {x,y,w,h} (top-left + size), or null if the
 *  given cells don't form one. Pure geometry only; doesn't know or care
 *  whether those cells actually hold a Tile — mergeDungeonTilesIntoRoom
 *  checks that separately. Exported so the UI can enable/disable its own
 *  "Merge into Room" button using the exact same rule this module enforces
 *  rather than a second, potentially-drifting copy of it. */
export function computeMergeRectangle(cells) {
  if (!Array.isArray(cells) || cells.length < 2) return null;
  const xs = cells.map((c) => c.x); const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const w = maxX - minX + 1; const h = maxY - minY + 1;
  if (cells.length !== w * h) return null; // wrong count for a solid rectangle (an L-shape, a diagonal, duplicates, ...)
  const given = new Set(cells.map((c) => key(c.x, c.y)));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!given.has(key(x, y))) return null; // a hole inside the bounding box
    }
  }
  return { x: minX, y: minY, w, h };
}

/** Merges the Tiles at `cells` into one Room — no-op (returns the
 *  campaign unchanged) unless `cells` forms a valid rectangle
 *  (computeMergeRectangle) AND every one of those cells already holds a
 *  Tile (an empty cell in the selection means there's nothing there to
 *  merge, so the whole action is rejected rather than silently merging
 *  just the filled subset into an oddly-shaped result). */
export function mergeDungeonTilesIntoRoom(campaign, mapId, cells) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const rect = computeMergeRectangle(cells);
  if (!m || !rect) return next;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (!m.tiles[key(x, y)]) return next; // an empty cell was part of the selection
    }
  }
  const room = { id: newRoomId(), x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      m.tiles[key(x, y)].room = room;
    }
  }
  return next;
}

/** Reverses mergeDungeonTilesIntoRoom for the Room containing (x,y) —
 *  drops the shared `room` tag from every one of its covered cells,
 *  restoring each cell's own original Tile (never touched by the merge in
 *  the first place). No-op if that cell isn't actually part of a merged
 *  Room. */
export function unmergeDungeonRoom(campaign, mapId, x, y) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const tile = m && m.tiles[key(x, y)];
  if (!tile || !tile.room) return next;
  const room = tile.room;
  for (let yy = room.y; yy < room.y + room.h; yy++) {
    for (let xx = room.x; xx < room.x + room.w; xx++) {
      const t = m.tiles[key(xx, yy)];
      if (t && t.room && t.room.id === room.id) delete t.room;
    }
  }
  return next;
}

/** Removes an entire merged Room (every covered cell's Tile, not just the
 *  `room` tag) — the Room-detail-panel equivalent of removeDungeonTile for
 *  a single Tile. No-op if (x,y) isn't part of a merged Room. */
export function removeDungeonRoom(campaign, mapId, x, y) {
  const next = clone(campaign);
  const m = ensure(next).maps.find((mm) => mm.id === mapId);
  const tile = m && m.tiles[key(x, y)];
  if (!tile || !tile.room) return next;
  const room = tile.room;
  for (let yy = room.y; yy < room.y + room.h; yy++) {
    for (let xx = room.x; xx < room.x + room.w; xx++) {
      const t = m.tiles[key(xx, yy)];
      if (t && t.room && t.room.id === room.id) delete m.tiles[key(xx, yy)];
    }
  }
  return next;
}

// --- Pure tile-grid math -----------------------------------------------------

const DIR_ORDER = ['N', 'E', 'S', 'W'];
const DIR_OFFSET = { N: { dx: 0, dy: -1 }, E: { dx: 1, dy: 0 }, S: { dx: 0, dy: 1 }, W: { dx: -1, dy: 0 } };

/** Rotates an Archetype's own default-orientation `edges` (N/E/S/W
 *  booleans) by a clockwise rotation in degrees (0/90/180/270; any other
 *  value is rounded to the nearest 90 and wrapped) — physically rotating a
 *  square Tile clockwise moves whatever was on its West side to its North
 *  side (and so on), matching the book's own "physically rotate the
 *  printed card" model (p.51). This is the one piece of game logic that
 *  needs to know which edges are ACTUALLY open after a Tile has been
 *  placed/rotated, since `edges` on the Archetype catalog itself is always
 *  expressed at the Tile's un-rotated "North" default. */
export function rotateEdges(edges, rotationDeg) {
  const steps = (((Math.round((Number(rotationDeg) || 0) / 90)) % 4) + 4) % 4;
  const out = {};
  for (let i = 0; i < 4; i++) {
    out[DIR_ORDER[i]] = !!edges[DIR_ORDER[(i - steps + 4) % 4]];
  }
  return out;
}

/** Every empty, in-bounds cell that can accept the next Tile right now —
 *  either every cell orthogonally adjacent to an already-placed Tile's own
 *  (rotated) open edge, or, if the map has no Tiles placed yet at all, just
 *  the single DUNGEON_START_CELL. Pure: takes the map + the Archetype
 *  catalog (so a test can pass a trimmed-down fixture) rather than
 *  importing the real catalog itself. */
export function computeDungeonAppendCells(map, archetypes = DUNGEON_CRAWL_ARCHETYPES) {
  if (!map) return [];
  const tiles = map.tiles || {};
  const placedKeys = Object.keys(tiles);
  if (!placedKeys.length) return [{ x: DUNGEON_START_CELL.x, y: DUNGEON_START_CELL.y }];
  const archByKey = new Map(archetypes.map((a) => [a.key, a]));
  const found = new Map();
  for (const k of placedKeys) {
    const [xs, ys] = k.split(',');
    const x = Number(xs); const y = Number(ys);
    const tile = tiles[k];
    const arch = archByKey.get(tile.archetypeKey);
    if (!arch) continue;
    const edges = rotateEdges(arch.edges, tile.rotation || 0);
    for (const dir of DIR_ORDER) {
      if (!edges[dir]) continue;
      const off = DIR_OFFSET[dir];
      const nx = x + off.dx; const ny = y + off.dy;
      if (!inDungeonBounds(nx, ny)) continue;
      if (tiles[key(nx, ny)]) continue;
      found.set(key(nx, ny), { x: nx, y: ny });
    }
  }
  return Array.from(found.values());
}

/** Picks a uniformly-random Archetype key — real randomness by default
 *  (gameplay roll, same posture as oracles.js), `rng` injectable for
 *  tests (oracles.js's makeRng). */
export function pickRandomDungeonArchetype(archetypes = DUNGEON_CRAWL_ARCHETYPES, rng = Math.random) {
  const a = archetypes[Math.floor(rng() * archetypes.length)] || archetypes[0];
  return a.key;
}

/** Picks a uniformly-random initial rotation (one of 0/90/180/270) for a
 *  freshly-picked pending Tile, before the GM manually fine-tunes it via
 *  the corner-touch rotate control. */
export function pickRandomDungeonRotation(rng = Math.random) {
  return [0, 90, 180, 270][Math.floor(rng() * 4)];
}
