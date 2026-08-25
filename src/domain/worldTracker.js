// worldTracker.js — the strategic World Tracker's pure storage
// (requirements/PLANETFALL_world_tracker.md): a fixed 6x6 grid of sectors
// for 5PFH Planetfall-style colony play (home base, exploration/resource/
// hazard state, mobile enemy-camp features, mission-hook suggestions).
// Distinct from battlemaps.js (that's the TACTICAL miniatures grid; this
// is the STRATEGIC colony/exploration map) — no shared code between them,
// since the layout models differ (fixed integer grid cells here vs.
// freeform 0-1 fractional placement there).
//
// `sectors` is a SPARSE map keyed "x,y" (1-based, 1..gridSize each) — a
// coordinate with no entry yet is read (getSector) as a synthesized
// default unexplored sector, never written until something actually
// touches it, same additive-lazy-init posture schema.js uses throughout.
//
// Campaign Turn / Campaign Milestones deliberately live in colony.js
// (colony.fields.campaignTurn/campaignMilestones, the same 5PFH Planetfall
// ruleset's existing Turn Sheet) — not duplicated here. advanceWorldTurn
// below only clears this module's OWN per-turn state (migration ghost
// markers); callers combine it with colony.js's advanceCampaignTurn.

import { WORLD_TRACKER_MISSION_HOOKS } from '../data/worldTrackerMissionHooks.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.worldTracker || typeof campaign.worldTracker !== 'object') campaign.worldTracker = {};
  const wt = campaign.worldTracker;
  if (!Number.isFinite(wt.gridSize) || wt.gridSize < 1) wt.gridSize = 6;
  if (!wt.sectors || typeof wt.sectors !== 'object') wt.sectors = {};
  if (wt.homeBaseSector === undefined) wt.homeBaseSector = null;
  if (typeof wt.notes !== 'string') wt.notes = '';
  return wt;
}

function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function key(x, y) { return `${x},${y}`; }

function clampCoord(n, gridSize) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(gridSize, v));
}

function rollDie(sides, rng) { return Math.floor(rng() * sides) + 1; }

// 5PFH Planetfall p.53 "Initial Placements": after picking/rolling a home
// sector, the GM marks exactly 10 OTHER sectors as investigation sites
// (the only ones that start showing a '?') — NOT every unexplored sector
// on the grid, which is what this used to assume (a real reported
// inaccuracy). This cap is advisory, not enforced here (see
// toggleInvestigationSite below) — a GM correcting a mistake mid-campaign
// shouldn't be hard-blocked by a rule about INITIAL setup.
export const MAX_INVESTIGATION_SITES = 10;

function defaultSector() {
  return {
    state: 'unexplored',
    investigationSite: false,
    resourceLevel: null, resourceHarvested: false,
    hazardLevel: null, hazardTags: [],
    features: [],
    cornerLabels: [],
    overlayIcon: null,
    notes: '',
  };
}

export function gridSizeOf(campaign) {
  return (campaign.worldTracker && campaign.worldTracker.gridSize) || 6;
}

/** Read-only — the real sector record, or a synthesized default. Never
 *  mutates the campaign, so callers scanning many/all sectors (a render
 *  loop, generateMissionHooks) don't need to clone anything themselves. */
export function getSector(campaign, x, y) {
  const wt = campaign.worldTracker || {};
  const rec = (wt.sectors || {})[key(x, y)];
  return rec ? { ...rec, x, y } : { ...defaultSector(), x, y };
}

/** Every sector actually touched (present in the sparse map) so far, each
 *  tagged with its own {x,y} — the Sectors/Features/Missions tabs and
 *  generateMissionHooks all scan this rather than all 36 possible
 *  coordinates, so a fresh campaign starts with an empty, uncluttered list
 *  instead of 36 identical "unexplored" entries. */
export function listTouchedSectors(campaign) {
  const wt = campaign.worldTracker || {};
  return Object.entries(wt.sectors || {}).map(([k, rec]) => {
    const [x, y] = k.split(',').map(Number);
    return { ...rec, x, y };
  });
}

export function countInvestigationSites(campaign) {
  return listTouchedSectors(campaign).filter((s) => s.investigationSite).length;
}

/** Toggles the p.53 "investigation site" marker for one sector — the only
 *  thing that makes an unexplored sector show a '?' (see deriveSectorIcon
 *  below). Un-marking is always allowed; marking is advisory-capped (see
 *  MAX_INVESTIGATION_SITES's own comment) rather than hard-blocked. */
export function toggleInvestigationSite(campaign, x, y) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = getOrCreateSectorRecord(wt, clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize));
  sector.investigationSite = !sector.investigationSite;
  return next;
}

