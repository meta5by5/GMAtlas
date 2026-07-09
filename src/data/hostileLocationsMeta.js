// hostileLocationsMeta.js — tiny, hand-maintained display counts for the
// HOSTILE Canon Locations gazetteer (docs/adr/0026, JSON-pack addendum).
// The actual catalog data moved to assets/data-packs/hostile-near-earth-
// zone.json, fetched only at import-click time (ui/hostileLocationsFetch.js)
// — these few numbers are the one piece of that pack's shape still worth
// shipping as bundled JS, so Settings' legend text can describe what
// importing will do without a network round-trip just to render. Keep in
// sync by hand whenever a new zone is appended to the JSON pack.
export const HOSTILE_LOCATIONS_META = {
  zoneLabel: 'Near Earth Zone',
  worldCount: 30,
  starCount: 30,
  baseCount: 4,
};
