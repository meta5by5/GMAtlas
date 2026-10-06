// dungeonCrawlTiles.js — the Dungeon Crawl module's tile catalog: the 12
// Archetypes (edge-connector layouts) of FlexTale's FlexCrawl Toolkit's
// "Dungeon" Environment, Theme Pack 01 "Dungeon Walls" (requirements/
// FlexTale/FlexTale_FlexCrawl_Toolkit.pdf, Table 6 p.40 + Tile Palette #1
// p.43 — both consulted directly, not guessed), plus three Theme Pack
// skins ("packs") that reuse the SAME 12 layouts with different art.
//
// Edge connectors — each Archetype's `edges` records which of its 4 sides
// (N/E/S/W) has a passage opening, at the Tile's own default "North"
// printed orientation (per the book's own convention, p.51: "find the
// Tile Index text... if you rotate the Tile so that its Tile Index text
// is readable, that's the Tile's 'North' orientation"). Verified directly
// against the real sample tile images (requirements/FlexTale/
// FlexTale_DungeonTiles/.../GC-DNG-01-0X;1XXp.PNG) rather than assumed:
// Straight Hall/Chamber open only West+East; L Bend opens only North+West
// (its two other sides show a small enclosed decorative alcove that does
// NOT reach the Tile's own edge — every Archetype has these, purely
// cosmetic, never a real connector); Four-Way opens all 4 sides; Dead End
// opens only West. T Connector/T Connector Chamber's own North+East+West
// opening (missing South) and Straight Hall w/ Overlap/Stairs Down's
// single-West opening were not independently re-confirmed against their
// own source images (time/scope) but follow directly from their names and
// the book's own "two adjacent," "three sides," "one side" Archetype
// descriptions (p.30-42) — if a future pass finds a mismatch against the
// real art, fix the `edges` value here, not the rendering code that reads
// it.
//
// Rotation: a placed Tile's STORED rotation (domain/dungeonCrawls.js's
// placeDungeonTile, always one of 0/90/180/270) is applied as a plain CSS
// transform over the WHOLE Tile at render time (an ordinary <img> for the
// `dungeon` pack, an inline <svg> for the two procedural packs) — matching
// the book's own "physically rotate the printed square card" model (p.51)
// exactly, including why it works cleanly: a Tile is square, so a 90°
// multiple rotation always realigns with its neighbors. `rotateEdges`
// (domain/dungeonCrawls.js) computes which compass edges are ACTUALLY open
// after that same rotation, for the one piece of code that cares
// (computeDungeonAppendCells — deciding which neighboring cells can accept
// the next Tile).
//
// `chamber` (a wide room vs. a narrow corridor) and `stairs` (this
// Archetype represents a Stairs Down Tile, p.39 — descends a level; V1
// only renders its distinct art, no actual multi-level map linking) are
// both PURELY cosmetic flags read by the procedural-pack SVG renderer
// (drawers/index.js's dungeonTileArtHtml) — they never affect `edges` or
// any placement/append logic.
export const DUNGEON_CRAWL_ARCHETYPES = [
  { key: 'straight-hall', label: 'Straight Hall', edges: { N: false, E: true, S: false, W: true }, chamber: false, stairs: false },
  { key: 'straight-chamber', label: 'Straight Chamber', edges: { N: false, E: true, S: false, W: true }, chamber: true, stairs: false },
  { key: 'l-bend', label: 'L Bend', edges: { N: true, E: false, S: false, W: true }, chamber: false, stairs: false },
  { key: 'l-bend-chamber', label: 'L Bend Chamber', edges: { N: true, E: false, S: false, W: true }, chamber: true, stairs: false },
  { key: 't-connector', label: 'T Connector', edges: { N: true, E: true, S: false, W: true }, chamber: false, stairs: false },
  { key: 't-connector-chamber', label: 'T Connector Chamber', edges: { N: true, E: true, S: false, W: true }, chamber: true, stairs: false },
  { key: 'four-way', label: 'Four-Way', edges: { N: true, E: true, S: true, W: true }, chamber: false, stairs: false },
  { key: 'four-way-chamber', label: 'Four-Way Chamber', edges: { N: true, E: true, S: true, W: true }, chamber: true, stairs: false },
  { key: 'dead-end', label: 'Dead End', edges: { N: false, E: false, S: false, W: true }, chamber: false, stairs: false },
  { key: 'dead-end-chamber', label: 'Dead End Chamber', edges: { N: false, E: false, S: false, W: true }, chamber: true, stairs: false },
  { key: 'straight-hall-overlap', label: 'Straight Hall w/ Overlap', edges: { N: false, E: true, S: false, W: true }, chamber: false, stairs: false },
  { key: 'stairs-down', label: 'Stairs Down', edges: { N: false, E: false, S: false, W: true }, chamber: false, stairs: true },
];

