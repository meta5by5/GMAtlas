// fiveLeagues.js — Five Leagues from the Borderlands ruleset mechanics that
// don't fit entities.js/statblocks.js's own generic, ruleset-agnostic
// shape: Character Origins (direct follow-up request: "Include racial
// tracking and apply NPC modifiers for the 5LFB ruleset" — data/
// fiveLeaguesOrigins.js, the real book's own Character Origins chapter,
// pp.15-19) and reading an entity's own Combat Skill/Toughness/Armor off
// its 5LFB character statblock for the Melee Exchange + Hits combat
// resolution (domain/dice.js's rollFiveLeaguesExchange/rollFiveLeaguesHit,
// pp.40-44 — direct follow-up request: "Upgrade the combat mechanics to
// use the 5LFB combat rules and require the selection of an opponent in
// the combat tracker when performing the combat challenge dice roles which
// would use the stats of the opponent").

import { getEntity } from './entities.js';
import { setStatblockField } from './statblocks.js';
import { findFiveLeaguesOrigin } from '../data/fiveLeaguesOrigins.js';
import { findFiveLeaguesArmorType, findFiveLeaguesWeapon, findFiveLeaguesWeaponTrait, findFiveLeaguesItem } from '../data/fiveLeaguesCharacter.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

// Matches data/rulesets.js's own 'fiveleagues' characterTemplate.tracks
// default (Luck/Will both `max: 3`) — the "normal" max restored whenever an
// Origin's own override is null (Human for Will, every non-Fey-blood
// origin for Luck).
const FIVE_LEAGUES_DEFAULT_TRACK_MAX = 3;

/** The index of `entity`'s own 5LFB character statblock group, or -1 if it
 *  doesn't have one — an entity using a DIFFERENT ruleset's sheet, or a
 *  plain Bestiary-template NPC (the real book's own Enemies have no Agility/
 *  Origin at all, p.17: "The enemies you fight do not have an Agility
 *  score"), has nothing for Origin tracking to attach to. */
export function findFiveLeaguesGroupIndex(entity) {
  const groups = (entity && entity.statblocks) || [];
  return groups.findIndex((g) => g.kind === 'character' && g.ruleset === 'fiveleagues');
}

function findFieldIndex(group, key) {
  const k = String(key).toLowerCase();
  return (group.fields || []).findIndex((f) => String(f.key || '').toLowerCase() === k);
}

/** The index of `entity`'s own Bestiary 'fiveleagues-lifeform' statblock
 *  group, or -1 — a Bestiary enemy (p.152's Enemy Profile) has no
 *  Agility/Origin and no Weapons table, but DOES carry Combat Skill/
 *  Toughness/Armor/Damage under its own (possibly pre-rename, see
 *  drawers/index.js's statblockFieldByKey) key names — real bug, found
 *  while diagnosing a report that "weapon selection in combat tracker
 *  does not select an item from the list": getFiveLeaguesStat/
 *  getFiveLeaguesAttackProfile below used to ONLY ever look at
 *  findFiveLeaguesGroupIndex's Player-Character sheet, so every Bestiary
 *  enemy added to the Combat Tracker silently rolled with Combat
 *  Skill/Armor/Toughness all read as 0 and Damage always Unarmed (-1/-1)
 *  — the "pick a weapon" dropdown wasn't just unhelpful for an enemy with
 *  no Weapons table, the whole Attack roll was wrong underneath it too. */
export function findFiveLeaguesEnemyGroupIndex(entity) {
  const groups = (entity && entity.statblocks) || [];
  return groups.findIndex((g) => g.templateId === 'fiveleagues-lifeform');
}

// The three stats a Player Character sheet and a Bestiary Enemy Profile
// both carry, under the Bestiary template's current SHORT key on a
// freshly-created statblock, or its original long key on an already-
// imported one (template keys were deliberately never renamed in place —
// see drawers/index.js's own statblockFieldByKey doc comment for why).
const FIVE_LEAGUES_ENEMY_STAT_ALIASES = {
  'combat skill': ['Combat', 'Combat Skill'],
  'toughness': ['Tough', 'Toughness'],
  'armor': ['Armor'],
};

