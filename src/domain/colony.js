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

function ensure(campaign) {
  if (!campaign.colony || typeof campaign.colony !== 'object') campaign.colony = { fields: {}, crew: [] };
  if (!campaign.colony.fields || typeof campaign.colony.fields !== 'object') campaign.colony.fields = {};
  if (!Array.isArray(campaign.colony.crew)) campaign.colony.crew = [];
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

/** Live filter over entities tagged #lifeform — encounters worth tracking
 *  across a Planetfall campaign, not a separate stored list. */
export function listLifeformEncounters(campaign) {
  return listEntities(campaign).filter((e) => Array.isArray(e.tags) && e.tags.some((t) => /^lifeforms?$/i.test(String(t).trim())));
}
