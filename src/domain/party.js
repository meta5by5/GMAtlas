// party.js — the Party tab: a live roster (NPC entities tagged #character —
// see domain/statblocks.js hasCharacterTag) plus free-form, party-wide
// resource trackers that aren't tied to any one entity (credits, custom
// clocks, timers). Ported from the old prototype's split between an
// entity-driven roster and a generic tracker list (see PROGRESS.md
// ISSUES/FINDINGS #1) — kept as two separate concerns here too, since a
// tracker like "party credits" has no natural entity to live on.

import { listEntities } from './entities.js';
import { hasCharacterTag } from './statblocks.js';
import {
  findProgressDifficulty, STARFORGED_PROGRESS_TRACK_MAX,
  STARFORGED_MOMENTUM_MIN, STARFORGED_MOMENTUM_MAX, STARFORGED_MOMENTUM_RESET, STARFORGED_SUPPLY_MAX,
} from '../data/rulesets.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.party || typeof campaign.party !== 'object') campaign.party = { trackers: [] };
  if (!Array.isArray(campaign.party.trackers)) campaign.party.trackers = [];
  if (campaign.party.sharedGear === undefined) campaign.party.sharedGear = '';
  if (!Array.isArray(campaign.party.sharedAssets)) campaign.party.sharedAssets = [];
  if (!Array.isArray(campaign.party.sharedAssetIds)) campaign.party.sharedAssetIds = [];
  return campaign.party;
}

/** Party members = NPC entities tagged #character. */
export function listPartyMembers(campaign) {
  return listEntities(campaign, ['npc']).filter(hasCharacterTag);
}

/** The member's own track fields (across every statblock group they carry —
 *  Character Sheet AND any Bestiary group at once, since #character NPCs
 *  can have both) whose key matches one of settings.partyHeadlineFields
 *  (case-insensitive) — what the Party Roster's collapsed member row shows
 *  as small right-aligned counters (direct request: "GM picks per-ruleset
 *  which fields surface"). Order follows settings.partyHeadlineFields, not
 *  field/group order, so a GM's chosen priority (e.g. "Health before
 *  Momentum") is honored regardless of how the underlying groups are
 *  sorted. Returns {f, gi, fi} triples — gi/fi index into entity.statblocks
 *  exactly like every other statblock mutator in this app expects. */
export function listPartyHeadlineTracks(campaign, entity) {
  const wanted = ((campaign.settings && campaign.settings.partyHeadlineFields) || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return [];
  const groups = entity.statblocks || [];
  const found = [];
  groups.forEach((group, gi) => {
    (group.fields || []).forEach((f, fi) => {
      if (f && f.track && wanted.includes(String(f.key || '').trim().toLowerCase())) found.push({ f, gi, fi });
    });
  });
  return wanted
    .map((name) => found.find(({ f }) => String(f.key || '').trim().toLowerCase() === name))
    .filter(Boolean);
}

export function listPartyTrackers(campaign) {
  return ((campaign.party && campaign.party.trackers) || []);
}

/** A tracker's kind (and, for a Starforged counter, its difficulty) is fixed
 *  for its lifetime — chosen once at creation, never edited afterward (see
 *  updatePartyTracker below). `max` (meter box count, "usually 5 or 10 in
 *  Starforged" but any size the GM wants) and `difficulty` (a counter, only
 *  when the campaign's stat ruleset is Starforged — one of
 *  data/rulesets.js's STARFORGED_PROGRESS_DIFFICULTIES) are both
 *  creation-time-only for the same reason. `min`/`max` only apply to a
 *  'gauge' (a bidirectional single-position track like Momentum, see
 *  setGaugeTrackerValue below — unlike 'meter', it can go negative and
 *  isn't a fill-from-zero count). */
export function addPartyTracker(campaign, { name = 'New Tracker', kind = 'meter', value = 0, max = 5, min = -6, difficulty = '' } = {}) {
  const next = clone(campaign);
  const party = ensure(next);
  const validKind = ['meter', 'counter', 'currency', 'gauge'].includes(kind) ? kind : 'meter';
  const isStarforged = ((next.settings && next.settings.statRuleset) || 'starforged') === 'starforged';
  const rank = validKind === 'counter' && isStarforged ? findProgressDifficulty(difficulty) : null;
  const tracker = {
    id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, kind: validKind,
    value: Number(value) || 0,
  };
  if (validKind === 'meter') tracker.max = Math.max(1, Number(max) || 5);
  if (validKind === 'gauge') {
    tracker.min = Number.isFinite(Number(min)) ? Number(min) : -6;
    tracker.max = Number.isFinite(Number(max)) ? Number(max) : 10;
    tracker.value = Math.max(tracker.min, Math.min(tracker.max, tracker.value));
  }
  if (rank) tracker.difficulty = rank.id;
  party.trackers.push(tracker);
  return next;
}

/** Click-to-set a gauge tracker (Momentum) directly to n, clamped to its own
 *  [min, max] — unlike setPartyTrackerValue's meter boxes (fill-from-zero,
 *  click-the-filled-box-to-decrement), a gauge shows a single CURRENT
 *  POSITION that can be negative, so every box just sets the value to its
 *  own number outright — no toggle-off ambiguity. */
export function setGaugeTrackerValue(campaign, id, n) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind !== 'gauge') return next;
  const min = Number.isFinite(t.min) ? t.min : -6;
  const max = Number.isFinite(t.max) ? t.max : 10;
  t.value = Math.max(min, Math.min(max, Number(n) || 0));
  return next;
}

