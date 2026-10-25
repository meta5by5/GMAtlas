// toc.js — Reference Library Table of Contents generation ("USER CHANGES"
// batch, design/adr/reference-toc-library.md): pure, testable
// orchestration over already-scanned PDF outline data (ui/tocScan.js does
// the actual async PDF.js work and hands this module plain {docTitle,
// entries} data, same domain/ui split mechanicsIndex.js/mechanicsScan.js
// already established). Writes one Guide document per source document,
// nested under a single find-or-create "Table of Contents" top-level
// Guide doc — and never touches a TOC that already exists (no duplicates,
// no overwrites: a GM may have edited it).
//
// A PDF's identity across campaigns is its `sourceKey` — the same doc-
// blob-store key the viewer already loads it by (a Reference Library
// entry's manifest `file` path, or an uploaded document's `blobKey`). A
// scan is remembered app-wide (appConfig.tocLibrary, keyed by sourceKey)
// so every other campaign showing that same PDF gets its TOC without a
// rescan; a campaign's "no thanks" lives in that campaign alone
// (documents.tocDeclined).

import { createGuideDoc, setGuideDocText } from './guide.js';
import { listCampaignReferenceDocuments, listDocuments } from './documents.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export const TOC_PARENT_TITLE = 'Table of Contents';

/** Turns one document's flat, depth-tagged outline entries into the
 *  lightweight list markup (ADR 0018) this app's Guide already renders —
 *  one `- ` bullet per entry, each wrapping a real `@[Title|DocTitle#Page]`
 *  mention. Depth is conveyed with a repeated em-dash prefix INSIDE the
 *  bullet's own text rather than true nested lists (this app's list
 *  renderer is intentionally one level deep, ADR 0018) — a multi-level
 *  rulebook TOC still reads fine this way, just without indentation depth
 *  beyond the prefix. */
export function buildTocText(entries, docTitle) {
  return (entries || [])
    .filter((e) => e && e.title && e.page)
    .map((e) => `- ${'— '.repeat(Math.max(0, e.depth || 0))}@[${e.title}|${docTitle}#${e.page}]`)
    .join('\n');
}

function guideDocs(campaign) {
  return (campaign.guide && campaign.guide.docs) || [];
}

function tocParent(campaign) {
  return guideDocs(campaign).find((d) => !d.parentId && d.title === TOC_PARENT_TITLE) || null;
}

/** The existing TOC Guide doc for this PDF, or null — matched by the
 *  `tocSourceKey` stamped on it at creation, or (for a TOC made before
 *  that stamp existed, or by hand) by its title under the TOC parent. */
export function findReferenceToc(campaign, { sourceKey = null, docTitle = '' } = {}) {
  const parent = tocParent(campaign);
  return guideDocs(campaign).find((d) => (sourceKey && d.tocSourceKey === sourceKey)
    || (parent && d.parentId === parent.id && docTitle && d.title === docTitle)) || null;
}

/** Adds one PDF's TOC under the "Table of Contents" parent (creating the
 *  parent on first use). Refuses — `added: false` — when there are no
 *  entries or a TOC for this PDF already exists; an existing one is never
 *  rewritten. Leaves the Guide's active doc where it was, since this also
 *  runs in the background (applyRememberedTocs). Returns {campaign, added}. */
export function addReferenceToc(campaign, { sourceKey = null, docTitle, entries } = {}) {
  if (!docTitle || !entries || !entries.length || findReferenceToc(campaign, { sourceKey, docTitle })) {
    return { campaign, added: false };
  }
  let next = clone(campaign);
  const prevActiveId = next.guide && next.guide.activeId;
  let parent = tocParent(next);
  if (!parent) {
    const r = createGuideDoc(next, { title: TOC_PARENT_TITLE });
    next = r.campaign;
    parent = { id: r.id };
  }
  const r = createGuideDoc(next, { title: docTitle, parentId: parent.id });
  next = setGuideDocText(r.campaign, r.id, buildTocText(entries, docTitle));
  const child = next.guide.docs.find((d) => d.id === r.id);
  if (sourceKey) child.tocSourceKey = sourceKey;
  if (prevActiveId !== undefined) next.guide.activeId = prevActiveId;
  if (sourceKey) next = clearTocDeclined(next, sourceKey);
  return { campaign: next, added: true };
}

/** `scanResults`: [{docTitle, sourceKey?, entries: [{title, page, depth}]}]
 *  — plain data, no PDF.js/DOM involved (see ui/tocScan.js). A document
 *  with no entries (no bookmarks found) is skipped, and one that already
 *  has a TOC is left exactly as it is. Returns {campaign, generated,
 *  skipped, existing} so the UI can report each count. */
