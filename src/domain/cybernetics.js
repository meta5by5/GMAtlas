// cybernetics.js — augmentation system inspired by Cities Without Number's
// best-known subsystem (widely discussed by its own community and
// reviewers as CWN's standout addition to the SWN engine): installing
// cyberware costs "Strain" against a limited capacity, and pushing past
// that capacity has consequences. This is an original re-implementation of
// that CONCEPT (a body has a limited tolerance for augmentation, tracked as
// a simple number) — CWN's own strain formula (tied to a Constitution-style
// stat) and its actual cyberware catalog are not reproduced; the concept is
// public-facing game design, not the book's specific text or numbers.
//
// Deliberately not folded into the statblock track-field system
// (statblocks.js): a statblock track is a single value/max pair, but
// cyberware here is a growing, removable LIST of named items each with
// their own strain cost — closer in shape to a faction's `assets` list
// (entities.js) than to a Health/Hull track. `cyberware` and
// `strainCapacity` live directly on the entity record, same as `assets`
// does for factions.

import { getEntity } from './entities.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export const DEFAULT_STRAIN_CAPACITY = 8;

/** An entity's installed cyberware list, always an array (never undefined). */
export function getCyberware(entity) {
  return (entity && Array.isArray(entity.cyberware)) ? entity.cyberware : [];
}

/** Total Strain currently spent across all installed cyberware. */
export function strainUsed(entity) {
  return getCyberware(entity).reduce((sum, c) => sum + (Number(c.strain) || 0), 0);
}

/** This entity's Strain capacity — a per-entity override if set, else the
 *  default. Not derived from any other stat (no Constitution-equivalent
 *  exists in this app's genre-agnostic field model); a GM can raise or
 *  lower it directly for a especially hardy or fragile character. */
export function strainCapacity(entity) {
  return (entity && Number.isFinite(entity.strainCapacity)) ? entity.strainCapacity : DEFAULT_STRAIN_CAPACITY;
}

/** True once installed Strain exceeds capacity — a GM-visible flag, not an
 *  auto-applied penalty (Article II: the GM always retains creative
 *  authority over what an overstrained character actually suffers). */
export function isOverStrained(entity) {
  return strainUsed(entity) > strainCapacity(entity);
}

/** Install a piece of cyberware: {name, strain, notes}. `strain` coerces to
 *  a non-negative integer (default 1 if omitted/invalid). No-op on a
 *  missing entity or an empty name. */
export function installCyberware(campaign, entityId, { name, strain, notes = '' } = {}) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  const clean = String(name || '').trim();
  if (!e || !clean) return next;
  if (!Array.isArray(e.cyberware)) e.cyberware = [];
  const s = Math.max(0, Math.round(Number(strain)) || 0) || 1;
  e.cyberware.push({ id: 'cw_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: clean, strain: s, notes: String(notes || '').trim() });
  return next;
}

/** Remove one piece of cyberware by id. No-op if the entity or the item
 *  doesn't exist. */
export function removeCyberware(campaign, entityId, cyberwareId) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e || !Array.isArray(e.cyberware)) return next;
  e.cyberware = e.cyberware.filter((c) => c.id !== cyberwareId);
  return next;
}

/** Set a per-entity Strain capacity override, clamped to a sane 1-30 range.
 *  No-op on a missing entity. */
export function setStrainCapacity(campaign, entityId, value) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const v = Math.round(Number(value));
  e.strainCapacity = Number.isFinite(v) ? Math.max(1, Math.min(30, v)) : DEFAULT_STRAIN_CAPACITY;
  return next;
}
