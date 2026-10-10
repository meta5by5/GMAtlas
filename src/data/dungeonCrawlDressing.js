// dungeonCrawlDressing.js — small placeable "dungeon dressing" markers a GM
// can drop onto an already-placed Tile's own 12x12 grid of 5-foot squares.
// Direct follow-up request: "treat each tile as 12"x12" and use a 1" = 5'
// typical map scale. then have an invisible 1" grid overlay to each tile
// that will allow graphic objects to snap to the grid when overlaid which
// would include typical dungeon map graphics for doors, secret doors,
// porcullis, stairs up or down, pillars, tree trunks, chests, campfires,
// etc." The 12x12 scale itself isn't new/invented — it's the real
// FlexCrawl Toolkit's own stated Tile dimensions (requirements/FlexTale/
// FlexTale_FlexCrawl_Toolkit.pdf p.55-56: "60' x 60' in size... a 5' square
// grid shown... 12 squares across by 12 squares down"), so this catalog
// just gives the GM graphic objects to drop onto that grid, which domain/
// dungeonCrawls.js's existing Archetype/Tile layer never modeled on its
// own (an Archetype's `edges` only describe which SIDES connect, not what
// dressing sits inside the room).
//
// Plain emoji glyphs — same "small, genre-neutral, data not code" posture
// as hexcrawlIcons.js's Threat markers / battlemapIcons.js, extensible
// later without touching any rendering code. A placed instance (domain/
// dungeonCrawls.js's addDungeonTileDressing) is {id, iconKey, gx, gy} on
// the Tile's own `dressing` array — gx/gy (each 0-11) are which of the
// 12x12 grid's own 144 cells it's centered in, NOT a pixel or fractional
// position, so a dressing icon always reads in the same relative spot
// whether shown at the small grid cell's own size or the Tile Detail
// panel's big zoomed view (drawers/index.js's dungeonDressingOverlayHtml
// renders both from the exact same gx/gy data).
export const DUNGEON_DRESSING_ICONS = [
  { key: 'door', label: 'Door', glyph: '🚪' },
  // `secret` flags drawers/index.js's own rendering to add a dashed
  // outline + a small "?" badge — same glyph as a plain Door (there's no
  // widely-supported distinct "secret door" emoji), distinguished visually
  // instead of by a different picture.
  { key: 'secret-door', label: 'Secret Door', glyph: '🚪', secret: true },
  { key: 'portcullis', label: 'Portcullis', glyph: '🔒' },
  { key: 'stairs-up', label: 'Stairs Up', glyph: '⬆️' },
  { key: 'stairs-down', label: 'Stairs Down', glyph: '⬇️' },
  { key: 'pillar', label: 'Pillar', glyph: '⬤' },
  { key: 'tree-trunk', label: 'Tree Trunk', glyph: '🌳' },
  { key: 'chest', label: 'Chest', glyph: '📦' },
  { key: 'campfire', label: 'Campfire', glyph: '🔥' },
];

export function findDungeonDressingIcon(key) {
  return DUNGEON_DRESSING_ICONS.find((d) => d.key === key) || null;
}

// The 12x12 grid's own size — "treat each tile as 12"x12" and use a 1" =
// 5' typical map scale" (matches the real book's own stated Tile
// dimensions exactly, see this file's own header comment). Exported so
// domain/dungeonCrawls.js's bounds-checking and drawers/index.js's
// pixel<->grid-cell math both read from the one real number rather than
// each hardcoding `12` independently.
export const DUNGEON_TILE_GRID_SIZE = 12;
