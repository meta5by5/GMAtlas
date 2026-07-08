// battlemapIcons.js — the Planetfall Grid Battlemap's built-in annotation
// icon set (docs/adr/0023-planetfall-grid-battlemap.md). No real Planetfall
// art asset exists in this repo (confirmed during research — only two
// Intergalactic Space Trader PDFs live under requirements/rulesystems/,
// unrelated), so this is a small, genre-neutral set of single-glyph icons
// rather than a licensed/lifted icon library — data, not code, matching
// this app's existing tables.js/economyTypes.js convention, so the set can
// grow later without touching any domain or UI logic. A combatant TOKEN
// (kind: 'token' on a placed icon) is a different thing — its art comes
// from the linked entity's Gallery thumbnail, not from this list.

export const BATTLEMAP_ICONS = [
  { key: 'hazard', label: 'Hazard', glyph: '⚠️' },
  { key: 'door', label: 'Door', glyph: '🚪' },
  { key: 'cover', label: 'Cover', glyph: '🛡️' },
  { key: 'terminal', label: 'Terminal', glyph: '💻' },
  { key: 'crate', label: 'Crate', glyph: '📦' },
  { key: 'ladder', label: 'Ladder/Stairs', glyph: '🪜' },
  { key: 'wreckage', label: 'Wreckage', glyph: '💥' },
  { key: 'extraction', label: 'Extraction Point', glyph: '🚀' },
  { key: 'alarm', label: 'Alarm', glyph: '🚨' },
  { key: 'objective', label: 'Objective', glyph: '⭐' },
  { key: 'note', label: 'Note', glyph: '📝' },
];

export function findBattlemapIcon(key) {
  return BATTLEMAP_ICONS.find((i) => i.key === key) || null;
}
