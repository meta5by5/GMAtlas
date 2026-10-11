// fiveLeaguesEnemyTraits.js — Five Leagues from the Borderlands 3rd
// Edition (read directly from assets/docs/5LFB/five-leagues-from-the-
// borderlands-3e.pdf) Universal Enemy Traits (p.152-153) and Aberration
// Traits (p.184-185), backing the Bestiary 'fiveleagues-lifeform'
// template's own Traits field (direct follow-up request: "include the
// Traits or Aberrant [sic — the real term is Aberration] Traits as
// separate lines where the title is in bold just like in the rulebook...
// make it a tooltip link to show the definition of the trait"). A GM
// still just types comma-separated trait NAMES into the one free-text
// Traits field, exactly as the book's own stat blocks print them
// ("Traits: Undead, Counter Attack") — this catalog is only ever used to
// resolve each typed name back to its own real definition for the
// tooltip; an unrecognized name (a Compendium-only trait, a homebrew one,
// a typo) still renders as a plain bold line with no tooltip, never an
// error.
export const FIVE_LEAGUES_ENEMY_TRAITS = [
  { key: 'awareness', label: 'Awareness', text: 'You cannot attempt to Seize the Initiative against this enemy, even if the scenario would allow the attempt.' },
  { key: 'brave', label: 'Brave', text: 'The enemy only fails Morale checks when rolling a 1, instead of the customary 1-2.' },
  { key: 'counterAttack', label: 'Counter Attack', text: 'If the enemy wins a melee exchange, they will inflict a Hit even if they were the defender.' },
  { key: 'crawling', label: 'Crawling', text: 'The enemy may Dash during Site Battles.' },
  { key: 'fearless', label: 'Fearless', text: 'The enemy does not take Morale checks.' },
  { key: 'fey', label: 'Fey', text: 'When targeted by a spell, the enemy may roll D6. The spell is canceled on a 4-6. If a spell would affect multiple figures, roll individually for each figure: the spell is canceled if any roll succeeds.' },
  { key: 'flying', label: 'Flying', text: 'The enemy ignores all terrain penalties and may move across obstacles, even if they would be otherwise Impassable. Flying figures are assumed to land or be hovering just over ground level at the end of their move, and can be engaged normally in melee. Foes do not receive a Combat Bonus from higher ground against Flying characters.' },
  { key: 'gruesome', label: 'Gruesome', text: 'A character who is removed as a casualty from battle must make a modification of -5 when rolling for post-game injuries. This does not affect rolls on the Flight in the Dark Table.' },
  { key: 'hangBack', label: 'Hang Back', text: 'An enemy with Hang Back should always be set up in or behind a terrain feature. They will not move from that feature, except to engage foes within one move. If targeted by ranged weapons, they will move to get out of sight, if possible.' },
  { key: 'monster', label: 'Monster', text: 'They cannot Dash and always move as directly as possible towards their foes.' },
  { key: 'outflank', label: 'Outflank', text: 'When deploying, the enemy may roll to Outflank, if the scenario permits it.' },
  { key: 'parry', label: 'Parry', text: 'The enemy may Parry in melee combat (p.42).' },
  { key: 'poison', label: 'Poison', text: 'A natural 6 on a ranged attack or a natural 6 as the attacker in a melee exchange will automatically remove the target as a casualty, unless the blow fails to penetrate Armor.' },
  { key: 'poorShot', label: 'Poor Shot', text: 'This enemy does not add their Combat Skill to ranged attacks.' },
  { key: 'regeneration', label: 'Regeneration', text: 'Each Tracking Phase, any enemy with a Wound will heal. Two Wounds during the same battle round will kill them, as normal.' },
  { key: 'relentless', label: 'Relentless', text: 'Warband members cannot use or gain the Parry and Counter Attack abilities in melee against this enemy.' },
  { key: 'skirmisher', label: 'Skirmisher', text: 'The enemy may make ranged attacks even if they moved a full move. Weapons that normally allow no movement (such as crossbows) will allow a half move instead.' },
  { key: 'slippery', label: 'Slippery', text: 'The enemy does not suffer movement reductions due to difficult terrain, may move through water features at normal speed, and may ignore obstacles up to 1" tall when moving.' },
  { key: 'terrifying', label: 'Terrifying', text: 'The enemy has Counter Attack when fighting Followers (but not Heroes).' },
  { key: 'tough', label: 'Tough', text: 'The enemy cannot be Stunned.' },
  { key: 'undead', label: 'Undead', text: 'The enemy cannot Dash. Undead are always Tough and Fearless as well.' },
  { key: 'unknownEnemies', label: 'Unknown Enemies', text: 'The enemy always uses the rules for Unknown Enemy markers unless the scenario would not permit it.' },
];