function findFiveLeaguesEnemyFieldIndex(group, key) {
  const aliases = FIVE_LEAGUES_ENEMY_STAT_ALIASES[String(key).toLowerCase()] || [key];
  for (const alias of aliases) {
    const fi = findFieldIndex(group, alias);
    if (fi !== -1) return fi;
  }
  return -1;
}

/** Reads a named stat/track field's current numeric value off an entity's
 *  own 5LFB character statblock (case-insensitive key match) — falling
 *  back to a Bestiary 'fiveleagues-lifeform' group (p.152) when the
 *  entity has no Player-Character sheet, since Combat Skill/Toughness/
 *  Armor are exactly the three stats both sheets share. 0 if the entity
 *  has neither, or no field by that name on whichever it has. Used by the
 *  Combat Challenge roll (shell.js) to read these off whichever two
 *  entities the GM picked, without the caller needing to know the
 *  statblock's own group/field index shape OR which of the two 5LFB
 *  sheet kinds it's reading from. */
export function getFiveLeaguesStat(entity, key) {
  const gi = findFiveLeaguesGroupIndex(entity);
  if (gi !== -1) {
    const fi = findFieldIndex(entity.statblocks[gi], key);
    if (fi !== -1) return Number(entity.statblocks[gi].fields[fi].value) || 0;
  }
  const egi = findFiveLeaguesEnemyGroupIndex(entity);
  if (egi === -1) return 0;
  const fi = findFiveLeaguesEnemyFieldIndex(entity.statblocks[egi], key);
  if (fi === -1) return 0;
  return Number(entity.statblocks[egi].fields[fi].value) || 0;
}

/** Sets (or, given a falsy originKey, clears) an entity's own Character
 *  Origin, and applies the one piece of this that resolves to a plain
 *  number already on the 5LFB template's own Luck/Will tracks: Human's
 *  "Driven" (the only origin not capped at 1 point of Will) and Fey-
 *  blood's "Cursed" (can never attain Luck at all) — see data/
 *  fiveLeaguesOrigins.js's own doc comment for why every OTHER trait stays
 *  reference-only rather than being simulated here. A track's current
 *  `value` is clamped down if the new max is now lower than it (e.g.
 *  switching a character who had 2 Will to a non-Human origin). No-op on
 *  the statblock side if the entity has no 5LFB character sheet — the
 *  Origin field itself is still set either way, so picking a sheet later
 *  doesn't lose the choice. */
export function setEntityFiveLeaguesOrigin(campaign, entityId, originKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const key = originKey || null;
  e.fiveLeaguesOrigin = key;
  const origin = key ? findFiveLeaguesOrigin(key) : null;
  const willMax = (origin && origin.willMaxOverride != null) ? origin.willMaxOverride : FIVE_LEAGUES_DEFAULT_TRACK_MAX;
  const luckMax = (origin && origin.luckMaxOverride != null) ? origin.luckMaxOverride : FIVE_LEAGUES_DEFAULT_TRACK_MAX;
  const gi = findFiveLeaguesGroupIndex(e);
  if (gi === -1) return next;
  const group = e.statblocks[gi];
  const willIdx = findFieldIndex(group, 'Will');
  if (willIdx !== -1) {
    const f = group.fields[willIdx];
    setStatblockField(e, gi, willIdx, { max: willMax, value: Math.min(Number(f.value) || 0, willMax) });
  }
  const luckIdx = findFieldIndex(group, 'Luck');
  if (luckIdx !== -1) {
    const f = group.fields[luckIdx];
    setStatblockField(e, gi, luckIdx, { max: luckMax, value: Math.min(Number(f.value) || 0, luckMax) });
  }
  return next;
}

// --- Character Type / Background / Skills / Armor / Spells -----------
// Direct follow-up request: "update the character sheet for 5lfb to track
// character type, skills, origins, background, armor, gear storage in
// self, backpack or stash, weapon traits, and spells (hidden if a spell
// casting class is not selected for that character or NPC) per the
// ruleset." Origins/Combat were built in an earlier request (above);
// everything here is additive entity-level state (same convention as
// `fiveLeaguesOrigin` itself — no schema.js change needed, an entity is a
// plain object and an unset field just reads back undefined/absent until
// first touched) plus data/fiveLeaguesCharacter.js's real catalogs.

