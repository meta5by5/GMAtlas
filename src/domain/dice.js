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

/**
 * Roll a generic NdX+modifier expression — the free-form dice roller (direct
 * request, modeled on the Iron Fellowship/Crew-Link Ironsworn companion
 * app's "Custom Dice Roll" button): count dice of the given number of sides,
 * summed, plus an optional flat modifier. No target/outcome — unlike
 * rollAction/rollFlat/rollTraveller this isn't tied to any stat or move, so
 * there's nothing to succeed or fail against, just a total.
 */
export function rollCustomDice(count = 1, sides = 6, modifier = 0, { rng = Math.random } = {}) {
  const n = Math.max(1, Math.min(100, Math.round(Number(count)) || 1));
  const s = Math.max(2, Number.isFinite(Number(sides)) ? Math.round(Number(sides)) : 6);
  const m = Math.round(Number(modifier)) || 0;
  const dieValues = Array.from({ length: n }, () => rollDie(s, rng));
  const total = dieValues.reduce((sum, v) => sum + v, 0) + m;
  return { count: n, sides: s, modifier: m, dieValues, total };
}

/** "2d6+3" -> {count:2, sides:6, modifier:3}; "d20"/"1d20-1" also accepted.
 *  Returns null for anything that doesn't parse — the UI's custom-notation
 *  field uses this to gate its Roll button. */
export function parseDiceNotation(input) {
  const m = String(input || '').trim().match(/^(\d{1,3})?d(\d{1,4})\s*([+-]\s*\d{1,3})?$/i);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  const modifier = m[3] ? Number(m[3].replace(/\s+/g, '')) : 0;
  if (count < 1 || count > 100 || sides < 2) return null;
  return { count, sides, modifier };
}

/** Render a custom-dice roll result as one journal/toast-friendly line. */
export function formatCustomDiceRollText(notation, r) {
  const modifierPart = r.modifier > 0 ? ` + ${r.modifier}` : r.modifier < 0 ? ` - ${Math.abs(r.modifier)}` : '';
  return `🎲 ${notation}: [${r.dieValues.join(', ')}]${modifierPart} = ${r.total}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatRollCopyText but for a custom NdX+modifier roll (no target/outcome
 *  line, since a free-form roll doesn't succeed or fail against anything). */
export function formatCustomDiceRollCopyText(notation, r) {
  const modifierPart = r.modifier > 0 ? ` + ${r.modifier}` : r.modifier < 0 ? ` - ${Math.abs(r.modifier)}` : '';
  return `\tRoll: ${notation} → ${r.dieValues.join(', ')}${modifierPart}\n\tTotal: ${r.total}`;
}

/**
 * Roll a mixed pool of dice — the floating dice roller's default mode
 * (direct follow-up request): pick any mix of die types (e.g. two d20s and
 * a d6) and roll each one SEPARATELY, with its own result, rather than
 * summing them into one total the way rollCustomDice does. `pool` is an
 * array of {sides, modifier} in the order the dice were added, e.g.
 * [{sides:20,modifier:0}, {sides:20,modifier:3}, {sides:6,modifier:-1}] —
 * each die can carry its OWN optional flat modifier (direct follow-up
 * request), applied only to that one die's own result, never combined
 * across dice the way rollCustomDice's single modifier sums into one total.
 */
export function rollDicePool(pool, { rng = Math.random } = {}) {
  const list = Array.isArray(pool) ? pool.slice(0, 50) : [];
  const rolls = list.map(({ sides, modifier }) => {
    const s = Math.max(2, Number.isFinite(Number(sides)) ? Math.round(Number(sides)) : 6);
    const m = Math.round(Number(modifier)) || 0;
    const value = rollDie(s, rng);
    return { sides: s, modifier: m, value, total: value + m };
  });
  return { rolls };
}

/** Render a dice-pool roll result as one journal/toast-friendly line. */
export function formatDicePoolRollText(label, r) {
  const parts = r.rolls.map((x) => {
    const modPart = x.modifier > 0 ? `+${x.modifier}` : x.modifier < 0 ? `${x.modifier}` : '';
    return `d${x.sides}${modPart}=${x.total}`;
  }).join(', ');
  return `🎲 ${label}: ${parts}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatCustomDiceRollCopyText but one line per die — no total across the
 *  whole pool, since the whole point of a pool roll is that the results
 *  stay separate; a die's OWN modifier still applies to just that line. */
export function formatDicePoolRollCopyText(label, r) {
  const lines = r.rolls.map((x) => {
    const modPart = x.modifier > 0 ? ` + ${x.modifier}` : x.modifier < 0 ? ` - ${Math.abs(x.modifier)}` : '';
    return `\td${x.sides}${modPart} → ${x.value}${x.modifier ? ` = ${x.total}` : ''}`;
  }).join('\n');
  return `\tRoll: ${label}\n${lines}`;
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
