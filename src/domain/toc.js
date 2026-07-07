// toc.js — Reference Library Table of Contents generation ("USER CHANGES"
// batch): pure, testable orchestration over already-scanned PDF outline
// data (ui/tocScan.js does the actual async PDF.js work and hands this
// module plain {docTitle, entries} data, same domain/ui split
// mechanicsIndex.js/mechanicsScan.js already established). Writes one
// Guide document per source document (find-or-create by title, so re-runs
// update in place instead of duplicating), nested under a single
// find-or-create "Table of Contents" top-level Guide doc.

import { createGuideDoc, setGuideDocText } from './guide.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

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

function findGuideDoc(campaign, predicate) {
  return ((campaign.guide && campaign.guide.docs) || []).find(predicate);
}

/** `scanResults`: [{docTitle, entries: [{title, page, depth}]}] — plain
 *  data, no PDF.js/DOM involved (see ui/tocScan.js). A document with no
 *  entries (no bookmarks found) is skipped, not written as an empty Guide
 *  doc. Idempotent: re-running updates each document's existing TOC child
 *  in place rather than creating duplicates, matching how the Mechanics
 *  Index scan already replaces its whole result on every run. Returns
 *  {campaign, generated, skipped} so the UI can report both counts. */
export function generateReferenceToc(campaign, scanResults) {
  let next = clone(campaign);
  let parent = findGuideDoc(next, (d) => !d.parentId && d.title === 'Table of Contents');
  let generated = 0;
  let skipped = 0;
  for (const scan of scanResults || []) {
    if (!scan.entries || !scan.entries.length) { skipped++; continue; }
    if (!parent) {
      const r = createGuideDoc(next, { title: 'Table of Contents' });
      next = r.campaign;
      parent = { id: r.id };
    }
    let child = findGuideDoc(next, (d) => d.parentId === parent.id && d.title === scan.docTitle);
    if (!child) {
      const r = createGuideDoc(next, { title: scan.docTitle, parentId: parent.id });
      next = r.campaign;
      child = { id: r.id };
    }
    next = setGuideDocText(next, child.id, buildTocText(scan.entries, scan.docTitle));
    generated++;
  }
  return { campaign: next, generated, skipped };
}
