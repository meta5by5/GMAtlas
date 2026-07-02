// statblocks.js — structured NPC / vehicle statblocks as pure data attached
// to an entity record. Deliberately system-agnostic: an ordered list of
// key/value fields rather than a hardcoded ruleset, so this stays true to
// "genre-aware, not genre-locked" — a Hostile/Starforged table works the same
// as a homebrew one. Vehicle statblocks auto-attach when an asset entity
// carries the "vehicle" tag (singular or plural, case-insensitive).
//
// Pure functions only. Mutators here operate on an already-cloned entity
// object, matching the pattern entities.js uses for its own mutators.

// A field is either a free-text row ({key, value}) or a numeric "track" row
// ({key, value, max, track: true}) — the Crew-Link-style click-to-set scale
// (click a box to set the value; double-click the value badge to roll d6 +
// value vs 2d10, see domain/dice.js). Any field can be toggled between the
// two shapes from the UI, so this stays genre-agnostic: nothing here assumes
// a specific stat name or ruleset.
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

export function makeStatblock(kind) {
  return { kind: kind === 'vehicle' ? 'vehicle' : 'npc', fields: fieldsFrom(kind === 'vehicle' ? VEHICLE_DEFAULT_FIELDS : NPC_DEFAULT_FIELDS) };
}

/**
 * Ensure an entity carries the statblock its current type/tags call for.
 * Mutates the passed entity in place and returns it (caller supplies an
 * already-cloned entity — see entities.js).
 *   - npc entities get an 'npc' statblock if they have none.
 *   - asset entities tagged #vehicle get a 'vehicle' statblock if they don't
 *     already have one.
 *   - Moving away from a qualifying type/tag never deletes an existing
 *     statblock — no data loss, it just stops being auto-managed.
 */
export function ensureAutoStatblock(entity) {
  if (!entity) return entity;
  const wantsVehicle = entity.type === 'asset' && hasVehicleTag(entity);
  const wantsNpc = entity.type === 'npc';
  if (wantsVehicle && !(entity.statblock && entity.statblock.kind === 'vehicle')) {
    entity.statblock = makeStatblock('vehicle');
  } else if (wantsNpc && !entity.statblock) {
    entity.statblock = makeStatblock('npc');
  }
  return entity;
}

export function setStatblockField(entity, index, patch) {
  const f = entity && entity.statblock && entity.statblock.fields[index];
  if (f) Object.assign(f, patch);
  return entity;
}

/**
 * Add a field. Accepts either the original positional form
 * (entity, key, value) for a text field, or an options object
 * (entity, { key, value, track, max }) to add a numeric track field —
 * kept as one function so callers don't need to know which shape in advance.
 */
export function addStatblockField(entity, keyOrOpts = 'New field', value = '') {
  if (!entity) return entity;
  if (!entity.statblock) entity.statblock = { kind: entity.type === 'asset' ? 'vehicle' : 'npc', fields: [] };
  let field;
  if (keyOrOpts && typeof keyOrOpts === 'object') {
    const { key = 'New field', value: v = 0, track = false, max = DEFAULT_TRACK_MAX } = keyOrOpts;
    field = track ? { key, value: clamp(Number(v) || 0, 0, max), max, track: true } : { key, value: v };
  } else {
    field = { key: keyOrOpts, value };
  }
  entity.statblock.fields.push(field);
  return entity;
}

export function removeStatblockField(entity, index) {
  if (entity && entity.statblock) entity.statblock.fields.splice(index, 1);
  return entity;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/** Flip a field between text and numeric-track shape, preserving intent:
 *  text → track parses a leading number out of the current value (else 0);
 *  track → text stringifies the current number. */
export function toggleStatblockFieldTrack(entity, index) {
  const f = entity && entity.statblock && entity.statblock.fields[index];
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
export function setStatblockTrackValue(entity, index, n) {
  const f = entity && entity.statblock && entity.statblock.fields[index];
  if (!f || !f.track) return entity;
  const max = f.max || DEFAULT_TRACK_MAX;
  const target = f.value === n ? n - 1 : n;
  f.value = clamp(target, 0, max);
  return entity;
}
