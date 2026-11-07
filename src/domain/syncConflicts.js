// syncConflicts.js — finding the edits a simultaneous change on another
// device overwrote (roadmap S2 item 4, "conflict chips";
// design/adr/personal-sync.md). Pure.
//
// Last-writer-wins resolves every race silently. A race only costs the GM
// something when *their* edit is the one that lost, so that is what this
// finds: an op of mine that an incoming op overrode, where the sender
// hadn't seen mine when it wrote. "Hadn't seen" is exact, not guessed from
// clocks: each pushed batch carries the sender's cursor (`seen`, the last
// server seq it had applied), and my own batches learn their seq on ack.
// A batch of mine still unacked has certainly not been seen.
//
// An incoming op overrides one of mine when the paths overlap (the same
// field, or one inside the other) and either it is newer (`t` later), or
// it deletes a record mine edits inside (record deletes always win).

const isIdSeg = (seg) => seg !== null && typeof seg === 'object' && 'id' in seg;
const segEq = (a, b) => (isIdSeg(a) ? isIdSeg(b) && String(a.id) === String(b.id) : a === b);
const isPrefix = (pre, path) => pre.length <= path.length && pre.every((s, i) => segEq(s, path[i]));
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A stable key for a path (for de-duplicating and ids). */
export function pathKey(path) {
  return path.map((s) => (isIdSeg(s) ? `[${s.id}]` : String(s))).join('.');
}

// Paths every edit stamps (housekeeping, not something the GM edited):
// never reported.
const IGNORED = [['meta', 'updatedAt']];
const ignored = (path) => IGNORED.some((p) => isPrefix(p, path));

/**
 * mine:     [{ seq: number|null, ops }]  my recent batches (seq null = unacked)
 * incoming: { seen: number|null, ops }   one batch from another device
 * Returns [{ path, deleted }]: the paths (mine, or the deleted record's)
 * where an edit of mine was overridden. One entry per path.
 */
export function findLostEdits(mine, incoming) {
  const seen = incoming && Number.isFinite(incoming.seen) ? incoming.seen : null;
  const unseen = (mine || []).filter((b) => b.seq == null || (seen != null && b.seq > seen));
  const out = new Map();
  for (const r of (incoming && incoming.ops) || []) {
    const recordDelete = r.k === 'del' && isIdSeg(r.p[r.p.length - 1]);
    for (const batch of unseen) {
      for (const m of batch.ops || []) {
        if (ignored(m.p)) continue;
        if (!isPrefix(r.p, m.p) && !isPrefix(m.p, r.p)) continue;
        if (recordDelete && isPrefix(r.p, m.p)) {
          if (m.k === 'del' && m.p.length === r.p.length) continue; // we both deleted it
          out.set(pathKey(r.p), { path: r.p, deleted: true });
          continue;
        }
        if (!(r.t > m.t)) continue;
        if (r.k === m.k && pathKey(r.p) === pathKey(m.p) && (r.k === 'del' || same(r.v, m.v))) continue; // same result
        const key = pathKey(m.p);
        if (!out.has(key)) out.set(key, { path: m.p, deleted: false });
      }
    }
  }
  // A deleted record covers every lost field inside it.
  const deletes = [...out.values()].filter((x) => x.deleted);
  return [...out.values()].filter((x) => x.deleted || !deletes.some((d) => isPrefix(d.path, x.path)));
}

const words = (key) => String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** "Entities › Kel Varro › Name": a path in words, naming records by
 *  their name/title/label where they have one. */
export function describePath(doc, path) {
  const parts = [];
  let cur = doc;
  for (const seg of path) {
    if (isIdSeg(seg)) {
      const rec = Array.isArray(cur) ? cur.find((x) => x && String(x.id) === String(seg.id)) : undefined;
      const name = rec && (rec.name || rec.title || rec.label || (typeof rec.text === 'string' && rec.text.slice(0, 40)));
      parts.push(name ? String(name) : 'an item');
      cur = rec;
    } else {
      if (!(parts.length && (seg === 'items' || seg === 'list'))) parts.push(words(seg));
      cur = cur == null ? undefined : cur[seg];
    }
  }
  return parts.join(' › ');
}

/** A short, readable form of a value for a conflict chip. */
export function describeValue(value) {
  if (value === undefined || value === null || value === '') return '(empty)';
  if (typeof value === 'string') {
    const plain = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > 80 ? `${plain.slice(0, 79)}…` : plain || '(empty)';
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (isPlainObject(value)) {
    const name = value.name || value.title || value.label;
    return name ? String(name) : `${Object.keys(value).length} fields`;
  }
  return String(value);
}