function getOrCreateSectorRecord(wt, x, y) {
  const k = key(x, y);
  if (!wt.sectors[k]) wt.sectors[k] = defaultSector();
  return wt.sectors[k];
}

/** Rolls resource/hazard levels (flat 1d6 each — the literal Planetfall
 *  roll tables aren't in this repo, only that these are rolled ints; see
 *  the requirements doc) and flips state to 'explored'. No-op if this
 *  sector has already been explored (or surveyed) — revealing is a
 *  one-time event per sector, not re-rollable by re-tapping it. */
export function revealSector(campaign, x, y, { rng = Math.random } = {}) {
  const next = clone(campaign);
  const wt = ensure(next);
  const gx = clampCoord(x, wt.gridSize), gy = clampCoord(y, wt.gridSize);
  const sector = getOrCreateSectorRecord(wt, gx, gy);
  if (sector.state !== 'unexplored') return next;
  sector.resourceLevel = rollDie(6, rng);
  sector.hazardLevel = rollDie(6, rng);
  sector.state = 'explored';
  // Spec 4.1's "standard use" — resource value in one corner, hazard in
  // another — applied automatically on reveal; a GM can still overwrite
  // either corner with setSectorCornerLabel afterward (source:'custom'
  // simply replaces whatever was here, same one-label-per-corner rule).
  sector.cornerLabels = sector.cornerLabels.filter((c) => c.corner !== 'top_left' && c.corner !== 'top_right');
  sector.cornerLabels.push({ corner: 'top_left', text: `R${sector.resourceLevel}`, source: 'resource' });
  sector.cornerLabels.push({ corner: 'top_right', text: `H${sector.hazardLevel}`, source: 'hazard' });
  return next;
}

/** 'explored' -> 'surveyed' only; no-op on an unexplored or already-
 *  surveyed sector. */
export function surveySector(campaign, x, y) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = wt.sectors[key(clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize))];
  if (sector && sector.state === 'explored') sector.state = 'surveyed';
  return next;
}

/** Marks the sector's resource as harvested — generateMissionHooks below
 *  suppresses just that sector's resource_node hook afterward, never the
 *  sector's other hooks (spec: "once harvested, sector stops generating
 *  RESOURCE-based mission hooks", not ALL of its hooks). No-op if the
 *  sector has no rolled resource at all. */
export function harvestSectorResource(campaign, x, y) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = wt.sectors[key(clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize))];
  if (sector && sector.resourceLevel != null) sector.resourceHarvested = true;
  return next;
}

export function setSectorNotes(campaign, x, y, notes) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = getOrCreateSectorRecord(wt, clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize));
  sector.notes = String(notes || '');
  return next;
}

/** `iconKey: null` clears a manual override back to deriveSectorIcon's
 *  automatic, feature-priority-based choice (see below) — the same
 *  "explicit override coexists with automatic derivation" shape
 *  CornerLabel's own source:'custom' already uses. */
export function setSectorOverlayIcon(campaign, x, y, iconKey) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = getOrCreateSectorRecord(wt, clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize));
  sector.overlayIcon = iconKey || null;
  return next;
}

const CORNERS = ['top_left', 'top_right', 'bottom_left', 'bottom_right'];

/** Each corner holds at most one label — setting one replaces whatever was
 *  there before at that SAME corner, the other three corners untouched. */
export function setSectorCornerLabel(campaign, x, y, corner, text, source = 'custom') {
  if (!CORNERS.includes(corner)) return clone(campaign);
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = getOrCreateSectorRecord(wt, clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize));
  sector.cornerLabels = sector.cornerLabels.filter((c) => c.corner !== corner);
  const t = String(text || '').trim();
  if (t) sector.cornerLabels.push({ corner, text: t, source });
  return next;
}

export function removeSectorCornerLabel(campaign, x, y, corner) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = wt.sectors[key(clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize))];
  if (sector) sector.cornerLabels = sector.cornerLabels.filter((c) => c.corner !== corner);
  return next;
}

const FEATURE_KINDS = ['alien_site', 'enemy_camp', 'resource_node', 'milestone_site'];

/** Features stack — a sector can carry more than one, e.g. a migrated camp
 *  landing on a sector that's already an alien site (spec 1.4). */
export function addSectorFeature(campaign, x, y, kind) {
  if (!FEATURE_KINDS.includes(kind)) return clone(campaign);
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = getOrCreateSectorRecord(wt, clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize));
  sector.features.push({ id: newId('wtf'), kind, mobile: kind === 'enemy_camp', discovered: false, linkedMissionType: null, movedFrom: null });
  return next;
}

