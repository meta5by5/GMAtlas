// worldTrackerIcons.js — the World Tracker's overlay-icon set
// (requirements/PLANETFALL_world_tracker.md, section 4.2). A sector's
// overlay icon is usually DERIVED from its features (worldTracker.js's
// deriveSectorIcon), never hardcoded — this is only the glyph lookup for
// whichever key that derivation (or a GM's manual override) lands on. Data,
// not code, matching battlemapIcons.js's own convention, so the set can
// grow without touching domain/UI logic.

export const WORLD_TRACKER_ICONS = [
  { key: 'home_base', label: 'Home Base', glyph: '🏠' },
  { key: 'alien_site', label: 'Alien Site', glyph: 'S' },
  { key: 'enemy_camp', label: 'Enemy Camp', glyph: 'H' },
  { key: 'resource_node', label: 'Resource Node', glyph: '⛏️' },
  { key: 'milestone_site', label: 'Milestone Site', glyph: '☆' },
  { key: 'unexplored', label: 'Unexplored', glyph: '?' },
];

export function findWorldTrackerIcon(key) {
  return WORLD_TRACKER_ICONS.find((i) => i.key === key) || null;
}
