// documents.js — pure document-library helpers for the GMAtlas docs drawer.

import { DOCS_MANIFEST } from '../data/docsManifest.js';
import { findByName } from './entities.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(doc) {
  if (!doc.documents || typeof doc.documents !== 'object') doc.documents = { library: [], openTabs: [] };
  if (!Array.isArray(doc.documents.library)) doc.documents.library = [];
  if (!Array.isArray(doc.documents.openTabs)) doc.documents.openTabs = [];
  if (doc.documents.activeTab === undefined) doc.documents.activeTab = null;
  // Reference Library entries (assets/docs/, auto-scanned into DOCS_MANIFEST
  // at build time) are read-only build artifacts — they carry no id/title/
  // tags of their own to persist. refOverrides is a small overlay, keyed by
  // the manifest's stable `file` path, the same "don't touch the generated
  // data, layer a persisted override on top" pattern oracles.overrides
  // already uses for SCENE_TABLES.
  if (!doc.documents.refOverrides || typeof doc.documents.refOverrides !== 'object') doc.documents.refOverrides = {};
  // Per-tab requested page (PDF viewer jumps to it via a #page=N fragment) —
  // keyed by the same tab key as openTabs, not persisted per-document since
  // the same PDF can be opened at different pages from different mentions.
  if (!doc.documents.tabPages || typeof doc.documents.tabPages !== 'object') doc.documents.tabPages = {};
  return doc.documents;
}

function normalizeTag(t) { return String(t || '').trim().replace(/^#/, '').toLowerCase(); }

export function addDocument(campaign, patch = {}) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = {
    id: 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: String(patch.title || 'Untitled document').trim(),
    content: String(patch.content || ''),
    kind: patch.kind === 'file' ? 'file' : 'note',
    tags: Array.isArray(patch.tags) ? patch.tags.map(normalizeTag).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Uploaded-file documents carry the file as a data URL instead of text
  // content — kept on the entry so the store's single localStorage module
  // still owns persistence (no second storage mechanism for uploads).
  if (entry.kind === 'file') {
    entry.fileName = String(patch.fileName || entry.title);
    entry.mimeType = String(patch.mimeType || 'application/octet-stream');
    entry.dataUrl = String(patch.dataUrl || '');
  }
  docs.library.push(entry);
  return next;
}

export function updateDocument(campaign, id, patch) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = docs.library.find((d) => d.id === id);
  if (!entry) return next;
  Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
  return next;
}

export function removeDocument(campaign, id) {
  const next = clone(campaign);
  const docs = ensure(next);
  docs.library = docs.library.filter((d) => d.id !== id);
  docs.openTabs = docs.openTabs.filter((tab) => tab !== id);
  return next;
}

export function renameDocument(campaign, id, title) {
  return updateDocument(campaign, id, { title: String(title || 'Untitled document').trim() });
}

export function addDocumentTag(campaign, id, tag) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = docs.library.find((d) => d.id === id);
  const t = normalizeTag(tag);
  if (entry && t) {
    if (!Array.isArray(entry.tags)) entry.tags = [];
    if (!entry.tags.includes(t)) entry.tags.push(t);
  }
  return next;
}

export function removeDocumentTag(campaign, id, tag) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = docs.library.find((d) => d.id === id);
  const t = normalizeTag(tag);
  if (entry && Array.isArray(entry.tags)) entry.tags = entry.tags.filter((x) => x !== t);
  return next;
}

/** Every distinct tag across the uploaded/note library AND the Reference
 *  Library overlay, sorted — for the tag-filter chip row and the
 *  tag-picker datalist. */
export function allDocumentTags(campaign) {
  const library = (campaign.documents && campaign.documents.library) || [];
  const set = new Set();
  for (const d of library) for (const t of (d.tags || [])) set.add(t);
  for (const r of listReferenceDocuments(campaign)) for (const t of (r.tags || [])) set.add(t);
  return [...set].sort();
}

