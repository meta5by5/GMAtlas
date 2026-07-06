// mechanicsScan.js — the async, browser-only half of the Game Mechanics
// Index (docs/adr/0014-mechanics-index-pdfjs.md): drives the vendored
// PDF.js UMD build (assets/vendor/pdfjs/, loaded as a classic <script> in
// index.html, exposing window.pdfjsLib) to search the Reference Library's
// PDFs for data/mechanicsTerms.js's curated terms and record the first
// page each turns up on. Deliberately NOT in src/domain/ — architectural
// rule 3 requires the domain layer stay pure/synchronous/DOM-free, and a
// real PDF text extraction is neither; this module does the scanning and
// hands the plain-data result to domain/mechanicsIndex.js's
// setMechanicsIndex() to store.
//
// file:// is a hard no for this feature, verified while building it:
// Chromium treats a file:// page's XHR/fetch to another file:// resource as
// cross-origin ("null" origin) and blocks it outright — a DIFFERENT, more
// fundamental restriction than the well-known "can't construct a Worker
// from file://" one, and there is no client-side fallback for reading a
// same-directory file:// PDF's bytes without it. scanMechanicsIndex() below
// checks this up front and throws a clear message rather than attempting
// (and failing) per PDF — see docs/adr/0014-mechanics-index-pdfjs.md. Every
// other feature in this app still works over file://; only this one
// requires `npm run serve` (http://).
import { DOCS_MANIFEST } from '../data/docsManifest.js';
import { MECHANICS_TERMS } from '../data/mechanicsTerms.js';
import { RULES_PROVIDERS } from '../data/rulesConstitution.js';
import { setMechanicsIndex } from '../domain/mechanicsIndex.js';

let workerConfigured = false;

function configureWorker(pdfjsLib) {
  if (workerConfigured) return;
  workerConfigured = true;
  pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/vendor/pdfjs/pdf.worker.min.js';
}

/** Which of the Reference Library's PDFs are "in scope" for a scan —
 *  always the Hostile core material (this app's default setting), plus
 *  whichever provider's PDF matches the campaign's active stat ruleset
 *  (data/rulesConstitution.js's rulesetId join). A simple title-substring
 *  heuristic, not exhaustive — falls back to every PDF if the heuristic
 *  matches nothing, so an unusual ruleset never silently scans zero docs. */
export function relevantDocs(settings) {
  const hints = ['hostile'];
  const activeRulesetId = settings && settings.statRuleset;
  for (const p of Object.values(RULES_PROVIDERS)) {
    if (p.rulesetId && p.rulesetId === activeRulesetId) hints.push(p.label.toLowerCase());
  }
  const pdfs = DOCS_MANIFEST.filter((d) => d.ext === 'pdf');
  const matched = pdfs.filter((d) => hints.some((h) => d.title.toLowerCase().includes(h)));
  return matched.length ? matched : pdfs;
}

/** Runs the scan and writes the result via store.update(setMechanicsIndex).
 *  Returns the entries found. Throws if PDF.js hasn't loaded (the vendored
 *  script tag failed or was blocked), or — discovered while verifying this
 *  feature — under file://: Chromium blocks XHR/fetch to a file:// resource
 *  from a file:// page as a cross-origin request (a DIFFERENT restriction
 *  than the Worker-construction one configureWorker() above works around;
 *  there is no client-side fallback for reading a same-directory file:// PDF
 *  without one). This is checked up front so the GM sees one clear,
 *  actionable message instead of N per-PDF console CORS errors and a
 *  confusing "0 terms found." Run via `npm run serve` (http://) instead. */
export async function scanMechanicsIndex(store) {
  const pdfjsLib = typeof window !== 'undefined' && window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js did not load — check assets/vendor/pdfjs/pdf.min.js');
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('PDF scanning needs the app served over http(s) — run `npm run serve` and try again (file:// blocks reading local PDFs for security reasons)');
  }
  configureWorker(pdfjsLib);

  const docs = relevantDocs(store.get().settings);
  const found = [];
  for (const doc of docs) {
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument(doc.file).promise;
    } catch {
      continue; // an unreadable/missing PDF shouldn't abort the whole scan
    }
    const remaining = new Set(MECHANICS_TERMS);
    for (let pageNum = 1; pageNum <= pdf.numPages && remaining.size; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items.map((it) => it.str).join(' ');
      for (const term of [...remaining]) {
        const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(text)) {
          found.push({ term, docTitle: doc.title, docFile: doc.file, page: pageNum });
          remaining.delete(term);
        }
      }
    }
  }
  store.update((d) => setMechanicsIndex(d, found));
  return found;
}