/** The 10 (or fewer, if the real range is smaller) consecutive integers to
 *  render as a gauge's boxes — a fixed-size WINDOW onto [min, max] that
 *  always contains the current value, centered on it where the range's own
 *  edges allow. Momentum's real range (-6..10, 17 values) can't all fit in
 *  10 boxes at once, so which box reads "0" shifts position within the
 *  rendered row as the window slides to follow the current value — a
 *  deliberate design choice (direct request), not a limitation glossed
 *  over. Pure/exported so the UI's rendering and this math share one tested
 *  source instead of the window logic living untested in drawers/index.js. */
export function gaugeWindow(value, min, max, size = 10) {
  const v = Math.max(min, Math.min(max, Number(value) || 0));
  const span = Math.max(1, Math.min(size, max - min + 1));
  let start = v - Math.floor((span - 1) / 2);
  if (start < min) start = min;
  if (start + span - 1 > max) start = max - span + 1;
  return Array.from({ length: span }, (_, i) => start + i);
}

/** Auto-populates Momentum (a 'gauge', -6..10, reset value +2) and Supply (a
 *  'meter', 0..5, starting full) onto the Party Tracker list the first time
 *  it's viewed under the Starforged ruleset (direct request) — idempotent
 *  (matched by name, case-insensitive) so it's safe to call on every Party
 *  drawer open rather than needing a one-time migration flag. Deliberately
 *  never REMOVES either tracker if the campaign's ruleset later changes
 *  away from Starforged — same "declared but inert, never silently
 *  dropped" posture every other ruleset-specific field in this app follows
 *  (migration rule 5's spirit, applied to a UI-triggered backfill instead
 *  of a schema migration). */
export function ensurePartyStarforgedTrackers(campaign) {
  const isStarforged = ((campaign.settings && campaign.settings.statRuleset) || 'starforged') === 'starforged';
  if (!isStarforged) return campaign;
  const next = clone(campaign);
  const party = ensure(next);
  const hasByName = (name) => party.trackers.some((t) => (t.name || '').trim().toLowerCase() === name);
  if (!hasByName('momentum')) {
    party.trackers.push({
      id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Momentum', kind: 'gauge',
      value: STARFORGED_MOMENTUM_RESET, min: STARFORGED_MOMENTUM_MIN, max: STARFORGED_MOMENTUM_MAX,
    });
  }
  if (!hasByName('supply')) {
    party.trackers.push({
      id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Supply', kind: 'meter',
      value: STARFORGED_SUPPLY_MAX, max: STARFORGED_SUPPLY_MAX,
    });
  }
  return next;
}