export function discoverSectorFeature(campaign, x, y, featureId) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = wt.sectors[key(clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize))];
  const feature = sector && sector.features.find((f) => f.id === featureId);
  if (feature) feature.discovered = true;
  return next;
}

export function removeSectorFeature(campaign, x, y, featureId) {
  const next = clone(campaign);
  const wt = ensure(next);
  const sector = wt.sectors[key(clampCoord(x, wt.gridSize), clampCoord(y, wt.gridSize))];
  if (sector) sector.features = sector.features.filter((f) => f.id !== featureId);
  return next;
}

/** Plain square 4-neighbor adjacency (up/down/left/right), clamped to the
 *  grid — no diagonals, no hex (5PFH Planetfall's grid is a plain d6xd6
 *  square, confirmed against the rulebook). Pure coordinate math, no
 *  campaign needed. */
export function adjacentSectors(x, y, gridSize = 6) {
  const candidates = [{ x, y: y - 1 }, { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }];
  return candidates.filter((c) => c.x >= 1 && c.x <= gridSize && c.y >= 1 && c.y <= gridSize);
}

/** GM-manual migration only (direct decision — no rulebook-derived auto-
 *  suggestion): no-ops if the feature isn't found, isn't mobile, or the
 *  target isn't actually adjacent to the source. The arriving copy is
 *  stamped with movedFrom so the UI can render a one-turn "moved from"
 *  ghost marker (spec 4.2); advanceWorldTurn below clears it. */
export function migrateFeature(campaign, fromX, fromY, featureId, toX, toY) {
  const next = clone(campaign);
  const wt = ensure(next);
  const gx = clampCoord(fromX, wt.gridSize), gy = clampCoord(fromY, wt.gridSize);
  const tx = clampCoord(toX, wt.gridSize), ty = clampCoord(toY, wt.gridSize);
  const source = wt.sectors[key(gx, gy)];
  const feature = source && source.features.find((f) => f.id === featureId);
  if (!feature || !feature.mobile) return next;
  if (!adjacentSectors(gx, gy, wt.gridSize).some((c) => c.x === tx && c.y === ty)) return next;
  source.features = source.features.filter((f) => f.id !== featureId);
  const dest = getOrCreateSectorRecord(wt, tx, ty);
  dest.features.push({ ...feature, movedFrom: { x: gx, y: gy } });
  return next;
}

export function setHomeBase(campaign, x, y) {
  const next = clone(campaign);
  const wt = ensure(next);
  wt.homeBaseSector = { x: clampCoord(x, wt.gridSize), y: clampCoord(y, wt.gridSize) };
  return next;
}

/** "Home base can be chosen or rolled randomly in any square" (5PFH
 *  Planetfall p.53) — 1d6 x 1d6, same die the whole grid is sized around. */
export function rollHomeBase(campaign, { rng = Math.random } = {}) {
  const wt = campaign.worldTracker || {};
  const gridSize = wt.gridSize || 6;
  return setHomeBase(campaign, rollDie(gridSize, rng), rollDie(gridSize, rng));
}

/** End-of-turn step, THIS module's part of it only (spec 1.6: "mobile
 *  features may migrate... new sectors get revealed" — migration/reveal
 *  themselves are separate GM actions above; this just clears every
 *  feature's movedFrom campaign-wide so a migration's ghost marker shows
 *  for exactly one turn, then disappears on the next). Callers combine
 *  this with colony.js's advanceCampaignTurn in the same store.update. */
export function advanceWorldTurn(campaign) {
  const next = clone(campaign);
  const wt = ensure(next);
  for (const sector of Object.values(wt.sectors)) {
    for (const feature of sector.features) feature.movedFrom = null;
  }
  return next;
}

// Priority order for the ONE overlay icon slot a sector can show at once
// (spec 4.1.3: "home base > active camp > alien site > milestone > plain
// unexplored ?" — resource_node isn't in the spec's own worked example
// list; inserted here between alien_site and milestone_site as the most
// sensible slot, easily reordered later since this is the only place the
// order is expressed).
const ICON_PRIORITY = ['enemy_camp', 'alien_site', 'resource_node', 'milestone_site'];

/** Pure — never reads/writes IndexedDB or the DOM. Only consulted by the
 *  UI when sector.overlayIcon (a manual override) is null. An unexplored
 *  sector only shows '?' if it's one of the GM's marked investigation
 *  sites (p.53 "Initial Placements" — a real reported inaccuracy: this
 *  used to show '?' on EVERY unexplored sector); a plain untouched/
 *  unmarked sector shows no icon at all. */
