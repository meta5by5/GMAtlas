// lifeformGenerationTables.js — the D100 tables behind Planetfall's own
// "Generating Lifeforms" procedure (rulebook p.146-148, confirmed via
// `pdftotext -raw -f 148/149/150 "assets/docs/5PFH Planetfall 1.2.pdf"` —
// PDF page 148 = printed p.146, matching this app's established +2
// PDF-to-printed offset). Kept as plain data (CLAUDE.md: "keep statblocks,
// oracle tables, and similar content data, not code") — domain/lifeforms.js
// is the roll logic that reads these.
//
// Each table is an ascending list of `{max, ...}` entries — a D100 roll of
// 1-100 (100 standing in for the book's "00") resolves to the first entry
// whose `max` is >= the roll.

// Step 1 (Mobility). A roll ending in 0 or 5 (e.g. 25, 80, 100) additionally
// makes the creature Partially Airborne — that's a modifier read off the
// raw roll itself, not a separate table.
export const LIFEFORM_MOBILITY_TABLE = [
  { max: 25, speed: 5 },
  { max: 80, speed: 6 },
  { max: 100, speed: 7 },
];

// Step 2a (Offensive — Combat Skill). A roll ending in 0 or 5 grants one
// Special Attack roll (see domain/lifeforms.js).
export const LIFEFORM_COMBAT_SKILL_TABLE = [
  { max: 25, combat: 0 },
  { max: 85, combat: 1 },
  { max: 100, combat: 2 },
];

// Step 2b (Offensive — Strike Power). Same "ends in 0/5" trigger as Combat
// Skill above — if BOTH rolls end in 0/5, roll Special Attacks twice
// (a duplicate result just means no additional attack).
export const LIFEFORM_STRIKE_POWER_TABLE = [
  { max: 20, meleeDamage: 0 },
  { max: 85, meleeDamage: 1 },
  { max: 100, meleeDamage: 2 },
];

export const LIFEFORM_SPECIAL_ATTACKS_TABLE = [
  { max: 15, name: 'Razor Claws' },
  { max: 30, name: 'Eruption' },
  { max: 50, name: 'Shoot' },
  { max: 70, name: 'Spit' },
  { max: 85, name: 'Overpower' },
  { max: 100, name: 'Ferocity' },
];

// Step 3 (Defensive/Toughness). `note`/`kp` are mutually exclusive per row
// in the book (only one of Armor Saving Throw / Dodge / 1 KP ever applies).
export const LIFEFORM_TOUGHNESS_TABLE = [
  { max: 25, toughness: 4, note: '' },
  { max: 35, toughness: 4, note: 'Armor Saving Throw 5+' },
  { max: 45, toughness: 3, note: 'Dodge (evades any hit on a natural 6, even one that would negate Saving Throws)' },
  { max: 65, toughness: 4, note: '', kp: 1 },
  { max: 80, toughness: 5, note: '' },
  { max: 90, toughness: 5, note: 'Armor Saving Throw 5+' },
  { max: 100, toughness: 5, note: '', kp: 1 },
];

// Step 4 (Unique Abilities). 'None' is a real table result, not the absence
// of one — domain/lifeforms.js treats it as no ability.
export const LIFEFORM_UNIQUE_ABILITY_TABLE = [
  { max: 30, name: 'None' },
  { max: 40, name: 'Pull' },
  { max: 50, name: 'Jump' },
  { max: 55, name: 'Teleport' },
  { max: 60, name: 'Paralyze' },
  { max: 70, name: 'Terror' },
  { max: 80, name: 'Confuse' },
  { max: 90, name: 'Hinder' },
  { max: 100, name: 'Knock Down' },
];

// The rulebook's own "Campaign Lifeform Encounters table (example)" (p.146)
// % breakdown — used verbatim per direct request, as the fixed 10-slot
// range column on the Colony tab's Lifeform Encounters list AND the header
// dice roller's own D100-to-slot resolution. Index 0 = slot/row 1.
export const LIFEFORM_ENCOUNTER_RANGES = [18, 32, 44, 54, 64, 73, 82, 89, 95, 100];
