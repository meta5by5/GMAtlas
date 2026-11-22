// factionChanges.js — faction events and change sets (design/Faction-
// baseline.md B4.6, B4.9; FACTION-ROADMAP F2). Records: Trigger, Event (with
// its Action), ChangeSet and Hook, each with a stable id and links both
// ways (trigger.eventIds ↔ event.triggerId, event.changeSetIds ↔
// changeSet.eventId, event.hookIds ↔ hook.eventId).
//
// A change set is a list of changes, each a target "slot" with a before
// and an after value. Applying checks every slot still holds its before
// value (so a GM edit made after the proposal pauses the change and shows
// both versions), then writes every after value at once. Undo records the
// inverse as a new change set marked `undoOf`, so the audit trail stays.
// The Ledger is append-only: undoing a Ledger entry appends a reversal.
//
// Any pure domain mutator can become a change set: `diffChanges(before,
// after)` turns the difference between two campaigns into changes.
// Pure and DOM-free: every mutator takes a campaign and returns a new one.

import { getEntity, listEntities } from './entities.js';
import { normalizeFactionsState, factionsState, makeLedgerEntry } from './factionState.js';
import { changeStanding, currentFactionTurn, addFactionMemory, setFactionProfile, factionProfile } from './factionProfile.js';
import { campaignTimeline } from './encounters.js';
import {
  CHANGE_TYPES, IMPACT_LEVELS, TRIGGER_KINDS, EVENT_SIGNIFICANCE, HOOK_TYPES, HOOK_URGENCY, HOOK_STATUSES, QUICK_ACTIONS,
} from '../data/factionEventKinds.js';
import { VISIBILITY_STATES, PLAYER_VISIBLE_STATES } from '../data/factionRelations.js';

export const ENGINE_VERSION = 'f2';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const rid = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const VIS_IDS = VISIBILITY_STATES.map((v) => v.id);
const vis = (v) => (VIS_IDS.includes(v) ? v : 'gm');

/** Key-order-independent equality, for the version check. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return v === undefined ? 'undefined' : JSON.stringify(v);
}
export function sameValue(a, b) { return stable(a) === stable(b); }

// ---------------------------------------------------------------------------
// Slots: where a change reads and writes. A value of `undefined` means
// "absent" (an add's before, a remove's after).
//   { kind: 'entity', id, path }           a field of an entity (dot path)
//   { kind: 'entity-item', id, path, itemId } one item, by id, in an entity list field
//   { kind: 'link', from, to }             the from→to relationship edge
//   { kind: 'record', collection, id }     an item, by id, in a campaign array
//                                          ('factions.ledger', 'factions.hooks', 'threads', 'journal', 'entities.items')

function getPath(obj, path) {
  let cur = obj;
  for (const k of String(path).split('.')) { if (!isObj(cur) && !Array.isArray(cur)) return undefined; cur = cur[k]; }
  return cur;
}
function setPath(obj, path, value) {
  const keys = String(path).split('.');
  let cur = obj;
  for (const k of keys.slice(0, -1)) { if (!isObj(cur[k])) cur[k] = {}; cur = cur[k]; }
  const last = keys[keys.length - 1];
  if (value === undefined) delete cur[last]; else cur[last] = clone(value);
}
function collection(campaign, path, create) {
  const keys = String(path).split('.');
  let cur = campaign;
  for (const k of keys.slice(0, -1)) { if (!isObj(cur[k])) { if (!create) return null; cur[k] = {}; } cur = cur[k]; }
  const last = keys[keys.length - 1];
  if (!Array.isArray(cur[last])) { if (!create) return null; cur[last] = []; }
  return cur[last];
}
function upsert(list, id, value) {
  const i = list.findIndex((x) => x && x.id === id);
  if (value === undefined) { if (i >= 0) list.splice(i, 1); return; }
  if (i >= 0) list[i] = clone(value); else list.push(clone(value));
}

/** The current value at a slot (`undefined` if absent). */
export function readSlot(campaign, t) {
  if (!t) return undefined;
  if (t.kind === 'entity') { const e = getEntity(campaign, t.id); return e ? clone(getPath(e, t.path)) : undefined; }
  if (t.kind === 'entity-item') {
    const e = getEntity(campaign, t.id); const list = e && getPath(e, t.path);
    const it = Array.isArray(list) ? list.find((x) => x && x.id === t.itemId) : undefined;
    return it ? clone(it) : undefined;
  }
  if (t.kind === 'link') {
    const e = getEntity(campaign, t.from);
    const r = e && Array.isArray(e.relationships) ? e.relationships.find((x) => x.to === t.to) : undefined;
    return r ? clone(r) : undefined;
  }
  if (t.kind === 'record') {
    const list = collection(campaign, t.collection, false);
    const it = list ? list.find((x) => x && x.id === t.id) : undefined;
    return it ? clone(it) : undefined;
  }
  return undefined;
}

