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
import { listReferenceDocuments } from '../domain/documents.js';
import { generateReferenceToc } from '../domain/toc.js';
import { configureWorker } from './mechanicsScan.js';

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

/** Every PDF this app can currently scan for a TOC — the Reference
 *  Library (assets/docs/) plus any uploaded 'file'-kind document, both
 *  resolved to whatever PDF.js's getDocument() can open directly (a file
 *  path or a data: URL alike). */
function combinedScannableDocs(campaign) {
  const refs = listReferenceDocuments(campaign).map((r) => ({ title: r.title, source: r.src || r.file }));
  const uploaded = ((campaign.documents && campaign.documents.library) || [])
    .filter((d) => d.kind === 'file' && d.dataUrl)
    .map((d) => ({ title: d.title || d.fileName, source: d.dataUrl }));
  return [...refs, ...uploaded];
}

/** Scans `onlyDoc` (the per-upload path — {title, source}) or the whole
 *  combined library (the manual Settings button) for real bookmarks and
 *  writes a Guide TOC entry per document that has any (domain/toc.js).
 *  Returns {generated, skipped, unresolved} — `unresolved` is the count of
 *  documents whose PDF outline had bookmarks that were SEEN but none of
 *  them resolved to a page (as opposed to having no bookmarks at all), so
 *  the caller can tell the GM apart "no TOC in this file" from "this file's
 *  TOC uses a bookmark format this scanner couldn't read." */
export async function scanAndGenerateToc(store, { onlyDoc } = {}) {
  const pdfjsLib = assertScannable();
  const docs = onlyDoc ? [onlyDoc] : combinedScannableDocs(store.get());
  const scanResults = [];
  let unresolved = 0;
  for (const doc of docs) {
    const { entries, seenCount } = await scanOutline(pdfjsLib, doc.source);
    if (!entries.length && seenCount > 0) unresolved++;
    scanResults.push({ docTitle: doc.title, entries });
  }
  let result = { generated: 0, skipped: 0, unresolved };
  store.update((d) => {
    const r = generateReferenceToc(d, scanResults);
    result = { generated: r.generated, skipped: r.skipped, unresolved };
    return r.campaign;
  });
  return result;
}
