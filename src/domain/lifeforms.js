// lifeforms.js — Planetfall's own "Generating Lifeforms" procedure
// (rulebook p.146-148, see data/lifeformGenerationTables.js for the
// transcribed tables and citation). Pure, DOM-free, mirrors worldbuilding.js's
// self-contained generator shape (rollX/formatX pair) — direct request:
// "fulfill the ruleset for encountering a new lifeform using the Generating
// Lifeforms rules on p.146 of Planetfall." Real randomness by default
// (Math.random); only tests pass a seeded rng (CLAUDE.md convention).

import {
  LIFEFORM_MOBILITY_TABLE, LIFEFORM_COMBAT_SKILL_TABLE, LIFEFORM_STRIKE_POWER_TABLE,
  LIFEFORM_SPECIAL_ATTACKS_TABLE, LIFEFORM_TOUGHNESS_TABLE, LIFEFORM_UNIQUE_ABILITY_TABLE,
  LIFEFORM_ENCOUNTER_RANGES,
} from '../data/lifeformGenerationTables.js';

function rollD100(rng) { return Math.floor(rng() * 100) + 1; }
function endsInZeroOrFive(n) { return n % 10 === 0 || n % 10 === 5; }
function fromRanges(table, n) { return table.find((row) => n <= row.max); }

/** Runs the full 5-step Generating Lifeforms procedure once, producing one
 *  creature's profile. See data/lifeformGenerationTables.js for each
 *  table's own rulebook citation. */
export function rollLifeformProfile(rng = Math.random) {
  const mobilityRoll = rollD100(rng);
  const mobility = fromRanges(LIFEFORM_MOBILITY_TABLE, mobilityRoll);
  const partiallyAirborne = endsInZeroOrFive(mobilityRoll);

  const combatRoll = rollD100(rng);
  const combat = fromRanges(LIFEFORM_COMBAT_SKILL_TABLE, combatRoll).combat;

  const strikeRoll = rollD100(rng);
  const meleeDamage = fromRanges(LIFEFORM_STRIKE_POWER_TABLE, strikeRoll).meleeDamage;

  // "If either roll ends in a 0 or a 5, the creature has a Special Attack
  // as well... If both rolls end in a 0 or a 5, the creature rolls twice
  // for Special Attacks. Ignore a duplicate result... and count it as no
  // additional attack" — a Set naturally implements that dedupe.
  const specialAttackRolls = (endsInZeroOrFive(combatRoll) ? 1 : 0) + (endsInZeroOrFive(strikeRoll) ? 1 : 0);
  const specialAttacks = new Set();
  for (let i = 0; i < specialAttackRolls; i++) {
    specialAttacks.add(fromRanges(LIFEFORM_SPECIAL_ATTACKS_TABLE, rollD100(rng)).name);
  }

  const toughnessRoll = rollD100(rng);
  const toughnessRow = fromRanges(LIFEFORM_TOUGHNESS_TABLE, toughnessRoll);

  const uniqueRoll = rollD100(rng);
  const uniqueName = fromRanges(LIFEFORM_UNIQUE_ABILITY_TABLE, uniqueRoll).name;

  return {
    speed: mobility.speed,
    partiallyAirborne,
    combat,
    meleeDamage,
    toughness: toughnessRow.toughness,
    toughnessNote: toughnessRow.note || '',
    kp: toughnessRow.kp || 0,
    specialAttacks: [...specialAttacks],
    uniqueAbility: uniqueName === 'None' ? null : uniqueName,
  };
}

/** Renders a rolled profile as the same one-line summary the rulebook's own
 *  example table entries use, e.g. `Nickname 'Turbostone': Speed 7",
 *  Combat +1, Melee +1 Damage, Toughness 5`. A Special Attack and a Unique
 *  Ability are folded into one trailing "Special:" list — confirmed by the
 *  book's own "Vaportrail" example (Overpower is a Special Attack, Hinder
 *  is a Unique Ability, listed together). */
export function formatLifeformProfile(name, profile) {
  const parts = [
    `Speed ${profile.speed}"${profile.partiallyAirborne ? ' (Partially Airborne)' : ''}`,
    `Combat +${profile.combat}`,
    `Melee +${profile.meleeDamage} Damage`,
    `Toughness ${profile.toughness}`,
  ];
  if (profile.toughnessNote) parts.push(profile.toughnessNote);
  if (profile.kp) parts.push(`${profile.kp} KP`);
  const specials = [...profile.specialAttacks, ...(profile.uniqueAbility ? [profile.uniqueAbility] : [])];
  if (specials.length) parts.push(`Special: ${specials.join(', ')}`);
  return `Nickname '${name}': ${parts.join(', ')}`;
}

/** "01-18" style label for the Colony tab's Lifeform Encounters range
 *  column, row index 0-9 (row 1 = index 0) — direct request: "add a column
 *  with that same % breakdown as the first column." */
export function lifeformEncounterRangeLabel(index) {
  const max = LIFEFORM_ENCOUNTER_RANGES[index];
  if (max == null) return '';
  const prevMax = index === 0 ? 0 : LIFEFORM_ENCOUNTER_RANGES[index - 1];
  const lo = String(prevMax + 1).padStart(2, '0');
  const hi = max === 100 ? '00' : String(max).padStart(2, '0');
  return `${lo}-${hi}`;
}

/** Maps a D100 roll (1-100) to which of the 10 Lifeform Encounters rows
 *  (1-10) it falls in, per the rulebook's own example table's fixed %
 *  breakdown — the header dice roller's own "roll D100 on the Campaign
 *  Lifeform Encounters table" step (p.146). */
export function resolveLifeformEncounterSlot(d100) {
  return LIFEFORM_ENCOUNTER_RANGES.findIndex((max) => d100 <= max) + 1;
}