/** Writes a value at a slot in place. Returns false if the slot's owner is gone. */
function writeSlot(campaign, t, value) {
  if (t.kind === 'entity') {
    const e = getEntity(campaign, t.id); if (!e) return false;
    setPath(e, t.path, value); return true;
  }
  if (t.kind === 'entity-item') {
    const e = getEntity(campaign, t.id); if (!e) return false;
    let list = getPath(e, t.path);
    if (!Array.isArray(list)) { list = []; setPath(e, t.path, list); list = getPath(e, t.path); }
    upsert(list, t.itemId, value); return true;
  }
  if (t.kind === 'link') {
    const e = getEntity(campaign, t.from); if (!e) return false;
    if (!Array.isArray(e.relationships)) e.relationships = [];
    const i = e.relationships.findIndex((x) => x.to === t.to);
    if (value === undefined) { if (i >= 0) e.relationships.splice(i, 1); } else if (i >= 0) e.relationships[i] = clone(value); else e.relationships.push(clone(value));
    return true;
  }
  if (t.kind === 'record') {
    if (t.collection === 'factions.ledger' || t.collection.startsWith('factions.')) normalizeFactionsState(campaign);
    upsert(collection(campaign, t.collection, true), t.id, value); return true;
  }
  return false;
}

/** Every entity id a slot touches (for entity history and filters). */
export function slotEntityIds(t, before, after) {
  if (!t) return [];
  if (t.kind === 'entity' || t.kind === 'entity-item') return [t.id];
  if (t.kind === 'link') return [t.from, t.to];
  if (t.kind === 'record') {
    if (t.collection === 'entities.items') return [t.id];
    const v = after || before || {};
    return [v.fromId, v.toId, v.factionId, ...(Array.isArray(v.refs) ? v.refs : [])].filter((x) => x && x !== 'party');
  }
  return [];
}

// ---------------------------------------------------------------------------
// Diff: the changes that turn `before` into `after`. Covers entities (field
// by field, list-of-records fields item by item, relationships edge by
// edge), the factions record collections, threads and the journal.

const RECORD_COLLECTIONS = ['factions.ledger', 'factions.objectives', 'factions.projects', 'factions.operations', 'factions.hooks', 'threads', 'journal'];
const isRecordList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => isObj(x) && x.id);

function diffRecords(before, after, coll, out, typeFor) {
  const a = collection(before, coll, false) || [];
  const b = collection(after, coll, false) || [];
  const am = new Map(a.filter((x) => x && x.id).map((x) => [x.id, x]));
  const bm = new Map(b.filter((x) => x && x.id).map((x) => [x.id, x]));
  for (const [id, v] of bm) {
    const old = am.get(id);
    if (!old) out.push({ type: typeFor ? typeFor('add') : 'add', target: { kind: 'record', collection: coll, id }, before: undefined, after: clone(v) });
    else if (!sameValue(old, v)) out.push({ type: 'update', target: { kind: 'record', collection: coll, id }, before: clone(old), after: clone(v) });
  }
  for (const [id, v] of am) if (!bm.has(id)) out.push({ type: 'remove', target: { kind: 'record', collection: coll, id }, before: clone(v), after: undefined });
}

