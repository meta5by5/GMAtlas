// syncOps.js — turns one campaign-document change into field-level ops, and
// merges ops from any device into a replica so every replica converges
// (design/ACCOUNTS-SYNC-ROADMAP.md, section 5). Pure/DOM-free, no
// dependencies: the browser bundle and the sync server (Phase S2) run this
// same file, so the two can never disagree about a merge.
//
// The model, in one paragraph:
// - An op sets or deletes the value at a path. Each one carries a hybrid
//   logical clock (HLC) string that sorts as plain text and ends in the
//   writing device's id, so no two writes ever tie.
// - Arrays whose elements all carry an `id` are addressed by id, never by
//   index, so two devices adding or editing different records never
//   collide. Any other array, and any scalar, is one value.
// - The latest clock wins per path (last writer wins). An op at a path is
//   ignored if that path, or any ancestor of it, was written more recently.
//   Writing an ancestor keeps any of its descendants that were written
//   more recently still.
// - A deleted id-addressed record stays deleted (ids are never reused).
// - An id-addressed array's order is its own last-writer-wins register (the
//   list of ids). Records the register doesn't list follow the listed
//   ones, sorted by id. Ids start with a base-36 timestamp, so that is
//   creation order.
// A replica is `{doc, meta}`; `meta` is the clock tree recording when each
// path was last written. It's plain JSON, so store.js can persist it.

const ID = '\u0001';          // clock-tree key prefix for an id-addressed element
const ORDER = '\u0002order';  // clock-tree key for an id-array's order register
const LOCAL_SCOPES = new Set(['local', 'overlay']);
const INLINE_BYTES = /^data:[\w.+-]+\/[\w.+-]+(;[^,]*)?,/;

// --- hybrid logical clock -------------------------------------------------

function formatHlc(ms, counter, deviceId) {
  return `${ms.toString(36).padStart(9, '0')}.${counter.toString(36).padStart(4, '0')}.${deviceId}`;
}

function parseHlc(hlc) {
  if (!hlc) return null;
  const [ms, counter] = String(hlc).split('.');
  return { ms: parseInt(ms, 36), counter: parseInt(counter, 36) };
}

/** The clock for a new local write: later than `last` and not behind the
 *  wall clock. */
export function nextHlc(last, wallMs, deviceId) {
  const prev = parseHlc(last);
  const ms = Math.max(wallMs, prev ? prev.ms : 0);
  return formatHlc(ms, prev && prev.ms === ms ? prev.counter + 1 : 0, deviceId);
}

/** The local clock after seeing a remote write, so the next local write
 *  sorts after everything this device has seen. */
export function observeHlc(last, remote, wallMs, deviceId) {
  const a = parseHlc(last);
  const b = parseHlc(remote);
  const ms = Math.max(wallMs, a ? a.ms : 0, b ? b.ms : 0);
  let counter = 0;
  if (a && a.ms === ms) counter = Math.max(counter, a.counter + 1);
  if (b && b.ms === ms) counter = Math.max(counter, b.counter + 1);
  return formatHlc(ms, counter, deviceId);
}

// --- paths ------------------------------------------------------------------

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const segKey = (seg) => (typeof seg === 'string' ? seg : seg.order ? ORDER : ID + String(seg.id));
const keySeg = (key) => (key === ORDER ? { order: 1 } : key.startsWith(ID) ? { id: key.slice(1) } : key);
const isIdSeg = (seg) => typeof seg === 'object' && 'id' in seg;
const isOrderSeg = (seg) => typeof seg === 'object' && seg.order;

/** Whether every element is a record with a unique id (vacuously true for
 *  an empty array). */
