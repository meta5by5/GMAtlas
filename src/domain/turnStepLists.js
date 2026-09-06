// turnStepLists.js — the standalone, named Turn Step List inventory (direct
// follow-up request: "create an inventory of Turn Step List profiles
// managed in Settings" — Turn Step content used to be trapped 1:1 inside a
// single Rules Profile; it's now shared appConfig.turnStepLists content,
// referenced by id from campaign.turnStepSlotAssignments (schema.js), same
// shared/reusable posture as Bestiary templates or Oracle tables). These
// are all "definition" mutators — they operate on appConfig (Settings'
// editing surface), never a campaign. See domain/turnSteps.js for the
// "play position" functions (getCurrentTurnStep/advanceTurnStep/
// retreatTurnStep), which operate on a campaign's own turnStepProgress
// against whichever list a slot is assigned to.
//
// Pure functions only. No DOM, no localStorage.

import { defaultTurnStepList } from '../core/schema.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

function ensureLists(appConfig) {
  if (!Array.isArray(appConfig.turnStepLists)) appConfig.turnStepLists = [];
  return appConfig.turnStepLists;
}

function findList(lists, listId) { return lists.find((l) => l.id === listId) || null; }
function findGroup(groups, groupId) { return groups.find((g) => g.id === groupId) || null; }

export function listTurnStepLists(appConfig) {
  return (appConfig && appConfig.turnStepLists) || [];
}

export function getTurnStepList(appConfig, listId) {
  return findList(listTurnStepLists(appConfig), listId) || null;
}

/** Creates a new, empty named list — the "+ New List" action in Settings.
 *  Returns { appConfig, id } so the caller can immediately select it for
 *  editing, same shape createRulesProfile/createCampaign already use. */
export function createTurnStepList(appConfig, name) {
  const next = clone(appConfig);
  const lists = ensureLists(next);
  const list = defaultTurnStepList(String(name || 'New List').trim() || 'New List');
  lists.push(list);
  return { appConfig: next, id: list.id };
}

export function renameTurnStepList(appConfig, listId, name) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  if (list) list.name = String(name || '').trim() || list.name;
  return next;
}

/** No-op if listId doesn't exist. Deliberately no guard against deleting a
 *  list a campaign currently has assigned (turnStepSlotAssignments) — that
 *  campaign's getCurrentTurnStep(campaign, slot) already returns null for
 *  an unresolvable assignment, same as "no turn steps configured" today. */
export function deleteTurnStepList(appConfig, listId) {
  const next = clone(appConfig);
  const lists = ensureLists(next);
  next.turnStepLists = lists.filter((l) => l.id !== listId);
  return next;
}

/** Splice-based reorder within one group of one list — same shape as
 *  statblockTemplates.js's moveTemplateField(campaign, systemId, index,
 *  dir). Bounds-checked no-op past either end; no-op on an unknown
 *  list/group. */
export function moveTurnStepInList(appConfig, listId, groupId, index, dir) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  if (!group) return next;
  const target = index + dir;
  if (target < 0 || target >= group.steps.length) return next;
  const [step] = group.steps.splice(index, 1);
  group.steps.splice(target, 0, step);
  return next;
}

/** Appends a new, empty category (group) to a list (direct follow-up
 *  request: "create new categories") — the "+ Category" action. No-op on
 *  an unknown list. Returns { appConfig, groupId } so a caller can
 *  immediately expand/target the new group. */
export function addTurnStepGroup(appConfig, listId, label) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  if (!list) return { appConfig: next, groupId: null };
  const groupId = uid('grp');
  list.groups.push({ id: groupId, label: String(label || 'New Category').trim() || 'New Category', steps: [] });
  return { appConfig: next, groupId };
}

export function renameTurnStepGroup(appConfig, listId, groupId, label) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  if (group) group.label = String(label || '').trim() || group.label;
  return next;
}

/** Appends a new step (blank text, no branchTo) to one category (direct
 *  follow-up request: "insert new Turn Steps, assign them to categories")
 *  — the "+ Step" action on a category's own header. No-op on an unknown
 *  list/group. Returns { appConfig, stepId }. */
