// guide.js — the Guide tab: a TREE of freeform reference documents (docs/
// adr/0017-multi-doc-guide-tree.md), each a table of contents with
// @mentions/@[Doc] pointers into the Cast and Document Library. Was a
// single field (`campaign.guide.text`); grown into `{ docs: [{id, title,
// text, parentId, order}], activeId }` so a GM can organize reference
// material into named, nested documents instead of one long scroll.
//
// Migration (rule 5, lossless): schema.js's default is `{ docs: [],
// activeId: null }`, and `withDefaults`' deep-merge means an OLD campaign
// (still shaped `{ text: '...' }`) ends up as the HYBRID `{ docs: [],
// activeId: null, text: '...' }` after every load — `docs` is already an
// array (just empty) at that point, so ensureGuide below checks
// `!docs.length`, not "is docs missing/not-an-array", specifically so this
// hybrid shape still gets recognized and the old text isn't silently
// dropped. Same seed-then-lazy-init posture as oracles.js's ensureOracles/
// entities.js's ensureFactionFields: only WRITE functions clone and call
// ensureGuide; pure reads (buildGuideTree/getActiveGuideDoc) tolerate the
// not-yet-migrated shape via their own read-only fallback instead of
// mutating — safe here specifically because that fallback only ever
// represents the single root doc every migration converges to, so a
// mismatched synthetic id before the first real write is never
// user-visible (see the ADR's Alternatives Considered).

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
function newId() { return 'gd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// A fixed (not randomly generated) id for the very first, migration-
// created root doc — deliberately, so that a PURE read (readGuideDocs,
// before any write has ever happened) and the REAL migration a write
// triggers (ensureGuide) always agree on its id. A random id here would
// mean the first read of a not-yet-migrated campaign could return an id
// that a subsequent write's real migration never actually uses, silently
// breaking any UI action (select/reparent/delete) taken before that first
// write. Collision-safe: newId()'s timestamp+random output is always
// longer than this fixed 7-character string.
const ROOT_BOOTSTRAP_ID = 'gd_root';

function ensureGuide(campaign) {
  if (!campaign.guide || typeof campaign.guide !== 'object') campaign.guide = {};
  if (!Array.isArray(campaign.guide.docs)) campaign.guide.docs = [];
  if (!campaign.guide.docs.length) {
    const legacyText = typeof campaign.guide.text === 'string' ? campaign.guide.text : '';
    campaign.guide.docs.push({ id: ROOT_BOOTSTRAP_ID, title: 'Guide', text: legacyText, parentId: null, order: 0 });
  }
  delete campaign.guide.text; // fully absorbed into the doc above either way
  if (!campaign.guide.activeId || !campaign.guide.docs.some((d) => d.id === campaign.guide.activeId)) {
    campaign.guide.activeId = campaign.guide.docs[0].id;
  }
  return campaign.guide;
}

/** Same fallback content ensureGuide would produce, without mutating —
 *  every pure getter below reads through this instead of assuming
 *  campaign.guide.docs is already populated. Uses the same fixed
 *  ROOT_BOOTSTRAP_ID ensureGuide's migration does, so a read taken before
 *  any write has ever happened still returns an id that later resolves
 *  correctly once a write does trigger the real migration. */
function readGuideDocs(campaign) {
  const g = campaign && campaign.guide;
  if (g && Array.isArray(g.docs) && g.docs.length) return g.docs;
  const legacyText = (g && typeof g.text === 'string') ? g.text : '';
  return [{ id: ROOT_BOOTSTRAP_ID, title: 'Guide', text: legacyText, parentId: null, order: 0 }];
}

function readActiveId(campaign) {
  const docs = readGuideDocs(campaign);
  const g = campaign && campaign.guide;
  if (g && g.activeId && docs.some((d) => d.id === g.activeId)) return g.activeId;
  return docs[0].id;
}

/** Every id in id's own subtree, id included — removeGuideDoc's cascade
 *  and moveGuideDoc's cycle guard share this. */
function subtreeIds(docs, id) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of docs) {
      if (d.parentId && ids.has(d.parentId) && !ids.has(d.id)) { ids.add(d.id); grew = true; }
    }
  }
  return ids;
}

