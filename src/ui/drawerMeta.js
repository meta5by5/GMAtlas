// drawerMeta.js — the shared glyph/label registry for every drawer-shaped
// id in the app, plus the three built-in Storyboard contents (dashboard/
// narrative/copilot) and the three Storyboard SLOT ids (composer/
// navigator/advisor) they normally fill. Extracted out of shell.js so both
// shell.js AND drawers/index.js's Settings > Ruleset Profile Editor tab
// (design/adr/rules-profiles-multi-campaign.md — building the Storyboard
// position <select>s and module-enable checkboxes needs this same id/label
// list) can read it without a circular import between those two files.

// 'cast' IS a real drawer (2026-07-06 restructure), an ordinary DRAWERS/
// openDrawers member with no special-cased open/close behavior (docs/adr/
// 0032 removed the anchor-slot mechanism it used to open into by default —
// dragging an entity into another tab's fields is now the touch-drag
// hover-to-switch-tab gesture instead, see shell.js's onTouchMove).
// 'entity-detail' (an entity's actual name/tags/overview/statblocks/
// relationships form) is NOT here — it has no edge nav button at all, and
// only ever opens via openDrawerTab('entity-detail') from an entity click
// anywhere (mention link, Cast row, relationship chip, graph node, ...),
// never picked from the tab list directly. See DRAWER_META for how the tab
// strip still labels it despite that.
export const DRAWERS = [
  { id: 'guide', glyph: '📘', label: 'Guide' },
  { id: 'journal', glyph: '📖', label: 'Journal' },
  { id: 'oracle', glyph: '🎲', label: 'Oracle' },
  { id: 'party', glyph: '👥', label: 'Party' },
  { id: 'cast', glyph: '☷', label: 'Cast' },
  { id: 'colony', glyph: '🏛', label: 'Colony' },
  { id: 'world-tracker', glyph: '🪐', label: 'World' },
  { id: 'faction-events', glyph: '⚔', label: 'Faction Events' },
  { id: 'trade', glyph: '💰', label: 'Trade' },
  { id: 'documents', glyph: '📄', label: 'Docs' },
  { id: 'gallery', glyph: '🖼', label: 'Gallery' },
  { id: 'battlemap', glyph: '🗺', label: 'Battlemap' },
  { id: 'graph', glyph: '🔗', label: 'Graph' },
  { id: 'settings', glyph: '⚙', label: 'Settings' },
];
// Tab-strip label/glyph lookup that also covers drawer ids with no edge
// button (currently just entity-detail) — DRAWERS.find(...) alone would
// come up empty for those.
export const DRAWER_META = {
  'entity-detail': { id: 'entity-detail', glyph: '👤', label: 'Entity' },
  // 'dashboard'/'narrative'/'copilot' are the three built-in Storyboard
  // CONTENTS (the former Dashboard/Narrative/Advisor) — a namespace kept
  // deliberately separate from the SLOT names right below (design/adr/
  // rules-profiles-multi-campaign.md's resolvePositionContentId explains
  // why: it's what lets a freed built-in, opened directly from the top
  // nav once something else occupies its slot, render itself instead of
  // being mistaken for a reference back to whatever now fills that slot).
  // None of the three are real pinned drawers (never added to
  // `openDrawers`) in their SLOT form — see shell.js's
  // renderActiveDrawerHtml/the drawer-tabs render. At compact widths
  // (isCompactTab() — phone AND tablet, design/UX-ROADMAP.md Steps 4/5)
  // the three SLOT ids are ALWAYS in the tab strip, permanently pinned,
  // unclosable — this tab menu IS how the Storyboard is reached there,
  // since .mc-workspace's own always-both-visible rendering is hidden at
  // that tier (styles/cockpit.css) in favor of this. On desktop only the
  // Advisor slot rides along, and only once a real drawer is open (Step
  // 3) — Composer/Navigator stay their own permanent columns there.
  dashboard: { id: 'dashboard', glyph: '📝', label: 'Composer' },
  narrative: { id: 'narrative', glyph: '🧭', label: 'Navigator' },
  copilot: { id: 'copilot', glyph: '💡', label: 'Advisor' },
  // The three SLOT ids themselves — 'composer'/'navigator'/'advisor' as an
  // activeDrawer value means "the pinned tab strip's Composer/Navigator/
  // Advisor SLOT is active," resolved through the profile's mapping
  // (resolvePositionContentId) to whatever content id actually fills it.
  // These entries are a last-resort label fallback only (resolution
  // should always find a match under dashboard/narrative/copilot or a
  // real DRAWERS id first) — never used as a storyboardPositions VALUE.
  composer: { id: 'composer', glyph: '📍', label: 'Composer' },
  navigator: { id: 'navigator', glyph: '📍', label: 'Navigator' },
  advisor: { id: 'advisor', glyph: '📍', label: 'Advisor' },
};
export function drawerMeta(id) { return DRAWERS.find((d) => d.id === id) || DRAWER_META[id] || null; }

// Every content id a Rules Profile can assign to a Storyboard position
// (design/adr/rules-profiles-multi-campaign.md) — the three built-ins
// ('dashboard'/'narrative'/'copilot', NOT the slot ids 'composer'/
// 'navigator'/'advisor' — a profile's storyboardPositions VALUE is never a
// slot name, see resolvePositionContentId), plus every DRAWERS id except
// 'entity-detail' (a sub-view of Cast, not a standalone module) and
// 'settings' (embedding Settings inside a position would be recursive/
// nonsensical).
export const POSITION_ASSIGNABLE_IDS = [
  'dashboard', 'narrative', 'copilot',
  ...DRAWERS.filter((d) => d.id !== 'settings').map((d) => d.id),
];
