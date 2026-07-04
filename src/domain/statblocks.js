// statblocks.js — structured NPC / vehicle / character statblocks as pure data
// attached to an entity record via entity.statblocks — an ARRAY of groups, so
// an entity can carry more than one simultaneously (e.g. a character with both
// a Starforged and a 5PFH sheet, or an NPC with two Bestiary templates active
// at once) rather than being forced to toggle/replace a single one. Vehicle
// statblocks auto-attach when an asset entity carries the "vehicle" tag
// (singular or plural, case-insensitive).
//
// Pure functions only. Mutators here operate on an already-cloned entity
// object, matching the pattern entities.js uses for its own mutators.

// A field is either a free-text row ({key, value}) or a numeric "track" row
// ({key, value, max, track: true}) — the Crew-Link-style click-to-set scale
// (click a box to set the value; double-click the value badge to roll d6 +
// value vs 2d10, see domain/dice.js). A field's shape (track vs text,
// attribute vs plain) and name are fixed once created — see
// data/statblockTemplates.js for the Bestiary/character templates that
// define them, editable in Settings. The entity view only edits values.
import { findRuleset, RULESETS } from '../data/rulesets.js';
import { DEFAULT_STATBLOCK_TEMPLATES } from '../data/statblockTemplates.js';

const CHARACTER_DEFAULT_RULESET = 'starforged';
const DEFAULT_BESTIARY_TEMPLATE = 'generic';

const NPC_DEFAULT_FIELDS = [
  { key: 'Role', value: '' },
  { key: 'Disposition', value: '' },
  { key: 'Health', value: 5, max: 5, track: true },
  { key: 'Combat / Danger', value: '' },
  { key: 'Notable Gear', value: '' },
  { key: 'Motivation', value: '' },
];

const VEHICLE_DEFAULT_FIELDS = [
  { key: 'Hull / Integrity', value: 5, max: 5, track: true },
  { key: 'Speed', value: '' },
  { key: 'Armament', value: '' },
  { key: 'Crew Capacity', value: '' },
  { key: 'Condition', value: 'Operational' },
];

const DEFAULT_TRACK_MAX = 5;

function fieldsFrom(defaults) {
  return defaults.map((f) => ({ ...f }));
}

/** True if the entity's tags include "vehicle"/"vehicles" (exact, case-insensitive). */
export function hasVehicleTag(entity) {
  return Array.isArray(entity && entity.tags) && entity.tags.some((t) => /^vehicles?$/i.test(String(t).trim()));
}

/** True if the entity's tags include "character" (case-insensitive) — the
 *  flag that marks an NPC as a Party member (see domain/party.js) and makes
 *  it default to a full character sheet instead of a Bestiary statblock. */
export function hasCharacterTag(entity) {
  return Array.isArray(entity && entity.tags) && entity.tags.some((t) => /^characters?$/i.test(String(t).trim()));
}

/**
 * Merge campaign.settings.statblockTemplates (user edits) onto the built-in
 * Bestiary defaults (data/statblockTemplates.js) — a system id present in
 * the override map fully replaces that system's default; systems the user
 * hasn't touched fall through to the shipped default untouched.
 */
export function getStatblockTemplates(settings) {
  const overrides = (settings && settings.statblockTemplates) || {};
  const out = {};
  for (const id of Object.keys(DEFAULT_STATBLOCK_TEMPLATES)) out[id] = overrides[id] || DEFAULT_STATBLOCK_TEMPLATES[id];
  for (const id of Object.keys(overrides)) if (!out[id]) out[id] = overrides[id];
  return out;
}

export function listStatblockTemplateIds(settings) {
  return Object.keys(getStatblockTemplates(settings));
}