/** Sets (or clears) a character's Character Type (p.14). Picking 'mystic'
 *  forces Background to 'mystic' too (p.21: "must be selected by Mystic
 *  characters, regardless of origin") — the Background picker itself
 *  disables in that state (drawers/index.js) so this is the only place
 *  that value can change while Mystic is active. Moving AWAY from Mystic
 *  clears a Background that was only 'mystic' because of that forcing, so
 *  the GM re-picks a real one for the character's actual Origin. */
export function setEntityFiveLeaguesCharacterType(campaign, entityId, typeKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const wasMystic = e.fiveLeaguesCharacterType === 'mystic';
  const key = typeKey || null;
  e.fiveLeaguesCharacterType = key;
  if (key === 'mystic') {
    e.fiveLeaguesBackground = 'mystic';
  } else if (wasMystic && e.fiveLeaguesBackground === 'mystic') {
    e.fiveLeaguesBackground = null;
  }
  return next;
}

/** Plain setter — the Background <select> itself (drawers/index.js) only
 *  ever offers keys availableFiveLeaguesBackgrounds() allows for the
 *  entity's current Origin/Character Type, so no validation is needed
 *  here beyond accepting whatever it's given. */
export function setEntityFiveLeaguesBackground(campaign, entityId, backgroundKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  e.fiveLeaguesBackground = backgroundKey || null;
  return next;
}

/** Toggles one of the 12 named Skills (p.23) on/off a character's known
 *  list — a plain checklist (see data/fiveLeaguesCharacter.js's own doc
 *  comment for why the Proficiency Test +2 bonus isn't automated). */
export function toggleEntityFiveLeaguesSkill(campaign, entityId, skillKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  if (!Array.isArray(e.fiveLeaguesSkills)) e.fiveLeaguesSkills = [];
  const i = e.fiveLeaguesSkills.indexOf(skillKey);
  if (i === -1) e.fiveLeaguesSkills.push(skillKey); else e.fiveLeaguesSkills.splice(i, 1);
  return next;
}

function ensureFiveLeaguesArmor(e) {
  if (!e.fiveLeaguesArmor || typeof e.fiveLeaguesArmor !== 'object') {
    e.fiveLeaguesArmor = { bodyType: null, shield: false, helmet: false, improvements: [] };
  }
  if (!Array.isArray(e.fiveLeaguesArmor.improvements)) e.fiveLeaguesArmor.improvements = [];
  return e.fiveLeaguesArmor;
}

/** Sets the character's worn Body Armor type (p.62) AND syncs the
 *  character sheet's own numeric "Armor" stat field to that type's rating
 *  — a clean, always-active 1:1 (unlike Shield/Helmet below, which stay
 *  reference-only; see data/fiveLeaguesCharacter.js's own doc comment on
 *  why). No-op on the statblock side if the entity has no 5LFB sheet or
 *  no Armor field, same "the choice itself still sticks" posture as
 *  setEntityFiveLeaguesOrigin above. */
export function setEntityFiveLeaguesArmorBody(campaign, entityId, bodyTypeKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const armor = ensureFiveLeaguesArmor(e);
  const key = bodyTypeKey || null;
  armor.bodyType = key;
  const armorType = key ? findFiveLeaguesArmorType(key) : null;
  const gi = findFiveLeaguesGroupIndex(e);
  if (gi === -1) return next;
  const group = e.statblocks[gi];
  const armorIdx = findFieldIndex(group, 'Armor');
  if (armorIdx !== -1) setStatblockField(e, gi, armorIdx, { value: armorType ? armorType.armor : 0 });
  return next;
}

/** Shield/Helmet (p.62) — reference-only booleans, not folded into the
 *  Armor stat (see setEntityFiveLeaguesArmorBody's own comment). */