export function diffChanges(before, after) {
  const out = [];
  const ae = new Map(listEntities(before).map((e) => [e.id, e]));
  const be = new Map(listEntities(after).map((e) => [e.id, e]));
  for (const [id, e] of be) {
    const old = ae.get(id);
    if (!old) { out.push({ type: 'create-entity', target: { kind: 'record', collection: 'entities.items', id }, before: undefined, after: clone(e) }); continue; }
    if (sameValue(old, e)) continue;
    const keys = new Set([...Object.keys(old), ...Object.keys(e)]);
    for (const k of keys) {
      if (k === 'relationships' || sameValue(old[k], e[k])) continue;
      if ((isRecordList(old[k]) || old[k] === undefined || (Array.isArray(old[k]) && !old[k].length)) && isRecordList(e[k])
          || (isRecordList(old[k]) && (e[k] === undefined || (Array.isArray(e[k]) && !e[k].length)))) {
        const om = new Map((old[k] || []).map((x) => [x.id, x]));
        const nm = new Map((e[k] || []).map((x) => [x.id, x]));
        if (!Array.isArray(old[k])) out.push({ type: 'update', target: { kind: 'entity', id, path: k }, before: old[k], after: [] });
        for (const [iid, v] of nm) {
          const ov = om.get(iid);
          if (!ov) out.push({ type: 'add', target: { kind: 'entity-item', id, path: k, itemId: iid }, before: undefined, after: clone(v) });
          else if (!sameValue(ov, v)) out.push({ type: 'update', target: { kind: 'entity-item', id, path: k, itemId: iid }, before: clone(ov), after: clone(v) });
        }
        for (const [iid, v] of om) if (!nm.has(iid)) out.push({ type: 'remove', target: { kind: 'entity-item', id, path: k, itemId: iid }, before: clone(v), after: undefined });
      } else {
        const numeric = typeof old[k] === 'number' && typeof e[k] === 'number';
        out.push({ type: numeric ? 'adjust-value' : 'update', target: { kind: 'entity', id, path: k }, before: clone(old[k]), after: clone(e[k]) });
      }
    }
    const or = new Map((old.relationships || []).map((r) => [r.to, r]));
    const nr = new Map((e.relationships || []).map((r) => [r.to, r]));
    for (const [to, r] of nr) {
      const o = or.get(to);
      if (!o) out.push({ type: 'create-link', target: { kind: 'link', from: id, to }, before: undefined, after: clone(r) });
      else if (!sameValue(o, r)) out.push({ type: 'update', target: { kind: 'link', from: id, to }, before: clone(o), after: clone(r) });
    }
    for (const [to, r] of or) if (!nr.has(to)) out.push({ type: 'close-link', target: { kind: 'link', from: id, to }, before: clone(r), after: undefined });
  }
  for (const [id, e] of ae) if (!be.has(id)) out.push({ type: 'remove', target: { kind: 'record', collection: 'entities.items', id }, before: clone(e), after: undefined });
  for (const coll of RECORD_COLLECTIONS) diffRecords(before, after, coll, out, coll === 'factions.ledger' || coll === 'journal' ? () => 'append-history' : null);
  return out;
}

// ---------------------------------------------------------------------------
// Change sets.

const IMPACT_IDS = IMPACT_LEVELS.map((l) => l.id);
const TYPE_IDS = CHANGE_TYPES.map((t) => t.id);

/** The approval policy for an impact level, from the campaign's settings.
 *  Critical always needs explicit approval and can't be changed (B4.6). */
export function policyFor(campaign, impact) {
  if (impact === 'critical') return 'approve';
  const a = factionsState(campaign).settings.approval || {};
  return a[impact] || (impact === 'low' ? 'routine' : impact === 'moderate' ? 'brief' : 'approve');
}

/** Builds a proposed change set. `changes` are slot changes; a missing
 *  `before` is read from the campaign now. `dependsOn` lists change
 *  indexes or ids. */
export function makeChangeSet(campaign, { eventId = '', causeRefs = [], changes = [], provenance = {}, idempotencyKey = '', atomic = false, at } = {}) {
  const id = rid('fcs');
  const list = changes.map((c, i) => ({ ...c, _i: i, id: c.id || `${id}_c${i + 1}` }));
  const byIndex = new Map(list.map((c) => [c._i, c.id]));
  const out = list.map((c) => {
    const impact = IMPACT_IDS.includes(c.impact) ? c.impact : 'low';
    return {
      id: c.id,
      target: clone(c.target),
      type: TYPE_IDS.includes(c.type) ? c.type : 'update',
      before: Object.prototype.hasOwnProperty.call(c, 'before') ? clone(c.before) : readSlot(campaign, c.target),
      after: clone(c.after),
      rationale: String(c.rationale || ''),
      impact,
      policy: policyFor(campaign, impact),
      dependsOn: (c.dependsOn || []).map((d) => (typeof d === 'number' ? byIndex.get(d) : d)).filter(Boolean),
      status: 'proposed',
    };
  });
  return {
    id, eventId, causeRefs: [...causeRefs],
    changes: out,
    provenance: { runId: '', engineVersion: ENGINE_VERSION, style: 'gm', confidence: 1, decision: '', ...provenance },
    status: 'proposed', atomic: !!atomic,
    idempotencyKey: String(idempotencyKey || ''),
    createdAt: at || new Date().toISOString(), appliedAt: '', undoOf: '', undoneBy: '',
  };
}

/** The ids of every change that depends (directly or not) on any of `ids`:
 *  unticking a change unticks these too (B4.6 partial approval). */
export function dependentsOf(changeSet, ids) {
  const out = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of changeSet.changes) {
      if (!out.has(c.id) && c.dependsOn.some((d) => out.has(d))) { out.add(c.id); grew = true; }
    }
  }
  for (const id of ids) out.delete(id);
  return [...out];
}

function findChangeSet(campaign, id) { return factionsState(campaign).changeSets.find((s) => s.id === id) || null; }
function findEvent(campaign, id) { return factionsState(campaign).events.find((e) => e.id === id) || null; }