function templateFieldToStatblockField(f) {
  if (f.kind === 'track') {
    const max = f.max || DEFAULT_TRACK_MAX;
    const field = { key: f.key, value: clamp(Number(f.value) || 0, 0, max), max, track: true, rollMethod: f.rollMethod || 'none' };
    if (field.rollMethod === 'flat') field.target = f.target || 6;
    if (field.rollMethod === 'traveller') field.target = f.target || 8;
    return field;
  }
  if (f.kind === 'attribute') {
    // A rollable stat/modifier (Edge, Combat, Speed, ...): a directly-
    // editable signed number, not a 1-5 click-to-set meter (that's `track`,
    // reserved for depleting resources like Health/Hull) — see attrRow in
    // ui/drawers/index.js. `format` picks the display convention (sign/
    // inches/plain — FIELD_FORMATS); `rollMethod` picks the dice model
    // (none/action/flat/traveller — ROLL_METHODS), each system's content, not
    // hardcoded per-system UI logic.
    const field = { key: f.key, value: Number(f.value) || 0, attribute: true, rollMethod: f.rollMethod || 'none', format: f.format || 'sign' };
    if (field.rollMethod === 'flat') field.target = f.target || 6;
    if (field.rollMethod === 'traveller') field.target = f.target || 8;
    return field;
  }
  return { key: f.key, value: '' };
}

/** Build a fresh statblock GROUP for `kind` ('npc' | 'vehicle' | 'character').
 *  A 'character' group is a full player-character sheet built from the
 *  chosen ruleset's template (see data/rulesets.js): stats and resource
 *  tracks are both rendered as click-to-set/roll tracks by the UI — the
 *  `group` tag only decides which section of the sheet they appear in.
 *  An 'npc' (or 'vehicle') group is built from a Bestiary template —
 *  `templateId` picks which one (defaults to 'generic'/'vehicle'); pass
 *  `settings` (campaign.settings) so user-edited templates are honored.
 *  This builds ONE group — an entity can hold several (see
 *  entity.statblocks and addStatblockGroup below). */
export function makeStatblock(kind, rulesetId, templateId, settings) {
  if (kind === 'character') {
    const ruleset = findRuleset(rulesetId || CHARACTER_DEFAULT_RULESET);
    const tpl = ruleset.characterTemplate;
    const fields = [
      // Stats (Edge/Heart/... , Reaction/Speed/...) are rollable modifiers,
      // not depleting resources — `attribute: true` routes them to the
      // editable-number row (attrRow) rather than the 1-5 click-to-set track
      // boxes, matching how Starforged/5PFH sheets actually present them.
      // Dice model/format default to the ruleset's own (attributeRollMethod/
      // attributeFormat) but a stat can override either (5PFH's Speed is
      // inches-formatted and not rollable, unlike its other stats).
      ...tpl.stats.map((s) => {
        const rollMethod = s.rollMethod || tpl.attributeRollMethod || 'action';
        const field = {
          key: s.key, value: s.value, attribute: true, group: 'stat',
          rollMethod, format: s.format || tpl.attributeFormat || 'sign',
        };
        if (rollMethod === 'flat') field.target = s.target || tpl.attributeTarget || 6;
        if (rollMethod === 'traveller') field.target = s.target || tpl.attributeTarget || 8;
        return field;
      }),
      ...tpl.tracks.map((t) => ({ key: t.key, value: t.value, max: t.max, track: true, group: 'resource' })),
    ];
    return { kind: 'character', ruleset: ruleset.id, fields };
  }
  const resolvedKind = kind === 'vehicle' ? 'vehicle' : 'npc';
  const templates = getStatblockTemplates(settings);
  const wantId = templateId || (resolvedKind === 'vehicle' ? 'vehicle' : DEFAULT_BESTIARY_TEMPLATE);
  const tpl = templates[wantId] || templates[DEFAULT_BESTIARY_TEMPLATE];
  const fields = tpl ? tpl.fields.map(templateFieldToStatblockField)
    : fieldsFrom(resolvedKind === 'vehicle' ? VEHICLE_DEFAULT_FIELDS : NPC_DEFAULT_FIELDS);
  return { kind: resolvedKind, templateId: wantId, fields };
}

/** Normalize an entity's statblock storage to the array shape, migrating a
 *  legacy singular `entity.statblock` (pre-multi-group) into a one-element
 *  `entity.statblocks` array. Idempotent — safe to call on every mutator. */
export function ensureStatblocksArray(entity) {
  if (!entity) return entity;
  if (!Array.isArray(entity.statblocks)) entity.statblocks = [];
  if (entity.statblock) {
    entity.statblocks.push(entity.statblock);
    delete entity.statblock;
  }
  return entity;
}