/** The full tree, nested by parentId and sorted by order within each
 *  level — same recursive {..., children} node shape
 *  oracles.js's buildGroupedOracleTree established for the Oracle tree
 *  (reused concept, not code — the data source differs). */
export function buildGuideTree(campaign) {
  const docs = readGuideDocs(campaign);
  const byParent = new Map();
  for (const d of docs) {
    const key = d.parentId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(d);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);
  const build = (parentId) => (byParent.get(parentId) || []).map((d) => ({ ...d, children: build(d.id) }));
  return build(null);
}

export function getActiveGuideDoc(campaign) {
  const docs = readGuideDocs(campaign);
  return docs.find((d) => d.id === readActiveId(campaign)) || docs[0];
}

export function setActiveGuideId(campaign, id) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  if (guide.docs.some((d) => d.id === id)) guide.activeId = id;
  return next;
}

export function setGuideDocText(campaign, id, text) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  const d = guide.docs.find((x) => x.id === id);
  if (d) d.text = String(text || '');
  return next;
}

export function renameGuideDoc(campaign, id, title) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  const d = guide.docs.find((x) => x.id === id);
  if (d) d.title = String(title || '').trim() || d.title;
  return next;
}

/** Creates a new doc (child of parentId, or top-level if null/omitted),
 *  appended after parentId's existing children, and makes it active.
 *  Falls back to top-level if parentId doesn't resolve. */
export function createGuideDoc(campaign, { title = 'Untitled', parentId = null } = {}) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  const resolvedParent = (parentId && guide.docs.some((d) => d.id === parentId)) ? parentId : null;
  const siblingOrders = guide.docs.filter((d) => (d.parentId || null) === resolvedParent).map((d) => d.order);
  const order = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
  const id = newId();
  guide.docs.push({ id, title: String(title || '').trim() || 'Untitled', text: '', parentId: resolvedParent, order });
  guide.activeId = id;
  return { campaign: next, id };
}

/** Every descendant of id, NOT including id itself — for the UI's
 *  pre-delete confirmation ("this will also delete N sub-document(s)"). */
export function countGuideDescendants(campaign, id) {
  return subtreeIds(readGuideDocs(campaign), id).size - 1;
}

/** Deletes id and its entire subtree (the UI confirms this first, naming
 *  the doc and countGuideDescendants' count). No-ops if id doesn't exist
 *  or is the only remaining doc — there must always be at least one for
 *  the main editor to show. */
export function removeGuideDoc(campaign, id) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  if (guide.docs.length <= 1 || !guide.docs.some((d) => d.id === id)) return next;
  const toRemove = subtreeIds(guide.docs, id);
  guide.docs = guide.docs.filter((d) => !toRemove.has(d.id));
  if (!guide.docs.length) guide.docs.push({ id: newId(), title: 'Guide', text: '', parentId: null, order: 0 });
  if (toRemove.has(guide.activeId)) guide.activeId = guide.docs[0].id;
  return next;
}

/** Reparents id under newParentId (or top-level if null/falsy), appended
 *  after newParentId's existing children — the drag-and-drop mutator.
 *  No-ops (returns the campaign unchanged) if id doesn't exist,
 *  newParentId doesn't exist, newParentId === id, or newParentId is one of
 *  id's own descendants (would create a cycle). Does not support
 *  reordering among siblings, only reparenting — a deliberately smaller
 *  first version (see the ADR). */
export function moveGuideDoc(campaign, id, newParentId) {
  const next = clone(campaign);
  const guide = ensureGuide(next);
  const d = guide.docs.find((x) => x.id === id);
  if (!d) return next;
  const parentId = newParentId || null;
  if (parentId === id) return next;
  if (parentId && !guide.docs.some((x) => x.id === parentId)) return next;
  if (parentId && subtreeIds(guide.docs, id).has(parentId)) return next;
  const siblingOrders = guide.docs.filter((x) => x.id !== id && (x.parentId || null) === parentId).map((x) => x.order);
  d.parentId = parentId;
  d.order = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
  return next;
}
