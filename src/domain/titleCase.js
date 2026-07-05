// titleCase.js — shared by scripts/build.js (Reference Library titles,
// generated from assets/docs/ filenames at build time) and the Documents
// drawer's file-upload handler (shell.js) — the exact same "derive a
// readable title from a raw filename" transform, so an uploaded PDF's title
// looks as clean as a bundled one instead of showing its literal filename
// (extension, hyphens/underscores, and any ALL-CAPS segments included) — a
// real reported case: "HOSTILE SHORTS 001GhostShip.pdf" uploaded as-is
// would otherwise show as a shouting link in the middle of a sentence.

// A short allowlist of real acronyms/system names that happen to be
// all-uppercase-letters, so they aren't mangled into "5Pfh".
const TITLE_CASE_ALLOWLIST = new Set(['5PFH', 'GM', 'NPC', 'PDF', 'SWN']);

/** Normalizes any all-uppercase WORD to proper Title Case (first letter
 *  capitalized, rest lowercase); already mixed-case words ("GhostShip",
 *  "001GhostShip") are left alone — this targets genuine ALL CAPS, not
 *  camelCase compounds. */
export function toProperTitleCase(title) {
  return String(title || '').split(' ').map((word) => {
    const letters = word.replace(/[^A-Za-z]/g, '');
    if (!letters || letters.length < 2) return word; // too short to be a case issue (a lone initial, digits-only)
    if (letters !== letters.toUpperCase()) return word; // already mixed/camelCase — leave it alone
    if (TITLE_CASE_ALLOWLIST.has(word)) return word;
    return word.charAt(0) + word.slice(1).toLowerCase();
  }).join(' ');
}

/** Strip a file extension and hyphens/underscores, then title-case — the
 *  full "raw filename -> display title" pipeline both callers need. */
export function titleFromFilename(filename) {
  const noExt = String(filename || '').replace(/\.[a-z0-9]+$/i, '');
  const spaced = noExt.replace(/[-_]+/g, ' ').trim();
  return toProperTitleCase(spaced);
}