/** Applies a proposed change set as one atomic write. Options:
 *  - skip: change ids the GM unticked (their dependents are skipped too);
 *  - force: change ids to apply even though the target changed since the
 *    proposal (their `before` becomes the current value, so undo restores
 *    the GM's edit).
 *  Returns { campaign, applied, skipped, conflicts }. If any selected change
 *  conflicts and isn't forced, nothing is applied: the set is marked
 *  `conflicted` with both versions recorded (B4.6). */
export function applyChangeSet(campaign, changeSetId, { skip = [], force = [], at } = {}) {
  let next = normalizeFactionsState(clone(campaign));
  let cs = findChangeSet(next, changeSetId);
  if (!cs || !['proposed', 'conflicted'].includes(cs.status)) return { campaign: next, applied: [], skipped: [], conflicts: [] };
  const skipped = cs.atomic ? [] : [...new Set([...skip, ...dependentsOf(cs, skip)])];
  const selected = cs.changes.filter((c) => !skipped.includes(c.id));
  // Check and write in order on a scratch copy, so changes that build on
  // the same slot (a list created, then an item added) check against each
  // other. Nothing reaches `next` unless every change passes.
  const conflicts = [];
  const work = clone(next);
  for (const c of selected) {
    const cur = readSlot(work, c.target);
    if (!sameValue(cur, c.before)) {
      if (force.includes(c.id)) c.before = cur;
      else { conflicts.push({ changeId: c.id, target: clone(c.target), proposedBefore: clone(c.before), current: cur, after: clone(c.after) }); continue; }
    }
    writeSlot(work, c.target, c.after);
  }
  if (conflicts.length) {
    cs.status = 'conflicted';
    cs.conflicts = conflicts;
    const ev = findEvent(next, cs.eventId); if (ev) ev.status = 'conflicted';
    return { campaign: next, applied: [], skipped, conflicts };
  }
  const forcedBefore = new Map(selected.map((c) => [c.id, c.before]));
  next = normalizeFactionsState(work);
  cs = findChangeSet(next, changeSetId);
  for (const c of cs.changes) {
    if (skipped.includes(c.id)) c.status = 'skipped';
    else { c.status = 'applied'; c.before = clone(forcedBefore.get(c.id)); }
  }
  cs.status = 'applied';
  cs.appliedAt = at || new Date().toISOString();
  delete cs.conflicts;
  const f = next.factions;
  f.lastProcessed = { turn: Math.max(Number(f.lastProcessed.turn) || 0, currentFactionTurn(next)), seq: (Number(f.lastProcessed.seq) || 0) + 1 };
  const ev = findEvent(next, cs.eventId);
  if (ev && !cs.undoOf) ev.status = 'applied';
  return { campaign: next, applied: selected.map((c) => c.id), skipped, conflicts: [] };
}

/** Undoes an applied change set: records its inverse as a new change set
 *  marked `undoOf` and applies it. Ledger entries are never removed: each
 *  one gets a reversal entry instead (the migrated seed is left alone, as
 *  it records what was already true). Returns { campaign, changeSetId,
 *  conflicts }; a target edited since is a conflict unless `force`. */
export function undoChangeSet(campaign, changeSetId, { force = false, at } = {}) {
  let next = normalizeFactionsState(clone(campaign));
  const cs = findChangeSet(next, changeSetId);
  if (!cs || cs.status !== 'applied' || cs.undoneBy) return { campaign: next, changeSetId: '', conflicts: [] };
  const turn = currentFactionTurn(next);
  const inverse = [];
  for (const c of cs.changes.filter((x) => x.status === 'applied').reverse()) {
    if (c.target.kind === 'record' && c.target.collection === 'factions.ledger') {
      const l = c.after;
      if (!l || c.before !== undefined || l.source === 'migrated' || l.reverses) continue;
      const rev = makeLedgerEntry({ ...l, id: `${l.id}_rev`, delta: -l.delta, reverses: l.id, reason: `Undone: ${l.reason}`, changeSetId: '', at }, at);
      rev.turn = l.turn;
      inverse.push({ type: 'append-history', target: { kind: 'record', collection: 'factions.ledger', id: rev.id }, before: undefined, after: rev, rationale: 'Undo' });
      continue;
    }
    const t = CHANGE_TYPES.find((x) => x.id === c.type);
    const type = c.type === 'append-history' ? 'remove' : ((t && t.inverse) || 'update');
    inverse.push({ type, target: clone(c.target), before: clone(c.after), after: clone(c.before), rationale: 'Undo', impact: c.impact });
  }
  const inv = makeChangeSet(next, { eventId: cs.eventId, causeRefs: cs.causeRefs, changes: inverse, provenance: { decision: 'undo' }, atomic: true, at });
  inv.undoOf = cs.id;
  next.factions.changeSets.push(inv);
  const r = applyChangeSet(next, inv.id, { force: force ? inv.changes.map((c) => c.id) : [], at });
  if (r.conflicts.length) {
    // Leave the original applied; drop the failed inverse so it can be retried.
    r.campaign.factions.changeSets = r.campaign.factions.changeSets.filter((s) => s.id !== inv.id);
    const ev = findEvent(r.campaign, cs.eventId); if (ev) ev.status = 'applied';
    return { campaign: r.campaign, changeSetId: '', conflicts: r.conflicts };
  }
  next = r.campaign;
  const orig = findChangeSet(next, cs.id);
  orig.status = 'undone'; orig.undoneBy = inv.id;
  const ev = findEvent(next, cs.eventId);
  if (ev && (ev.changeSetIds || []).every((id) => { const s = findChangeSet(next, id); return !s || s.status !== 'applied'; })) ev.status = 'undone';
  return { campaign: next, changeSetId: inv.id, conflicts: [] };
}