/**
 * Ensure an entity carries the statblock groups its current type/tags call
 * for. Mutates the passed entity in place and returns it (caller supplies an
 * already-cloned entity — see entities.js). Always ADDS a missing group; it
 * never replaces or removes one that's already there, so multiple groups
 * (e.g. two rulesets' character sheets) coexist rather than being toggled.
 *   - npc entities get a Bestiary group if they have none at all.
 *   - #character-tagged NPCs additionally get a full character sheet if they
 *     don't already have one (a Party member — see domain/party.js).
 *   - asset entities tagged #vehicle get a 'vehicle' group if they don't
 *     already have one.
 *   - Moving away from a qualifying type/tag never deletes an existing
 *     group — no data loss, it just stops being auto-managed.
 */
export function ensureAutoStatblock(entity, settings) {
  if (!entity) return entity;
  ensureStatblocksArray(entity);
  const wantsVehicle = entity.type === 'asset' && hasVehicleTag(entity);
  const wantsNpc = entity.type === 'npc';
  const wantsCharacter = wantsNpc && hasCharacterTag(entity);
  if (wantsVehicle && !entity.statblocks.some((g) => g.kind === 'vehicle')) {
    entity.statblocks.push(makeStatblock('vehicle', null, 'vehicle', settings));
  }
  if (wantsCharacter && !entity.statblocks.some((g) => g.kind === 'character')) {
    entity.statblocks.push(makeStatblock('character', settings && settings.statRuleset));
  }
  if (wantsNpc && !wantsCharacter && entity.statblocks.length === 0) {
    entity.statblocks.push(makeStatblock('npc', null, null, settings));
  }
  return entity;
}

/** Add a new statblock group (does not replace or remove any existing one —
 *  see the module doc comment). Caller (entities.js) is responsible for
 *  duplicate-prevention (adding the exact same ruleset/template twice). */
export function addStatblockGroup(entity, kind, rulesetOrTemplateId, settings) {
  if (!entity) return entity;
  ensureStatblocksArray(entity);
  const rulesetId = kind === 'character' ? rulesetOrTemplateId : null;
  const templateId = kind === 'vehicle' ? 'vehicle' : (kind === 'npc' ? rulesetOrTemplateId : undefined);
  entity.statblocks.push(makeStatblock(kind, rulesetId, templateId, settings));
  return entity;
}

export function removeStatblockGroup(entity, groupIndex) {
  if (entity && Array.isArray(entity.statblocks)) entity.statblocks.splice(groupIndex, 1);
  return entity;
}

/** Sort order for displaying an entity's statblock groups: character sheets
 *  first (in Settings' ruleset registration order), then Bestiary/NPC groups
 *  (in Settings' template order), then vehicle. Returns `{group, index}`
 *  pairs — `index` is the position in the ORIGINAL (unsorted) array, which
 *  is what every mutator below addresses a group by, so sorting for display
 *  never disturbs the identifiers used to edit a group. */
export function sortStatblockGroups(groups, settings) {
  const list = groups || [];
  const rulesetOrder = RULESETS.map((r) => r.id);
  const templateOrder = listStatblockTemplateIds(settings);
  const KIND_RANK = { character: 0, npc: 1, vehicle: 2 };
  const rank = (g) => {
    const kindRank = KIND_RANK[g.kind] ?? 9;
    const subRank = g.kind === 'character' ? Math.max(0, rulesetOrder.indexOf(g.ruleset))
      : g.kind === 'npc' ? Math.max(0, templateOrder.indexOf(g.templateId)) : 0;
    return kindRank * 100 + subRank;
  };
  return list.map((group, index) => ({ group, index })).sort((a, b) => rank(a.group) - rank(b.group));
}

export function setStatblockField(entity, groupIndex, fieldIndex, patch) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  const f = g && g.fields[fieldIndex];
  if (f) Object.assign(f, patch);
  return entity;
}

/**
 * Add a field to an existing group. Accepts either the original positional
 * form (entity, groupIndex, key, value) for a text field, or an options
 * object (entity, groupIndex, { key, value, track, max }) for a numeric
 * track field — kept as one function so callers don't need to know which
 * shape in advance. No-ops if the group doesn't exist (groupIndex should
 * always address an already-rendered group).
 */
export function addStatblockField(entity, groupIndex, keyOrOpts = 'New field', value = '') {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  if (!g) return entity;
  let field;
  if (keyOrOpts && typeof keyOrOpts === 'object') {
    const { key = 'New field', value: v = 0, track = false, max = DEFAULT_TRACK_MAX } = keyOrOpts;
    field = track ? { key, value: clamp(Number(v) || 0, 0, max), max, track: true } : { key, value: v };
  } else {
    field = { key: keyOrOpts, value };
  }
  g.fields.push(field);
  return entity;
}

