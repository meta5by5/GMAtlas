// enhancements.js — augmentation system inspired by Cities Without Number's
// best-known subsystem (widely discussed by its own community and
// reviewers as CWN's standout addition to the SWN engine): installing an
// enhancement costs "Strain" against a limited capacity, and pushing past
// that capacity has consequences. This is an original re-implementation of
// that CONCEPT (a body has a limited tolerance for augmentation, tracked as
// a simple number) — CWN's own strain formula (tied to a Constitution-style
// stat) and its actual cyberware catalog are not reproduced; the concept is
// public-facing game design, not the book's specific text or numbers.
//
// Renamed from "Cybernetics" (docs/adr/next-request.md, 2026-07-06): the
// mechanic isn't just cybernetics — a Hostile-flavored campaign may prefer
// Wetware/bio-genetic augmentation, and other genres may want psionics or
// gene-modification instead. Each installed item now carries a `type`
// (data/enhancementTypes.js) rather than the whole section being
// cybernetics-only; the underlying Strain-vs-capacity mechanic is unchanged
// and deliberately keeps that name (it's a generic resource dial, not a
// CWN-specific term).
//
// Deliberately not folded into the statblock track-field system
// (statblocks.js): a statblock track is a single value/max pair, but
// enhancements here are a growing, removable LIST of named items each with
// their own strain cost — closer in shape to a faction's `assets` list
// (entities.js) than to a Health/Hull track. `enhancements` and
// `strainCapacity` live directly on the entity record, same as `assets`
// does for factions.

import { getEntity } from './entities.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

export const DEFAULT_STRAIN_CAPACITY = 8;
export const DEFAULT_ENHANCEMENT_TYPE = 'cybernetics';

/** An entity's installed enhancements list, always an array (never
 *  undefined). Tolerant of a pre-rename entity that still only has the old
 *  `cyberware` field (an old campaign export) — reads it as a fallback and
 *  normalizes any item missing a `type` to the old default, the same
 *  "undefined reads as the old behavior" idiom this codebase already uses
 *  for statblock fields' `rollMethod`. Nothing is migrated/written back by
 *  this read — the next install/remove naturally moves the entity onto
 *  `enhancements` going forward. */
export function getEnhancements(entity) {
  if (!entity) return [];
  if (Array.isArray(entity.enhancements)) return entity.enhancements;
  if (Array.isArray(entity.cyberware)) return entity.cyberware.map((c) => ({ type: DEFAULT_ENHANCEMENT_TYPE, ...c }));
  return [];
}

/** Total Strain currently spent across all installed enhancements. */
export function strainUsed(entity) {
  return getEnhancements(entity).reduce((sum, c) => sum + (Number(c.strain) || 0), 0);
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

/** Install an enhancement: {name, type, strain, notes}. `strain` coerces to
 *  a non-negative integer (default 1 if omitted/invalid); `type` defaults
 *  to 'cybernetics' if omitted/unrecognized. No-op on a missing entity or
 *  an empty name. Always writes to `enhancements`, never `cyberware`. */
export function installEnhancement(campaign, entityId, { name, type, strain, notes = '' } = {}) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  const clean = String(name || '').trim();
  if (!e || !clean) return next;
  const existing = getEnhancements(e);
  const s = Math.max(0, Math.round(Number(strain)) || 0) || 1;
  e.enhancements = [...existing, {
    id: 'en_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: clean,
    type: String(type || '').trim() || DEFAULT_ENHANCEMENT_TYPE,
    strain: s,
    notes: String(notes || '').trim(),
  }];
  return next;
}

/** Remove one enhancement by id. No-op if the entity or the item doesn't
 *  exist. */
export function removeEnhancement(campaign, entityId, enhancementId) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  e.enhancements = getEnhancements(e).filter((c) => c.id !== enhancementId);
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