/** Rename only — kind/difficulty/max are creation-time-only (see
 *  addPartyTracker), so they're stripped from any patch here rather than
 *  trusted to a caller that "shouldn't" send them. */
export function updatePartyTracker(campaign, id, patch) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (t) {
    const { kind, difficulty, max, min, ...rest } = patch || {};
    Object.assign(t, rest);
  }
  return next;
}

/** Step a counter/currency tracker by delta. A Starforged-difficulty counter
 *  steps by that rank's tick count (Troublesome=12 ... Epic=1, out of a
 *  40-tick track — data/rulesets.js's STARFORGED_PROGRESS_DIFFICULTIES/
 *  STARFORGED_PROGRESS_TRACK_MAX) instead of a plain +1, so it actually
 *  behaves like the Vow/quest progress track it's standing in for. Meters
 *  are click-to-set (see setPartyTrackerValue) and don't step. */
export function stepPartyTracker(campaign, id, delta) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind === 'meter') return next;
  const rank = t.difficulty && findProgressDifficulty(t.difficulty);
  const step = rank ? rank.ticks : 1;
  const raw = (Number(t.value) || 0) + delta * step;
  t.value = rank ? Math.max(0, Math.min(STARFORGED_PROGRESS_TRACK_MAX, raw)) : Math.max(0, raw);
  return next;
}

/** Click-to-set a meter tracker's box (clicking the currently-filled box
 *  clears down by one) — the same interaction as an entity statblock's
 *  track boxes (see domain/statblocks.js's setStatblockTrackValue), now
 *  that a Party meter renders as boxes instead of a numeric ratio. */
export function setPartyTrackerValue(campaign, id, n) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind !== 'meter') return next;
  const max = t.max || 5;
  const target = t.value === n ? n - 1 : n;
  t.value = Math.max(0, Math.min(max, target));
  return next;
}

export function removePartyTracker(campaign, id) {
  const next = clone(campaign);
  const party = ensure(next);
  party.trackers = party.trackers.filter((x) => x.id !== id);
  return next;
}

/** Party-wide free-text gear notes (not tied to any one character) —
 *  e.g. a shared toolkit, a ship's medkit. One field, overwritten
 *  wholesale on each edit like every other rich-text field in this app. */
export function setPartySharedGear(campaign, text) {
  const next = clone(campaign);
  const party = ensure(next);
  party.sharedGear = String(text || '');
  return next;
}

/** Append a free-text Shared Asset. Mirrors addPartyTracker's shape
 *  (party-level, not entity-level — see entities.js's addFactionAsset
 *  for the entity-scoped equivalent this deliberately does NOT reuse). */
export function addPartySharedAsset(campaign, text) {
  const next = clone(campaign);
  const party = ensure(next);
  const clean = String(text || '').trim();
  if (!clean) return next;
  party.sharedAssets.push(clean);
  return next;
}

/** Remove one Shared Asset by index. */
export function removePartySharedAsset(campaign, index) {
  const next = clone(campaign);
  const party = ensure(next);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= party.sharedAssets.length) return next;
  party.sharedAssets.splice(i, 1);
  return next;
}

/** A real Asset ENTITY (a vehicle, typically — see the "+Vehicle" picker,
 *  shell.js) linked into Shared Assets, distinct from the plain free-text
 *  strings above — this one renders as a real entity thumbnail (opens the
 *  Entity Editor, shows its Vehicle Statblock) rather than a static chip.
 *  Deliberately a separate array from sharedAssets rather than repurposing
 *  it, since existing campaigns' sharedAssets entries are plain typed
 *  strings with no entity behind them (migration rule 5 — never reinterpret
 *  an existing field's meaning). */
export function addPartySharedAssetEntity(campaign, entityId) {
  const next = clone(campaign);
  const party = ensure(next);
  if (entityId && !party.sharedAssetIds.includes(entityId)) party.sharedAssetIds.push(entityId);
  return next;
}

export function removePartySharedAssetEntity(campaign, entityId) {
  const next = clone(campaign);
  const party = ensure(next);
  party.sharedAssetIds = party.sharedAssetIds.filter((id) => id !== entityId);
  return next;
}