function isIdArray(arr) {
  if (!Array.isArray(arr)) return false;
  const seen = new Set();
  for (const x of arr) {
    if (!isPlainObject(x) || (typeof x.id !== 'string' && typeof x.id !== 'number')) return false;
    const id = String(x.id);
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** The sync scope for a path, from a policy map such as
 *  CAMPAIGN_SYNC_POLICY (data/syncPolicy.js): the longest dotted prefix of
 *  the path's leading named segments that the policy lists. Undefined when
 *  nothing matches. */
export function syncScopeFor(policy, path) {
  const named = [];
  for (const seg of path) { if (typeof seg !== 'string') break; named.push(seg); }
  for (let n = named.length; n > 0; n--) {
    const scope = policy[named.slice(0, n).join('.')];
    if (scope) return scope;
  }
  return undefined;
}

function containsInlineBytes(v) {
  if (typeof v === 'string') return INLINE_BYTES.test(v);
  if (Array.isArray(v)) return v.some(containsInlineBytes);
  if (isPlainObject(v)) return Object.values(v).some(containsInlineBytes);
  return false;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function clone(v) { try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); } }

// --- the clock tree ---------------------------------------------------------

const newNode = () => ({ kids: {} });

function getNode(meta, path) {
  let node = meta.root;
  for (const seg of path) {
    node = node && node.kids[segKey(seg)];
    if (!node) return null;
  }
  return node;
}

function ensureNode(meta, path) {
  let node = meta.root;
  for (const seg of path) {
    const k = segKey(seg);
    if (!node.kids[k]) node.kids[k] = newNode();
    node = node.kids[k];
  }
  return node;
}

/** Ids in the order an id-array materializes in: the register's listed ids
 *  that still exist, then the rest sorted by id. */
export function materializeOrder(registerIds, existingIds) {
  const existing = new Set(existingIds.map(String));
  const listed = [];
  const seen = new Set();
  for (const id of registerIds || []) {
    const s = String(id);
    if (existing.has(s) && !seen.has(s)) { listed.push(s); seen.add(s); }
  }
  const rest = [...existing].filter((id) => !seen.has(id)).sort();
  return [...listed, ...rest];
}

function orderRegister(meta, arrayPath) {
  const node = getNode(meta, arrayPath);
  const reg = node && node.kids[ORDER];
  return (reg && reg.v) || [];
}

// --- document access by path ------------------------------------------------

function readAt(doc, path) {
  let cur = doc;
  for (const seg of path) {
    if (cur == null) return undefined;
    if (isIdSeg(seg)) cur = Array.isArray(cur) ? cur.find((x) => x && String(x.id) === String(seg.id)) : undefined;
    else cur = cur[seg];
  }
  return cur;
}

/** The container a path's last segment lives in, created on the way down
 *  if missing (an op can arrive before the op that created its parent).
 *  The path of every id-array a placeholder record was added to goes into
 *  `grown`, so the caller can put that array back in materialized order,
 *  and the path of every container made up on the way goes into `made`. */
function containerFor(doc, path, grown, made) {
  let cur = doc;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const wantArray = isIdSeg(path[i + 1]);
    if (isIdSeg(seg)) {
      let el = cur.find((x) => x && String(x.id) === String(seg.id));
      if (!el) { el = { id: seg.id }; cur.push(el); grown.push(path.slice(0, i)); made.push(path.slice(0, i + 1)); }
      cur = el;
    } else {
      const okType = wantArray ? Array.isArray(cur[seg]) : isPlainObject(cur[seg]);
      if (!okType) { cur[seg] = wantArray ? [] : {}; made.push(path.slice(0, i + 1)); }
      cur = cur[seg];
    }
  }
  return cur;
}

function writeAt(doc, path, value, grown = [], made = []) {
  const last = path[path.length - 1];
  const parent = containerFor(doc, path, grown, made);
  if (isIdSeg(last)) {
    const i = parent.findIndex((x) => x && String(x.id) === String(last.id));
    if (i >= 0) parent[i] = value; else { parent.push(value); grown.push(path.slice(0, -1)); }
  } else {
    parent[last] = value;
  }
}

