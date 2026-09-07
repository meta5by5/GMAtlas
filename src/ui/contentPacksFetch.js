// contentPacksFetch.js — the async, browser-only half of importing a
// content pack from data/contentPacksManifest.js's own list (Settings'
// "Available Packs"). Deliberately NOT in src/domain/ — fetch() is
// neither pure nor synchronous, the same reason ui/hostileLocationsFetch.js
// (this file's own model) and ui/mechanicsScan.js/ui/tocScan.js live here
// instead. Unlike hostileLocationsFetch.js's own fetchHostileLocationsPack
// (several zone files merged into one bespoke `{bases,zones,...}` shape),
// a content pack is always exactly one file handed straight to
// domain/contentPack.js's importContentPack — no merge logic needed.
//
// Same file:// restriction as hostileLocationsFetch.js: Chromium treats a
// file:// page's fetch to another file:// resource as cross-origin and
// blocks it outright, so this needs `npm run serve` (http://) — every
// other feature in this app still works over plain file://.
export async function fetchJsonPack(url) {
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('Content Packs need the app served over http(s) — run `npm run serve` and try again (file:// blocks reading a local JSON file for security reasons)');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the pack at ${url} (HTTP ${res.status})`);
  return res.json();
}
