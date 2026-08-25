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

export function incrementCampaignMilestones(campaign) {
  const current = Number(getColonyFields(campaign).campaignMilestones) || 0;
  return setColonyField(campaign, 'campaignMilestones', Math.min(7, current + 1));
}

export function decrementCampaignMilestones(campaign) {
  const current = Number(getColonyFields(campaign).campaignMilestones) || 0;
  return setColonyField(campaign, 'campaignMilestones', Math.max(0, current - 1));
}

// Provisional Crew Role list (direct follow-up request — "the 2nd dropdown
// is the role a Crew can play in 5PFH Planetfall... rules added later for
// managing combat and exploration"). The real Planetfall role table isn't
// transcribed into this repo yet — these are common colony-crew archetypes
// standing in until it is, kept as data (not hardcoded in the UI) so
// swapping in the real table later is a one-place edit.
export const CREW_ROLES = [
  { id: 'pilot', label: 'Pilot' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'medic', label: 'Medic' },
  { id: 'scout', label: 'Scout' },
  { id: 'gunner', label: 'Gunner' },
  { id: 'quartermaster', label: 'Quartermaster' },
  { id: 'scientist', label: 'Scientist' },
  { id: 'diplomat', label: 'Diplomat' },
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