export function setEntityFiveLeaguesArmorFlag(campaign, entityId, flag, value) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const armor = ensureFiveLeaguesArmor(e);
  if (flag === 'shield' || flag === 'helmet') armor[flag] = !!value;
  return next;
}

/** Toggles an Improved Armor trait (Fine/Fey Steel, p.62) on the worn
 *  body armor. */
export function toggleEntityFiveLeaguesArmorImprovement(campaign, entityId, key) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const armor = ensureFiveLeaguesArmor(e);
  const i = armor.improvements.indexOf(key);
  if (i === -1) armor.improvements.push(key); else armor.improvements.splice(i, 1);
  return next;
}

/** Toggles one of the 34 real spells (pp.47-50) on/off a Mystic's known
 *  list. The section this backs (drawers/index.js) only renders at all
 *  when the entity's Character Type is 'mystic' (p.45), but the mutator
 *  itself doesn't re-check that — a character detyped away from Mystic
 *  keeps whatever spells were recorded, rather than silently losing them,
 *  in case the GM is just fixing a miscategorization. */
export function toggleEntityFiveLeaguesSpell(campaign, entityId, spellKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  if (!Array.isArray(e.fiveLeaguesSpells)) e.fiveLeaguesSpells = [];
  const i = e.fiveLeaguesSpells.indexOf(spellKey);
  if (i === -1) e.fiveLeaguesSpells.push(spellKey); else e.fiveLeaguesSpells.splice(i, 1);
  return next;
}

/** "+3"/"-1"/"+0" — the real rulebook's own sign convention for an
 *  Overcome Armor/Toughness bonus (p.43: "A Hit or attack is always
 *  written as +x / +y"). Exported for the Bestiary 'fiveleagues-lifeform'
 *  template's own Damage field (direct follow-up request: "format
 *  'damage' use a '+0/+0' format using two numbers with appended '+' and
 *  '/' separator to look the same as the handbook"), which combines two
 *  plain number inputs into this same real string format rather than
 *  storing the two halves separately. */
export function formatFiveLeaguesOvercome(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

/** Quick-fills one Weapons-table row (p.60-61) from the real catalog —
 *  Name/Range/Damage ("Overcome Armor / Overcome Toughness")/Traits, all
 *  still plain free-text fields afterward (updateEntityStatblockWeapon),
 *  so a GM can keep hand-editing anything the catalog can't capture (a
 *  magic weapon's extra line, a renamed heirloom, ...). A no-op if the
 *  row or the catalog key doesn't exist. */
export function applyFiveLeaguesWeaponCatalogPick(campaign, entityId, groupIndex, weaponIndex, catalogKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const w = findFiveLeaguesWeapon(catalogKey);
  if (!w) return next;
  const g = e.statblocks && e.statblocks[groupIndex];
  const weapon = g && Array.isArray(g.weapons) && g.weapons[weaponIndex];
  if (!weapon) return next;
  Object.assign(weapon, {
    name: w.label,
    range: w.range || (w.type === 'melee' ? 'Melee' : ''),
    shots: w.traits.includes('limitedAmmunition') ? 'Limited' : '—',
    damage: `${formatFiveLeaguesOvercome(w.overcomeArmor)} / ${formatFiveLeaguesOvercome(w.overcomeToughness)}`,
    traits: w.traits.map((k) => (findFiveLeaguesWeaponTrait(k) || {}).label).filter(Boolean).join(', '),
  });
  if (!weapon.location) weapon.location = 'self';
  return next;
}

/** Pushes a new Items-table row (p.63-65) prefilled from the real Assorted
 *  Items catalog — Name + the item's own rule text as a Notes starting
 *  point, still plain free-text afterward. A no-op if the entity/group
 *  doesn't exist; an unknown catalogKey still adds a blank row (same
 *  "+ Custom Item" shape) rather than silently doing nothing. */
export function addFiveLeaguesItemFromCatalog(campaign, entityId, groupIndex, catalogKey) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  const g = e.statblocks && e.statblocks[groupIndex];
  if (!g) return next;
  if (!Array.isArray(g.items)) g.items = [];
  const item = findFiveLeaguesItem(catalogKey);
  g.items.push({
    name: item ? item.label : '',
    location: 'self',
    notes: item ? item.text : '',
  });
  return next;
}

