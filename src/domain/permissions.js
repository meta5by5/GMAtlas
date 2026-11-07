// permissions.js — a thin seam for future access control. Direct
// instruction: "The Load button will only be available to the Admin or
// those given permission when access controls are implemented. So create
// any hooks needed in preparation for that future architecture." No user/
// role/login concept exists anywhere in this app yet (requirements/
// previous-design-principles/adr/0028-multiuser-access-and-cloud-sync.md
// is Proposed, not started) — every GM running this locally is implicitly
// the sole admin. Gated actions call a function from HERE, never an inline
// check, so wiring a real permission system later means teaching these
// functions about a real session/role instead of re-finding every call
// site. Defaults fully open (true), same "default open, only restrict once
// configured" posture as domain/entitlements.js's own install-level
// Game-System gate — a deliberately different, narrower concept (which
// Game Systems this install may use at all, no user axis) than this file's
// own (which user may take a given gated UI action) — never merge the two.

/** Whether the current session may click the Rulesets tab's "Load"
 *  sourcebook button (drawers/index.js/shell.js). Takes no real argument
 *  yet because there is no session/role object to pass — a future
 *  permission layer would thread one through here (and every other
 *  function this file grows) rather than each gated call site inventing
 *  its own check. */
export function canLoadRulesetReference(/* session */) {
  return true;
}

/** Where a license's sourcebook PDFs come from (design/ACCOUNTS-SYNC-
 *  ROADMAP.md 4.5): 'server' (Load from the site) or 'import' ("Import my
 *  copy": the GM picks their own file). The hosted service serves only
 *  openly licensed (CC-BY) PDFs, since serving anyone else's book to
 *  everyone would be redistribution. Running on your own machine
 *  (localhost, or a file:// double-click) the "server" is your own disk, so
 *  Load stays. `location` is {protocol, hostname}. */
export function referenceDocSource(license, location) {
  if (license && license.open) return 'server';
  const loc = location || {};
  if (loc.protocol === 'file:') return 'server';
  if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(String(loc.hostname || ''))) return 'server';
  return 'import';
}

/** Whether a picked file looks like the sourcebook it's being imported as:
 *  a PDF (by its first bytes), and whether its name matches the expected
 *  one (case-insensitive). `head` is the file's first bytes. */
export function checkImportedPdf(expectedFile, pickedName, head) {
  const bytes = head instanceof Uint8Array ? head : new Uint8Array(head || []);
  const isPdf = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const expected = String(expectedFile || '').split('/').pop().toLowerCase();
  return { isPdf, nameMatches: String(pickedName || '').toLowerCase() === expected };
}

/** Pairs picked files with a license's sourcebooks by file name. Returns
 *  {matched: [{file, picked}], unmatched: [picked]}. */
export function matchPickedPdfs(licenseDocs, pickedNames) {
  const byName = new Map((licenseDocs || []).map((f) => [f.split('/').pop().toLowerCase(), f]));
  const matched = [];
  const unmatched = [];
  for (const name of pickedNames || []) {
    const file = byName.get(String(name).toLowerCase());
    if (file) matched.push({ file, picked: name }); else unmatched.push(name);
  }
  return { matched, unmatched };
}
