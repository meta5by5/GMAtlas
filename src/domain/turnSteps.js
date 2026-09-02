// turnSteps.js — the Turn Step workflow (design/adr/rules-profiles-multi-
// campaign.md, direct follow-up request — converted from the Guide entry
// "5PFH Campaign Turn Sequence"). Two kinds of function here, on purpose:
//
//   - "Definition" mutators (moveTurnStepInGroup, updateTurnStepText,
//     loadDefaultTurnSteps) operate on a PROFILE — the step list, its
//     order, and each step's text are Rules Profile content (like Genre
//     Pack/Rules Constitution), edited via the Ruleset Profile Editor's
//     draft/Save/Discard flow, shared by every campaign on that profile.
//
//   - "Play position" functions (getCurrentTurnStep, advanceTurnStep,
//     retreatTurnStep) operate on a CAMPAIGN only, reading `campaign.
//     turnSteps` (the active profile's definitions, spliced in by
//     store.js's overlayProfile — never actually persisted on the
//     campaign document) and mutating `campaign.turnStepProgress` (real,
//     per-campaign play state). This keeps every function here
//     single-argument, matching every other domain module's convention —
//     no domain function anywhere else in this app takes both a campaign
//     and a profile.
//
// Pure functions only. No DOM, no localStorage.

import { advanceCampaignTurnWithAccrual } from './colony.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensureTurnSteps(profile) {
  if (!profile.turnSteps || typeof profile.turnSteps !== 'object') profile.turnSteps = { groups: [] };
  if (!Array.isArray(profile.turnSteps.groups)) profile.turnSteps.groups = [];
  return profile.turnSteps;
}

function ensureProgress(campaign) {
  if (!campaign.turnStepProgress || typeof campaign.turnStepProgress !== 'object') {
    campaign.turnStepProgress = { groupId: null, stepIndex: 0, returnStack: [] };
  }
  if (!Array.isArray(campaign.turnStepProgress.returnStack)) campaign.turnStepProgress.returnStack = [];
  return campaign.turnStepProgress;
}

function findGroup(groups, groupId) { return groups.find((g) => g.id === groupId) || null; }

// --- Definitions (Rules Profile content, draft-edited) ---------------------

/** Splice-based reorder within one group — same shape as
 *  statblockTemplates.js's moveTemplateField(campaign, systemId, index,
 *  dir). Bounds-checked no-op past either end; no-op on an unknown group. */
export function moveTurnStepInGroup(profile, groupId, index, dir) {
  const next = clone(profile);
  const group = findGroup(ensureTurnSteps(next).groups, groupId);
  if (!group) return next;
  const target = index + dir;
  if (target < 0 || target >= group.steps.length) return next;
  const [step] = group.steps.splice(index, 1);
  group.steps.splice(target, 0, step);
  return next;
}

/** Plain-text edit — step text keeps the same `@[Label|Target]` document-
 *  mention syntax the seed content already uses (src/ui/mentionEditor.js),
 *  rendered clickable at display time via buildMentionEditorHTML; editing
 *  it here is a plain textarea, no rich-editor round trip needed. No-op on
 *  an unknown group/step. */
export function updateTurnStepText(profile, groupId, stepId, text) {
  const next = clone(profile);
  const group = findGroup(ensureTurnSteps(next).groups, groupId);
  const step = group && group.steps.find((s) => s.id === stepId);
  if (step) step.text = String(text || '');
  return next;
}

/** Replaces this profile's ENTIRE turnSteps.groups with a deep clone of
 *  the given seed data (src/data/turnStepsDefault5pfh.js, or any future
 *  preset shaped the same way) — the explicit, visible "Load Default
 *  Steps" action; never applied silently to a profile the GM didn't ask
 *  for it on. */
export function loadDefaultTurnSteps(profile, groupsData) {
  const next = clone(profile);
  ensureTurnSteps(next).groups = clone(groupsData || []);
  return next;
}

// --- Play position (real campaign state) ------------------------------

/** Read-only: resolves the campaign's current turnStepProgress against its
 *  (profile-overlaid) turnSteps.groups into everything the Colony widget
 *  needs to render. Returns null when the active profile has no turn
 *  steps configured, or once progress has advanced past the very last
 *  step of the root workflow with nothing left on the return stack. */
export function getCurrentTurnStep(campaign) {
  const groups = (campaign.turnSteps && campaign.turnSteps.groups) || [];
  if (!groups.length) return null;
  const progress = campaign.turnStepProgress || { groupId: null, stepIndex: 0, returnStack: [] };
  const groupId = progress.groupId || groups[0].id;
  const group = findGroup(groups, groupId) || groups[0];
  const index = Math.max(0, Math.min(group.steps.length - 1, progress.stepIndex || 0));
  const step = group.steps[index];
  if (!step) return null;
  const stack = progress.returnStack || [];
  const atGroupEnd = index === group.steps.length - 1;
  return {
    group, step, index, total: group.steps.length,
    hasNext: !!(step.branchTo && findGroup(groups, step.branchTo)) || !atGroupEnd || stack.length > 0,
    hasPrev: index > 0 || stack.length > 0,
  };
}