// --- Combat Tracker: Attacker's weapon/spell choice --------------------
// Direct follow-up request: "when selecting the attacker, determine if
// they have more than one weapon or spell capability and prompt which is
// being used in the attack. use the attributes of the weapon in the
// attack role, if applicable." A weapon's own real Overcome Armor/
// Overcome Toughness profile (pp.60-61) lives in its free-text `damage`
// field as "+X / +Y" (characterSheetWeaponsAndGearHtml's own column,
// either hand-typed or filled by applyFiveLeaguesWeaponCatalogPick above)
// — parsed back out here into real numbers to feed rollFiveLeaguesHit's
// armorBonus/toughnessBonus (shell.js's "🩸 Roll Hit" handler). A spell
// has no equivalent Overcome stats (it's resolved by a completely
// different real mechanic, the 2D6-vs-Incantation Casting roll, pp.45-46,
// not modeled by this Melee Exchange flow) — included in the SAME pick
// list as a flavor/record choice only, per "if applicable": its own
// overcomeArmor/overcomeToughness are always 0.
export function parseFiveLeaguesWeaponDamage(damage) {
  const m = String(damage || '').match(/([+-]?\d+)\s*\/\s*([+-]?\d+)/);
  if (!m) return { overcomeArmor: 0, overcomeToughness: 0 };
  return { overcomeArmor: Number(m[1]) || 0, overcomeToughness: Number(m[2]) || 0 };
}

// --- Active weapon (direct follow-up request: "the weapon selection is
// important... Display in the statblock box in the combat tracker the
// active weapon selected. have this be a link to select from a list of
// possible weapons in the entity's worn gear (not backpack or stash).
// the selection will become the active weapon used to determine ranged/
// melee rules.") -----------------------------------------------------
// Supersedes the earlier per-ATTACK "which weapon or spell" ephemeral
// prompt (removed, along with listFiveLeaguesCombatActions, the function
// that backed it) with a PERSISTED, per-character choice shown and
// changeable right on their own Combat Tracker card at all times, not
// just while they happen to be the current Attacker — closer to how a
// real character sheet works ("what am I currently carrying?") than a
// one-off per-roll question. Spell-casting is no longer offered as an
// "active weapon" alternative: it never contributed any real mechanical
// value in the old picker either (its own overcomeArmor/overcomeToughness
// were always 0 — spells are resolved by a completely different real
// mechanic, the 2D6-vs-Incantation Casting roll, this app doesn't
// simulate), so nothing of substance is lost, only a decorative label.

/** Every weapon on the entity's own 5LFB Weapons table whose Location
 *  (p.59) is 'self' (worn/carried) — explicitly excluding 'backpack'/
 *  'stash', per the request — as `{index, weapon}` pairs (index is the
 *  real position in the underlying weapons array, for addressing by
 *  setEntityFiveLeaguesActiveWeapon). A weapon row with no `location` at
 *  all (predates this field) defaults to 'self', same fallback the
 *  Weapons table's own Location <select> already uses. */
export function listFiveLeaguesSelfWeapons(entity) {
  const gi = findFiveLeaguesGroupIndex(entity);
  if (gi === -1) return [];
  const weapons = (entity.statblocks[gi] && entity.statblocks[gi].weapons) || [];
  return weapons
    .map((weapon, index) => ({ index, weapon }))
    .filter(({ weapon }) => (weapon.location || 'self') === 'self');
}

/** Sets (or clears, given a falsy weaponIndex) the entity's own active
 *  weapon — a plain array index into their real Weapons table, same
 *  addressing convention every other weapon-index reference in this app
 *  already uses. Not restricted to self-location weapons here (the UI's
 *  own <select>, drawers/index.js, only ever offers those, same
 *  "the picker enforces it, the mutator stays permissive" posture as
 *  everywhere else) — a weapon moved to Backpack/Stash after being made
 *  active simply stops being surfaced as pickable again until moved back,
 *  rather than this function needing to re-validate on every unrelated
 *  edit. */
