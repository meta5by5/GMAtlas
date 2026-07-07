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
    return (await pdf.getPageIndex(d[0])) + 1; // +1: this app's @[Title#N] mentions are 1-based, matching mechanicsScan.js's own page-loop convention
  } catch {
    return null;
  }
}

async function walkOutline(pdf, items, depth, out) {
  for (const item of items) {
    const page = item.dest ? await resolveDestPage(pdf, item.dest) : null;
    if (page) out.push({ title: item.title, page, depth });
    if (item.items && item.items.length) await walkOutline(pdf, item.items, depth + 1, out);
  }
}

async function scanOutline(pdfjsLib, source) {
  let pdf;
  try { pdf = await pdfjsLib.getDocument(source).promise; } catch { return []; }
  const outline = await pdf.getOutline();
  if (!outline || !outline.length) return [];
  const out = [];
  await walkOutline(pdf, outline, 0, out);
  return out;
}

/** Every PDF this app can currently scan for a TOC — the Reference
 *  Library (assets/docs/) plus any uploaded 'file'-kind document, both
 *  resolved to whatever PDF.js's getDocument() can open directly (a file
 *  path or a data: URL alike). */
function combinedScannableDocs(campaign) {
  const refs = listReferenceDocuments(campaign).map((r) => ({ title: r.title, source: r.file }));
  const uploaded = ((campaign.documents && campaign.documents.library) || [])
    .filter((d) => d.kind === 'file' && d.dataUrl)
    .map((d) => ({ title: d.title || d.fileName, source: d.dataUrl }));
  return [...refs, ...uploaded];
}

/** Scans `onlyDoc` (the per-upload path — {title, source}) or the whole
 *  combined library (the manual Settings button) for real bookmarks and
 *  writes a Guide TOC entry per document that has any (domain/toc.js).
 *  Returns {generated, skipped} for the caller's toast/confirm summary. */
export async function scanAndGenerateToc(store, { onlyDoc } = {}) {
  const pdfjsLib = assertScannable();
  const docs = onlyDoc ? [onlyDoc] : combinedScannableDocs(store.get());
  const scanResults = [];
  for (const doc of docs) {
    const entries = await scanOutline(pdfjsLib, doc.source);
    scanResults.push({ docTitle: doc.title, entries });
  }
  let result = { generated: 0, skipped: 0 };
  store.update((d) => {
    const r = generateReferenceToc(d, scanResults);
    result = { generated: r.generated, skipped: r.skipped };
    return r.campaign;
  });
  return result;
}