// Direct follow-up request: "start the first tile with an entrance such as
// a door, cave, or stairs" — a 13th Archetype, kept OUT of
// DUNGEON_CRAWL_ARCHETYPES' own array (never offered by pickRandomDungeon
// Archetype's uniform pick — a second "entrance" appearing mid-dungeon
// would read as a bug, not a feature) since nothing in the real FlexCrawl
// book defines an Entrance Tile at all — this is original, disclosed
// content layered on top of the real system, same posture as the `cave`/
// `forest` packs' own procedural art. shell.js's dcAppend handler forces
// this exact key (never a random one) only for the very first Tile placed
// on an empty map. One open edge (West, like Dead End) since an entrance
// is the dungeon's own outer boundary — nothing connects beyond it.
// Rendered via dungeonEntranceSvg (drawers/index.js) regardless of which
// pack is active, its icon literally reading as the user's own 3 named
// examples, one per pack: a stone doorway for `dungeon`, a jagged cave
// mouth for `cave`, a short flight of steps up to the surface for
// `forest` — so "start with an entrance" always looks right for whichever
// biome the GM picked, without needing a 4th random variant to track.
export const DUNGEON_CRAWL_ENTRANCE_ARCHETYPE = {
  key: 'entrance', label: 'Entrance', edges: { N: false, E: false, S: false, W: true }, chamber: false, stairs: false, entrance: true,
};

// Every real connector-bearing Archetype, Entrance included — for anything
// that needs to resolve a PLACED Tile's own edges (domain/dungeonCrawls.js's
// computeDungeonAppendCells) rather than offer a random pick (which must
// stay DUNGEON_CRAWL_ARCHETYPES alone, excluding Entrance — see that
// constant's own doc comment). Using this one shared list instead of each
// call site re-concatenating its own copy keeps the two lists from ever
// drifting apart.
export const ALL_DUNGEON_CRAWL_ARCHETYPES = [DUNGEON_CRAWL_ENTRANCE_ARCHETYPE, ...DUNGEON_CRAWL_ARCHETYPES];

export function findDungeonCrawlArchetype(key) {
  if (key === DUNGEON_CRAWL_ENTRANCE_ARCHETYPE.key) return DUNGEON_CRAWL_ENTRANCE_ARCHETYPE;
  return DUNGEON_CRAWL_ARCHETYPES.find((a) => a.key === key) || null;
}

