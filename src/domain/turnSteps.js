// turnSteps.js — Turn Step workflow PLAY POSITION (design/adr/rules-
// profiles-multi-campaign.md, direct follow-up request — converted from
// the Guide entry "5PFH Campaign Turn Sequence"). Every function here
// operates on a CAMPAIGN only, reading `campaign.turnStepLists` (the
// shared appConfig inventory, spliced in by store.js's overlay — never
// actually persisted on the campaign document) resolved through
// `campaign.turnStepSlotAssignments[slot]`, and mutating
// `campaign.turnStepProgress[slot]` (real, per-campaign play state, now
// keyed by SLOT — direct follow-up request: the Campaign panel's Colony
// and Starship tabs each walk through their OWN list independently). See
// domain/turnStepLists.js for the "definition" mutators (moveTurnStepInList,
// updateTurnStepText, loadDefaultIntoTurnStepList, ...), which operate on
// appConfig instead — Settings' Turn Step tab edits the shared inventory
// directly, not a campaign.
//
// Pure functions only. No DOM, no localStorage.

import { advanceCampaignTurnWithAccrual } from './colony.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function findGroup(groups, groupId) { return groups.find((g) => g.id === groupId) || null; }

/** Resolves which list backs a given slot ('colony'/'starship') and
 *  returns its groups — [] if unassigned or the assigned list no longer
 *  exists (deleted from the inventory), same "nothing configured" posture
 *  every caller below already handles. */
function resolveGroups(campaign, slot) {
  const listId = campaign.turnStepSlotAssignments && campaign.turnStepSlotAssignments[slot];
  if (!listId) return [];
  const list = ((campaign.turnStepLists) || []).find((l) => l.id === listId);
  return (list && list.groups) || [];
}

function ensureProgress(campaign, slot) {
  if (!campaign.turnStepProgress || typeof campaign.turnStepProgress !== 'object') campaign.turnStepProgress = {};
  if (!campaign.turnStepProgress[slot] || typeof campaign.turnStepProgress[slot] !== 'object') {
    campaign.turnStepProgress[slot] = { groupId: null, stepIndex: 0, returnStack: [] };
  }
  if (!Array.isArray(campaign.turnStepProgress[slot].returnStack)) campaign.turnStepProgress[slot].returnStack = [];
  return campaign.turnStepProgress[slot];
}

/** Read-only: resolves the campaign's current turnStepProgress[slot]
 *  against the list assigned to that slot into everything a Turn Step
 *  widget needs to render. Returns null when that slot has no list
 *  assigned (or the assigned list has no groups), or once progress has
 *  advanced past the very last step of the root workflow with nothing left
 *  on the return stack. */
export function getCurrentTurnStep(campaign, slot) {
  const groups = resolveGroups(campaign, slot);
  if (!groups.length) return null;
  const progress = (campaign.turnStepProgress && campaign.turnStepProgress[slot]) || { groupId: null, stepIndex: 0, returnStack: [] };
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
 *  last step, nothing to return to). No-op if this slot has no list
 *  assigned. */
export function advanceTurnStep(campaign, slot) {
  const groups = resolveGroups(campaign, slot);
  if (!groups.length) return campaign;
  const next = clone(campaign);
  const progress = ensureProgress(next, slot);
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
 *  No-op at the very start of the root workflow, or if this slot has no
 *  list assigned. */
export function retreatTurnStep(campaign, slot) {
  const groups = resolveGroups(campaign, slot);
  if (!groups.length) return campaign;
  const next = clone(campaign);
  const progress = ensureProgress(next, slot);
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

/** "Do you want to start the next Campaign Turn?" — the Colony tab's own
 *  Next-step handler's confirm() prompt fires this once getCurrentTurnStep
 *  (slot 'colony')'s hasNext is false. Increments colony.fields.campaignTurn
 *  AND applies the Planetfall rulebook's automatic per-turn point/morale
 *  bookkeeping (colony.js's own advanceCampaignTurnWithAccrual — see its
 *  own comment for exactly what does and doesn't accrue automatically),
 *  then resets turnStepProgress.colony back to the first step of the
 *  Colony-assigned list's first group. Returns {campaign, turn, changes},
 *  same shape advanceCampaignTurnWithAccrual returns, so the caller can
 *  build one Journal entry covering both the turn change and everything
 *  the accrual touched. See startNextStarshipCampaignTurn below for the
 *  Starship tab's own, deliberately un-accrued equivalent (direct
 *  follow-up request — Planetfall's Build/Research Points/Colony Morale
 *  math has no bearing on the base 5PFH game the Starship tab plays). */
export function startNextColonyCampaignTurn(campaign) {
  const groups = resolveGroups(campaign, 'colony');
  const { campaign: next, turn, changes } = advanceCampaignTurnWithAccrual(campaign);
  if (groups.length) {
    next.turnStepProgress = next.turnStepProgress || {};
    next.turnStepProgress.colony = { groupId: groups[0].id, stepIndex: 0, returnStack: [] };
  }
  return { campaign: next, turn, changes };
}

/** The Starship tab's own "start the next Campaign Turn" — a separate,
 *  non-accruing counter (party.starshipCampaignTurn) independent of
 *  Colony's own Campaign Turn (direct follow-up request). Resets
 *  turnStepProgress.starship back to the first step of the Starship-
 *  assigned list's first group. Returns { campaign, turn } (no `changes` —
 *  there's no rulebook accrual to report). */
export function startNextStarshipCampaignTurn(campaign) {
  const next = clone(campaign);
  const party = next.party && typeof next.party === 'object' ? next.party : (next.party = {});
  const turn = (Number(party.starshipCampaignTurn) || 0) + 1;
  party.starshipCampaignTurn = turn;
  const groups = resolveGroups(next, 'starship');
  if (groups.length) {
    next.turnStepProgress = next.turnStepProgress || {};
    next.turnStepProgress.starship = { groupId: groups[0].id, stepIndex: 0, returnStack: [] };
  }
  return { campaign: next, turn };
}
