// party.js — the Party tab: a live roster (NPC entities tagged #character —
// see domain/statblocks.js hasCharacterTag) plus free-form, party-wide
// resource trackers that aren't tied to any one entity (credits, custom
// clocks, timers). Ported from the old prototype's split between an
// entity-driven roster and a generic tracker list (see PROGRESS.md
// ISSUES/FINDINGS #1) — kept as two separate concerns here too, since a
// tracker like "party credits" has no natural entity to live on.

import { listEntities } from './entities.js';
import { hasCharacterTag } from './statblocks.js';
import { findProgressDifficulty, STARFORGED_PROGRESS_TRACK_MAX } from '../data/rulesets.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.party || typeof campaign.party !== 'object') campaign.party = { trackers: [] };
  if (!Array.isArray(campaign.party.trackers)) campaign.party.trackers = [];
  if (campaign.party.sharedGear === undefined) campaign.party.sharedGear = '';
  if (!Array.isArray(campaign.party.sharedAssets)) campaign.party.sharedAssets = [];
  return campaign.party;
}

/** Party members = NPC entities tagged #character. */
export function listPartyMembers(campaign) {
  return listEntities(campaign, ['npc']).filter(hasCharacterTag);
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
 *  creation-time-only for the same reason. */
export function addPartyTracker(campaign, { name = 'New Tracker', kind = 'meter', value = 0, max = 5, difficulty = '' } = {}) {
  const next = clone(campaign);
  const party = ensure(next);
  const validKind = ['meter', 'counter', 'currency'].includes(kind) ? kind : 'meter';
  const isStarforged = ((next.settings && next.settings.statRuleset) || 'starforged') === 'starforged';
  const rank = validKind === 'counter' && isStarforged ? findProgressDifficulty(difficulty) : null;
  const tracker = {
    id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, kind: validKind,
    value: Number(value) || 0,
  };
  if (validKind === 'meter') tracker.max = Math.max(1, Number(max) || 5);
  if (rank) tracker.difficulty = rank.id;
  party.trackers.push(tracker);
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
    const { kind, difficulty, max, ...rest } = patch || {};
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