// Three Theme Pack skins of the identical 12 layouts above — direct
// follow-up request: "Make cave and forest versions of the same tile
// layouts as well."
//
// `dungeon` (kind: 'image') is the one pack with REAL extracted art: all
// 12 Archetypes cropped from the actual sample images (Theme Pack 01
// "Dungeon Walls," the "p" Player-side variant — the book's own default
// rendering side, p.56-57 — except t-connector-chamber, whose sample pack
// only shipped an "f" Full/GM-side image, used as-is since the dynamic-
// content markers it carries are faint/unobtrusive at this image's
// resolution). See assets/dungeoncrawl-tiles/dungeon/ (resized 480x480,
// one-off extraction, no script kept). `four-way` and `four-way-chamber`
// render identically — not a processing mistake: the two SOURCE sample
// images themselves are the same art (confirmed byte-for-byte different
// source files that nonetheless depict the same Tile), i.e. a gap in the
// sample pack itself, disclosed here rather than silently papered over.
//
// `cave` and `forest` (kind: 'procedural') are ORIGINAL, disclosed art —
// NOT a transcription of anything in the book. The sample pack's own
// Theme 03 "Cave Walls" only ever shipped ONE of its 12 images (GC-DNG-
// 03-01;151f.PNG, Straight Hall), nowhere near enough to faithfully
// extract a full Cave set the way `dungeon` above was — so rather than
// stretching one real image to stand in for 11 others it was never drawn
// for, `cave`'s palette below is simply sampled/eyeballed from that one
// real image (dark rock, amber ore-vein accents) and the Tile art itself
// is generated at render time (drawers/index.js's dungeonTileArtHtml) from
// each Archetype's own `edges`/`chamber`/`stairs` flags, same "no owned
// source → build a disclosed original" posture this project already uses
// for the Traveller ruleset. `forest` has no real source art at all (the
// book has not published a Forest Environment) and uses the same
// generated-from-edges approach with its own palette. Both packs reuse
// the exact same generic SVG builder, just with different `palette`
// colors and corner-decoration glyphs, so a GM can re-skin a map between
// `cave`/`forest` (or even `dungeon`) at any time without touching a
// single placed Tile's layout.
export const DUNGEON_CRAWL_PACKS = [
  {
    key: 'dungeon', label: 'Dungeon (Stone Walls)', kind: 'image',
    imageDir: 'assets/dungeoncrawl-tiles/dungeon',
    // Direct follow-up request: "allow zoom capability to read markings
    // like secret doors and color coded encounter zones" — the small grid
    // cell above keeps using the Player-side art (imageDir, no dynamic-
    // content clutter at that size), but the big zoomed Tile Detail view
    // (drawers/index.js's dungeonTileDetailArtHtml) uses THIS second set
    // instead: the real Full/GM-side sample images (same Theme Pack 01
    // source, p.56-57's own "Full" version, "complete with all of the
    // dozens of dynamic content markers" — the color-coded numbered boxes
    // and 'S' secret-door glyphs this request is about), re-extracted at a
    // much bigger 900x900 (vs. the grid art's 480x480) specifically so
    // zooming in actually reveals more real detail instead of just
    // upscaled blur, saved as JPEG (quality 90, ~250KB each vs. a lossless
    // PNG's ~800KB) since these are busy photographic/painted textures
    // where JPEG's savings vastly outweigh its minor softening, unlike the
    // flatter line-art the hexcrawl icons use. `straight-hall-overlap` has
    // no real "f" sample in this pack at all (same kind of sourcing gap as
    // `four-way`/`four-way-chamber` sharing identical art, disclosed
    // below) — falls back to its own Player-side art, just resized up to
    // this folder's bigger resolution rather than a missing image.
    imageFullDir: 'assets/dungeoncrawl-tiles/dungeon-full',
  },
  {
    key: 'cave', label: 'Cave', kind: 'procedural',
    palette: { floor: '#3a3733', wall: '#15120d', decor: '#a9792e' },
  },
  {
    key: 'forest', label: 'Forest', kind: 'procedural',
    palette: { floor: '#2e3b22', wall: '#17240f', decor: '#4b3620' },
  },
];

export function findDungeonCrawlPack(key) {
  return DUNGEON_CRAWL_PACKS.find((p) => p.key === key) || DUNGEON_CRAWL_PACKS[0];
}

// Fallback floor/wall/decor colors for the one `kind: 'image'` pack
// (`dungeon`) whenever something needs to render WITHOUT its real photo
// art — the Entrance icon (always procedural, every pack, see above) and
// a merged multi-Tile Room (direct follow-up request: "Allow selection of
// multiple adjacent tiles and replace them with a larger tile that gives
// a bigger room" — domain/dungeonCrawls.js's mergeDungeonTilesIntoRoom;
// there is no real source art for an arbitrarily-sized merged room, so it
// always renders as a plain floor-colored rectangle regardless of pack).
// Sampled to read as neutral stone, close to the real `dungeon` pack's own
// photo palette so switching packs on a map with a merged Room never looks
// jarringly different from its ordinary Tiles.
export const DUNGEON_ROOM_FALLBACK_PALETTE = { floor: '#4a4a46', wall: '#17140f', decor: '#8a7558' };
