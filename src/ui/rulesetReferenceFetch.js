// rulesetReferenceFetch.js — the async, browser-only half of the Rulesets
// tab's "Load" button (direct instruction: "The document PDF does not get
// pulled from the website to the local browser unless clicking the load
// button"). Deliberately NOT in src/domain/ — fetch() is neither pure nor
// synchronous, the same reason ui/hostileLocationsFetch.js/ui/mechanicsScan.js/
// ui/tocScan.js all live here instead. Same file:// guard those three
// already established verbatim: Chromium treats a file:// page's fetch to
// another file:// resource as cross-origin and blocks it outright.

export async function fetchRulesetReferenceBlob(file) {
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('Loading a sourcebook PDF needs the app served over http(s) — run `npm run serve` and try again (file:// blocks reading a local PDF for security reasons)');
  }
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status})`);
  return res.blob();
}
