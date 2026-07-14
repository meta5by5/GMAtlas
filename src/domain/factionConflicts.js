// factionConflicts.js — Faction Conflict (Living Faction Engine,
// docs/design/faction-conflict-integration-plan.md): the one-click
// "quick-start" generator for a conflict's hero-path fields. Everything
// that mutates an actual conflict entity's fields lives in
// domain/entities.js (ensureConflictFields and its sibling mutators),
// matching where every other entity-field mutator already lives; this
// module is just the pure content generator, mirroring domain/
// missions.js's generateMission() shape — a plain object out, no draft/
// review step, since there's no dice outcome to resolve, only flavor
// text a GM edits or accepts as-is.

import { pick, tablesWithOverrides } from './oracles.js';

/** Rolls a conflict's hero-path starting content from the "Faction
 *  Conflict" oracle table group (data/tables.js) — a stated/root-cause
 *  gap, a third-party casualty idea, and one starter session hook.
 *  Pure/RNG-injectable like every other generator in this app. Returns
 *  plain strings ready to hand to entities.js's updateEntity/
 *  addConflictSessionHook — this function never touches the campaign
 *  itself. */
export function generateConflictSeed(campaign, { rng = Math.random } = {}) {
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  const group = (tables && tables['Faction Conflict']) || {};
  const rootCauseTable = group['Root Cause Category'] || [];
  const gapTable = group['Cause Gap Flavor'] || [];
  const casualtyTable = group['Third-Party Casualty'] || [];
  const hookTable = group['Starter Session Hook'] || [];
  const rootCause = rootCauseTable.length ? pick(rootCauseTable, rng) : '';
  const gap = gapTable.length ? pick(gapTable, rng) : '';
  return {
    statedCause: rootCause ? `On the surface, this is about ${rootCause}.` : '',
    rootCause: gap ? `But ${gap}.` : '',
    causeGapHook: 'If the party surfaces the gap between the two, both sides’ public stories stop holding up.',
    thirdPartyCasualty: casualtyTable.length ? pick(casualtyTable, rng) : '',
    sessionHook: hookTable.length ? pick(hookTable, rng) : '',
  };
}
