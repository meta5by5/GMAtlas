// statblockTemplates.js — campaign-level CRUD for Bestiary statblock
// templates (campaign.settings.statblockTemplates): the "future-state"
// per-system field manifest editable in Settings — game system, field kind
// (attribute / track-progress-bar / text), roll method (calculation
// method), and sort order (array position) — so a Bestiary can assign the
// right rule system to each creature. See data/statblockTemplates.js for
// the shipped defaults these override, and domain/statblocks.js for how a
// template becomes an entity's actual statblock fields.

import { getStatblockTemplates } from './statblocks.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

// First edit to a system copies the merged (default + prior overrides)
// field list into settings so later edits are additive, never lossy.
function ensureOverride(campaign, systemId) {
  if (!campaign.settings.statblockTemplates) campaign.settings.statblockTemplates = {};
  if (!campaign.settings.statblockTemplates[systemId]) {
    const merged = getStatblockTemplates(campaign.settings)[systemId];
    campaign.settings.statblockTemplates[systemId] = merged
      ? { label: merged.label, fields: merged.fields.map((f) => ({ ...f })) }
      : { label: systemId, fields: [] };
  }
  return campaign.settings.statblockTemplates[systemId];
}

/** All templates (system id -> {label, fields}), defaults merged with edits. */
export function listTemplates(settings) {
  const templates = getStatblockTemplates(settings);
  return Object.entries(templates).map(([id, t]) => ({ id, label: t.label, fields: t.fields }));
}

export function addTemplateSystem(campaign, id, label) {
  const next = clone(campaign);
  if (!next.settings.statblockTemplates) next.settings.statblockTemplates = {};
  const key = String(id || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!key || next.settings.statblockTemplates[key]) return next;
  next.settings.statblockTemplates[key] = { label: label || id, fields: [] };
  return next;
}

export function renameTemplateSystem(campaign, systemId, label) {
  const next = clone(campaign);
  const tpl = ensureOverride(next, systemId);
  tpl.label = label;
  return next;
}

export function addTemplateField(campaign, systemId, field = {}) {
  const next = clone(campaign);
  const tpl = ensureOverride(next, systemId);
  tpl.fields.push({ key: 'New Field', kind: 'text', rollMethod: 'none', max: 5, target: 6, format: 'sign', ...field });
  return next;
}

export function updateTemplateField(campaign, systemId, index, patch) {
  const next = clone(campaign);
  const tpl = ensureOverride(next, systemId);
  if (tpl.fields[index]) Object.assign(tpl.fields[index], patch);
  return next;
}

export function removeTemplateField(campaign, systemId, index) {
  const next = clone(campaign);
  const tpl = ensureOverride(next, systemId);
  tpl.fields.splice(index, 1);
  return next;
}

/** Move a field up (-1) or down (+1) in sort order — array position IS the
 *  sort order, so Settings' Move Up/Down just swaps neighbors. */
export function moveTemplateField(campaign, systemId, index, dir) {
  const next = clone(campaign);
  const tpl = ensureOverride(next, systemId);
  const target = index + dir;
  if (target < 0 || target >= tpl.fields.length) return next;
  const [field] = tpl.fields.splice(index, 1);
  tpl.fields.splice(target, 0, field);
  return next;
}