// ---------------------------------------------------------------------------
// Triggers, events and hooks.

const TRIGGER_IDS = TRIGGER_KINDS.map((k) => k.id);
const SIG = new Map(EVENT_SIGNIFICANCE.map((s) => [s.id, s]));

/** Records an event: its trigger, the event (with its Action), and a change
 *  set built from `mutate` (a pure campaign → campaign function whose
 *  difference becomes the changes) and/or explicit `changes`. A significant
 *  or major event also writes a journal entry, inside the same change set
 *  so undo takes it back too. With `apply` (default), the set is applied at
 *  once. A repeated `idempotencyKey` returns the existing records unchanged.
 *  Returns { campaign, eventId, triggerId, changeSetId, conflicts, duplicate }. */
export function recordEvent(campaign, opts = {}) {
  const {
    title = 'Event', summary = '', trigger = {}, action = {}, actorIds = [], targetRefs = [], locationId = '',
    visibility = 'gm', significance = 'minor', mutate, changes = [], idempotencyKey = '', apply = true,
    journal = true, turn, at = new Date().toISOString(), impact = 'low', hookSpecs = [],
  } = opts;
  let next = normalizeFactionsState(clone(campaign));
  const f = next.factions;
  if (idempotencyKey) {
    const dup = f.events.find((e) => e.idempotencyKey === idempotencyKey);
    if (dup) return { campaign: next, eventId: dup.id, triggerId: dup.triggerId, changeSetId: (dup.changeSetIds || [])[0] || '', conflicts: [], duplicate: true };
  }
  const t = Number.isFinite(Number(turn)) ? Number(turn) : currentFactionTurn(next);
  const eventId = rid('fxe');
  const trig = {
    id: rid('ftr'), kind: TRIGGER_IDS.includes(trigger.kind) ? trigger.kind : 'gm',
    summary: String(trigger.summary || title), refs: [...(trigger.refs || [])], turn: t, at, eventIds: [eventId],
  };
  const sig = SIG.has(significance) ? significance : 'minor';
  // The difference `mutate` makes, measured on a scratch copy.
  let proposed = [];
  if (typeof mutate === 'function') {
    const after = mutate(clone(next), { eventId, turn: t, at });
    proposed = diffChanges(next, after);
  }
  proposed = proposed.concat(changes);
  if (journal && SIG.get(sig).journal) {
    const jid = `j_${eventId}`;
    proposed.push({
      type: 'append-history', target: { kind: 'record', collection: 'journal', id: jid }, before: undefined,
      after: { id: jid, createdAt: at, source: 'Factions', text: summary ? `${title}. ${summary}` : title, isHtml: false, factionEventId: eventId },
      rationale: 'Journal entry for a significant event',
    });
  }
  for (const p of proposed) {
    if (!p.impact) p.impact = impact;
    // Ledger entries made by `mutate` carry this event's id.
    if (p.target.kind === 'record' && p.target.collection === 'factions.ledger' && p.after && !p.before) p.after.eventId = p.after.eventId || eventId;
  }
  const cs = makeChangeSet(next, { eventId, causeRefs: [trig.id, ...trig.refs], changes: proposed, idempotencyKey, at });
  for (const c of cs.changes) if (c.target.kind === 'record' && c.target.collection === 'factions.ledger' && c.after && !c.after.changeSetId) c.after.changeSetId = cs.id;
  const hooks = hookSpecs.map((h) => makeHook({ ...h, eventId }, at));
  const ev = {
    id: eventId, triggerId: trig.id,
    action: {
      id: rid('fxa'), kind: String(action.kind || trig.kind), verb: String(action.verb || ''),
      actorId: String(action.actorId || actorIds[0] || ''), targetIds: [...(action.targetIds || targetRefs)], method: String(action.method || ''),
    },
    title: String(title), summary: String(summary),
    actorIds: [...actorIds], targetRefs: [...targetRefs], locationId: String(locationId || ''),
    turn: t, seq: (Number(f.lastProcessed.seq) || 0) + 1, at,
    visibility: vis(visibility), significance: sig,
    changeSetIds: [cs.id], hookIds: hooks.map((h) => h.id),
    status: 'proposed', idempotencyKey: String(idempotencyKey || ''),
  };
  f.triggers.push(trig);
  f.events.push(ev);
  f.changeSets.push(cs);
  for (const h of hooks) f.hooks.push(h);
  if (!apply) return { campaign: next, eventId, triggerId: trig.id, changeSetId: cs.id, conflicts: [], duplicate: false };
  const r = applyChangeSet(next, cs.id, { at });
  return { campaign: r.campaign, eventId, triggerId: trig.id, changeSetId: cs.id, conflicts: r.conflicts, duplicate: false };
}

