// threads.js — Threads (progress clocks): a first-class solo-RPG mechanic that
// the unified campaign model makes trivial and that the Co-Pilot can reason
// about ("Thread X is 3/4 — one more push resolves it"). NEW in this branch;
// v0.53 only had a single free-text "current thread" string.
//
// Pure functions returning a NEW campaign, composed by the UI via store.update.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!Array.isArray(campaign.threads)) campaign.threads = [];
  return campaign.threads;
}

export function listThreads(campaign) {
  return Array.isArray(campaign.threads) ? campaign.threads : [];
}

export function addThread(campaign, name, segments = 4) {
  const next = clone(campaign);
  ensure(next).push({
    id: 'thr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: name || 'New thread',
    filled: 0,
    segments: Math.max(2, Math.min(12, segments | 0 || 4)),
    done: false,
    createdAt: new Date().toISOString(),
  });
  return next;
}

export function advanceThread(campaign, id, delta = 1) {
  const next = clone(campaign);
  const t = ensure(next).find((x) => x.id === id);
  if (!t) return next;
  t.filled = Math.max(0, Math.min(t.segments, t.filled + delta));
  t.done = t.filled >= t.segments;
  return next;
}

export function removeThread(campaign, id) {
  const next = clone(campaign);
  next.threads = ensure(next).filter((x) => x.id !== id);
  return next;
}

/** Thread nearest to completion but not yet done — used by the Co-Pilot. */
export function threadUnderPressure(campaign) {
  const open = listThreads(campaign).filter((t) => !t.done);
  if (!open.length) return null;
  return open.slice().sort((a, b) => (b.filled / b.segments) - (a.filled / a.segments))[0];
}