export function deriveSectorIcon(sector, isHomeBase) {
  if (isHomeBase) return 'home_base';
  for (const kind of ICON_PRIORITY) {
    if ((sector.features || []).some((f) => f.kind === kind)) return kind;
  }
  if (sector.state === 'unexplored' && sector.investigationSite) return 'unexplored';
  return null;
}

function hookFor(signal) { return WORLD_TRACKER_MISSION_HOOKS.find((h) => h.signal === signal) || null; }

/** Scans every TOUCHED sector (listTouchedSectors — an untouched, never-
 *  interacted-with coordinate isn't "on the map" for hook purposes yet, so
 *  a fresh 6x6 grid doesn't start with 36 identical "go explore" hooks)
 *  against WORLD_TRACKER_MISSION_HOOKS' signal->missionType data. A hook
 *  retires itself once its underlying signal no longer applies — the
 *  harvested-resource flag suppresses a resource_node's hook (spec 1.3),
 *  and a feature's own `discovered` flag suppresses its hook the same way
 *  once the GM has run that mission (see the `resolve` field's own
 *  comment in the data file). Returns [{x, y, missionType, reason, signal,
 *  featureId}] — `featureId` only set for a feature-kind hook, since a
 *  sector can carry more than one feature (each gets its own hook, not
 *  deduplicated by kind); most-recently-touched order is NOT guaranteed —
 *  this is a suggestion list of currently-available missions, not a log
 *  of completed ones. */
export function generateMissionHooks(campaign) {
  const hooks = [];
  for (const sector of listTouchedSectors(campaign)) {
    // Only a marked investigation site's own "Investigation" hook (p.53) —
    // not every touched-but-still-unexplored sector (e.g. one that merely
    // has a note or a corner label on it isn't automatically a mission
    // hook).
    if (sector.state === 'unexplored' && sector.investigationSite) {
      const def = hookFor('unexplored');
      if (def) hooks.push({ x: sector.x, y: sector.y, missionType: def.missionType, reason: def.reason, signal: 'unexplored' });
    }
    if (sector.state === 'explored') {
      const def = hookFor('explored');
      if (def) hooks.push({ x: sector.x, y: sector.y, missionType: def.missionType, reason: def.reason, signal: 'explored' });
    }
    for (const feature of sector.features) {
      if (feature.discovered) continue;
      if (feature.kind === 'resource_node' && sector.resourceHarvested) continue;
      const def = hookFor(feature.kind);
      if (def) hooks.push({ x: sector.x, y: sector.y, missionType: def.missionType, reason: def.reason, signal: feature.kind, featureId: feature.id });
    }
  }
  return hooks;
}

export function setWorldTrackerNotes(campaign, notes) {
  const next = clone(campaign);
  ensure(next).notes = String(notes || '');
  return next;
}

/** The Overview tab's guided-workflow checklist (direct request: surface
 *  each pending decision as a step in the tool's own UI instead of
 *  requiring the GM to notice it by clicking through tabs — and never
 *  decide it FOR them; every item here is something the GM still has to
 *  act on). Pure and read-only, same "just look at current state" shape
 *  generateMissionHooks already uses — nothing here is itself a decision,
 *  only a surfaced one. Order matches the natural p.53 setup sequence
 *  (home base, then investigation sites) followed by whatever's currently
 *  actionable in play (every generateMissionHooks entry, one item each).
 *  Returns [{ kind: 'home-base' | 'investigation-sites' | 'mission', label, detail, ...hook }]
 *  — a 'mission' item spreads its generateMissionHooks entry directly
 *  (x/y/missionType/reason/signal/featureId) so the UI can reuse the exact
 *  same "Run this" control the Missions tab already has, no duplicate
 *  markup or a second resolution code path. */
export function worldTrackerAttentionItems(campaign) {
  const items = [];
  const wt = campaign.worldTracker || {};
  if (!wt.homeBaseSector) {
    items.push({ kind: 'home-base', label: 'Set your home base', detail: 'Pick one on the grid (Sectors tab), or roll it randomly (5PFH Planetfall p.53).' });
  }
  const marked = countInvestigationSites(campaign);
  if (marked < MAX_INVESTIGATION_SITES) {
    items.push({
      kind: 'investigation-sites',
      label: `${MAX_INVESTIGATION_SITES - marked} more investigation site${MAX_INVESTIGATION_SITES - marked === 1 ? '' : 's'} to mark`,
      detail: `${marked} / ${MAX_INVESTIGATION_SITES} marked so far — mark them from a sector's own detail panel (Sectors tab).`,
    });
  }
  for (const hook of generateMissionHooks(campaign)) {
    items.push({ kind: 'mission', label: `Sector ${hook.x},${hook.y}: ${hook.missionType} available`, detail: hook.reason, ...hook });
  }
  return items;
}