/** Builds a Hook record (B4.9). */
export function makeHook(fields = {}, at = new Date().toISOString()) {
  return {
    id: fields.id || rid('fhk'),
    eventId: String(fields.eventId || ''),
    type: HOOK_TYPES.some((h) => h.id === fields.type) ? fields.type : 'open-thread',
    summary: String(fields.summary || ''),
    refs: Array.isArray(fields.refs) ? fields.refs.map(String) : [],
    locationId: String(fields.locationId || ''),
    urgency: HOOK_URGENCY.includes(fields.urgency) ? fields.urgency : 'low',
    visibility: vis(fields.visibility),
    status: HOOK_STATUSES.includes(fields.status) ? fields.status : 'open',
    createdAt: at,
  };
}

/** The undo of an event: undoes its applied change sets, newest first. */
export function undoEvent(campaign, eventId, opts = {}) {
  let next = clone(campaign);
  const ev = findEvent(next, eventId);
  if (!ev) return { campaign: next, conflicts: [] };
  for (const id of [...(ev.changeSetIds || [])].reverse()) {
    const r = undoChangeSet(next, id, opts);
    if (r.conflicts.length) return { campaign: r.campaign, conflicts: r.conflicts };
    next = r.campaign;
  }
  return { campaign: next, conflicts: [] };
}

// ---------------------------------------------------------------------------
// Quick actions (F2): helped, hurt, struck a deal, betrayed, exposed.

export function quickActionDef(id) { return QUICK_ACTIONS.find((q) => q.id === id) || null; }

/** Records a quick action by the party toward a faction: a player-action
 *  trigger, the faction's standing toward the party (Ledger, with ripple to
 *  its friends and enemies), a memory, and for some actions attention. */
export function recordQuickAction(campaign, factionId, actionId, { note = '', turn, at, idempotencyKey } = {}) {
  const def = quickActionDef(actionId);
  const fac = getEntity(campaign, factionId);
  if (!def || !fac || fac.type !== 'faction') return { campaign: clone(campaign), eventId: '', changeSetId: '', conflicts: [], duplicate: false };
  const title = `The party ${def.past} ${fac.name || 'a faction'}`;
  const reason = note ? `${def.label}: ${note}` : def.label;
  return recordEvent(campaign, {
    title, summary: note,
    trigger: { kind: 'player-action', summary: title, refs: [factionId] },
    action: { kind: 'player-action', verb: def.id, actorId: 'party', targetIds: [factionId] },
    actorIds: ['party'], targetRefs: [factionId], significance: def.significance,
    idempotencyKey, turn, at,
    mutate: (c, { eventId, turn: t }) => {
      let x = c;
      for (const ch of def.changes) x = changeStanding(x, { fromId: factionId, toId: 'party', field: ch.field, delta: ch.delta, decay: ch.decay, reason, source: 'event', eventId, turn: t });
      if (def.memory) x = addFactionMemory(x, factionId, { kind: def.memory.kind, severity: def.memory.severity, aboutId: 'party', text: note ? `${title}: ${note}` : title, turn: t, eventId, id: `mem_${eventId}` });
      if (def.attention) x = setFactionProfile(x, factionId, 'attention', factionProfile(getEntity(x, factionId)).attention + def.attention);
      return x;
    },
  });
}

/** A GM-authored event (F2 "Record an event"): a title, an acting faction,
 *  optionally whom it concerns (a faction or 'party') with a stance and/or
 *  trust change, a memory, significance and visibility. */
