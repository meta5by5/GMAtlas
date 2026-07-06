// worldbuilding.js — "styling creatures, places, and adventure seeds"
// (2026-07-06, docs/adr/0011-swn-cwn-content.md): three small combinatorial
// generators in the same shape as missions.js's generateMission — several
// oracle tables rolled together into one Journal-friendly block, not a new
// engine. The building-block approach (roll a creature's origin, then its
// method of getting around, then what makes it dangerous, and combine them
// into a concept) is the well-documented pattern Stars Without Number's own
// alien-creation chapter is known for; the tables below are original
// phrasing written for this app, not a transcription of SWN's actual
// creature-part tables. Adventure Seed reuses the existing Miscellaneous >
// Story Complication table for its third beat instead of duplicating it —
// same "don't build a second table where one already exists" rule
// missions.js already follows.

import { pick, tablesWithOverrides } from './oracles.js';

function rollFrom(tables, group, key, rng) {
  const list = tables && tables[group] && tables[group][key];
  return Array.isArray(list) && list.length ? pick(list, rng) : '';
}

/** A creature concept: origin, method of movement, an unusual trait, and
 *  what makes it genuinely dangerous — enough to seed a unique Bestiary
 *  entry rather than reusing a generic "hostile alien" template. */
export function generateCreatureConcept(campaign, { rng = Math.random } = {}) {
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  return {
    origin: rollFrom(tables, 'Xenobestiary', 'Creature Origin', rng),
    method: rollFrom(tables, 'Xenobestiary', 'Creature Method', rng),
    trait: rollFrom(tables, 'Xenobestiary', 'Creature Trait', rng),
    threat: rollFrom(tables, 'Xenobestiary', 'Creature Threat', rng),
  };
}

export function formatCreatureConcept(c) {
  const lines = ['Creature concept:'];
  if (c.origin) lines.push(`Origin: ${c.origin}.`);
  if (c.method) lines.push(`Gets around by: ${c.method}.`);
  if (c.trait) lines.push(`Distinguishing trait: ${c.trait}.`);
  if (c.threat) lines.push(`What makes it dangerous: ${c.threat}.`);
  return lines.join('\n');
}

/** A place concept: a notable feature, a danger, and a wonder — deliberately
 *  discovery-first like the existing Site Survey tables (not all-danger),
 *  for styling a Location beyond its name and a one-line description. */
export function generateSiteConcept(campaign, { rng = Math.random } = {}) {
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  return {
    feature: rollFrom(tables, 'Site Concept', 'Site Feature', rng),
    danger: rollFrom(tables, 'Site Concept', 'Site Danger', rng),
    wonder: rollFrom(tables, 'Site Concept', 'Site Wonder', rng),
  };
}

export function formatSiteConcept(s) {
  const lines = ['Site concept:'];
  if (s.feature) lines.push(`Notable feature: ${s.feature}.`);
  if (s.wonder) lines.push(`Worth seeing: ${s.wonder}.`);
  if (s.danger) lines.push(`Danger: ${s.danger}.`);
  return lines.join('\n');
}

/** An adventure seed: a hook, a twist, and a complication — "creating
 *  problems" on demand rather than starting a session from a blank page.
 *  The complication leg reuses the existing Story Complication table
 *  (Miscellaneous group) instead of a fourth new one. */
export function generateAdventureSeed(campaign, { rng = Math.random } = {}) {
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  return {
    hook: rollFrom(tables, 'Adventure Seed', 'Hook', rng),
    twist: rollFrom(tables, 'Adventure Seed', 'Twist', rng),
    complication: rollFrom(tables, 'Miscellaneous', 'Story Complication', rng),
  };
}

export function formatAdventureSeed(s) {
  const lines = ['Adventure seed:'];
  if (s.hook) lines.push(`Hook: ${s.hook}.`);
  if (s.twist) lines.push(`Twist: ${s.twist}.`);
  if (s.complication) lines.push(`Complication: ${s.complication}.`);
  return lines.join('\n');
}
