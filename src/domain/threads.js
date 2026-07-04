// threads.js — Threads (progress clocks): a first-class solo-RPG mechanic that
// the unified campaign model makes trivial and that the Co-Pilot can reason
// about ("Thread X is 3/4 — one more push resolves it"). NEW in this branch;
// v0.53 only had a single free-text "current thread" string.
//
// Phase 6 ("Richer Thread lifecycle", pack 77): a thread carries a 7-state
// narrative lifecycle in addition to its clock — a thread going quiet isn't
// just "stuck", it's explicitly Dormant, which is what lets the Co-Pilot
// periodically resurface it ("what did I overlook?") instead of a thread
// silently rotting once nobody's touched it in a while. `priority` is a
// simple GM-set dial (not auto-computed) so nothing here ever overrides a
// GM's own call on what matters — "flag, don't auto-correct."
//
// Pure functions returning a NEW campaign, composed by the UI via store.update.

export const THREAD_STATUSES = ['seeded', 'active', 'escalating', 'dormant', 'converging', 'resolved', 'archived'];
export const THREAD_STATUS_LABELS = {
  seeded: 'Seeded', active: 'Active', escalating: 'Escalating', dormant: 'Dormant',
  converging: 'Converging', resolved: 'Resolved', archived: 'Archived',
};
export const THREAD_PRIORITIES = ['low', 'normal', 'high'];

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!Array.isArray(campaign.threads)) campaign.threads = [];
  return campaign.threads;
}

// Threads created before this feature only have {id,name,filled,segments,
// done,createdAt} — default status from `done` (never lose the done/not-done
// distinction that already existed) and priority to 'normal'. Called on
// read (listThreads, non-mutating) and defensively at the top of every
// mutator (so an old thread gains real fields the first time it's touched,
// not just a synthetic view of them).
function normalizeThread(t) {
  return { priority: 'normal', ...t, status: t.status || (t.done ? 'resolved' : 'active') };
}

export function listThreads(campaign) {
  const arr = Array.isArray(campaign.threads) ? campaign.threads : [];
  return arr.map(normalizeThread);
}

export function addThread(campaign, name, segments = 4) {
  const next = clone(campaign);
  ensure(next).push({
    id: 'thr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: name || 'New thread',
    filled: 0,
    segments: Math.max(2, Math.min(12, segments | 0 || 4)),
    done: false,
    status: 'active',
    priority: 'normal',
    createdAt: new Date().toISOString(),
  });
  return next;
}

export function advanceThread(campaign, id, delta = 1) {
  const next = clone(campaign);
  const t = ensure(next).find((x) => x.id === id);
  if (!t) return next;
  const wasDone = t.filled >= t.segments;
  t.filled = Math.max(0, Math.min(t.segments, t.filled + delta));
  t.done = t.filled >= t.segments;
  // Filling the clock completely reads as "resolved" narratively too, unless
  // it's already been explicitly archived; pulling it back off a full clock
  // resumes it as active. Any other status transition (Escalating, Dormant,
  // ...) is left to the GM via setThreadStatus — advancing/backing the clock
  // never silently overrides those.
  const status = t.status || (wasDone ? 'resolved' : 'active');
  if (t.done && !wasDone && status !== 'archived') t.status = 'resolved';
  else if (!t.done && wasDone && status === 'resolved') t.status = 'active';
  else t.status = status;
  return next;
}

/** Set a thread's narrative lifecycle stage directly — the GM's own call,
 *  never inferred (see the module doc comment). No-op on an unknown status
 *  id or missing thread. */
export function setThreadStatus(campaign, id, status) {
  const next = clone(campaign);
  const t = ensure(next).find((x) => x.id === id);
  if (!t || !THREAD_STATUSES.includes(status)) return next;
  normalizeInPlace(t);
  t.status = status;
  return next;
}

export function setThreadPriority(campaign, id, priority) {
  const next = clone(campaign);
  const t = ensure(next).find((x) => x.id === id);
  if (!t || !THREAD_PRIORITIES.includes(priority)) return next;
  normalizeInPlace(t);
  t.priority = priority;
  return next;
}

function normalizeInPlace(t) {
  if (!t.status) t.status = t.done ? 'resolved' : 'active';
  if (!t.priority) t.priority = 'normal';
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

/** Threads that have gone quiet — explicitly Dormant, or Active/Escalating/
 *  Seeded with no clock progress since creation — for the Co-Pilot's "what
 *  did I overlook?" surfacing (pack 13/76: observation only, never an
 *  auto-correction). Resolved/Archived threads are deliberately excluded —
 *  they're not overlooked, they're finished. */
export function overlookedThreads(campaign) {
  return listThreads(campaign).filter((t) => !t.done
    && t.status !== 'resolved' && t.status !== 'archived'
    && (t.status === 'dormant' || t.filled === 0));
}