export const FIVE_LEAGUES_ABERRATION_TRAITS = [
  { key: 'areaAttack', label: 'Area Attack', text: 'After the creature moves, if it did not enter melee, it will conduct a ranged attack against the closest warband member in range. The target is Hit on a D6 roll of 4+. Any character within 2" of the target point is struck on a D6 roll of 5+. Cover and protections against ranged attacks have no effect, and the attack can strike allies of the Aberration as well as foes.' },
  { key: 'charge', label: 'Charge', text: 'If the creature moves into melee, it receives a Combat Bonus in the first exchange.' },
  { key: 'cruelWounds', label: 'Cruel Wounds', text: 'A character knocked out by this creature must add 1 turn to any recovery time required by the Injury Table after the battle.' },
  { key: 'difficultToKill', label: 'Difficult to Kill', text: 'Each Tracking Phase, if the Aberration did not fight in melee combat, roll D6. On a 5-6, it regains 1 MP if any have been lost.' },
  { key: 'ethereal', label: 'Ethereal', text: 'The creature does not lose more than 1 MP to a strike, even if rolling above its Toughness.' },
  { key: 'fellTouch', label: 'Fell Touch', text: 'Blows from the creature always penetrate non-enchanted Armor.' },
  { key: 'knockBack', label: 'Knock Back', text: 'A character suffering a melee strike from the creature is flung D6" directly backwards. If they collide with another character, they stop in place. This ends the melee.' },
  { key: 'lash', label: 'Lash', text: 'Whenever the creature loses MP, it lashes out, pushing all melee opponents back 3", and ending the melee immediately.' },
  { key: 'magicResistant', label: 'Magic Resistant', text: 'The creature is unaffected by any spells, and enchanted weapons provide no advantage against it. Effects that specifically affect the character fighting the creature apply as normal.' },
  { key: 'rangedAttack', label: 'Ranged Attack', text: 'If the creature is not in melee by the end of a normal move, it will conduct a ranged attack just like an archer. These attacks have their own damage score and cannot run out of ammunition.' },
  { key: 'size', label: 'Size', text: 'All ranged attacks against the creature receive a +1 bonus to Hit.' },
  { key: 'terror', label: 'Terror', text: 'A Follower that loses a melee exchange to the creature will flee a full move directly away, if they survive, and can take no Actions the following battle round. If engaged in melee combat, they will fight normally.' },
  { key: 'venom', label: 'Venom', text: 'A natural 6 on a combat roll will knock the target out, bypassing Armor.' },
  { key: 'wings', label: 'Wings', text: 'The creature ignores all terrain penalties and may move across obstacles, even if they would be otherwise Impassable. When using Wings, figures are assumed to land or be hovering just over ground level at the end of their move, and can be engaged normally in melee.' },
  { key: 'undying', label: 'Undying', text: 'The creature counts as being Undead for the purpose of items and spells with special effects against Undead.' },
];

/** Resolves a GM-typed trait name (whatever casing/whitespace) back to
 *  its own real definition, searching the Universal Enemy Traits first
 *  and then the Aberration Traits — null if unrecognized (a Compendium-
 *  only trait, a homebrew one, or a typo), which the UI renders as a
 *  plain bold line with no tooltip rather than an error. */
export function findFiveLeaguesEnemyTrait(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  const all = [...FIVE_LEAGUES_ENEMY_TRAITS, ...FIVE_LEAGUES_ABERRATION_TRAITS];
  return all.find((t) => t.label.toLowerCase() === needle) || null;
}
