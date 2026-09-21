// locationTypeIcons.js — Five Leagues from the Borderlands' own canonical
// Location categories (Core rulebook p.68 Step 2: Establish Settlements;
// p.92-94 Encounter Locations: Enemy Camps, Enemy Hideouts, Delves, Monster
// Lairs, Unexplored Locations), offered as a small symbolic icon a GM can
// pick as a Location entity's own "portrait" — direct follow-up request:
// "create simple drawing icons representing the types of locations that
// are in 5LFB that can be selected as the portrait of the location entity
// record and will be displayed in the hex." Same small/genre-neutral/
// single-glyph posture as every other icon catalog here (battlemapIcons.js,
// hexcrawlIcons.js's own Threat catalog) — a real hand-drawn pen-and-ink
// set isn't something this tool can hand-author convincingly (same
// constraint noted for Hexcrawl's Geography icons before a real source
// sprite sheet was supplied to crop from); these are plain emoji glyphs
// instead, matching the app-wide convention.
//
// Shown as a picker in the Entity Editor for a Location entity only while
// Five Leagues is the active ruleset (settings.statRuleset ===
// 'fiveleagues' — see entityLocationTypeIconPicker, drawers/index.js), and
// stored on the entity as `locationTypeIcon` (a plain field via
// updateEntity, same as any other simple entity field — no dedicated
// domain mutator needed). Resolved at render time in the Hexcrawl grid's
// own center-icon slot (hexcrawlGrid) as a fallback UNDER a real uploaded
// Gallery thumbnail (entity.thumbnailId) but ABOVE the plain initial-letter
// fallback.
export const FIVELEAGUES_LOCATION_TYPE_ICONS = [
  { key: 'settlement', label: 'Settlement', glyph: '🏘️' },
  { key: 'enemy-camp', label: 'Enemy Camp', glyph: '⛺' },
  { key: 'enemy-hideout', label: 'Enemy Hideout', glyph: '🕳️' },
  { key: 'delve', label: 'Delve', glyph: '🏚️' },
  { key: 'monster-lair', label: 'Monster Lair', glyph: '🐾' },
  { key: 'unexplored', label: 'Unexplored Location', glyph: '❓' },
];

export function findLocationTypeIcon(key) {
  return FIVELEAGUES_LOCATION_TYPE_ICONS.find((i) => i.key === key) || null;
}
