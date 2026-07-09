// hostileLocationsMeta.js — tiny, hand-maintained display counts for the
// HOSTILE Canon Locations gazetteer (docs/adr/0026, JSON-pack addendum).
// The actual catalog data lives in assets/data-packs/hostile-*.json, one
// file per zone, fetched only at import-click time (ui/
// hostileLocationsFetch.js) — these few numbers are the one piece of those
// packs' shape still worth shipping as bundled JS, so Settings' legend
// text can describe what importing will do without a network round-trip
// just to render. Keep in sync by hand whenever a new zone file is added
// to ui/hostileLocationsFetch.js's PACK_URLS.
export const HOSTILE_LOCATIONS_META = {
  zoneLabel: 'Near Earth Zone + Fomalhaut Settlement Zone',
  worldCount: 54,
  starCount: 54,
  baseCount: 4,
};
