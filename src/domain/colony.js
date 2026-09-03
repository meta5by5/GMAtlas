// colony.js — the Colony tab: a flat turn-sheet matching the 5PFH Planetfall
// campaign-turn tracker (ported field-for-field from the old prototype, see
// PROGRESS.md ISSUES/FINDINGS #2), a crew roster that references
// character/vehicle entities instead of duplicating their stats, and a live
// filter over #lifeform-tagged entities for tracked encounters.
//
// Deliberately just one ruleset's data module — "genre-aware, not
// genre-locked" means a different colony-sim ruleset gets its own module
// and its own drawer section later, not a hardcoded branch in this one.

import { listEntities } from './entities.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

const MAX_ENCOUNTERS = 10;

function ensure(campaign) {
  if (!campaign.colony || typeof campaign.colony !== 'object') campaign.colony = { fields: {}, crew: [], encounters: [] };
  if (!campaign.colony.fields || typeof campaign.colony.fields !== 'object') campaign.colony.fields = {};
  if (!Array.isArray(campaign.colony.crew)) campaign.colony.crew = [];
  if (!Array.isArray(campaign.colony.encounters)) campaign.colony.encounters = [];
  return campaign.colony;
}

// { key, label, type } — type is 'text' | 'number' | 'textarea', purely a
// rendering hint for the drawer.
export const COLONY_FIELDS = [
  { key: 'name', label: 'Colony Name', type: 'text' },
  { key: 'campaignTurn', label: 'Campaign Turn', type: 'number' },
  { key: 'campaignMilestones', label: 'Campaign Milestones', type: 'number' },
  { key: 'rosterSize', label: 'Roster Size', type: 'number' },
  { key: 'colonyMorale', label: 'Colony Morale', type: 'number' },
  { key: 'colonyIntegrity', label: 'Colony Integrity', type: 'number' },
  { key: 'buildPointsPerTurn', label: 'Build Points / Turn', type: 'number' },
  { key: 'buildPoints', label: 'Build Points', type: 'number' },
  { key: 'researchPointsPerTurn', label: 'Research Points / Turn', type: 'number' },
  { key: 'researchPoints', label: 'Research Points', type: 'number' },
  { key: 'storyPoints', label: 'Story Points', type: 'number' },
  { key: 'ancientSigns', label: 'Ancient Signs', type: 'number' },
  { key: 'repairCapacity', label: 'Repair Capacity', type: 'number' },
  { key: 'augmentationPoints', label: 'Augmentation Points', type: 'number' },
  { key: 'colonyDefenses', label: 'Colony Defenses', type: 'number' },
  { key: 'rawMaterials', label: 'Raw Materials', type: 'number' },
  { key: 'calamityPoints', label: 'Calamity Points', type: 'number' },
  { key: 'grunts', label: 'Grunts', type: 'number' },
  { key: 'enemyInformation', label: 'Enemy Information', type: 'textarea' },
  { key: 'missionData', label: 'Mission Data', type: 'textarea' },
  { key: 'conditionNotes', label: 'Condition Notes', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export function getColonyFields(campaign) {
  return (campaign.colony && campaign.colony.fields) || {};
}

export function setColonyField(campaign, key, value) {
  const next = clone(campaign);
  const colony = ensure(next);
  const def = COLONY_FIELDS.find((f) => f.key === key);
  colony.fields[key] = def && def.type === 'number' ? Number(value) || 0 : value;
  return next;
}

// Campaign Turn / Campaign Milestones (COLONY_FIELDS above) are the ONE
// real "what turn/milestone is it" state for a 5PFH Planetfall campaign —
// the World Tracker module (worldTracker.js) reads/writes these same
// fields via these helpers rather than keeping its own separate counter,
// so a GM never has two different turn numbers to keep in sync by hand.
// Milestones clamp 0-7 (the campaign's fixed win condition) only through
// these dedicated +/- actions — direct edits to the underlying field via
// setColonyField above stay a plain unclamped number, matching every other
// COLONY_FIELDS entry's generic-number-input convention.
export function advanceCampaignTurn(campaign) {
  const current = Number(getColonyFields(campaign).campaignTurn) || 0;
  return setColonyField(campaign, 'campaignTurn', current + 1);
}

/** The 5PFH Planetfall Campaign Turn sequence's automatic per-turn
 *  bookkeeping (assets/docs/5PFH Planetfall 1.2.pdf), applied when a new
 *  Campaign Turn starts (direct follow-up request — "add any points/turn
 *  calculations... as per the rulebook"):
 *    - Step 14 (Research) / Step 15 (Building): each stat's own "/Turn"
 *      rate is added onto its running total — Build Points += Build
 *      Points/Turn, Research Points += Research Points/Turn.
 *    - Step 11 (Colony Morale Adjustments): "your Colony Morale score
 *      automatically drops 1 point during this step, regardless of any
 *      actions taken" (p.67) — the rulebook's own wording for an
 *      UNCONDITIONAL drop, distinct from the further -1/battle-casualty
 *      it also describes, which this app has no casualty count to apply
 *      automatically (no such field exists anywhere in this schema).
 *  Story Points and every other COLONY_FIELDS stat (Roster Size, Colony
 *  Integrity, Colony Defenses, Raw Materials, Calamity Points, Grunts,
 *  Ancient Signs, Repair Capacity, Augmentation Points) are deliberately
 *  left untouched — the rulebook ties each of those to a specific
 *  mission/event/purchase (p.55-56), not a flat per-turn rate, so there is
 *  nothing to compute automatically without inventing a rule this app has
 *  no data source for.
 *  Returns { campaign, turn, changes } (not just campaign, matching the
 *  existing rollRandomInvestigationSite/{campaign,...} return shape this
 *  codebase already uses when a caller needs to know what happened, not
 *  just get the new document) — changes is [{key, label, from, to}] for
 *  whichever stats actually changed, for the caller to build one combined
 *  Journal entry from. */
export function advanceCampaignTurnWithAccrual(campaign) {
  const before = getColonyFields(campaign);
  let next = advanceCampaignTurn(campaign);
  const turn = Number(getColonyFields(next).campaignTurn) || 0;
  const changes = [];

  const buildRate = Number(before.buildPointsPerTurn) || 0;
  if (buildRate) {
    const from = Number(before.buildPoints) || 0;
    const to = from + buildRate;
    next = setColonyField(next, 'buildPoints', to);
    changes.push({ key: 'buildPoints', label: 'Build Points', from, to });
  }

  const researchRate = Number(before.researchPointsPerTurn) || 0;
  if (researchRate) {
    const from = Number(before.researchPoints) || 0;
    const to = from + researchRate;
    next = setColonyField(next, 'researchPoints', to);
    changes.push({ key: 'researchPoints', label: 'Research Points', from, to });
  }

  const moraleFrom = Number(before.colonyMorale) || 0;
  const moraleTo = moraleFrom - 1;
  next = setColonyField(next, 'colonyMorale', moraleTo);
  changes.push({ key: 'colonyMorale', label: 'Colony Morale', from: moraleFrom, to: moraleTo });

  // Crew Tasks eligibility (design/adr/rules-profiles-multi-campaign.md,
  // direct follow-up request) — "not yet performed a crew task this
  // campaign turn" resets here, alongside every other per-turn bookkeeping
  // this function already does, so both places that actually advance the
  // Campaign Turn (World Tracker's End Turn ▸, and Turn Step's own "start
  // the next Campaign Turn" confirm) clear it for free.
  next.crewTaskProgress = { doneMemberIds: [] };

  return { campaign: next, turn, changes };
}

/** Plain-text Journal note for advanceCampaignTurnWithAccrual's result —
 *  one combined entry covering the turn change and every stat it touched,
 *  per the direct follow-up request ("Make a note of all changes as a
 *  Journal entry"), plus a heads-up once Colony Morale reaches the
 *  rulebook's own -10 "you must test for Colony Morale" threshold (p.67). */
export function formatTurnAdvanceNote(turn, changes) {
  const lines = [`Campaign Turn changed to ${turn}.`];
  for (const c of changes) {
    const delta = c.to - c.from;
    lines.push(`${c.label}: ${c.from} → ${c.to} (${delta > 0 ? `+${delta}` : delta}).`);
  }
  const morale = changes.find((c) => c.key === 'colonyMorale');
  if (morale && morale.to <= -10) lines.push('Colony Morale is at -10 or worse — test for Colony Morale (5PFH Planetfall p.89).');
  return lines.join('\n');
}

export function incrementCampaignMilestones(campaign) {
  const current = Number(getColonyFields(campaign).campaignMilestones) || 0;
  return setColonyField(campaign, 'campaignMilestones', Math.min(7, current + 1));
}

export function decrementCampaignMilestones(campaign) {
  const current = Number(getColonyFields(campaign).campaignMilestones) || 0;
  return setColonyField(campaign, 'campaignMilestones', Math.max(0, current - 1));
}

// Crew Role list — the three character classes 5PFH Planetfall's colony
// roster actually uses (assets/docs/5PFH Planetfall 1.2.pdf, "Your Colony
// Crew"). There is no Pilot/Engineer/Medic/Gunner/Quartermaster/Diplomat
// role table in the book — that was a placeholder guess pending the real
// source, since replaced with the actual class list.
export const CREW_ROLES = [
  { id: 'scout', label: 'Scout' },
  { id: 'scientist', label: 'Scientist' },
  { id: 'trooper', label: 'Trooper' },
];

export function listCrewRows(campaign) {
  return ((campaign.colony && campaign.colony.crew) || []);
}

export function addCrewRow(campaign, { characterId = '', assetId = '', role = '' } = {}) {
  const next = clone(campaign);
  const colony = ensure(next);
  colony.crew.push({ id: 'crew_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), characterId, assetId, role });
  return next;
}

export function updateCrewRow(campaign, id, patch) {
  const next = clone(campaign);
  const colony = ensure(next);
  const row = colony.crew.find((r) => r.id === id);
  if (row) Object.assign(row, patch);
  return next;
}

export function removeCrewRow(campaign, id) {
  const next = clone(campaign);
  const colony = ensure(next);
  colony.crew = colony.crew.filter((r) => r.id !== id);
  return next;
}

/** Live filter over entities tagged #lifeform, OR (direct follow-up
 *  request — lifeform is now a peer entity type, entities.js's
 *  ENTITY_TYPES) typed 'lifeform' directly — encounters worth tracking
 *  across a Planetfall campaign, not a separate stored list. Both count so
 *  a campaign that used the old #lifeform-tagged-NPC convention keeps
 *  showing those entries unchanged. */
export function listLifeformEncounters(campaign) {
  return listEntities(campaign).filter((e) => e.type === 'lifeform' || (Array.isArray(e.tags) && e.tags.some((t) => /^lifeforms?$/i.test(String(t).trim()))));
}

/** The Colony's own Encounters log (direct follow-up request — "follow the
 *  rules and workflow for Encounters in the 5PFH Planetfall rules"): up to
 *  MAX_ENCOUNTERS rows, each a free-text note plus an optional reference to
 *  a specific Lifeform entity once one's been identified in play. Distinct
 *  from listLifeformEncounters() above (an unbounded, automatic filter over
 *  every Lifeform-typed/tagged Cast entity) — this is the GM's own
 *  per-campaign turn-sheet row list, capped to match the physical 10-row
 *  Encounters table. */
export function listColonyEncounters(campaign) {
  return ((campaign.colony && campaign.colony.encounters) || []);
}

export function addColonyEncounter(campaign) {
  const next = clone(campaign);
  const colony = ensure(next);
  if (colony.encounters.length >= MAX_ENCOUNTERS) return next;
  colony.encounters.push({ id: 'enc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), note: '', entityId: '' });
  return next;
}

export function updateColonyEncounter(campaign, id, patch) {
  const next = clone(campaign);
  const colony = ensure(next);
  const row = colony.encounters.find((r) => r.id === id);
  if (row) Object.assign(row, patch);
  return next;
}

export function removeColonyEncounter(campaign, id) {
  const next = clone(campaign);
  const colony = ensure(next);
  colony.encounters = colony.encounters.filter((r) => r.id !== id);
  return next;
}