export function recordGmEvent(campaign, { title, summary = '', actorId = '', towardId = '', stanceDelta = 0, trustDelta = 0, decay = 'slow', memoryKind = '', significance = 'minor', visibility = 'gm', locationId = '', turn, at } = {}) {
  const clean = String(title || '').trim();
  if (!clean) return { campaign: clone(campaign), eventId: '', changeSetId: '', conflicts: [], duplicate: false };
  const sd = Math.round(Number(stanceDelta)) || 0;
  const td = Math.round(Number(trustDelta)) || 0;
  const actor = getEntity(campaign, actorId);
  const isFac = actor && actor.type === 'faction';
  return recordEvent(campaign, {
    title: clean, summary,
    trigger: { kind: 'gm', summary: clean, refs: [actorId, towardId].filter((x) => x && x !== 'party') },
    action: { kind: 'gm', actorId, targetIds: towardId ? [towardId] : [] },
    actorIds: actorId ? [actorId] : [], targetRefs: towardId ? [towardId] : [], locationId,
    significance, visibility, turn, at,
    mutate: (c, { eventId, turn: t }) => {
      let x = c;
      if (isFac && towardId && towardId !== actorId) {
        if (sd) x = changeStanding(x, { fromId: actorId, toId: towardId, field: 'stance', delta: sd, decay, reason: clean, source: 'event', eventId, turn: t, visibility });
        if (td) x = changeStanding(x, { fromId: actorId, toId: towardId, field: 'trust', delta: td, decay, reason: clean, source: 'event', eventId, turn: t, visibility });
      }
      if (isFac && memoryKind) x = addFactionMemory(x, actorId, { kind: memoryKind, aboutId: towardId, text: clean, turn: t, eventId, id: `mem_${eventId}` });
      return x;
    },
  });
}

// ---------------------------------------------------------------------------
// Reading history.

/** New-shape events, newest first, with their change sets attached.
 *  Filters: factionId / entityId (any ref or touched entity), kind (trigger
 *  kind), playerView (public and player-known only). */
export function factionEventList(campaign, { factionId = '', entityId = '', kind = '', playerView = false, includeUndone = true } = {}) {
  const f = factionsState(campaign);
  const sets = new Map(f.changeSets.map((s) => [s.id, s]));
  const trig = new Map(f.triggers.map((t) => [t.id, t]));
  const want = entityId || factionId;
  return f.events
    .filter((e) => (includeUndone || e.status !== 'undone'))
    .filter((e) => !playerView || PLAYER_VISIBLE_STATES.includes(e.visibility))
    .filter((e) => !kind || (trig.get(e.triggerId) || {}).kind === kind)
    .map((e) => {
      const changeSets = (e.changeSetIds || []).map((id) => sets.get(id)).filter(Boolean);
      const undo = f.changeSets.filter((s) => s.undoOf && changeSets.some((c) => c.id === s.undoOf));
      const touched = new Set([...(e.actorIds || []), ...(e.targetRefs || []), e.locationId].filter(Boolean));
      for (const s of changeSets) for (const c of s.changes) for (const id of slotEntityIds(c.target, c.before, c.after)) touched.add(id);
      return { ...e, trigger: trig.get(e.triggerId) || null, changeSets, undoSets: undo, touched: [...touched] };
    })
    .filter((e) => !want || e.touched.includes(want))
    .sort((a, b) => (b.turn - a.turn) || (b.seq - a.seq) || String(b.at).localeCompare(String(a.at)));
}