export function generateReferenceToc(campaign, scanResults) {
  let next = campaign;
  let generated = 0;
  let skipped = 0;
  let existing = 0;
  for (const scan of scanResults || []) {
    if (findReferenceToc(next, scan)) { existing++; continue; }
    if (!scan.entries || !scan.entries.length) { skipped++; continue; }
    const r = addReferenceToc(next, scan);
    next = r.campaign;
    generated++;
  }
  return { campaign: next === campaign ? clone(campaign) : next, generated, skipped, existing };
}

// --- Per-campaign "don't ask again" ----------------------------------------

export function isTocDeclined(campaign, sourceKey) {
  return ((campaign.documents && campaign.documents.tocDeclined) || []).includes(sourceKey);
}

export function declineToc(campaign, sourceKey) {
  const next = clone(campaign);
  if (!next.documents) next.documents = {};
  const list = Array.isArray(next.documents.tocDeclined) ? next.documents.tocDeclined : [];
  if (sourceKey && !list.includes(sourceKey)) list.push(sourceKey);
  next.documents.tocDeclined = list;
  return next;
}

function clearTocDeclined(campaign, sourceKey) {
  if (!isTocDeclined(campaign, sourceKey)) return campaign;
  campaign.documents.tocDeclined = campaign.documents.tocDeclined.filter((k) => k !== sourceKey);
  return campaign;
}

// --- App-wide remembered scans (appConfig.tocLibrary) ------------------------

/** Records one scan result under its sourceKey — including an EMPTY one
 *  (a PDF with no bookmarks), so that PDF is never offered again for a
 *  scan that's known to find nothing. Returns a new library object. */
export function rememberToc(library, sourceKey, { docTitle = '', entries = [] } = {}) {
  if (!sourceKey) return { ...(library || {}) };
  return { ...(library || {}), [sourceKey]: { docTitle, entries: (entries || []).map((e) => ({ title: e.title, page: e.page, depth: e.depth || 0 })), scannedAt: new Date().toISOString() } };
}

/** Every PDF this campaign's Docs library shows (sourcebooks pulled into
 *  this browser for its game system, plus its own uploaded PDFs), as
 *  {sourceKey, docTitle, tabKey} — the set the TOC prompt, the remembered-
 *  TOC sync, and Settings' per-sourcebook list all work over. */
export function listTocSources(campaign, loadedKeys = new Set()) {
  const refs = listCampaignReferenceDocuments(campaign, loadedKeys)
    .filter((r) => (r.ext || String(r.file).split('.').pop()).toLowerCase() === 'pdf')
    .map((r) => ({ sourceKey: r.file, docTitle: r.title, tabKey: `ref:${r.file}` }));
  const uploads = listDocuments(campaign)
    .filter((d) => d.kind === 'file' && (d.mimeType === 'application/pdf' || /\.pdf$/i.test(d.fileName || '')))
    .map((d) => ({ sourceKey: d.blobKey || d.id, docTitle: d.title || d.fileName, tabKey: `lib:${d.id}` }));
  return [...refs, ...uploads];
}

/** Adds every remembered TOC this campaign is missing, for the PDFs its
 *  Docs library shows (`sources`, from listTocSources) — skipping ones the
 *  campaign declined and ones that already have a TOC. Each TOC is written
 *  with THIS campaign's own title for the doc, so its @-mentions resolve
 *  here even if the doc was renamed. Returns {campaign, added}. */
export function applyRememberedTocs(campaign, library, sources) {
  let next = campaign;
  let added = 0;
  for (const s of sources || []) {
    const remembered = library && library[s.sourceKey];
    if (!remembered || !remembered.entries.length || isTocDeclined(next, s.sourceKey)) continue;
    const r = addReferenceToc(next, { sourceKey: s.sourceKey, docTitle: s.docTitle, entries: remembered.entries });
    if (r.added) { next = r.campaign; added++; }
  }
  return { campaign: next, added };
}

/** Whether opening this PDF should ask "generate a TOC?" — only when this
 *  campaign has no TOC for it, hasn't declined, and no scan of it is
 *  remembered (a remembered one is applied silently instead; a remembered
 *  empty scan means there's nothing to generate). */
export function tocPromptNeeded(campaign, library, source) {
  if (!source || !source.sourceKey) return false;
  if (findReferenceToc(campaign, source) || isTocDeclined(campaign, source.sourceKey)) return false;
  return !(library && library[source.sourceKey]);
}