export function addTurnStepToGroup(appConfig, listId, groupId, text) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  if (!group) return { appConfig: next, stepId: null };
  const stepId = uid('step');
  group.steps.push({ id: stepId, text: String(text || ''), branchTo: null });
  return { appConfig: next, stepId };
}

/** Moves a step OUT of its current category and appends it to a different
 *  one (direct follow-up request: "move them between categories") —
 *  distinct from moveTurnStepInList's own within-group reorder. No-op if
 *  the list/either group/the step doesn't exist, or fromGroupId ===
 *  toGroupId (nothing to do). The step's own branchTo travels with it
 *  unchanged. */
export function moveTurnStepToGroup(appConfig, listId, fromGroupId, stepId, toGroupId) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  if (!list || fromGroupId === toGroupId) return next;
  const fromGroup = findGroup(list.groups, fromGroupId);
  const toGroup = findGroup(list.groups, toGroupId);
  if (!fromGroup || !toGroup) return next;
  const index = fromGroup.steps.findIndex((s) => s.id === stepId);
  if (index === -1) return next;
  const [step] = fromGroup.steps.splice(index, 1);
  toGroup.steps.push(step);
  return next;
}

/** Sets (or clears, targetGroupId falsy) which category a step's "Next"
 *  jumps into once reached — direct follow-up request: "connect or move
 *  categories to sub categories." This is the SAME branchTo field
 *  getCurrentTurnStep/advanceTurnStep (domain/turnSteps.js) already read —
 *  previously only ever set in seed data, now GM-editable per step. No-op
 *  on an unknown list/group/step; a targetGroupId that doesn't resolve to
 *  a real group in this SAME list is still stored as-is (advanceTurnStep
 *  already treats an unresolvable branchTo as "no branch" defensively —
 *  see its own findGroup(groups, step.branchTo) check — so a stale
 *  reference left over from a deleted category degrades safely rather than
 *  erroring). */
export function setTurnStepBranchTo(appConfig, listId, groupId, stepId, targetGroupId) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  const step = group && group.steps.find((s) => s.id === stepId);
  if (step) step.branchTo = targetGroupId || null;
  return next;
}

/** Plain-text edit — step text keeps the same `@[Label|Target]` document-
 *  mention syntax the seed content already uses (src/ui/mentionEditor.js),
 *  rendered clickable at display time via buildMentionEditorHTML; editing
 *  it here is a plain textarea, no rich-editor round trip needed. No-op on
 *  an unknown list/group/step. */
export function updateTurnStepText(appConfig, listId, groupId, stepId, text) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  const step = group && group.steps.find((s) => s.id === stepId);
  if (step) step.text = String(text || '');
  return next;
}

/** Toggles whether a step shows Colony's Crew Tasks box — a plain per-step
 *  boolean flag (`showCrewTasks`), same shape every other optional per-step
 *  field here uses (branchTo). No-op on an unknown list/group/step. */
export function setTurnStepShowCrewTasks(appConfig, listId, groupId, stepId, value) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  const group = list && findGroup(list.groups, groupId);
  const step = group && group.steps.find((s) => s.id === stepId);
  if (step) step.showCrewTasks = !!value;
  return next;
}

/** Replaces this list's ENTIRE groups with a deep clone of the given seed
 *  data (src/data/turnStepsDefault5pfh.js, src/data/
 *  turnStepListPlanetfall.js, or any future preset shaped the same way) —
 *  the explicit, visible "Load Default Steps" action; never applied
 *  silently. No-op on an unknown list. */
export function loadDefaultIntoTurnStepList(appConfig, listId, groupsData) {
  const next = clone(appConfig);
  const list = findList(ensureLists(next), listId);
  if (list) list.groups = clone(groupsData || []);
  return next;
}

/** One-time, idempotent hoist for an install that predates the standalone
 *  Turn Step List inventory: any Rules Profile with non-empty LEGACY
 *  `profile.turnSteps.groups` (the old profile-scoped storage) gets that
 *  content moved (not copied — the source field is deleted once hoisted,
 *  see below) into a new named entry in the inventory, named after the
 *  profile it came from. Migration rule 5 ("never drop data"): the content
 *  itself is fully preserved, just relocated to its new canonical home —
 *  deleting the now-redundant profile.turnSteps afterward is what makes
 *  this safely idempotent (a second call finds nothing left to hoist,
 *  rather than creating a duplicate list every boot). No-op (returns the
 *  same reference) if no profile has any legacy turnSteps content. */
