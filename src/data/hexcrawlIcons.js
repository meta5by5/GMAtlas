// hexcrawlIcons.js — the Hexcrawl map's two built-in icon sets: a
// background Geography "paint" (one per hex, fills the cell) and Threat
// markers (one per hex vertex, up to 6 per hex). Same posture as
// battlemapIcons.js/worldTrackerIcons.js — a small, genre-neutral,
// single-glyph set, data not code, so it can grow later without touching
// any domain or UI logic. A hex's third layer, the center Location icon,
// is NOT here — like Battlemap's own "token" icons, its art comes from a
// linked Cast entity's own Gallery thumbnail, not a picked glyph.

// `color` is the hex's own solid fill (direct follow-up request: "make the
// Geography background solid color") — a real, distinct hue per terrain
// type rather than a shared neutral cell background with just a faint
// glyph watermark, tuned against this app's own dark cockpit palette
// (styles/tokens.css has no light/dark toggle to account for).
// `iconArt` — direct follow-up request: "update the geography icons to be
// more fantasy pencil pen and ink similar to used in dungeoncraft maps. Add
// 3 variations of each geography biome icon that rotate when placed to
// create variety." Hand-authoring convincing pen-and-ink line art isn't
// something this tool can generate, so these are real crops crop from a
// user-supplied pen-and-ink hex-map icon sheet (assets/map-icons2.jpg),
// processed to a transparent black-ink overlay (assets/hexcrawl-icons/,
// see processIcons.cjs in git history for the one-off extraction script)
// so they read correctly over any of this catalog's own solid `color`
// fills. Exactly 3 variants per biome that had matching source art; a hex's
// `geoVariant` (domain/hexcrawls.js) records which one was picked at paint
// time so it stays stable across re-renders. `water` and `ice` have no
// matching pen-and-ink art anywhere in the source sheet — they keep their
// plain emoji `glyph` as a deliberate, disclosed fallback rather than
// forcing a mismatched icon.
export const HEXCRAWL_GEOGRAPHY_ICONS = [
  { key: 'plains', label: 'Plains', glyph: '🌾', color: '#8a8f3a', iconArt: ['plains_1.png', 'plains_2.png', 'plains_3.png'] },
  { key: 'forest', label: 'Forest', glyph: '🌲', color: '#2f5233', iconArt: ['forest_1.png', 'forest_2.png', 'forest_3.png'] },
  { key: 'hills', label: 'Hills', glyph: '⛰️', color: '#7a6a3f', iconArt: ['hills_1.png', 'hills_2.png', 'hills_3.png'] },
  { key: 'mountains', label: 'Mountains', glyph: '🏔️', color: '#5f6066', iconArt: ['mountains_1.png', 'mountains_2.png', 'mountains_3.png'] },
  { key: 'desert', label: 'Desert', glyph: '🏜️', color: '#b8902f', iconArt: ['desert_1.png', 'desert_2.png', 'desert_3.png'] },
  { key: 'swamp', label: 'Swamp / Marsh', glyph: '🥀', color: '#465c3d', iconArt: ['swamp_1.png', 'swamp_2.png', 'swamp_3.png'] },
  { key: 'water', label: 'Water / Coast', glyph: '🌊', color: '#2d6a8f' },
  { key: 'ice', label: 'Ice / Tundra', glyph: '❄️', color: '#7fa8b8' },
  { key: 'volcanic', label: 'Volcanic', glyph: '🌋', color: '#7c3626', iconArt: ['volcanic_1.png', 'volcanic_2.png', 'volcanic_3.png'] },
  // 'ruins' moved to HEXCRAWL_THREAT_ICONS below (direct follow-up
  // request: "Move Ruins to an Encounter and not a geography") — a ruin
  // is a point of interest a party finds IN a hex, not the hex's own
  // whole-cell terrain, same reasoning every other Encounter already
  // fits. Its former iconArt crops (ruins_1/2/3.png) stay unused on disk
  // rather than deleted — Encounters render a plain glyph, not iconArt,
  // same as every other entry in that catalog.
  // Direct follow-up request: "Add a sea button that will add blue ocean
  // with waves similar to the other geography graphics" — a NEW button
  // distinct from the existing generic 'water' entry above (which stays
  // as its own plain-emoji terrain choice). No source sprite-sheet art
  // exists for open-ocean waves the way it did for the other biomes'
  // `iconArt` crops (assets/map-icons2.jpg), so this uses `svgArt`
  // instead — a hand-authored inline SVG wave-line pattern in the SAME
  // black-ink-on-transparent style those crops were processed into
  // (hexGeoGlyphHtml, drawers/index.js, renders whichever of iconArt/
  // svgArt/glyph a geography entry actually has, in that priority order).
  {
    key: 'ocean', label: 'Ocean', glyph: '🌊', color: '#123a52',
    svgArt: '<path d="M-28,-14 Q-21,-20 -14,-14 T0,-14 T14,-14 T28,-14" stroke="#0a0a0a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      + '<path d="M-28,0 Q-21,-6 -14,0 T0,0 T14,0 T28,0" stroke="#0a0a0a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      + '<path d="M-28,14 Q-21,8 -14,14 T0,14 T14,14 T28,14" stroke="#0a0a0a" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  },
];

export function findHexcrawlGeography(key) {
  return HEXCRAWL_GEOGRAPHY_ICONS.find((i) => i.key === key) || null;
}

// Displayed to a GM as "Encounters" (direct follow-up request — the
// palette section/Hex Detail panel headers, drawers/index.js), though the
// underlying key/field names ('threat'/hex.threats/setHexThreat/...) stay
// as-is — a display-only rename, same posture as entityTypeLabel's own
// Fantasy-genre "Bestiary" relabel elsewhere in this app.
export const HEXCRAWL_THREAT_ICONS = [
  { key: 'lair', label: 'Monster Lair', glyph: '🐉' },
  { key: 'raiders', label: 'Bandits / Raiders', glyph: '⚔️' },
  { key: 'hazard', label: 'Hazard', glyph: '⚠️' },
  { key: 'anomaly', label: 'Cursed / Anomaly', glyph: '🌀' },
  { key: 'patrol', label: 'Patrol', glyph: '🚩' },
  { key: 'ruins', label: 'Ruins', glyph: '🏛️' },
  // Direct follow-up request: "Add a town, city and keep as options in
  // locations" — settlement-scale points of interest, same posture as
  // Ruins just above (a specific thing a party finds/visits in a hex, not
  // the hex's own whole-cell terrain).
  { key: 'town', label: 'Town', glyph: '🏘️' },
  { key: 'city', label: 'City', glyph: '🏙️' },
  { key: 'keep', label: 'Keep', glyph: '🏰' },
  { key: 'unknown', label: 'Unknown', glyph: '❓' },
];

export function findHexcrawlThreat(key) {
  return HEXCRAWL_THREAT_ICONS.find((i) => i.key === key) || null;
}