/** A one-line description of one change, for consequence chains. */
export function describeChange(campaign, c) {
  const name = (id) => (id === 'party' ? 'the party' : ((getEntity(campaign, id) || {}).name || 'someone'));
  const t = c.target || {};
  const sign = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100) / 100}`;
  if (t.kind === 'record' && t.collection === 'factions.ledger' && c.after) {
    const l = c.after;
    return `${name(l.fromId)} → ${name(l.toId)}: ${l.field} ${sign(l.delta)}${l.reverses ? ' (undo)' : ''}`;
  }
  if (t.kind === 'record' && t.collection === 'journal') return c.after ? 'Journal entry written' : 'Journal entry removed';
  if (t.kind === 'record' && t.collection === 'entities.items') return `${c.after ? 'Created' : 'Removed'} ${(c.after || c.before || {}).name || 'an entity'}`;
  if (t.kind === 'record' && t.collection === 'factions.hooks') return `Hook: ${(c.after || c.before || {}).summary || ''}`;
  if (t.kind === 'record') return `${c.type} in ${t.collection}`;
  if (t.kind === 'entity-item') {
    const v = c.after || c.before || {};
    const what = t.path === 'memories' ? `memory (${v.kind || 'note'})` : t.path;
    return `${name(t.id)}: ${c.after ? (c.before ? 'changed' : 'added') : 'removed'} ${what}`;
  }
  if (t.kind === 'link') {
    if (!c.before) return `${name(t.from)} → ${name(t.to)}: link created (${(c.after || {}).type || 'linked'})`;
    if (!c.after) return `${name(t.from)} → ${name(t.to)}: link closed`;
    return `${name(t.from)} → ${name(t.to)}: ${(c.before || {}).type} → ${(c.after || {}).type}`;
  }
  if (t.kind === 'entity') {
    const fmt = (v) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? '…' : String(v));
    return `${name(t.id)}: ${t.path} ${fmt(c.before)} → ${fmt(c.after)}`;
  }
  return c.type;
}

/** An entity's history (C9): every applied change that targeted it, newest
 *  first, each with its before value. Derived from change sets only. */
export function entityHistory(campaign, entityId, { playerView = false } = {}) {
  const f = factionsState(campaign);
  const evs = new Map(f.events.map((e) => [e.id, e]));
  const out = [];
  for (const s of f.changeSets) {
    if (!['applied', 'undone'].includes(s.status)) continue;
    const ev = evs.get(s.eventId);
    if (playerView && (!ev || !PLAYER_VISIBLE_STATES.includes(ev.visibility))) continue;
    for (const c of s.changes) {
      if (c.status !== 'applied') continue;
      if (!slotEntityIds(c.target, c.before, c.after).includes(entityId)) continue;
      out.push({
        changeSetId: s.id, changeId: c.id, eventId: s.eventId, eventTitle: ev ? ev.title : '', turn: ev ? ev.turn : 0,
        at: s.appliedAt || s.createdAt, type: c.type, target: c.target, before: c.before, after: c.after,
        undo: !!s.undoOf, undone: s.status === 'undone', text: describeChange(campaign, c),
      });
    }
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// ---------------------------------------------------------------------------
// The Timeline as the single history (U7).

export const TIMELINE_KINDS = [
  { id: 'scene', label: 'Scenes' },
  { id: 'encounter', label: 'Encounters' },
  { id: 'journal', label: 'Journal' },
  { id: 'faction', label: 'Faction events' },
];

/** Scenes (with their Encounters), loose Encounters, journal entries and
 *  faction events (new-shape and the classic log) in time order, oldest
 *  first. Filters: `kinds` (TIMELINE_KINDS ids; empty means all) and
 *  `entityId` (a faction, Location, Conflict, NPC or mission: keeps only
 *  items that involve it). */
export function campaignHistory(campaign, { kinds = [], entityId = '' } = {}) {
  const want = (k) => !kinds.length || kinds.includes(k);
  const involves = (obj) => !entityId || JSON.stringify(obj || {}).includes(entityId);
  const items = [];
  for (const it of campaignTimeline(campaign)) {
    if (it.kind === 'scene') {
      const encounters = want('encounter') ? it.encounters.filter((e) => involves(getEntity(campaign, e.id) || e)) : [];
      const scene = (campaign.scenes || []).find((s) => s.id === it.id) || it;
      if (want('scene') && (involves(scene) || encounters.length)) items.push({ ...it, encounters });
      else for (const e of encounters) items.push(e);
    } else if (want('encounter') && involves(getEntity(campaign, it.id) || it)) items.push(it);
  }
  if (want('journal')) {
    for (const j of campaign.journal || []) {
      if (!j || j.factionEventId) continue; // shown on its faction event instead
      if (!involves(j)) continue;
      const text = String(j.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      items.push({ kind: 'journal', id: j.id, at: j.createdAt || '', label: text.slice(0, 140) + (text.length > 140 ? '…' : ''), source: j.source || '' });
    }
  }
  if (want('faction')) {
    for (const e of factionEventList(campaign, { entityId })) {
      const changes = e.changeSets.flatMap((s) => s.changes.filter((c) => c.status === 'applied' && !(c.target.kind === 'record' && c.target.collection === 'journal')));
      items.push({
        kind: 'faction', id: e.id, at: e.at, label: e.title, turn: e.turn, status: e.status, significance: e.significance,
        consequences: changes.length, factionIds: e.touched.filter((id) => (getEntity(campaign, id) || {}).type === 'faction'),
      });
    }
    for (const e of campaign.factionEvents || []) {
      if (entityId && !involves(e)) continue;
      items.push({ kind: 'faction', classic: true, id: e.id, at: e.createdAt || '', label: e.narrative || `${e.factionName || 'A faction'}: ${e.action || 'acted'}`, turn: e.turnNumber || 0, status: e.outcome || '', factionIds: e.factionId ? [e.factionId] : [] });
    }
  }
  return items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