export function hoistLegacyProfileTurnSteps(appConfig) {
  const hasLegacy = (appConfig.profiles || []).some((p) => p.turnSteps && Array.isArray(p.turnSteps.groups) && p.turnSteps.groups.length);
  if (!hasLegacy) return appConfig;
  const next = clone(appConfig);
  const lists = ensureLists(next);
  next.profiles = next.profiles.map((p) => {
    if (!p.turnSteps || !Array.isArray(p.turnSteps.groups) || !p.turnSteps.groups.length) return p;
    const { turnSteps, ...rest } = p;
    let name = p.name;
    while (lists.some((l) => l.name === name)) name = `${p.name} (${p.id.slice(-4)})`;
    lists.push({ id: `tsl_${p.id}`, name, createdAt: p.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), groups: turnSteps.groups });
    return rest;
  });
  return next;
}

/** One-time content-correction backfill (direct follow-up request:
 *  "revise the Planetfall profile using the same configuration design as
 *  for the mapping under the 5PFH profile to map Battle Steps as a
 *  follow up to... Mission Determination[, then map] Post-Battle Steps
 *  to... Play Out Your Mission") — the seed content
 *  (turnStepListPlanetfall.js) already ships these branchTo links now, but
 *  a campaign whose "Planetfall" list was seeded/loaded BEFORE this fix
 *  landed still has the old, unbranched steps persisted. Finds the list
 *  named "Planetfall" and sets pf6/pf8's branchTo only if not already
 *  correct — never touches a GM's own further edits to those two steps'
 *  TEXT, and no-ops entirely (same reference back) once already fixed or
 *  if no such list/steps exist (e.g. the GM renamed or heavily restructured
 *  it, in which case this stays out of the way rather than guessing). */
export function fixPlanetfallBranching(appConfig) {
  const list = listTurnStepLists(appConfig).find((l) => l.name === 'Planetfall');
  if (!list) return appConfig;
  const mission = list.groups.flatMap((g) => g.steps).find((s) => s.id === 'pf6');
  const playOut = list.groups.flatMap((g) => g.steps).find((s) => s.id === 'pf8');
  const needsFix = (mission && mission.branchTo !== 'battle-steps') || (playOut && playOut.branchTo !== 'post-battle-steps');
  if (!needsFix) return appConfig;
  const next = clone(appConfig);
  const nextList = listTurnStepLists(next).find((l) => l.id === list.id);
  for (const g of nextList.groups) {
    for (const s of g.steps) {
      if (s.id === 'pf6') s.branchTo = 'battle-steps';
      if (s.id === 'pf8') s.branchTo = 'post-battle-steps';
    }
  }
  return next;
}

/** Idempotent backfill (same shape/purpose as rulesProfiles.js's
 *  backfillDefaultTurnSteps/backfillDefaultCrewTasks did before Turn Step
 *  Lists became a standalone inventory): ensures the "5PFH" and
 *  "Planetfall" named lists both exist, seeding whichever is missing from
 *  this app's own default content. A no-op once both already exist —
 *  never overwrites a list a GM has since renamed/edited/deleted on
 *  purpose (only checked by NAME, so a GM who renames "5PFH" away would
 *  see a fresh one reseeded next boot — the same fragile name-coupling the
 *  old profile-scoped version had, kept for continuity rather than
 *  introducing new provenance tracking here). */
export function backfillTurnStepListInventory(appConfig, fivepfhGroups, planetfallGroups) {
  const lists = listTurnStepLists(appConfig);
  const has5pfh = lists.some((l) => l.name === '5PFH');
  const hasPlanetfall = lists.some((l) => l.name === 'Planetfall');
  if (has5pfh && hasPlanetfall) return appConfig;
  const next = clone(appConfig);
  const nextLists = ensureLists(next);
  if (!has5pfh) nextLists.push({ ...defaultTurnStepList('5PFH'), groups: clone(fivepfhGroups || []) });
  if (!hasPlanetfall) nextLists.push({ ...defaultTurnStepList('Planetfall'), groups: clone(planetfallGroups || []) });
  return next;
}
