// crewTasks.js — the Crew Tasks widget behind Colony's "Daily Life" step 2
// ("Assign/resolve crew tasks," design/adr/rules-profiles-multi-campaign.md,
// direct follow-up request). Two kinds of function here, same split
// turnSteps.js already established:
//
//   - "Definition" mutators (moveCrewTaskInList, updateCrewTaskText,
//     loadDefaultCrewTasks) operate on a PROFILE — the task list, its
//     order, and each task's own text are Rules Profile content, edited via
//     the Settings > Crew Tasks tab's draft/Save/Discard flow (the same one
//     Turn Step and Ruleset Profile Editor already share), shared by every
//     campaign on that profile.
//
//   - "Assignment" functions (listEligibleCrewMembers, assignCrewTask)
//     operate on a CAMPAIGN only, reading `campaign.crewTasks` (the active
//     profile's task definitions, spliced in by store.js's overlayProfile —
//     never actually persisted on the campaign document, same as
//     `turnSteps`) and mutating `campaign.crewTaskProgress` (real,
//     per-campaign play state: which party members have already performed
//     a crew task THIS Campaign Turn). This keeps every function here
//     single-argument, matching every other domain module's convention.
//
// Pure functions only. No DOM, no localStorage.

import { listPartyMembers } from './party.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensureCrewTasks(profile) {
  if (!profile.crewTasks || typeof profile.crewTasks !== 'object') profile.crewTasks = { tasks: [] };
  if (!Array.isArray(profile.crewTasks.tasks)) profile.crewTasks.tasks = [];
  return profile.crewTasks;
}

function ensureProgress(campaign) {
  if (!campaign.crewTaskProgress || typeof campaign.crewTaskProgress !== 'object') {
    campaign.crewTaskProgress = { doneMemberIds: [] };
  }
  if (!Array.isArray(campaign.crewTaskProgress.doneMemberIds)) campaign.crewTaskProgress.doneMemberIds = [];
  return campaign.crewTaskProgress;
}

// --- Definitions (Rules Profile content, draft-edited) ---------------------

/** Splice-based reorder within the flat list — same shape as
 *  turnSteps.js's moveTurnStepInGroup, minus the group layer (Crew Tasks
 *  is a flat list, not grouped/branching — jobs are picked independently
 *  each campaign turn, not stepped through in sequence). Bounds-checked
 *  no-op past either end. */
export function moveCrewTaskInList(profile, index, dir) {
  const next = clone(profile);
  const tasks = ensureCrewTasks(next).tasks;
  const target = index + dir;
  if (target < 0 || target >= tasks.length) return next;
  const [task] = tasks.splice(index, 1);
  tasks.splice(target, 0, task);
  return next;
}

/** Plain-text edit — a task's text keeps the same `@[Label|Target]`
 *  document-mention syntax the seed content already uses
 *  (src/ui/mentionEditor.js), rendered clickable at display time via
 *  buildMentionEditorHTML. No-op on an unknown task id. */
export function updateCrewTaskText(profile, taskId, text) {
  const next = clone(profile);
  const task = ensureCrewTasks(next).tasks.find((t) => t.id === taskId);
  if (task) task.text = String(text || '');
  return next;
}

/** Replaces crewTasks.tasks with a deep clone of the given seed data (the
 *  Settings tab's "Load 5PFH Default Crew Tasks" button, and
 *  wrapLegacyCampaignIntoAppConfig's first-install seeding). */
export function loadDefaultCrewTasks(profile, tasksData) {
  const next = clone(profile);
  ensureCrewTasks(next).tasks = clone(tasksData || []);
  return next;
}

// --- Assignment (real per-campaign play state) ------------------------------

/** Party members (party.js's own listPartyMembers) who have NOT yet
 *  performed a crew task this Campaign Turn — the Party Member dropdown's
 *  own option list. Resets whenever the Campaign Turn actually advances
 *  (colony.js's advanceCampaignTurnWithAccrual clears doneMemberIds), never
 *  by a manual Campaign Turn field edit. */
export function listEligibleCrewMembers(campaign) {
  const done = new Set((campaign.crewTaskProgress && campaign.crewTaskProgress.doneMemberIds) || []);
  return listPartyMembers(campaign).filter((m) => !done.has(m.id));
}

/** Marks `memberId` as having performed a crew task this Campaign Turn —
 *  called alongside addNote when the GM clicks Log (logging IS what
 *  "performs" the task; merely selecting a task+member in the UI doesn't
 *  mark anyone done, so changing your mind before logging costs nothing).
 *  Idempotent — a no-op if the member is already marked done. `taskId` is
 *  unused here (nothing about which task was done affects eligibility,
 *  only that ONE was) but kept in the signature since the caller always
 *  has both and it documents the call site's intent. */
export function assignCrewTask(campaign, taskId, memberId) {
  const next = clone(campaign);
  const progress = ensureProgress(next);
  if (!progress.doneMemberIds.includes(memberId)) progress.doneMemberIds.push(memberId);
  return next;
}
