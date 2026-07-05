// missions.js — Phase 10's Mission/Job generator (2026-07-03 ruleset
// review; user priority: "robust missions with balanced risk vs reward").
// Distinct from a Trade contract (domain/trade.js) — a mission isn't tied
// to a route/commodity/patron, it's a general job with payout math. Borrows
// Hostile Crew Expendable's cargo-job formula (destination distance x a
// 2D6 payout-modifier table, explicit damage/lateness penalties) and
// 5PFH's danger-tier-scaled Deployment Conditions, reduced to a single
// pure function since this app has no travel-distance mechanic of its own:
// `danger` is sourced from the existing context.what.threat Narrative
// Tracker by default, so higher ambient threat produces higher-stakes,
// higher-payout missions automatically — risk and reward move together
// instead of being hand-tuned per mission.

import { pick, tablesWithOverrides } from './oracles.js';

const BASE_PAYOUT = 100;

/** payout scales with danger (0-10): 1x at 0, up to 3x at 10. */
function payoutForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  return Math.round(BASE_PAYOUT * (1 + d * 0.2));
}

/** A more dangerous job is also a more urgent one — the deadline tightens
 *  as danger rises, the same "risk and reward move together" logic as
 *  payout above (7 days at danger 0, down to 2 at danger 10). */
function deadlineForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  return Math.max(1, 7 - Math.round(d * 0.5));
}

/** Explicit lateness/damage penalty, framed the same way Hostile Crew
 *  Expendable's cargo jobs already are — harsher at higher danger. */
function penaltyForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  if (d >= 6) return 'Late or damaged delivery voids the payout entirely.';
  if (d >= 3) return 'Late or damaged delivery halves the payout.';
  return 'Late delivery costs a modest penalty; damage is negotiable.';
}

/** Generate a mission: payout, a complication (rolled from the existing
 *  Miscellaneous > Story Complication oracle table — not a new table),
 *  a deadline in days, and an explicit penalty. `danger` defaults to the
 *  campaign's own context.what.threat so a mission generated mid-session
 *  reflects how dangerous things already are without the GM re-entering
 *  that number by hand. Pure/RNG-injectable like every other roll here. */
export function generateMission(campaign, { danger, rng = Math.random } = {}) {
  const d = danger != null ? danger : ((campaign.context && campaign.context.what && campaign.context.what.threat) || 0);
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  const complicationTable = (tables && tables.Miscellaneous && tables.Miscellaneous['Story Complication']) || [];
  const complication = complicationTable.length ? pick(complicationTable, rng) : '';
  return {
    danger: d,
    payout: payoutForDanger(d),
    deadlineDays: deadlineForDanger(d),
    complication,
    penalty: penaltyForDanger(d),
  };
}

/** Render a generated mission as one Journal-friendly block. */
export function formatMission(m) {
  const lines = [
    `New job available — danger ${m.danger}/10`,
    `Payout: ${m.payout}`,
    `Deadline: ${m.deadlineDays} day${m.deadlineDays === 1 ? '' : 's'}`,
  ];
  if (m.complication) lines.push(`Complication: ${m.complication}`);
  lines.push(m.penalty);
  return lines.join('\n');
}
