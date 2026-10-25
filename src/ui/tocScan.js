// tocScan.js — Reference Library Table of Contents generation ("USER
// CHANGES" batch): unlike mechanicsScan.js's full-text search, this reads
// each PDF's real bookmark tree via PDF.js's getOutline() — never called
// anywhere in this app before this. Deliberately NOT in src/domain/ (rule
// 3 — this is inherently async/browser-only); domain/toc.js does the
// actual Guide-tree writing from this module's plain scan-result data,
// same domain/ui split mechanicsIndex.js/mechanicsScan.js established.
//
// Shares mechanicsScan.js's file:// restriction (Chromium blocks a
// file:// page from reading another file:// resource's bytes — see that
// module's own comment) and its one-time PDF.js worker setup.
import { listReferenceDocuments, getDocument } from '../domain/documents.js';
import { generateReferenceToc, findReferenceToc, rememberToc } from '../domain/toc.js';
import { configureWorker } from './mechanicsScan.js';

/** Whether a TOC scan can run here at all — the open-a-PDF prompt checks
 *  this first, so it never offers a scan that's bound to fail. */
export function canScanToc() {
  return typeof window !== 'undefined' && !!window.pdfjsLib
    && !(typeof location !== 'undefined' && location.protocol === 'file:');
}

function assertScannable() {
  const pdfjsLib = typeof window !== 'undefined' && window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js did not load — check assets/vendor/pdfjs/pdf.min.js');
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('Table of Contents generation needs the app served over http(s) — run `npm run serve` and try again (file:// blocks reading local PDFs for security reasons)');
  }
  configureWorker(pdfjsLib);
  return pdfjsLib;
}

// A PDF.js outline entry's `dest` is either a named destination (a string,
// needing getDestination() to resolve) or an explicit destination array
// already — either way, its first element is a page ref that
// getPageIndex() turns into a real (0-based) page number.
async function resolveDestPage(pdf, dest) {
  try {
    let d = dest;
    if (typeof d === 'string') d = await pdf.getDestination(d);
    if (!Array.isArray(d) || !d.length) return null;
    const ref = d[0];
    // Most real-world PDFs point at a page via an indirect Ref object,
    // which getPageIndex() resolves — but some PDF generators write a
    // destination array whose first element is already a plain 0-based
    // page number instead of a Ref, which getPageIndex() rejects/throws
    // on. Handling that directly (rather than letting it fall into the
    // catch-and-drop below) is what stops a PDF using this variant from
    // silently reporting zero resolvable bookmarks despite genuinely
    // having them.
    if (typeof ref === 'number') return ref + 1;
    return (await pdf.getPageIndex(ref)) + 1; // +1: this app's @[Title#N] mentions are 1-based, matching mechanicsScan.js's own page-loop convention
  } catch {
    return null;
  }
}

// `seen` counts every outline item visited regardless of whether its page
// resolved — scanOutline uses the seen-vs-resolved gap to tell "this PDF
// genuinely has no bookmarks" apart from "this PDF has bookmarks but none
// of them resolved to a page" (e.g. URL/JS-action bookmarks, or a
// destination shape resolveDestPage doesn't recognize), which otherwise
// looked identical to the GM as one "has no bookmarks" toast either way.
async function walkOutline(pdf, items, depth, out, seen) {
  for (const item of items) {
    seen.count++;
    const page = item.dest ? await resolveDestPage(pdf, item.dest) : null;
    if (page) out.push({ title: item.title, page, depth });
    if (item.items && item.items.length) await walkOutline(pdf, item.items, depth + 1, out, seen);
  }
}

async function scanOutline(pdfjsLib, source) {
  let pdf;
  try { pdf = await pdfjsLib.getDocument(source).promise; } catch { return { entries: [], seenCount: 0 }; }
  const outline = await pdf.getOutline();
  if (!outline || !outline.length) return { entries: [], seenCount: 0 };
  const out = [];
  const seen = { count: 0 };
  await walkOutline(pdf, outline, 0, out, seen);
  return { entries: out, seenCount: seen.count };
}

/** What PDF.js's getDocument() should open for one TOC source
 *  ({sourceKey, tabKey} — domain/toc.js's listTocSources): this browser's
 *  own stored copy first (the same doc-blob-store key the viewer loads it
 *  by), else a Reference Library entry's served path or a legacy upload's
 *  inline data: URL. Returns {url, revoke} or null. */
async function resolveScanUrl(store, campaign, source) {
  const blob = await store.getDocBlob(source.sourceKey);
  if (blob) return { url: URL.createObjectURL(blob), revoke: true };
  if (String(source.tabKey).startsWith('ref:')) {
    const ref = listReferenceDocuments(campaign).find((r) => r.file === source.sourceKey);
    return ref ? { url: ref.src || ref.file, revoke: false } : null;
  }
  const entry = getDocument(campaign, String(source.tabKey).slice('lib:'.length));
  return entry && entry.dataUrl ? { url: entry.dataUrl, revoke: false } : null;
}

/** Writes a Guide TOC for each of `sources` ({sourceKey, docTitle,
 *  tabKey}) that doesn't already have one — a PDF with an existing TOC is
 *  skipped untouched, never rescanned or overwritten. A scan already
 *  remembered app-wide (appConfig.tocLibrary) is reused instead of
 *  re-reading the PDF; every fresh scan is remembered there, empty ones
 *  included, so other campaigns get it for free. Returns {generated,
 *  skipped, existing, unresolved} — `unresolved` is the count of documents
 *  whose PDF outline had bookmarks that were SEEN but none of them resolved
 *  to a page (as opposed to having no bookmarks at all), so the caller can
 *  tell the GM apart "no TOC in this file" from "this file's TOC uses a
 *  bookmark format this scanner couldn't read." */
export async function scanAndGenerateToc(store, { sources = [] } = {}) {
  const pdfjsLib = assertScannable();
  const scanResults = [];
  let unresolved = 0;
  let existing = 0;
  for (const source of sources) {
    const campaign = store.get();
    if (findReferenceToc(campaign, source)) { existing++; continue; }
    const remembered = (store.getAppConfig().tocLibrary || {})[source.sourceKey];
    if (remembered) { scanResults.push({ ...source, entries: remembered.entries }); continue; }
    const target = await resolveScanUrl(store, campaign, source);
    const { entries, seenCount } = target ? await scanOutline(pdfjsLib, target.url) : { entries: [], seenCount: 0 };
    if (target && target.revoke) URL.revokeObjectURL(target.url);
    if (!entries.length && seenCount > 0) unresolved++;
    // Only a PDF that actually opened is remembered — a missing file
    // stays askable once it's been imported.
    if (target) store.updateAppConfig((c) => ({ ...c, tocLibrary: rememberToc(c.tocLibrary, source.sourceKey, { docTitle: source.docTitle, entries }) }));
    scanResults.push({ ...source, entries });
  }
  let result = { generated: 0, skipped: 0, existing, unresolved };
  if (!scanResults.length) return result;
  store.update((d) => {
    const r = generateReferenceToc(d, scanResults);
    result = { generated: r.generated, skipped: r.skipped, existing: existing + r.existing, unresolved };
    return r.campaign;
  });
  return result;
}