function deleteAt(doc, path) {
  const last = path[path.length - 1];
  const parent = readAt(doc, path.slice(0, -1));
  if (parent == null) return;
  if (isIdSeg(last)) {
    if (!Array.isArray(parent)) return;
    const i = parent.findIndex((x) => x && String(x.id) === String(last.id));
    if (i >= 0) parent.splice(i, 1);
  } else {
    delete parent[last];
  }
}

/** Puts an array's records in materialized order. An array can hold plain
 *  values and records at once only after a type change raced with record
 *  edits; the plain values then stay first, in their own order. */
function resort(doc, meta, arrayPath) {
  const arr = readAt(doc, arrayPath);
  if (!Array.isArray(arr)) return;
  const isRecord = (x) => isPlainObject(x) && (typeof x.id === 'string' || typeof x.id === 'number');
  const records = arr.filter(isRecord);
  if (!records.length) return;
  const order = materializeOrder(orderRegister(meta, arrayPath), records.map((x) => x.id));
  const rank = new Map(order.map((id, i) => [id, i]));
  const sorted = [...arr.filter((x) => !isRecord(x)), ...records.sort((a, b) => rank.get(String(a.id)) - rank.get(String(b.id)))];
  arr.splice(0, arr.length, ...sorted);
}

// --- diff -------------------------------------------------------------------

/** The ops that turn `replica.doc` into `next`, all stamped with `hlc`.
 *  With a `policy`, paths scoped `local` or `overlay` are left out. Throws
 *  if a value to send carries inline bytes (a `data:` URL): bytes never
 *  travel in ops (roadmap section 6.1). */
export function diffDoc(replica, next, { hlc, policy = null } = {}) {
  const ops = [];
  const skip = (path) => policy && LOCAL_SCOPES.has(syncScopeFor(policy, path));
  const set = (path, v) => {
    if (containsInlineBytes(v)) throw new Error(`Inline bytes can't be synced (${path.map((s) => (typeof s === 'string' ? s : `[${s.id}]`)).join('.')})`);
    ops.push({ p: path, k: 'set', v: clone(v), t: hlc });
  };
  const del = (path) => ops.push({ p: path, k: 'del', t: hlc });

  function walk(a, b, path) {
    if (a === b || skip(path)) return;
    if (isPlainObject(a) && isPlainObject(b)) {
      for (const k of Object.keys(b)) {
        if (b[k] === undefined) continue;
        const child = [...path, k];
        if (skip(child)) continue;
        if (a[k] === undefined) set(child, b[k]);
        else walk(a[k], b[k], child);
      }
      for (const k of Object.keys(a)) {
        if (a[k] !== undefined && b[k] === undefined && !skip([...path, k])) del([...path, k]);
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b) && isIdArray(a) && isIdArray(b) && (a.length || b.length)) {
      const before = new Map(a.map((x) => [String(x.id), x]));
      const after = new Map(b.map((x) => [String(x.id), x]));
      for (const id of before.keys()) if (!after.has(id)) del([...path, { id }]);
      for (const [id, x] of after) {
        if (!before.has(id)) set([...path, { id }], x);
        else walk(before.get(id), x, [...path, { id }]);
      }
      const aIds = [...before.keys()];
      const bIds = [...after.keys()];
      if (!deepEqual(aIds, bIds) && !deepEqual(materializeOrder(orderRegister(replica.meta, path), bIds), bIds)) {
        set([...path, { order: 1 }], bIds);
      }
      return;
    }
    if (!deepEqual(a, b)) set(path, b);
  }

  walk(replica.doc, next, []);
  return ops;
}

// --- apply ------------------------------------------------------------------

/** Every descendant of `node` written later than `t`, and every record
 *  tombstone: kept, with its current state (its value, or absent), so an
 *  older ancestor write can't change it. Older descendants are pruned from
 *  the tree, since the ancestor write now governs them. */
