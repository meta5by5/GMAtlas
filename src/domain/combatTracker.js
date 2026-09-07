// combatTracker.js — the Combat Initiative Tracker (direct request): an
// ordered list of {id, entityId} rows, real per-campaign state so it
// survives a reload mid-fight (the panel's own open/closed visibility is
// separate, ephemeral shell.js state — see renderCombatTrackerPanel).
// Pure, DOM-free, same clone-once-then-mutate shape every other domain
// mutator in this app uses.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
function freshId() { return 'ctr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function ensure(campaign) {
  if (!campaign.combatTracker || typeof campaign.combatTracker !== 'object') campaign.combatTracker = { entries: [], activeEntryId: null };
  if (!Array.isArray(campaign.combatTracker.entries)) campaign.combatTracker.entries = [];
  if (!('activeEntryId' in campaign.combatTracker)) campaign.combatTracker.activeEntryId = null;
  return campaign.combatTracker;
}

export function listCombatTrackerEntries(campaign) {
  return (campaign.combatTracker && campaign.combatTracker.entries) || [];
}

/** Which row's own id is the current turn pointer, or null if none is
 *  marked (direct follow-up request: "click-to-highlight ... 'active
 *  combatant'"). */
export function getCombatTrackerActiveEntryId(campaign) {
  return (campaign.combatTracker && campaign.combatTracker.activeEntryId) || null;
}

/** Clicking the already-active row clears it (toggle off, no combatant
 *  highlighted); clicking any other row makes IT the active one instead —
 *  only ever one at a time, like a turn pointer. A no-op if entryId isn't
 *  a real row. */
export function setCombatTrackerActiveEntry(campaign, entryId) {
  const next = clone(campaign);
  const tracker = ensure(next);
  if (!tracker.entries.some((e) => e.id === entryId)) return next;
  tracker.activeEntryId = tracker.activeEntryId === entryId ? null : entryId;
  return next;
}

/** Appends a new row for entityId — a no-op (returns campaign unchanged)
 *  if that entity already has a row, since a creature doesn't need two
 *  initiative slots. */
export function addCombatTrackerEntity(campaign, entityId) {
  if (listCombatTrackerEntries(campaign).some((e) => e.entityId === entityId)) return campaign;
  const next = clone(campaign);
  ensure(next).entries.push({ id: freshId(), entityId });
  return next;
}

export function removeCombatTrackerEntry(campaign, entryId) {
  const next = clone(campaign);
  const tracker = ensure(next);
  tracker.entries = tracker.entries.filter((e) => e.id !== entryId);
  // Clears a dangling pointer rather than leaving activeEntryId referring
  // to a row that no longer exists.
  if (tracker.activeEntryId === entryId) tracker.activeEntryId = null;
  return next;
}

/** Splice-based reposition (same bounds-checked shape moveTurnStepInList/
 *  moveCrewTaskInList already use) — the row's drag handle's own reorder
 *  action. A no-op if entryId isn't found or toIndex is already its
 *  current slot. */
export function moveCombatTrackerEntry(campaign, entryId, toIndex) {
  const next = clone(campaign);
  const tracker = ensure(next);
  const fromIndex = tracker.entries.findIndex((e) => e.id === entryId);
  if (fromIndex === -1) return next;
  const clampedTo = Math.max(0, Math.min(toIndex, tracker.entries.length - 1));
  if (clampedTo === fromIndex) return next;
  const [row] = tracker.entries.splice(fromIndex, 1);
  tracker.entries.splice(clampedTo, 0, row);
  return next;
}

export function clearCombatTracker(campaign) {
  const next = clone(campaign);
  const tracker = ensure(next);
  tracker.entries = [];
  tracker.activeEntryId = null;
  return next;
}
