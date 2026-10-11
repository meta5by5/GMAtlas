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
//
// Every roll function below also accepts an optional `dice` override object
// (one field per die, e.g. {actionDie, challenge1, challenge2}) so a real
// pre-rolled value can stand in for an internal rollDie(n, rng) call —
// src/ui/diceBox3d.js's 3D animation reads back dice-box's own actual
// physics result and feeds it in here, since dice-box has no way to be told
// what to land on beforehand, only read back afterward. Omitting `dice`
// (every pre-existing call site) rolls with `rng` exactly as before.

function rollDie(sides, rng) {
  return Math.floor(rng() * sides) + 1;
}

/**
 * Roll an action: d6 + value (+ optional adds) vs 2d10.
 *   value — the statblock field's current numeric value (0..max).
 *   adds  — optional situational bonus, defaults to 0.
 *   rng   — () => number in [0,1); defaults to Math.random.
 *   dice  — optional {actionDie, challenge1, challenge2} override, one or
 *           all three — the 3D dice module's own real physics roll is
 *           authoritative when present (dice-box has no way to be TOLD what
 *           to land on, only read back afterward — see diceBox3d.js), so
 *           this lets its actual result stand in for `rollDie(n, rng)` per
 *           die instead of a second, independent Math.random roll. Omitted
 *           (every pre-existing call site) behaves exactly as before.
 */
