// dice.js — the action-roll mechanic behind "double-click to roll" on a
// numeric statblock field: an action die (d6) plus the field's value versus
// two challenge dice (d10 each), Starforged/Ironsworn-style. Pure and
// RNG-injectable so it's fully unit-testable (pass a seeded rng in tests,
// default to Math.random for real play) — the same posture as every other
// domain module in this codebase.
//
// Outcome: 2 challenge dice beaten = Strong Hit, 1 = Weak Hit, 0 = Miss.
// A "match" (both challenge dice equal) is flagged separately — traditionally
// an extra strong twist either way — and left for the GM to interpret.

function rollDie(sides, rng) {
  return Math.floor(rng() * sides) + 1;
}

/**
 * Roll an action: d6 + value (+ optional adds) vs 2d10.
 *   value — the statblock field's current numeric value (0..max).
 *   adds  — optional situational bonus, defaults to 0.
 *   rng   — () => number in [0,1); defaults to Math.random.
 */
export function rollAction(value = 0, { adds = 0, rng = Math.random } = {}) {
  const actionDie = rollDie(6, rng);
  const challenge1 = rollDie(10, rng);
  const challenge2 = rollDie(10, rng);
  const v = Number(value) || 0;
  const a = Number(adds) || 0;
  const total = actionDie + v + a;
  const hits = (total > challenge1 ? 1 : 0) + (total > challenge2 ? 1 : 0);
  const match = challenge1 === challenge2;
  const outcome = hits === 2 ? 'strong-hit' : hits === 1 ? 'weak-hit' : 'miss';
  const outcomeLabel = hits === 2 ? 'Strong Hit' : hits === 1 ? 'Weak Hit' : 'Miss';
  return { actionDie, value: v, adds: a, total, challenge1, challenge2, hits, match, outcome, outcomeLabel };
}

/** Render a roll result as one journal/toast-friendly line. */
export function formatRollText(label, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  const matchPart = r.match ? ' (match)' : '';
  return `🎲 ${label}: ${r.actionDie} + ${r.value}${addsPart} = ${r.total} vs ${r.challenge1}, ${r.challenge2}${matchPart} → ${r.outcomeLabel}`;
}

/** Multi-line plain text matching the dice roll window's own layout exactly
 *  (its copy-to-clipboard button uses this verbatim) — a tab-indented
 *  "Action: ..." line, a tab-indented "Challenge: ..." line, then the
 *  outcome on its own line in caps, e.g.:
 *    	Action: 3 + 2 = 5
 *    	Challenge: 5, 1
 *  WEAK HIT
 */
export function formatRollCopyText(r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  const matchPart = r.match ? ' (match)' : '';
  return `\tAction: ${r.actionDie} + ${r.value}${addsPart} = ${r.total}\n\tChallenge: ${r.challenge1}, ${r.challenge2}${matchPart}\n${r.outcomeLabel.toUpperCase()}`;
}

/**
 * Roll a flat d6-vs-target check: d6 + value vs a target number (5PFH-style
 * "d6+attribute" field type — meet or beat the target to succeed). Same
 * RNG-injectable posture as rollAction, just a different table's mechanic.
 */
export function rollFlat(value = 0, { target = 6, adds = 0, rng = Math.random } = {}) {
  const die = rollDie(6, rng);
  const v = Number(value) || 0;
  const a = Number(adds) || 0;
  const total = die + v + a;
  const success = total >= target;
  return { die, value: v, adds: a, total, target, success, outcome: success ? 'success' : 'fail', outcomeLabel: success ? 'Success' : 'Fail' };
}

/** Render a flat-roll result as one journal/toast-friendly line. */
export function formatFlatRollText(label, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `🎲 ${label}: ${r.die} + ${r.value}${addsPart} = ${r.total} vs target ${r.target} → ${r.outcomeLabel}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatRollCopyText but for a flat (d6-vs-target) check. */
export function formatFlatRollCopyText(r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `\tRoll: ${r.die} + ${r.value}${addsPart} = ${r.total}\n\tTarget: ${r.target}\n${r.outcomeLabel.toUpperCase()}`;
}

/**
 * Roll a Traveller-style 2d6 check: 2d6 + value vs a target number (classic
 * Traveller task resolution defaults to an 8+). Same RNG-injectable posture
 * as rollAction/rollFlat, just a different table's dice and default target.
 */
export function rollTraveller(value = 0, { target = 8, adds = 0, rng = Math.random } = {}) {
  const die1 = rollDie(6, rng);
  const die2 = rollDie(6, rng);
  const v = Number(value) || 0;
  const a = Number(adds) || 0;
  const total = die1 + die2 + v + a;
  const success = total >= target;
  return { die1, die2, value: v, adds: a, total, target, success, outcome: success ? 'success' : 'fail', outcomeLabel: success ? 'Success' : 'Fail' };
}

/** Render a Traveller-roll result as one journal/toast-friendly line. */
export function formatTravellerRollText(label, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `🎲 ${label}: ${r.die1}+${r.die2} + ${r.value}${addsPart} = ${r.total} vs target ${r.target} → ${r.outcomeLabel}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatRollCopyText but for a Traveller (2d6-vs-target) check. */
export function formatTravellerRollCopyText(r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `\tRoll: ${r.die1} + ${r.die2}${addsPart} = ${r.total}\n\tTarget: ${r.target}\n${r.outcomeLabel.toUpperCase()}`;
}
