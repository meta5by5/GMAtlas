// party.js — the Party tab: a live roster (NPC entities tagged #character —
// see domain/statblocks.js hasCharacterTag) plus free-form, party-wide
// resource trackers that aren't tied to any one entity (credits, custom
// clocks, timers). Ported from the old prototype's split between an
// entity-driven roster and a generic tracker list (see PROGRESS.md
// ISSUES/FINDINGS #1) — kept as two separate concerns here too, since a
// tracker like "party credits" has no natural entity to live on.

import { listEntities } from './entities.js';
import { hasCharacterTag } from './statblocks.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.party || typeof campaign.party !== 'object') campaign.party = { trackers: [] };
  if (!Array.isArray(campaign.party.trackers)) campaign.party.trackers = [];
  return campaign.party;
}

/** Party members = NPC entities tagged #character. */
export function listPartyMembers(campaign) {
  return listEntities(campaign, ['npc']).filter(hasCharacterTag);
}

export function listPartyTrackers(campaign) {
  return ((campaign.party && campaign.party.trackers) || []);
}

export function addPartyTracker(campaign, { name = 'New Tracker', kind = 'meter', value = 0, max = 5 } = {}) {
  const next = clone(campaign);
  const party = ensure(next);
  party.trackers.push({
    id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, kind: ['meter', 'counter', 'currency'].includes(kind) ? kind : 'meter',
    value: Number(value) || 0,
    max: kind === 'meter' ? (Number(max) || 5) : undefined,
  });
  return next;
}

export function updatePartyTracker(campaign, id, patch) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  return next;
}

/** Step a meter/counter tracker by delta, clamped to [0, max] for meters. */
export function stepPartyTracker(campaign, id, delta) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t) return next;
  const raw = (Number(t.value) || 0) + delta;
  t.value = t.kind === 'meter' ? Math.max(0, Math.min(t.max || 5, raw)) : Math.max(0, raw);
  return next;
}

export function removePartyTracker(campaign, id) {
  const next = clone(campaign);
  const party = ensure(next);
  party.trackers = party.trackers.filter((x) => x.id !== id);
  return next;
}