export function setEntityFiveLeaguesActiveWeapon(campaign, entityId, weaponIndex) {
  const next = clone(campaign);
  const e = getEntity(next, entityId);
  if (!e) return next;
  e.fiveLeaguesActiveWeaponIndex = (weaponIndex === '' || weaponIndex == null) ? null : Number(weaponIndex);
  return next;
}

/** Reads back the entity's own active weapon ROW (not just its index) —
 *  null if unset, invalid (index out of range, or the weapon was since
 *  removed), or the entity has no 5LFB sheet at all; the GM's own
 *  Combat Tracker card and the Attack roll's own melee/ranged branching
 *  both treat a null return as "fighting unarmed" (p.60's own Unarmed
 *  profile, Melee -1/-1), not an error. */
export function getFiveLeaguesActiveWeapon(entity) {
  const gi = findFiveLeaguesGroupIndex(entity);
  if (gi === -1) return null;
  const idx = entity.fiveLeaguesActiveWeaponIndex;
  if (idx == null) return null;
  const weapons = (entity.statblocks[gi] && entity.statblocks[gi].weapons) || [];
  return weapons[idx] || null;
}

/** Ranged vs melee (p.39 vs pp.40-44 — genuinely different resolution
 *  mechanics, direct follow-up request: "the selection will become the
 *  active weapon used to determine ranged/melee rules") — a weapon row
 *  has no explicit `type` field of its own (hand-typed rows never would),
 *  so this reads the SAME signal the row's own Range column already
 *  carries: applyFiveLeaguesWeaponCatalogPick (above) writes a real
 *  tabletop distance like `18"` for a ranged catalog weapon, or the
 *  literal text "Melee" for a melee one — and a hand-typed row works the
 *  same way by the GM's own convention (typing a number implies ranged).
 *  No weapon at all (unarmed) is melee. */
export function isFiveLeaguesWeaponRanged(weaponRow) {
  if (!weaponRow) return false;
  return /\d/.test(String(weaponRow.range || ''));
}

/** The Attacker's own real combat profile for an exchange — folds
 *  together the two different places a 5LFB entity's attack stats can
 *  live, so the Combat Tracker's Attack button (shell.js) never needs to
 *  know which kind of entity it's rolling for:
 *  - A Player Character (has a Weapons table): unchanged from before —
 *    their own PERSISTED active weapon (getFiveLeaguesActiveWeapon), or
 *    genuinely Unarmed (-1/-1, p.60) if none is selected.
 *  - A Bestiary enemy (p.152's Enemy Profile, no Weapons table at all):
 *    their own single Damage field covers every attack, melee or ranged
 *    alike — there's no separate "ranged weapon" to pick, so `ranged`
 *    here is driven by the caller's own `enemyRangedActive` flag (an
 *    ephemeral, per-exchange GM call — combatOptions.enemyRangedActive,
 *    shell.js — never persisted on the entity itself: ONE Enemy Profile
 *    entry can represent a mixed group where only SOME models carry a
 *    ranged weapon at all, per the Profile's own Ranged column, e.g. "2
 *    slingers" out of a larger band). `hasRangedOption` tells the caller
 *    whether that choice is even worth offering for this entity. */
