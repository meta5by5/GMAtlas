// expeditions.js — Expedition trackers (docs/adr/0009-situation-engine-
// revisited.md, Decision item 1): an expedition is a Thread tagged
// `kind: 'expedition'`, the same tagged-Thread convention Contracts
// (domain/trade.js) and the Faction Pressure Track (domain/factions.js)
// already established — every existing Thread mutator (advanceThread,
// setThreadStatus, setThreadPriority, removeThread) works on one unchanged.
// Mirrors factions.js's shape (createX/getX/listX), not entity-scoped since
// an expedition isn't tied to any one entity.
//
// The user explicitly rejected folding these into a Thread's lifecycle
// status (ADR 0008's original alternative) in favor of real numeric dials:
// three additional 0-10 dials — `supplies`, `exposure`, `morale` — alongside
// the Thread's own existing fill-clock, which already IS the fourth
// ("Progress") dial, so no fourth field is added on top of it. Same
// neutral-midpoint-5 default and 0-10 range as context.what's Resources/
// Reputation/Stress dials, for the same reason: an old expedition-less save
// reads as unaffected, not suddenly under-supplied.

import { addThread, listThreads } from './threads.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export const EXPEDITION_DIAL_DEFAULT = 5;
export const EXPEDITION_DIAL_FIELDS = ['supplies', 'exposure', 'morale'];

/** Every expedition-tagged Thread. */
export function listExpeditions(campaign) {
  return listThreads(campaign).filter((t) => t.kind === 'expedition');
}

export function getExpedition(campaign, threadId) {
  return listExpeditions(campaign).find((t) => t.id === threadId) || null;
}

/** Create a new expedition: an ordinary Thread (its own clock is the
 *  Progress dial) tagged `kind: 'expedition'` with the three additional
 *  dials at the neutral midpoint. */
export function createExpedition(campaign, name, segments = 4) {
  const next = addThread(campaign, name || 'New expedition', segments);
  const t = next.threads[next.threads.length - 1];
  t.kind = 'expedition';
  for (const field of EXPEDITION_DIAL_FIELDS) t[field] = EXPEDITION_DIAL_DEFAULT;
  return next;
}

/** Set one of an expedition's three dials (0-10, clamped). No-op on an
 *  unknown thread id, a thread that isn't an expedition, or an unrecognized
 *  field. */
export function setExpeditionDial(campaign, threadId, field, value) {
  const next = clone(campaign);
  const t = (next.threads || []).find((x) => x.id === threadId && x.kind === 'expedition');
  if (!t || !EXPEDITION_DIAL_FIELDS.includes(field)) return next;
  const v = Math.round(Number(value));
  t[field] = Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : EXPEDITION_DIAL_DEFAULT;
  return next;
}

/** Every open expedition crossing the GM-set danger threshold (Supplies <=2
 *  or Exposure >=8) — the same "one signal, one observation" shape
 *  copilot.js's Stress/Resources thresholds already use, applied per-
 *  expedition instead of campaign-wide since multiple expeditions can run
 *  in parallel. */
export function expeditionsInDanger(campaign) {
  return listExpeditions(campaign).filter((t) => !t.done && (t.supplies <= 2 || t.exposure >= 8));
}
