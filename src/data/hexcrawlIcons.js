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
// fills. A hex's `geoVariant` (domain/hexcrawls.js) records which one was
// picked at paint time so it stays stable across re-renders. `water` and
// `ice` have no matching pen-and-ink art anywhere in the source sheet —
// they keep their plain emoji `glyph` as a deliberate, disclosed fallback
// rather than forcing a mismatched icon.
//
// LATER direct follow-up request: "create three more variants than exist
// for more variety of map icons... that models the style of this template
// assets/map-icons2.jpg" — 3 more crops per biome (6 total then), found by
// combing the same source sheet for clusters/formations not used in the
// first pass (a second mountain ridge, the sheet's small hill-bump grid
// which the first pass had barely touched, round-tree clusters alongside
// the original pine ones, more grass rows, more swamp pool-blob clusters,
// standing stones + an obelisk + a 4th arch for ruins). That sheet only
// ever drew 3 distinct volcano cones total — rather than inventing art
// that isn't there, volcanic_4/5/6 reuse those same 3 cones at genuinely
// different framings (a wide two-cone composite, and two tighter peak-only
// zooms), disclosed here rather than silently passed off as fresh source
// art.
//
// STILL LATER direct follow-up request: "add to the existing map icons...
// by parsing five variants of each biome from the template assets/
// map-icons3.jpg" — a second, cleanly labeled reference sheet (each
// biome its own named row of icons: Mountains/Hills/Plains/Desert/
// Forests/Swamp/Volcanic/Ruins, 4-5 icons per row) brought every biome up
// to 11 variants (_7 through _11), same extraction pipeline as before
// (crop, grayscale-to-alpha with a fixed dark-ink RGB, trim to content).
// That sheet's own Volcanic row only drew 4 cones, not 5 — rather than
// reusing art again, volcanic_11 instead comes from that sheet's
// Miscellaneous row's smoking-vent/fumarole icon, a genuinely different
// but still clearly volcanic formation.
export const HEXCRAWL_GEOGRAPHY_ICONS = [
  { key: 'plains', label: 'Plains', glyph: '🌾', color: '#8a8f3a', iconArt: ['plains_1.png', 'plains_2.png', 'plains_3.png', 'plains_4.png', 'plains_5.png', 'plains_6.png', 'plains_7.png', 'plains_8.png', 'plains_9.png', 'plains_10.png', 'plains_11.png'] },
  { key: 'forest', label: 'Forest', glyph: '🌲', color: '#2f5233', iconArt: ['forest_1.png', 'forest_2.png', 'forest_3.png', 'forest_4.png', 'forest_5.png', 'forest_6.png', 'forest_7.png', 'forest_8.png', 'forest_9.png', 'forest_10.png', 'forest_11.png'] },
  { key: 'hills', label: 'Hills', glyph: '⛰️', color: '#7a6a3f', iconArt: ['hills_1.png', 'hills_2.png', 'hills_3.png', 'hills_4.png', 'hills_5.png', 'hills_6.png', 'hills_7.png', 'hills_8.png', 'hills_9.png', 'hills_10.png', 'hills_11.png'] },
  { key: 'mountains', label: 'Mountains', glyph: '🏔️', color: '#5f6066', iconArt: ['mountains_1.png', 'mountains_2.png', 'mountains_3.png', 'mountains_4.png', 'mountains_5.png', 'mountains_6.png', 'mountains_7.png', 'mountains_8.png', 'mountains_9.png', 'mountains_10.png', 'mountains_11.png'] },
  { key: 'desert', label: 'Desert', glyph: '🏜️', color: '#b8902f', iconArt: ['desert_1.png', 'desert_2.png', 'desert_3.png', 'desert_4.png', 'desert_5.png', 'desert_6.png', 'desert_7.png', 'desert_8.png', 'desert_9.png', 'desert_10.png', 'desert_11.png'] },
  { key: 'swamp', label: 'Swamp / Marsh', glyph: '🥀', color: '#465c3d', iconArt: ['swamp_1.png', 'swamp_2.png', 'swamp_3.png', 'swamp_4.png', 'swamp_5.png', 'swamp_6.png', 'swamp_7.png', 'swamp_8.png', 'swamp_9.png', 'swamp_10.png', 'swamp_11.png'] },
  { key: 'water', label: 'Water / Coast', glyph: '🌊', color: '#2d6a8f' },
  { key: 'ice', label: 'Ice / Tundra', glyph: '❄️', color: '#7fa8b8' },
  { key: 'volcanic', label: 'Volcanic', glyph: '🌋', color: '#7c3626', iconArt: ['volcanic_1.png', 'volcanic_2.png', 'volcanic_3.png', 'volcanic_4.png', 'volcanic_5.png', 'volcanic_6.png', 'volcanic_7.png', 'volcanic_8.png', 'volcanic_9.png', 'volcanic_10.png', 'volcanic_11.png'] },
  // 'ruins' moved to HEXCRAWL_THREAT_ICONS below (direct follow-up
  // request: "Move Ruins to an Encounter and not a geography") — a ruin
  // is a point of interest a party finds IN a hex, not the hex's own
  // whole-cell terrain, same reasoning every other Encounter already
  // fits. Its former iconArt crops (ruins_1-11.png, grown the same two
  // times every other biome's own set was) stay unused on disk rather
  // than deleted — Encounters render a plain glyph, not iconArt, same as
  // every other entry in that catalog.
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