export function getFiveLeaguesAttackProfile(entity, { enemyRangedActive = false } = {}) {
  const gi = findFiveLeaguesGroupIndex(entity);
  if (gi !== -1) {
    const weapon = getFiveLeaguesActiveWeapon(entity);
    const { overcomeArmor, overcomeToughness } = weapon ? parseFiveLeaguesWeaponDamage(weapon.damage) : { overcomeArmor: -1, overcomeToughness: -1 };
    return {
      label: weapon ? (weapon.name || 'Weapon') : 'Unarmed',
      overcomeArmor, overcomeToughness,
      ranged: isFiveLeaguesWeaponRanged(weapon),
      hasRangedOption: false,
      limitedAmmunition: weapon ? /limited ammunition/i.test(String(weapon.traits || '')) : false,
    };
  }
  const egi = findFiveLeaguesEnemyGroupIndex(entity);
  if (egi === -1) return { label: 'Unarmed', overcomeArmor: -1, overcomeToughness: -1, ranged: false, hasRangedOption: false, limitedAmmunition: false };
  const group = entity.statblocks[egi];
  const damageFi = findFieldIndex(group, 'Damage');
  const { overcomeArmor, overcomeToughness } = damageFi !== -1 ? parseFiveLeaguesWeaponDamage(group.fields[damageFi].value) : { overcomeArmor: 0, overcomeToughness: 0 };
  const rangedFi = findFieldIndex(group, 'Ranged');
  const rangedText = rangedFi !== -1 ? String(group.fields[rangedFi].value || '').trim() : '';
  const hasRangedOption = !!rangedText && !/^(none|-|n\/a)$/i.test(rangedText);
  const ranged = hasRangedOption && !!enemyRangedActive;
  return {
    // Not the entity's own name — the dice-roll card already shows that
    // separately (e.g. "Brute vs Hero"); repeating it here read as
    // "Brute (Brute)". A Bestiary enemy has no weapon identity of its
    // own to display (p.152, one Damage stat covers every attack).
    label: ranged ? 'Ranged Attack' : 'Melee Attack',
    overcomeArmor, overcomeToughness,
    ranged,
    hasRangedOption,
    limitedAmmunition: false,
  };
}

function anyFiveLeaguesWeaponTraitTextMatches(entity, needle) {
  const re = new RegExp(needle, 'i');
  const gi = findFiveLeaguesGroupIndex(entity);
  if (gi !== -1) {
    const weapons = (entity.statblocks[gi] && entity.statblocks[gi].weapons) || [];
    if (weapons.some((w) => re.test(String(w.traits || '')) || re.test(String(w.name || '')))) return true;
  }
  // A Bestiary enemy has no Weapons table, but can carry the same real
  // trait (p.152's own Counter Attack/Parry Universal Enemy Traits) in
  // its one free-text Traits field instead (data/fiveLeaguesEnemyTraits.js)
  // — checked in ADDITION to the Weapons table above, not instead of it,
  // since an entity could in principle have both a character sheet AND a
  // Bestiary group attached.
  const egi = findFiveLeaguesEnemyGroupIndex(entity);
  if (egi !== -1) {
    const fi = findFieldIndex(entity.statblocks[egi], 'Traits');
    if (fi !== -1 && re.test(String(entity.statblocks[egi].fields[fi].value || ''))) return true;
  }
  return false;
}

/** A courtesy auto-detect/pre-tick for the Combat Tracker's own Counter
 *  Attack checkbox (direct follow-up request: "Factor in... all other
 *  combat conditions... prompt with questions for optional attributes or
 *  abilities... to be applied") — true if ANY of the entity's own
 *  Weapons-table rows mentions "Counter Attack" in its Traits/Name text
 *  (War Spear's own catalog entry does, via applyFiveLeaguesWeaponCatalogPick
 *  above). Approximate on purpose: Counter Attack's real sources also
 *  include terrain (higher ground, obstacles, difficult ground) this app
 *  has no positional model for, and a character may own several weapons
 *  but only fight with one — the checkbox this feeds is always GM-
 *  overridable, never authoritative. */
export function entityHasFiveLeaguesCounterAttack(entity) {
  return anyFiveLeaguesWeaponTraitTextMatches(entity, 'counter attack');
}

/** A courtesy auto-detect for Parry (p.42) — true if the entity has a
 *  Shield (p.62: "may Parry against melee strikes") or any Weapons-table
 *  row mentions "Parry" in its Traits/Name text. Unlike Counter Attack
 *  above, this isn't surfaced as a GM-overridable checkbox — Parry's own
 *  trigger (the Defender's own exchange die rolling a natural 1, p.42) is
 *  purely mechanical with no terrain/judgment component, so it's applied
 *  automatically wherever this returns true. */
export function entityHasFiveLeaguesParry(entity) {
  if (entity && entity.fiveLeaguesArmor && entity.fiveLeaguesArmor.shield) return true;
  return anyFiveLeaguesWeaponTraitTextMatches(entity, 'parry');
}