export function rollAction(value = 0, { adds = 0, rng = Math.random, dice = {} } = {}) {
  const actionDie = dice.actionDie ?? rollDie(6, rng);
  const challenge1 = dice.challenge1 ?? rollDie(10, rng);
  const challenge2 = dice.challenge2 ?? rollDie(10, rng);
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
export function rollFlat(value = 0, { target = 6, adds = 0, rng = Math.random, dice = {} } = {}) {
  const die = dice.die ?? rollDie(6, rng);
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
export function rollTraveller(value = 0, { target = 8, adds = 0, rng = Math.random, dice = {} } = {}) {
  const die1 = dice.die1 ?? rollDie(6, rng);
  const die2 = dice.die2 ?? rollDie(6, rng);
  const v = Number(value) || 0;
  const a = Number(adds) || 0;
  const total = die1 + die2 + v + a;
  const success = total >= target;
  return { die1, die2, value: v, adds: a, total, target, success, outcome: success ? 'success' : 'fail', outcomeLabel: success ? 'Success' : 'Fail' };
}

/**
 * Roll a plain d20 check: 1d20 + the field's stored value (already a final
 * signed bonus, e.g. a D&D 5e saving throw or skill modifier read straight
 * off a character sheet) — no target/outcome, since a 5e check succeeds or
 * fails against a DC/AC decided in the moment by the GM, not something
 * fixed on the sheet itself. Same RNG-injectable/`dice`-override posture as
 * every other roll here.
 */
export function rollD20(value = 0, { adds = 0, rng = Math.random, dice = {} } = {}) {
  const die = dice.die ?? rollDie(20, rng);
  const v = Number(value) || 0;
  const a = Number(adds) || 0;
  const total = die + v + a;
  return { die, value: v, adds: a, total };
}

/** Render a d20-check result as one journal/toast-friendly line. */
export function formatD20RollText(label, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `🎲 ${label}: ${r.die} + ${r.value}${addsPart} = ${r.total}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatRollCopyText but for a plain d20 check (no target/outcome line). */
export function formatD20RollCopyText(r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `\tRoll: ${r.die} + ${r.value}${addsPart} = ${r.total}`;
}

/**
 * Roll a d20 check derived from a raw 1-30 ability SCORE rather than an
 * already-final bonus (D&D 5e's own Ability Scores section stores the raw
 * score, e.g. "14", the way a GM reads it straight off a character sheet —
 * the modifier is derived, not stored): modifier = floor((score - 10) / 2).
 */
export function rollD20Score(score = 10, { adds = 0, rng = Math.random, dice = {} } = {}) {
  const die = dice.die ?? rollDie(20, rng);
  const s = Number(score) || 10;
  const modifier = Math.floor((s - 10) / 2);
  const a = Number(adds) || 0;
  const total = die + modifier + a;
  return { die, score: s, modifier, adds: a, total };
}

/** Render a score-derived d20-check result as one journal/toast-friendly line. */
export function formatD20ScoreRollText(label, r) {
  const modPart = r.modifier >= 0 ? `+${r.modifier}` : `${r.modifier}`;
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `🎲 ${label}: ${r.die} ${modPart} (score ${r.score})${addsPart} = ${r.total}`;
}

/** Multi-line copy text for the dice roll window, same shape as
 *  formatD20RollCopyText but for a score-derived d20 check. */
export function formatD20ScoreRollCopyText(r) {
  const modPart = r.modifier >= 0 ? `+${r.modifier}` : `${r.modifier}`;
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  return `\tRoll: ${r.die} ${modPart} (score ${r.score})${addsPart} = ${r.total}`;
}

/**
 * Roll a generic NdX+modifier expression — the free-form dice roller (direct
 * request, modeled on the Iron Fellowship/Crew-Link Ironsworn companion
 * app's "Custom Dice Roll" button): count dice of the given number of sides,
 * summed, plus an optional flat modifier. No target/outcome — unlike
 * rollAction/rollFlat/rollTraveller this isn't tied to any stat or move, so
 * there's nothing to succeed or fail against, just a total.
 */
export function rollCustomDice(count = 1, sides = 6, modifier = 0, { rng = Math.random, dice = {} } = {}) {
  const n = Math.max(1, Math.min(100, Math.round(Number(count)) || 1));
  const s = Math.max(2, Number.isFinite(Number(sides)) ? Math.round(Number(sides)) : 6);
  const m = Math.round(Number(modifier)) || 0;
  const dieValues = Array.isArray(dice.dieValues) && dice.dieValues.length === n
    ? dice.dieValues.slice()
    : Array.from({ length: n }, () => rollDie(s, rng));
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
export function rollDicePool(pool, { rng = Math.random, dice = {} } = {}) {
  const list = Array.isArray(pool) ? pool.slice(0, 50) : [];
  const overrides = Array.isArray(dice.values) ? dice.values : [];
  const rolls = list.map(({ sides, modifier }, i) => {
    const s = Math.max(2, Number.isFinite(Number(sides)) ? Math.round(Number(sides)) : 6);
    const m = Math.round(Number(modifier)) || 0;
    const value = overrides[i] ?? rollDie(s, rng);
    return { sides: s, modifier: m, value, total: value + m };
  });
  return { rolls };
}

/**
 * Roll a flat d100 (1-100) — no value/target/outcome, just the raw roll.
 * Used by Colony's Lifeform Encounters header roll (5PFH Planetfall
 * p.146, resolveLifeformEncounterSlot maps the result to a table row) —
 * previously a bespoke inline `Math.floor(Math.random()*100)+1` bypassing
 * this module entirely; routed through here instead so it shares the same
 * `dice` override posture as every other roll (the 3D dice module's own
 * real result standing in for rollDie(100, rng)).
 */
export function rollD100({ rng = Math.random, dice = {} } = {}) {
  return { value: dice.value ?? rollDie(100, rng) };
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

/**
 * Five Leagues from the Borderlands' Melee Combat "Resolve Exchange" step
 * (assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf p.41, read
 * directly) — direct follow-up request: "Upgrade the combat mechanics to
 * use the 5LFB combat rules and require the selection of an opponent in
 * the combat tracker when performing the combat challenge dice roles which
 * would use the stats of the opponent." Both combatants roll D6 + their own
 * Combat Skill (+ any situational `adds`, e.g. a +1 Combat Bonus from an
 * ally within 1" or a Stunned opponent, p.44 — the GM applies these as a
 * plain modifier rather than this function trying to detect adjacency/
 * Stun state, which this app has no tabletop-position model for); higher
 * total wins the exchange and strikes the Hit (rollFiveLeaguesHit below
 * resolves what that Hit actually does), a draw ends the melee with the
 * defender retreating and nobody struck.
 */
export function rollFiveLeaguesExchange(attackerSkill = 0, defenderSkill = 0, { attackerAdds = 0, defenderAdds = 0, attackerAdvantage = false, rng = Math.random, dice = {} } = {}) {
  // Direct follow-up request: "Factor in armor and all other combat
  // conditions... prompt with questions for optional attributes or
  // abilities or buffs" — Fight Defensively (p.40: "The character rolls
  // twice and picks the best roll") is the one Tactic that changes the
  // die mechanic itself rather than just adding a flat bonus; Fight
  // Evasively/Furiously/Simply Fight all "roll normally." attackerAdvantage
  // only ever applies to the Attacker (Fight Defensively's own real
  // restriction is just "the character," but this app's Combat Tracker
  // only ever collects the Attacker's tactic — see shell.js's own scope
  // note on why). attackerDieRolls is null unless advantage was actually
  // used, so existing callers/tests that never pass it see no change.
  let attackerDie; let attackerDieRolls = null;
  if (dice.attackerDie != null) {
    attackerDie = dice.attackerDie;
  } else if (attackerAdvantage) {
    const roll1 = rollDie(6, rng);
    const roll2 = rollDie(6, rng);
    attackerDieRolls = [roll1, roll2];
    attackerDie = Math.max(roll1, roll2);
  } else {
    attackerDie = rollDie(6, rng);
  }
  const defenderDie = dice.defenderDie ?? rollDie(6, rng);
  const aSkill = Number(attackerSkill) || 0;
  const dSkill = Number(defenderSkill) || 0;
  const aAdds = Number(attackerAdds) || 0;
  const dAdds = Number(defenderAdds) || 0;
  const attackerTotal = attackerDie + aSkill + aAdds;
  const defenderTotal = defenderDie + dSkill + dAdds;
  const winner = attackerTotal > defenderTotal ? 'attacker' : attackerTotal < defenderTotal ? 'defender' : 'draw';
  return {
    attackerDie, attackerDieRolls, attackerSkill: aSkill, attackerAdds: aAdds, attackerTotal,
    defenderDie, defenderSkill: dSkill, defenderAdds: dAdds, defenderTotal,
    winner,
  };
}

// Direct follow-up request: "Factor in armor and all other combat
// conditions listed in the basic... ruleset... Prompt with questions for
// optional attributes or abilities or buffs that have limited uses for
// consideration to be applied." Resolves whether a Hit is even possible
// this exchange, and whether it's negated by Parry — a pure decision
// table off the real rules (pp.41-43), re-read closely while building
// this: by DEFAULT only an ATTACKER's win strikes a Hit ("If the Defender
// has the higher score, they avoid harm" — no Hit at all, just a role
// swap for the next exchange of a real multi-exchange melee this app
// doesn't simulate). Counter Attack is the one thing that lets a
// DEFENDER's win also strike a Hit; Fight Furiously forces a Hit against
// the Attacker on a loss UNCONDITIONALLY (even without Counter Attack);
// Fight Defensively/Evasively instead suppress a Hit on an Attacker win
// ("If they win, they inflict no Hits"). Parry (p.42) only ever protects
// whoever holds the DEFENDER role, and only when THEIR OWN exchange die
// (not the total) came up a natural 1 — it can never apply to a Hit
// landing on the Attacker (Counter Attack/Furious-loss), since the
// Attacker is never "defending" in this app's single-exchange model.
export function resolveFiveLeaguesHitEligibility({ winner, tactic = 'fight', defenderHasCounterAttack = false, defenderHasParry = false, defenderDieIsNaturalOne = false } = {}) {
  if (winner === 'draw') return { hitPossible: false, parried: false };
  if (winner === 'attacker') {
    if (tactic === 'defensively' || tactic === 'evasively') return { hitPossible: false, parried: false };
    if (defenderHasParry && defenderDieIsNaturalOne) return { hitPossible: false, parried: true };
    return { hitPossible: true, parried: false };
  }
  // winner === 'defender'
  if (tactic === 'furiously') return { hitPossible: true, parried: false };
  if (defenderHasCounterAttack) return { hitPossible: true, parried: false };
  return { hitPossible: false, parried: false };
}

// Direct follow-up request: "during a ranged combat attack, prompt the
// user for range details per rules on p.39 regarding distance and
// cover... Do the challenge method for melee attacks." Ranged Attacks
// (p.39, read directly) are a completely different, SIMPLER mechanic
// than the Melee Exchange above — a single D6 roll (never opposed), with
// the target number set entirely by distance/cover, not an Overcome-style
// bonus: "Within 6\" and in the open: 3+", "Within weapon range and in
// the open: 5+", "Within weapon range and concealed or behind Cover: 6+"
// — these 3 bands are the complete real table (there is no 4th "within
// 6\" and in Cover" row; the book's own table only ever lists these
// three). "If the shooter is stationary, add their Combat Skill to the
// roll" — this app has no movement/positioning model to know whether the
// Attacker actually moved this round, so `stationary` always defaults
// true (the common case); "A roll of natural 1 is always a miss"
// regardless of any bonus.
export const FIVE_LEAGUES_RANGED_BANDS = [
  { key: 'close', label: 'Within 6", in the open', targetNumber: 3 },
  { key: 'range-open', label: 'Within weapon range, in the open', targetNumber: 5 },
  { key: 'range-cover', label: 'Within weapon range, concealed or behind Cover', targetNumber: 6 },
];
export function findFiveLeaguesRangedBand(key) {
  return FIVE_LEAGUES_RANGED_BANDS.find((b) => b.key === key) || null;
}

export function rollFiveLeaguesRangedAttack(combatSkill = 0, targetNumber = 3, { stationary = true, adds = 0, rng = Math.random, dice = {} } = {}) {
  const die = dice.die ?? rollDie(6, rng);
  const skill = stationary ? (Number(combatSkill) || 0) : 0;
  const bonusAdds = Number(adds) || 0;
  const total = die + skill + bonusAdds;
  const naturalOne = die === 1;
  const hit = !naturalOne && total >= targetNumber;
  return { die, skill, adds: bonusAdds, total, targetNumber, naturalOne, hit };
}

/** Render a Ranged Attack result as one journal/toast-friendly line. */
export function formatFiveLeaguesRangedAttackText(attackerLabel, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  const outcome = r.naturalOne ? 'Miss (natural 1)' : r.hit ? 'Hit!' : 'Miss';
  return `🏹 ${attackerLabel}: ${r.die} + ${r.skill}${addsPart} = ${r.total} vs ${r.targetNumber}+ → ${outcome}`;
}

/** Multi-line copy text for the dice roll window, same shape as every
 *  other format*RollCopyText above. */
export function formatFiveLeaguesRangedAttackCopyText(attackerLabel, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  const outcome = r.naturalOne ? 'MISS (NATURAL 1)' : r.hit ? 'HIT' : 'MISS';
  return `\t${attackerLabel}: ${r.die} + ${r.skill}${addsPart} = ${r.total} (needed ${r.targetNumber}+)\n${outcome}`;
}

/** Render a Melee Exchange result as one journal/toast-friendly line. */
export function formatFiveLeaguesExchangeText(attackerLabel, defenderLabel, r) {
  const aAdds = r.attackerAdds ? ` + ${r.attackerAdds}` : '';
  const dAdds = r.defenderAdds ? ` + ${r.defenderAdds}` : '';
  const winText = r.winner === 'draw' ? 'Draw — defender retreats, melee ends' : `${r.winner === 'attacker' ? attackerLabel : defenderLabel} wins the exchange`;
  return `⚔ ${attackerLabel} ${r.attackerDie}+${r.attackerSkill}${aAdds}=${r.attackerTotal} vs ${defenderLabel} ${r.defenderDie}+${r.defenderSkill}${dAdds}=${r.defenderTotal} → ${winText}`;
}

/** Multi-line copy text for the dice roll window, same shape as every other
 *  format*RollCopyText above. */
export function formatFiveLeaguesExchangeCopyText(attackerLabel, defenderLabel, r) {
  const aAdds = r.attackerAdds ? ` + ${r.attackerAdds}` : '';
  const dAdds = r.defenderAdds ? ` + ${r.defenderAdds}` : '';
  const winText = r.winner === 'draw' ? 'DRAW — DEFENDER RETREATS' : `${(r.winner === 'attacker' ? attackerLabel : defenderLabel).toUpperCase()} WINS`;
  return `\t${attackerLabel} (Attacker): ${r.attackerDie} + ${r.attackerSkill}${aAdds} = ${r.attackerTotal}\n\t${defenderLabel} (Defender): ${r.defenderDie} + ${r.defenderSkill}${dAdds} = ${r.defenderTotal}\n${winText}`;
}

/**
 * Five Leagues from the Borderlands' "Hits" resolution (p.43-44, read
 * directly) — Step 1 rolls to Overcome the target's Armor (skipped
 * entirely if their Armor is 0, per the book's own exception), Step 2
 * (only reached if Step 1 penetrates, or was skipped) rolls to Overcome
 * their Toughness. `target` is `{armor, toughness}`; `armorBonus`/
 * `toughnessBonus` are the attack's own "+x / +y" bonus (p.43) — a weapon
 * trait or tactic choice, again a plain GM-supplied modifier rather than
 * something this function derives on its own.
 * Outcomes: 'no-effect' (armor roll too low — attack fails outright),
 * 'stunned' (armor roll exactly equal — Stunned, attack still fails; OR a
 * natural 1 on the Toughness roll, regardless of bonus), 'wounded-stunned'
 * (Toughness roll — natural 2-6 plus bonus — at or below Toughness), or
 * 'casualty' (that same roll exceeds Toughness — removed from play).
 */
export function rollFiveLeaguesHit(target = {}, { armorBonus = 0, toughnessBonus = 0, rng = Math.random, dice = {} } = {}) {
  const armor = Number(target.armor) || 0;
  const toughness = Number(target.toughness) || 0;
  const aBonus = Number(armorBonus) || 0;
  const tBonus = Number(toughnessBonus) || 0;
  let armorDie = null; let armorTotal = null; let armorResult = 'skipped';
  if (armor > 0) {
    armorDie = dice.armorDie ?? rollDie(6, rng);
    armorTotal = armorDie + aBonus;
    armorResult = armorTotal > armor ? 'penetrated' : armorTotal === armor ? 'stunned' : 'failed';
    if (armorResult !== 'penetrated') {
      return {
        armor, armorDie, armorBonus: aBonus, armorTotal, armorResult,
        toughness, toughnessDie: null, toughnessBonus: tBonus, toughnessTotal: null,
        outcome: armorResult === 'stunned' ? 'stunned' : 'no-effect',
      };
    }
  }
  const toughnessDie = dice.toughnessDie ?? rollDie(6, rng);
  const naturalOne = toughnessDie === 1;
  const toughnessTotal = naturalOne ? toughnessDie : toughnessDie + tBonus;
  const outcome = naturalOne ? 'stunned' : toughnessTotal > toughness ? 'casualty' : 'wounded-stunned';
  return { armor, armorDie, armorBonus: aBonus, armorTotal, armorResult, toughness, toughnessDie, toughnessBonus: tBonus, toughnessTotal, outcome };
}

export const FIVE_LEAGUES_HIT_OUTCOME_LABEL = { 'no-effect': 'No Effect', stunned: 'Stunned', 'wounded-stunned': 'Wounded & Stunned', casualty: 'Casualty' };

/** Render a Hit resolution result as one journal/toast-friendly line. */
export function formatFiveLeaguesHitText(label, r) {
  const armorPart = r.armorResult === 'skipped' ? 'Armor 0 (skipped)' : `${r.armorDie}+${r.armorBonus}=${r.armorTotal} vs Armor ${r.armor}`;
  const toughnessPart = r.toughnessDie == null ? '' : r.toughnessDie === 1
    ? ` · natural 1 vs Toughness ${r.toughness}`
    : ` · ${r.toughnessDie}+${r.toughnessBonus}=${r.toughnessTotal} vs Toughness ${r.toughness}`;
  return `🩸 ${label}: ${armorPart}${toughnessPart} → ${FIVE_LEAGUES_HIT_OUTCOME_LABEL[r.outcome]}`;
}

/** Multi-line copy text for the dice roll window. */
export function formatFiveLeaguesHitCopyText(r) {
  const armorPart = r.armorResult === 'skipped' ? 'Armor 0 — skipped' : `${r.armorDie} + ${r.armorBonus} = ${r.armorTotal} (Armor ${r.armor})`;
  const toughnessPart = r.toughnessDie == null ? '' : `\n\tOvercome Toughness: ${r.toughnessDie}${r.toughnessDie === 1 ? ' (natural 1)' : ` + ${r.toughnessBonus} = ${r.toughnessTotal}`} (Toughness ${r.toughness})`;
  return `\tOvercome Armor: ${armorPart}${toughnessPart}\n${FIVE_LEAGUES_HIT_OUTCOME_LABEL[r.outcome].toUpperCase()}`;
}