/** Filter the library by a free-text search (title/tags) AND a set of
 *  required tags (all must be present) — used by the Documents drawer. */
export function filterDocuments(campaign, { search = '', tags = [] } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const required = tags.map(normalizeTag).filter(Boolean);
  return listDocuments(campaign).filter((d) => {
    if (required.length && !required.every((t) => (d.tags || []).includes(t))) return false;
    if (!q) return true;
    const haystack = [d.title, ...(d.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function listDocuments(campaign) {
  return ((campaign.documents && campaign.documents.library) || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export function findDocumentByTitle(campaign, title) {
  if (!title) return null;
  const key = String(title || '').trim().toLowerCase();
  return ((campaign.documents && campaign.documents.library) || []).find((entry) => String(entry.title || '').trim().toLowerCase() === key) || null;
}

export function getDocument(campaign, id) {
  return ((campaign.documents && campaign.documents.library) || []).find((entry) => entry && entry.id === id) || null;
}

// A bracketed mention may end in a page anchor — "#12" or "p.12"/"p12" —
// naming a specific page for the PDF viewer to jump to. Bare @Name mentions
// (no brackets) never carry one; a page only makes sense for a document, and
// bare mentions are ambiguous with entity names, which have no page concept.
function splitPageAnchor(raw) {
  const m = String(raw || '').trim().match(/^(.*?)\s*(?:#|p\.?)\s*(\d+)$/i);
  if (m && m[1].trim()) return { name: m[1].trim(), page: Number(m[2]) };
  return { name: String(raw || '').trim(), page: null };
}

// A bracketed mention may also carry a custom display label ahead of the
// actual name/target, separated by "|" — @[Colony rules|5PFH Planetfall p.12]
// shows "Colony rules" but still resolves/links/opens the actual document
// (or entity — this same bracket syntax is shared by both, see
// documentBadges' comment), or @[old friend|Captain Reyes] for an entity.
// Bare @Name mentions can never carry a label (no delimiter-safe way to fit
// one in a single unbroken word) or a page.
function splitLabel(raw) {
  const s = String(raw || '');
  const i = s.indexOf('|');
  if (i < 0) return { label: null, target: s };
  return { label: s.slice(0, i).trim() || null, target: s.slice(i + 1).trim() };
}

/** Scan every @Name/@[Name]/@[Label|Name] mention in `text`, each as
 *  `{name, page, label, start, end}` — `start`/`end` are the source string
 *  indices of the whole mention (including the leading @), for callers that
 *  need to slice around it (see scanMentionSpans/ui/mentionEditor.js).
 *  Order-preserving, not deduplicated (the same title mentioned twice, or at
 *  two different pages, is two distinct refs). */
function scanMentions(text) {
  const out = [];
  const source = String(text || '');
  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'to', 'for', 'with', 'from', 'in', 'on']);
  let i = 0;

  while (i < source.length) {
    const at = source.indexOf('@', i);
    if (at < 0) break;
    if (at + 1 >= source.length) break;

    if (source[at + 1] === '[') {
      const match = source.slice(at).match(/^@\[([^\]]+)\]/);
      if (match) {
        const { label, target } = splitLabel(match[1]);
        const { name, page } = splitPageAnchor(target);
        if (name) out.push({ name, page, label, start: at, end: at + match[0].length });
        i = at + match[0].length;
        continue;
      }
    }

    const words = [];
    let j = at + 1;
    let nameEnd = j;
    while (j < source.length) {
      if (source[j] === '@') break;
      if (/[.,;:!?]/.test(source[j])) break;
      if (/\s/.test(source[j])) {
        j++;
        continue;
      }
      const tokenMatch = source.slice(j).match(/^([A-Za-z0-9_''-]+)/);
      if (!tokenMatch) break;
      const token = tokenMatch[1];
      if (stopWords.has(token.toLowerCase())) break;
      words.push(token);
      j += token.length;
      // Only the position right after the last word actually INCLUDED in
      // the name counts as its end — `j` alone would also swallow the
      // trailing whitespace this loop skips over while probing whether the
      // next word continues the name (a caller slicing text around this
      // range, e.g. the mention-link editor, would otherwise eat a real
      // space from the text).
      nameEnd = j;
    }

    const name = words.join(' ').trim();
    if (name) out.push({ name, page: null, label: null, start: at, end: nameEnd });
    i = at + 1;
  }

  return out;
}

/** Parse @Name and @[Doc Title] mentions, each as `{name, page, label}` —
 *  `page` is the anchor from `@[Doc Title#12]`/`@[Doc Title p.12]`, `label`
 *  is the custom display text from `@[Label|Doc Title]`, either or both
 *  null when the mention doesn't carry one. Order-preserving, not
 *  deduplicated (the same title mentioned at two different pages is two
 *  distinct refs). */
export function parseDocumentMentionRefs(text) {
  return scanMentions(text).map(({ name, page, label }) => ({ name, page, label }));
}

/** Same scan as parseDocumentMentionRefs, but keeps each mention's `start`/
 *  `end` source-string indices — the inline mention-link editor (see
 *  ui/mentionEditor.js) needs these to slice the plain-text segments between
 *  mentions when first building its rich DOM from stored text. */
export function scanMentionSpans(text) {
  return scanMentions(text);
}

/** Just the distinct document titles mentioned in `text` — the form callers
 *  that don't care about page anchors (auto-linking, existence checks) want. */
export function parseDocumentMentions(text) {
  const seen = new Set();
  const out = [];
  for (const { name } of parseDocumentMentionRefs(text)) {
    if (!seen.has(name)) { seen.add(name); out.push(name); }
  }
  return out;
}

// Bare @Name and bracketed @[Name] mentions share the exact same syntax
// (brackets only exist to let a multi-word name survive the parser — see
// parseDocumentMentionRefs/parseMentions in entities.js, which both accept
// either form identically), so a mention can't be told apart as "meant for a
// document" vs "meant for an entity" by its punctuation alone. Journal/
// context-field editing (session.js's addNote/editContextText) runs entity
// auto-linking FIRST, so by the time this runs, `next` already has a real
// entity for every name that didn't already exist. Skipping those here is
// what stops e.g. "@Sakura Combine" (an NPC/faction mention) from ALSO
// spawning a same-named phantom "document" with an empty note body — a real
// reported bug (stray entity-named entries cluttering the Documents drawer).
// A name that resolves to neither an existing document nor an existing
// entity still gets auto-created as a document, same as before.
export function linkDocumentMentions(campaign, text) {
  const names = parseDocumentMentions(text);
  if (!names.length) return campaign;
  const next = clone(campaign);
  const docs = ensure(next);
  const library = docs.library || [];
  const byTitle = new Map(library.map((entry) => [String(entry.title || '').trim().toLowerCase(), entry]));
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (byTitle.has(key)) continue;
    if (findByName(next, name)) continue;
    // Also skip a name that already matches a Reference Library doc (a
    // build artifact, never something to "create") — missing this let a
    // phantom same-titled text note get created anyway, which then
    // permanently shadowed the real PDF for every future mention of that
    // title (see findDocumentTabByTitle's openable-preference fix below —
    // this stops a NEW phantom from being created; that fix un-shadows any
    // that already exist in a saved campaign).
    if (findDocumentTabByTitle(next, name)) continue;
    const created = {
      id: 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: name.trim(),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    library.push(created);
    byTitle.set(key, created);
  }
  return next;
}

/** Resolve a mentioned title to a document — an OPENABLE match (an uploaded
 *  PDF, or a Reference Library entry — always a real PDF) wins over a
 *  same-titled uploaded TEXT NOTE, not just whichever list happens to be
 *  checked first. Without that preference, a stray phantom note sharing a
 *  Reference Library PDF's exact title (see linkDocumentMentions above —
 *  this used to be possible to create) would permanently shadow the real
 *  PDF: every future @[Same Title] mention would resolve to the note and
 *  show "not a PDF file" instead of ever reaching the actual document
 *  again. `openable` is false only when nothing openable matched at all. */
export function findDocumentTabByTitle(campaign, name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  const library = (campaign.documents && campaign.documents.library) || [];
  const libEntry = library.find((d) => String(d.title || '').trim().toLowerCase() === key);
  if (libEntry && libEntry.kind === 'file') return { tabKey: 'lib:' + libEntry.id, title: libEntry.title, openable: true };
  const refDocs = listReferenceDocuments(campaign);
  const ref = refDocs.find((r) => String(r.title || '').trim().toLowerCase() === key);
  if (ref) return { tabKey: 'ref:' + ref.key, title: ref.title, openable: true };
  if (libEntry) return { tabKey: 'lib:' + libEntry.id, title: libEntry.title, openable: false };
  return null;
}

/** Every distinct name in `text`'s @mentions that already resolves to a real
 *  document (uploaded library OR Reference Library) — lowercased, for
 *  entities.js's linkMentions to exclude via its `skip` option. Without
 *  this, mentioning an existing document (e.g. after the @-suggestion
 *  popup's "which page?" prompt inserts @[Title#12]) would still pass
 *  through linkMentions unfiltered and spawn a same-named phantom NPC,
 *  since linkMentions has no idea the document library exists at all — a
 *  real reported bug ("asking for a page... creates a new NPC entity named
 *  filename#pagenumber" instead of linking the document). */
export function resolvedDocumentMentionNames(campaign, text) {
  const out = new Set();
  for (const name of parseDocumentMentions(text)) {
    if (findDocumentTabByTitle(campaign, name)) out.add(name.trim().toLowerCase());
  }
  return out;
}

export function listDocumentMentions(campaign) {
  return (campaign.documents && campaign.documents.library || [])
    .filter((entry) => entry && entry.title)
    .map((entry) => ({ documentId: entry.id, name: entry.title }));
}

// --- Reference Library (assets/docs/, DOCS_MANIFEST) ------------------------
// Read-only build artifacts, but a GM still wants to rename/tag them for
// their own organization — refOverrides is a persisted overlay keyed by the
// manifest's stable `file` path, never mutating DOCS_MANIFEST itself.

/** DOCS_MANIFEST entries merged with any persisted title/tag overrides —
 *  what the Documents drawer's "Reference Library" section actually renders.
 *  A hidden entry (see hideRefDocument) is a bundled build artifact still
 *  sitting in assets/docs/, not actually deleted — hiding is the closest a
 *  per-campaign override can get to "delete" without touching the repo. */
export function listReferenceDocuments(campaign) {
  const overrides = (campaign.documents && campaign.documents.refOverrides) || {};
  return DOCS_MANIFEST.map((r) => {
    const o = overrides[r.file] || {};
    return { ...r, key: r.file, title: (o.title || r.title), tags: Array.isArray(o.tags) ? o.tags : [], hidden: !!o.hidden };
  }).filter((r) => !r.hidden);
}

export function hideRefDocument(campaign, key) {
  const next = clone(campaign);
  const docs = ensure(next);
  if (!docs.refOverrides[key]) docs.refOverrides[key] = {};
  docs.refOverrides[key].hidden = true;
  return next;
}

export function renameRefDocument(campaign, key, title) {
  const next = clone(campaign);
  const docs = ensure(next);
  if (!docs.refOverrides[key]) docs.refOverrides[key] = {};
  docs.refOverrides[key].title = String(title || '').trim();
  return next;
}

export function addRefDocumentTag(campaign, key, tag) {
  const next = clone(campaign);
  const docs = ensure(next);
  const t = normalizeTag(tag);
  if (!t) return next;
  if (!docs.refOverrides[key]) docs.refOverrides[key] = {};
  const o = docs.refOverrides[key];
  if (!Array.isArray(o.tags)) o.tags = [];
  if (!o.tags.includes(t)) o.tags.push(t);
  return next;
}

export function removeRefDocumentTag(campaign, key, tag) {
  const next = clone(campaign);
  const docs = ensure(next);
  const t = normalizeTag(tag);
  const o = docs.refOverrides[key];
  if (o && Array.isArray(o.tags)) o.tags = o.tags.filter((x) => x !== t);
  return next;
}

// --- Document viewer tabs -----------------------------------------------
// A tab key is "ref:<manifest file path>" (a bundled reference PDF — the
// manifest's stable `file` path, not an array index: the Reference Library
// list is searchable/hideable, so a rendered row's position can't be
// trusted as a stable id) or "lib:<document id>" (an uploaded/library
// file) — the same shape the
// existing data-doc-open dataset value already used for a single viewer,
// now persisted as a list so more than one can be open at once (see
// docs/adr — old v0.53 had this via a legacy `sagaAtlasPdfOpenTabs` key,
// which migrate.js already carries into documents.openTabs; this is that
// feature rebuilt on the new architecture, not a new idea).

/** Open (or refocus) a viewer tab, optionally jumping a PDF to `page` — the
 *  click target for a document mention's page anchor. Omitting `page` leaves
 *  any page already recorded for this tab alone, so re-focusing a tab you're
 *  mid-way through reading never resets it back to page 1. */
export function openDocumentTab(campaign, tabKey, page) {
  const next = clone(campaign);
  const docs = ensure(next);
  if (!docs.openTabs.includes(tabKey)) docs.openTabs.push(tabKey);
  docs.activeTab = tabKey;
  if (page) docs.tabPages[tabKey] = Number(page);
  return next;
}

export function closeDocumentTab(campaign, tabKey) {
  const next = clone(campaign);
  const docs = ensure(next);
  const wasActive = docs.activeTab === tabKey;
  docs.openTabs = docs.openTabs.filter((k) => k !== tabKey);
  delete docs.tabPages[tabKey];
  if (wasActive) docs.activeTab = docs.openTabs[docs.openTabs.length - 1] || null;
  return next;
}

export function setActiveDocumentTab(campaign, tabKey) {
  const next = clone(campaign);
  const docs = ensure(next);
  if (docs.openTabs.includes(tabKey)) docs.activeTab = tabKey;
  return next;
}

/** Resolve a tab key to what the viewer needs to render it: a title and an
 *  iframe src. Returns null for a key that no longer resolves to anything
 *  (e.g. a library document that was deleted out from under an open tab).
 *  An empty `src` on a resolved 'lib' entry means the file itself never
 *  actually saved (see store.js's persist() — a quota failure now rolls
 *  back instead of leaving a phantom entry, but old campaigns saved before
 *  that fix could still have one) — callers should show a message, not a
 *  blank iframe, in that case. */
// PDF viewers (browsers' built-in one included) honor a `#page=N` fragment
// on the URL, including on a data: URI — strip any existing fragment first
// so re-anchoring never stacks "#page=3#page=12".
function withPageAnchor(src, page) {
  if (!src || !page) return src;
  return src.split('#')[0] + '#page=' + page;
}

export function resolveDocumentTab(campaign, tabKey) {
  const [kind, id] = String(tabKey || '').split(':');
  const page = (campaign.documents && campaign.documents.tabPages && campaign.documents.tabPages[tabKey]) || null;
  if (kind === 'ref') {
    const ref = DOCS_MANIFEST.find((m) => m.file === id);
    if (!ref) return null;
    const overrides = (campaign.documents && campaign.documents.refOverrides) || {};
    const title = (overrides[ref.file] && overrides[ref.file].title) || ref.title;
    return { title, src: withPageAnchor(ref.file, page), kind: 'ref', page };
  }
  const entry = getDocument(campaign, id);
  if (!entry) return null;
  return { title: entry.title || entry.fileName, src: withPageAnchor(entry.dataUrl || '', page), kind: 'lib', page };
}
