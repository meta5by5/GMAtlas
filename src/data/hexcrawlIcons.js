// hexcrawlIcons.js — the Hexcrawl map's two built-in icon sets: a
// background Geography "paint" (one per hex, fills the cell) and Threat
// markers (one per hex vertex, up to 6 per hex). Same posture as
// battlemapIcons.js/worldTrackerIcons.js — a small, genre-neutral,
// single-glyph set, data not code, so it can grow later without touching
// any domain or UI logic. A hex's third layer, the center Location icon,
// is NOT here — like Battlemap's own "token" icons, its art comes from a
// linked Cast entity's own Gallery thumbnail, not a picked glyph.

export const HEXCRAWL_GEOGRAPHY_ICONS = [
  { key: 'plains', label: 'Plains', glyph: '🌾' },
  { key: 'forest', label: 'Forest', glyph: '🌲' },
  { key: 'hills', label: 'Hills', glyph: '⛰️' },
  { key: 'mountains', label: 'Mountains', glyph: '🏔️' },
  { key: 'desert', label: 'Desert', glyph: '🏜️' },
  { key: 'swamp', label: 'Swamp / Marsh', glyph: '🥀' },
  { key: 'water', label: 'Water / Coast', glyph: '🌊' },
  { key: 'ice', label: 'Ice / Tundra', glyph: '❄️' },
  { key: 'volcanic', label: 'Volcanic', glyph: '🌋' },
  { key: 'ruins', label: 'Ruins', glyph: '🏛️' },
];

export function findHexcrawlGeography(key) {
  return HEXCRAWL_GEOGRAPHY_ICONS.find((i) => i.key === key) || null;
}

export const HEXCRAWL_THREAT_ICONS = [
  { key: 'lair', label: 'Monster Lair', glyph: '🐉' },
  { key: 'raiders', label: 'Bandits / Raiders', glyph: '⚔️' },
  { key: 'hazard', label: 'Hazard', glyph: '⚠️' },
  { key: 'anomaly', label: 'Cursed / Anomaly', glyph: '🌀' },
  { key: 'patrol', label: 'Patrol', glyph: '🚩' },
  { key: 'unknown', label: 'Unknown Danger', glyph: '❓' },
];

export function findHexcrawlThreat(key) {
  return HEXCRAWL_THREAT_ICONS.find((i) => i.key === key) || null;
}
