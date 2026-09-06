// cssTemplates.js — the CSS style template a campaign can be assigned
// (direct follow-up request: "assigned CSS style template from a list of
// templates... a code stub for TBD design of applying different CSS
// templates"). Per-campaign (campaign.meta.cssTemplate — see schema.js),
// picked in Settings > General. Deliberately inert right now: nothing in
// the app reads this value to actually swap stylesheets yet — it exists
// so the Campaigns feature has a real, persisted place to store the
// choice ahead of that design work, instead of inventing one later and
// needing a migration to backfill it.
export const CSS_TEMPLATES = [
  { id: 'default', label: 'Default' },
];
