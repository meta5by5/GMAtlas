// mechanicsIndex.js — pure storage for the Guide's Game Mechanics Index
// (docs/adr/0014-mechanics-index-pdfjs.md): a term -> {system doc, page}
// lookup the GM can click straight into. The actual PDF scan is
// inherently async and browser-only (PDF.js), so it does NOT belong in
// this domain layer per architectural rule 3 (pure, DOM-free,
// synchronous) — that lives in ui/mechanicsScan.js instead, which calls
// setMechanicsIndex() once it has a result. This module only holds and
// reads whatever that scan already produced.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

/** Every entry the last scan found: [{term, docTitle, docFile, page}]. */
export function getMechanicsIndex(campaign) {
  return (campaign && Array.isArray(campaign.mechanicsIndex)) ? campaign.mechanicsIndex : [];
}

/** Replace the whole index with a fresh scan result. */
export function setMechanicsIndex(campaign, entries) {
  const next = clone(campaign);
  next.mechanicsIndex = Array.isArray(entries) ? entries : [];
  return next;
}
