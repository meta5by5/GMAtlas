// worldFlags.js — a lightweight ledger of individual campaign facts
// ("does the party know the Duke has the ledger?"), separate from any
// one entity's own fields. Scoped down from
// docs/design/GMAtlas_Scene_Story_Data_Model.md's World State Flags table
// (see docs/design/scene-story-integration-plan.md for the
// reconciliation) — same idea, no `set_in_scene_id` FK, since scenes in
// this app have no stable pre-authored identity to point at; a flag's
// own `notes` field can @mention the relevant entity/journal entry by
// hand instead, same as everywhere else in this app. Pure, DOM-free.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export const WORLD_FLAG_VALUES = ['unknown', 'suspected', 'confirmed', 'false'];
export const WORLD_FLAG_VALUE_LABEL = { unknown: 'Unknown', suspected: 'Suspected', confirmed: 'Confirmed', false: 'False' };

/** Add one fact — {id, description, value, notes, setAt}. No-op on blank
 *  description. `value` defaults to 'unknown' (the spec's own default
 *  epistemic state — a fact that exists but isn't yet known either way)
 *  and is clamped to the four GM-legible states above rather than a raw
 *  boolean, matching the spec's "supports simple bool or multi-state"
 *  note with the richer of the two options — a GM who only wants
 *  true/false can just use confirmed/false and ignore the middle two. */
export function addWorldFlag(campaign, description, value = 'unknown', notes = '') {
  const next = clone(campaign);
  const clean = String(description || '').trim();
  if (!clean) return next;
  next.worldFlags = Array.isArray(next.worldFlags) ? next.worldFlags : [];
  next.worldFlags.push({
    id: 'wf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    description: clean,
    value: WORLD_FLAG_VALUES.includes(value) ? value : 'unknown',
    notes: String(notes || '').trim(),
    setAt: new Date().toISOString(),
  });
  return next;
}

/** Updates a flag's value in place (e.g. suspected -> confirmed once the
 *  party actually finds out) — the whole point of a multi-state ledger
 *  over a one-shot boolean is that this transition IS the interesting
 *  event, not something to model as delete-and-recreate. */
export function updateWorldFlagValue(campaign, id, value) {
  const next = clone(campaign);
  const f = (next.worldFlags || []).find((x) => x.id === id);
  if (f && WORLD_FLAG_VALUES.includes(value)) f.value = value;
  return next;
}

export function updateWorldFlagNotes(campaign, id, notes) {
  const next = clone(campaign);
  const f = (next.worldFlags || []).find((x) => x.id === id);
  if (f) f.notes = String(notes || '').trim();
  return next;
}

export function removeWorldFlag(campaign, id) {
  const next = clone(campaign);
  next.worldFlags = (next.worldFlags || []).filter((f) => f.id !== id);
  return next;
}