export function removeStatblockField(entity, groupIndex, fieldIndex) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  if (g) g.fields.splice(fieldIndex, 1);
  return entity;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/** Flip a field between text and numeric-track shape, preserving intent:
 *  text → track parses a leading number out of the current value (else 0);
 *  track → text stringifies the current number. Not currently wired to any
 *  UI control (field shape is now template-driven, set in Settings) but
 *  kept as tested, reusable domain API. */
export function toggleStatblockFieldTrack(entity, groupIndex, fieldIndex) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  const f = g && g.fields[fieldIndex];
  if (!f) return entity;
  if (f.track) {
    f.value = String(f.value);
    delete f.track;
    delete f.max;
  } else {
    const parsed = parseInt(String(f.value).replace(/[^0-9-]/g, ''), 10);
    f.max = DEFAULT_TRACK_MAX;
    f.value = clamp(Number.isFinite(parsed) ? parsed : 0, 0, f.max);
    f.track = true;
  }
  return entity;
}

/** Click-to-set a track field's value (clicking the active box again clears
 *  down by one, so a full track can be zeroed out one click at a time). */
export function setStatblockTrackValue(entity, groupIndex, fieldIndex, n) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  const f = g && g.fields[fieldIndex];
  if (!f || !f.track) return entity;
  const max = f.max || DEFAULT_TRACK_MAX;
  const target = f.value === n ? n - 1 : n;
  f.value = clamp(target, 0, max);
  return entity;
}

/** Commit a directly-typed value for an attribute field (Edge, Combat, ...):
 *  parses out a leading signed integer and falls back to 0 for anything that
 *  doesn't parse, so the field is always a valid number — no min/max clamp,
 *  since a stat modifier can legitimately be negative or exceed an old 1-5
 *  scale (see attrRow in ui/drawers/index.js, which replaced the +/- spinner
 *  with this editable input). */
export function setStatblockAttributeValue(entity, groupIndex, fieldIndex, rawValue) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  const f = g && g.fields[fieldIndex];
  if (!f) return entity;
  const parsed = parseInt(String(rawValue).trim().replace(/[^0-9-]/g, ''), 10);
  f.value = Number.isFinite(parsed) ? parsed : 0;
  return entity;
}

/** Toggle a field's `attribute` flag so it can be rendered as an attribute
 *  badge in the UI (e.g. EDGE +3). Purely visual metadata. Not currently
 *  wired to any UI control (attribute/track classification is now
 *  template-driven, set in Settings) but kept as tested, reusable domain
 *  API. */
export function toggleStatblockFieldAttribute(entity, groupIndex, fieldIndex) {
  const g = entity && entity.statblocks && entity.statblocks[groupIndex];
  const f = g && g.fields[fieldIndex];
  if (!f) return entity;
  f.attribute = !f.attribute;
  return entity;
}

/** Parse a stats string like "reaction: 3, tough: 4, combat: 2, ..." into a map
 *  and return an ordered list suitable for rendering. Recognizes Starforged
 *  stat names (edge, iron, heart, shadow, wits) and 5PFH names
 *  (reaction, speed, combat, savvy, tough). */
export function parseStatsString(str) {
  const s = String(str || '');
  const parts = s.split(/[,;]\s*/).map((p) => p.trim()).filter(Boolean);
  const map = new Map();
  for (const p of parts) {
    const m = p.match(/^([^:\s]+)\s*:\s*(.+)$/);
    if (m) {
      map.set(m[1].trim().toLowerCase(), m[2].trim());
    }
  }

  const starOrder = ['edge','iron','heart','shadow','wits','reaction','speed','combat','savvy','tough'];
  const fiveOrder = ['reaction','speed','combat','savvy','tough'];

  const hasStar = [...map.keys()].some((k) => starOrder.includes(k));
  const hasFive = [...map.keys()].some((k) => fiveOrder.includes(k));

  let order = [];
  if (hasStar) order = starOrder.filter((k) => map.has(k));
  else if (hasFive) order = fiveOrder.filter((k) => map.has(k));
  else order = [...map.keys()];

  const ordered = order.map((k) => ({ key: k, value: map.get(k) }));
  return { map, ordered };
}
