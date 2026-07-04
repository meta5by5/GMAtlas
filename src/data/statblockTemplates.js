// statblockTemplates.js — default NPC/creature "Bestiary" statblock templates,
// one per game system, editable in Settings (campaign.settings.statblockTemplates
// overrides these by system id — see domain/statblocks.js getStatblockTemplates).
//
// This is the "future-state" field-manifest design the user asked to have
// revived from the old prototype: each field carries a game system, a field
// kind (attribute vs track/progress-bar — classification lives here, in
// data/settings, not per-instance), a roll method (calculation method), and
// a sort order. A NPC entity picks ONE template by id (its "Bestiary" flag —
// see entity.statblockTemplateId) instead of rendering every system at once.
//
// kind: 'text' | 'attribute' | 'track'   — attribute is a directly-editable,
//   validated-numeric stat/modifier (e.g. "EDGE +3", label-click-to-roll);
//   track renders as a click-to-set scale (progress bar / meter, e.g. Health).
// rollMethod: 'none' | 'action' | 'flat' | 'traveller' — 'action' is d6+value
//   vs 2d10 (Starforged); 'flat' is d6+value vs a target number (5PFH, see
//   field.target, default 6); 'traveller' is 2d6+value vs a target (default
//   8); 'none' means not rollable. More models (5PFH Planetfall, Stars
//   Without Number) can be added here and in domain/dice.js as those systems
//   get authored content — this list isn't meant to be exhaustive yet.
// format (attribute fields only): 'sign' (+3, Starforged-style, default),
//   'inches' (3", 5PFH Speed-style — see the 5pfh template's Speed field
//   below), or 'plain' (bare number). Purely a display convention; unrelated
//   to rollMethod (an inches-formatted field can still be given a roll
//   method if a future system wants that).
// Sort order is the array order itself — Settings' Move Up/Down reorders
// the array in place rather than tracking a separate numeric field.

// A plain "track" (progress-bar) field defaults to starting full (value =
// max) unless the template says otherwise — matches the old NPC/vehicle
// defaults (a fresh Health/Hull meter starts at 5/5, not 0/5). Attribute
// (rollable stat) fields always need an explicit starting value below —
// "full" isn't a sensible default for a stat.
function withDefaults(fields) {
  return fields.map((f) => {
    const merged = { kind: 'text', rollMethod: 'none', max: 5, target: 6, format: 'sign', ...f };
    if (merged.kind === 'track' && merged.value === undefined) merged.value = merged.max;
    if (merged.kind === 'attribute' && merged.value === undefined) merged.value = 0;
    return merged;
  });
}

export const DEFAULT_STATBLOCK_TEMPLATES = {
  generic: {
    label: 'Generic (system-agnostic)',
    fields: withDefaults([
      { key: 'Role', kind: 'text' },
      { key: 'Disposition', kind: 'text' },
      { key: 'Health', kind: 'track', rollMethod: 'none', max: 5 },
      { key: 'Combat / Danger', kind: 'attribute', rollMethod: 'action', max: 5 },
      { key: 'Notable Gear', kind: 'text' },
      { key: 'Motivation', kind: 'text' },
    ]),
  },
  starforged: {
    label: 'Starforged',
    fields: withDefaults([
      { key: 'Threat Rank', kind: 'text' },
      { key: 'Disposition', kind: 'text' },
      { key: 'Health', kind: 'track', rollMethod: 'none', max: 5 },
      { key: 'Combat', kind: 'attribute', rollMethod: 'action', max: 5 },
      { key: 'Notable Gear', kind: 'text' },
      { key: 'Motivation', kind: 'text' },
    ]),
  },
  '5pfh': {
    label: '5PFH',
    fields: withDefaults([
      { key: 'Threat Type', kind: 'text' },
      { key: 'Toughness', kind: 'track', rollMethod: 'none', max: 5 },
      { key: 'Combat', kind: 'attribute', rollMethod: 'flat', target: 6 },
      { key: 'Speed', kind: 'attribute', rollMethod: 'none', format: 'inches' },
      { key: 'Notable Gear', kind: 'text' },
    ]),
  },
  vehicle: {
    label: 'Vehicle',
    fields: withDefaults([
      { key: 'Hull / Integrity', kind: 'track', rollMethod: 'none', max: 5 },
      { key: 'Speed', kind: 'text' },
      { key: 'Armament', kind: 'text' },
      { key: 'Crew Capacity', kind: 'text' },
      { key: 'Condition', kind: 'text' },
    ]),
  },
};

export const STATBLOCK_TEMPLATE_SYSTEMS = Object.keys(DEFAULT_STATBLOCK_TEMPLATES);