function takeNewerDescendants(node, t, doc, absPath, rel = [], keep = []) {
  for (const [k, kid] of Object.entries(node.kids)) {
    const seg = keySeg(k);
    if ((kid.del && isIdSeg(seg)) || (kid.t && kid.t > t)) {
      const order = isOrderSeg(seg);
      keep.push({ rel: [...rel, seg], order, value: order ? undefined : clone(readAt(doc, [...absPath, ...rel, seg])) });
      continue;
    }
    takeNewerDescendants(kid, t, doc, absPath, [...rel, seg], keep);
    kid.t = undefined;
    kid.del = undefined;
    kid.implicit = undefined;
    if (!Object.keys(kid.kids).length && !('v' in kid)) delete node.kids[k];
    else if (isOrderSeg(seg)) delete node.kids[k];
  }
  return keep;
}

/** Whether anything under `node` written after `t` still carries a value. */
function hasNewerValue(node, t) {
  for (const [k, kid] of Object.entries(node.kids)) {
    if (k === ORDER) continue;
    if (kid.t && kid.t > t && !kid.del) return true;
    if (hasNewerValue(kid, t)) return true;
  }
  return false;
}

/** A path whose own latest write was a delete, or a container made up only
 *  to hold an op that arrived ahead of its parent's (`implicit`), exists
 *  only to hold newer values below it. After a delete, walks up and removes
 *  any such ancestor left holding nothing, so the result doesn't depend on
 *  delivery order. */
function dropEmptiedAncestors(doc, meta, path) {
  for (let i = path.length - 1; i > 0; i--) {
    const ancestor = path.slice(0, i);
    const node = getNode(meta, ancestor);
    if (!node) continue;
    const heldOnly = node.implicit || (node.del && !isIdSeg(ancestor[i - 1]));
    if (heldOnly && !hasNewerValue(node, node.t || '')) deleteAt(doc, ancestor);
  }
}

function applyOne(doc, meta, op) {
  const path = op.p;
  const last = path[path.length - 1];
  // Deleting a record is absolute: it lands whatever its clock or its
  // ancestors' clocks, and its tombstone outlives any ancestor write (see
  // takeNewerDescendants). Otherwise the result would depend on whether the
  // delete arrived before or after the record's other writes.
  const recordDelete = isIdSeg(last) && op.k === 'del';
  // Superseded by a newer write to an ancestor, or inside a deleted record.
  let node = meta.root;
  for (let i = 0; i < path.length - 1; i++) {
    node = node.kids[segKey(path[i])];
    if (!node) break;
    if (node.del && isIdSeg(path[i])) return;
    if (!recordDelete && node.t && node.t > op.t) return;
  }
  const target = ensureNode(meta, path);
  if (!recordDelete && target.t && target.t >= op.t) return;
  if (target.del && isIdSeg(last) && !recordDelete) return;

  if (isOrderSeg(last)) {
    target.t = op.t;
    target.v = clone(op.v);
    resort(doc, meta, path.slice(0, -1));
    return;
  }

  const keep = recordDelete ? [] : takeNewerDescendants(target, op.t, doc, path);
  if (recordDelete) target.kids = {};

  // Newer descendants are written back below. Only ones carrying a value
  // recreate their parents (writeAt builds whatever containers the path
  // needs); a newer delete or order under an older write changes nothing,
  // so it must not leave an empty container behind.
  const grown = [];
  const made = [];
  if (op.k === 'set') {
    const value = clone(op.v);
    writeAt(doc, path, value, grown, made);
    if (isIdArray(value) && value.length && !target.kids[ORDER]) target.kids[ORDER] = { kids: {}, t: op.t, v: value.map((x) => String(x.id)) };
  } else {
    deleteAt(doc, path);
  }
  keep.sort((x, y) => x.rel.length - y.rel.length);
  for (const k of keep) {
    const abs = [...path, ...k.rel];
    if (k.order) resort(doc, meta, abs.slice(0, -1));
    else if (k.value === undefined) deleteAt(doc, abs);
    else writeAt(doc, abs, k.value, grown, made);
  }
  for (const arrayPath of grown) resort(doc, meta, arrayPath);
  for (const p of made) {
    const n = ensureNode(meta, p);
    if (!n.t || n.del) n.implicit = true;
  }
  target.t = recordDelete && target.t && target.t > op.t ? target.t : op.t;
  target.del = op.k === 'del' || undefined;
  target.implicit = undefined;
  if (isIdSeg(last)) resort(doc, meta, path.slice(0, -1));
  if (op.k === 'del') dropEmptiedAncestors(doc, meta, path);
}

