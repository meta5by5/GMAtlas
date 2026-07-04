// guide.js — the Guide tab: one freeform reference document (a table of
// contents pointing into the Cast and Document Library via the existing
// @mention / @[Doc Name] conventions). Ported concept from the old
// prototype's single-field rich-text guide (see PROGRESS.md
// ISSUES/FINDINGS #4) — simplified to plain text here since this repo's
// @mention/@document badge rendering already does the linking work; no new
// rich-text/sanitization layer is needed for a table-of-contents use case.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export function getGuideText(campaign) {
  return (campaign.guide && campaign.guide.text) || '';
}

export function setGuideText(campaign, text) {
  const next = clone(campaign);
  if (!next.guide || typeof next.guide !== 'object') next.guide = { text: '' };
  next.guide.text = String(text || '');
  return next;
}
