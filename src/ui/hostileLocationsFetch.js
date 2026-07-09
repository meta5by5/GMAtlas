// hostileLocationsFetch.js — the async, browser-only half of importing
// HOSTILE's own canon Locations gazetteer (docs/adr/0026, JSON-pack
// addendum): fetches assets/data-packs/hostile-near-earth-zone.json and
// hands the plain data to domain/hostileLocations.js's pure
// importHostileLocations(campaign, pack). Deliberately NOT in src/domain/
// — fetch() is neither pure nor synchronous, the same reason
// ui/mechanicsScan.js/ui/tocScan.js live here instead of domain/.
//
// file:// is a hard no for this feature, the same restriction
// ui/mechanicsScan.js already documented and worked around by just
// surfacing a clear error rather than attempting a workaround: Chromium
// treats a file:// page's fetch to another file:// resource as
// cross-origin and blocks it outright. Every other feature in this app
// still works over file://; only this one (and the PDF-scanning features)
// requires `npm run serve` (http://).
// Each zone is its own JSON file (one per pass of the ADR 0026 rollout
// checklist) rather than one ever-growing file — keeps each zone's data
// independently reviewable/citable and avoids merge conflicts in a single
// huge JSON as later zones are appended. Add a new zone's file path here
// when it lands; importHostileLocations()'s dedup-by-name and
// linkContains relationship logic need no changes since it just sees one
// bigger merged pack.
const PACK_URLS = [
  './assets/data-packs/hostile-near-earth-zone.json',
  './assets/data-packs/hostile-fomalhaut-settlement-zone.json',
];

export async function fetchHostileLocationsPack() {
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('HOSTILE Canon Locations needs the app served over http(s) — run `npm run serve` and try again (file:// blocks reading a local JSON file for security reasons)');
  }
  const merged = { zones: [], bases: [], stars: [], locations: [] };
  for (const url of PACK_URLS) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load the HOSTILE Locations data pack at ${url} (HTTP ${res.status})`);
    const pack = await res.json();
    for (const key of Object.keys(merged)) {
      if (Array.isArray(pack[key])) merged[key] = merged[key].concat(pack[key]);
    }
  }
  return merged;
}