// --- views ------------------------------------------------------------------

const localPolicyPaths = (policy) => Object.entries(policy || {})
  .filter(([, scope]) => LOCAL_SCOPES.has(scope))
  .map(([dotted]) => dotted.split('.'));

function deletePath(doc, segs) {
  let cur = doc;
  for (let i = 0; i < segs.length - 1; i++) {
    if (!isPlainObject(cur[segs[i]])) return;
    cur = cur[segs[i]];
  }
  delete cur[segs[segs.length - 1]];
}

/** A copy of `doc` as other devices may see it: every path the policy
 *  scopes `local` or `overlay` removed. This is what a sync snapshot
 *  carries. (A policy entry nested under a local one isn't re-included;
 *  none exists.) */
export function syncedView(doc, policy) {
  const out = clone(doc);
  for (const segs of localPolicyPaths(policy)) deletePath(out, segs);
  return out;
}

/** `syncedDoc` with this device's own `local`-scoped paths copied in from
 *  `localDoc` (drafts, open panels, drawer widths): what replacing a local
 *  campaign with its synced copy keeps. Overlay paths are left out, since
 *  store.get() splices those in itself. */
export function withLocalPaths(syncedDoc, localDoc, policy) {
  const out = clone(syncedDoc);
  for (const [dotted, scope] of Object.entries(policy || {})) {
    if (scope !== 'local') continue;
    const segs = dotted.split('.');
    const value = readAt(localDoc, segs);
    if (value === undefined) continue;
    let cur = out;
    for (let i = 0; i < segs.length - 1; i++) {
      if (!isPlainObject(cur[segs[i]])) cur[segs[i]] = {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = clone(value);
  }
  return out;
}

/** Whether any value in `doc` is a `data:` URL (bytes not yet moved to the
 *  blob store). */
export function hasInlineBytes(doc) {
  return containsInlineBytes(doc);
}

/** `doc` without any value that is a `data:` URL, for diffing while an
 *  image's bytes are still on their way into the blob store: the record
 *  syncs now, its blob key a moment later, and the bytes never. Returns
 *  `doc` itself when there's nothing to strip. */
export function withoutInlineBytes(doc) {
  if (!containsInlineBytes(doc)) return doc;
  const strip = (v) => {
    if (Array.isArray(v)) return v.filter((x) => !(typeof x === 'string' && INLINE_BYTES.test(x))).map(strip);
    if (isPlainObject(v)) {
      const o = {};
      for (const [k, x] of Object.entries(v)) if (!(typeof x === 'string' && INLINE_BYTES.test(x))) o[k] = strip(x);
      return o;
    }
    return v;
  };
  return strip(doc);
}

/** A fresh replica of a document nobody has written ops against yet. */
export function createReplica(doc) {
  return { doc: clone(doc), meta: { root: newNode() } };
}

/** Merges ops into a replica and returns the new replica (the input is
 *  untouched). Order, duplicates and lateness don't matter: any two
 *  replicas that have applied the same set of ops hold the same document. */
export function applyOps(replica, ops) {
  const doc = clone(replica.doc);
  const meta = clone(replica.meta);
  for (const op of ops || []) applyOne(doc, meta, op);
  return { doc, meta };
}