/** "Next Step." A branching step (branchTo set) pushes {groupId,
 *  stepIndex} — where we're leaving — onto returnStack and jumps to
 *  {branchTo, 0} (confirmed: auto-jump, not just a reference). Otherwise
 *  advances within the current group; at the group's last step, pops
 *  returnStack to resume the parent one step further (returning from a
 *  branch), or no-ops at the true end of the whole workflow (root group,
 *  last step, nothing to return to). No-op if the active profile has no
 *  turn steps at all. */
export function advanceTurnStep(campaign) {
  const groups = (campaign.turnSteps && campaign.turnSteps.groups) || [];
  if (!groups.length) return campaign;
  const next = clone(campaign);
  const progress = ensureProgress(next);
  const groupId = progress.groupId || groups[0].id;
  const group = findGroup(groups, groupId) || groups[0];
  progress.groupId = group.id;
  const index = Math.max(0, Math.min(group.steps.length - 1, progress.stepIndex || 0));
  const step = group.steps[index];
  if (step && step.branchTo && findGroup(groups, step.branchTo)) {
    progress.returnStack.push({ groupId: group.id, stepIndex: index });
    progress.groupId = step.branchTo;
    progress.stepIndex = 0;
    return next;
  }
  if (index < group.steps.length - 1) {
    progress.stepIndex = index + 1;
    return next;
  }
  // Pop the return stack until we find a parent group with room to advance
  // further — a branch reached at the very last step of ITS OWN parent
  // means popping once isn't enough, so this keeps going instead of
  // stranding progress on an out-of-range index.
  while (progress.returnStack.length) {
    const resume = progress.returnStack.pop();
    const parentGroup = findGroup(groups, resume.groupId);
    const resumeIndex = resume.stepIndex + 1;
    if (parentGroup && resumeIndex < parentGroup.steps.length) {
      progress.groupId = resume.groupId;
      progress.stepIndex = resumeIndex;
      return next;
    }
  }
  // True end of the workflow — nothing left to advance to or return from.
  return next;
}

/** "Previous Step" — the mirror of advanceTurnStep. Steps back within the
 *  current group; at index 0 of a group that was entered via a branch
 *  (returnStack non-empty), pops back to the parent's saved position
 *  WITHOUT advancing it (undoing the jump, not the parent's own progress).
 *  No-op at the very start of the root workflow, or if the active profile
 *  has no turn steps at all. */
export function retreatTurnStep(campaign) {
  const groups = (campaign.turnSteps && campaign.turnSteps.groups) || [];
  if (!groups.length) return campaign;
  const next = clone(campaign);
  const progress = ensureProgress(next);
  const groupId = progress.groupId || groups[0].id;
  const group = findGroup(groups, groupId) || groups[0];
  progress.groupId = group.id;
  const index = Math.max(0, Math.min(group.steps.length - 1, progress.stepIndex || 0));
  if (index > 0) {
    progress.stepIndex = index - 1;
    return next;
  }
  const resume = progress.returnStack.pop();
  if (resume) {
    progress.groupId = resume.groupId;
    progress.stepIndex = resume.stepIndex;
    return next;
  }
  return next; // already at the very first step of the root — no-op
}

/** "Do you want to start the next Campaign Turn?" — the shell.js Next-step
 *  handler's confirm() prompt fires this once getCurrentTurnStep's hasNext
 *  is false (the true end of the workflow: no branchTo, no more steps in
 *  the current group, empty returnStack). Increments campaignTurn AND
 *  applies the rulebook's automatic per-turn point/morale bookkeeping
 *  (colony.js's own advanceCampaignTurnWithAccrual — see its own comment
 *  for exactly what does and doesn't accrue automatically), then resets
 *  turnStepProgress back to the first step of the first group —
 *  deliberately NOT advanceWorldTurn's "clear every feature's moved-from
 *  marker" housekeeping, which is a separate action tied to World
 *  Tracker's own "End Turn ▸" button, not this one. Returns {campaign,
 *  turn, changes}, same shape advanceCampaignTurnWithAccrual returns, so
 *  the caller can build one Journal entry covering both the turn change
 *  and everything the accrual touched. */
export function startNextCampaignTurn(campaign) {
  const groups = (campaign.turnSteps && campaign.turnSteps.groups) || [];
  const { campaign: next, turn, changes } = advanceCampaignTurnWithAccrual(campaign);
  if (groups.length) next.turnStepProgress = { groupId: groups[0].id, stepIndex: 0, returnStack: [] };
  return { campaign: next, turn, changes };
}
