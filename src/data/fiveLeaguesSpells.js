// fiveLeaguesSpells.js — the real Spell Table (Five Leagues from the
// Borderlands 3rd Edition, pp.47-50, read directly from assets/docs/5LFB/
// five-leagues-from-the-borderlands-3e.pdf), backing the Character Sheet's
// "Known Spells" section (direct follow-up request — only shown for a
// character whose Character Type is Mystic, p.45: "A Mystic is a
// spell-casting character"). All 34 D100-table entries (01-03 through
// 99-100), each with its real Incantation score, Target, Effect text, and
// Duration — a GM ticking a spell known here sees the real rule at hand
// without flipping back to the book. `simple: true` marks the 4 spells the
// table itself flags with a trailing "*" (p.46: a Simple spell never costs
// a Strand on a success, only on a natural-2 failure). No spell in this
// table carries the separate "Taxing" marker the rules text also defines
// (once-per-battle casting) — none of the 34 entries show it.
export const FIVE_LEAGUES_SPELLS = [
  { key: 'antidote', label: 'Antidote', incantation: '7+', target: '1 ally', effect: 'Target is unaffected by Poison or Venom traits.', duration: 'Battle', simple: false },
  { key: 'barrier', label: 'Barrier', incantation: '6+', target: 'Ground', effect: 'Place a line of fire 4" long and 0.5" wide without touching any characters. Prevents all movement across it except for figures with the Flying trait. It may be shot across, but provides Cover.', duration: 'Full round', simple: false },
  { key: 'bind', label: 'Bind', incantation: '8+', target: 'Up to 3 enemies within 1" of each other', effect: 'Each targeted figure rolls D6, adding any Monster Point total, breaking free on a 6+. If failing to break free, the figure cannot move, but may fight and shoot normally.', duration: 'Activation', simple: false },
  { key: 'bleed', label: 'Bleed', incantation: '8+', target: '1 enemy', effect: 'The target loses the Regeneration trait if they have it. If Wounded, roll D6 each Tracking Phase — on a 6, they die.', duration: 'Battle', simple: false },
  { key: 'compel', label: 'Compel', incantation: '7+', target: '1 enemy', effect: 'When the target next activates, they must move directly towards the Mystic as fast as possible, never risking damage from dangerous terrain.', duration: 'Activation', simple: true },
  { key: 'confuse', label: 'Confuse', incantation: '7+', target: '1 enemy', effect: 'Target loses the Parry and Counter Attack traits.', duration: 'Full round', simple: false },
  { key: 'darts', label: 'Darts', incantation: '6+', target: '1 ally', effect: 'Target a character out of ranged weapon ammunition — they immediately restock. Does not work on single-use weapons.', duration: 'Immediate', simple: false },
  { key: 'distract', label: 'Distract', incantation: '7+', target: '1 enemy Ranged Trooper', effect: 'The target will remain in place and will not shoot.', duration: 'Activation', simple: false },
  { key: 'escape', label: 'Escape', incantation: '6+', target: '1 ally', effect: 'Remove the target character from the battle. No "Flight in the Dark" roll is needed.', duration: 'Immediate', simple: false },
  { key: 'explore', label: 'Explore', incantation: '7+', target: '1 marker', effect: 'Select an Unknown Enemy Marker, Exploration Marker, Unusual Location Marker, or similar, and roll to resolve what it is. Does not require Line of Sight.', duration: 'Immediate', simple: false },
  { key: 'fog', label: 'Fog', incantation: '6+', target: 'Ground', effect: 'Place a fog cloud circle 3" across. Figures can move into, out of, and through it, but it blocks all Lines of Sight.', duration: 'Full round', simple: false },
  { key: 'foresee', label: 'Foresee', incantation: '7+', target: 'None', effect: 'If a time limit applies to Achieving the Objective, increase the limit by 1 battle round.', duration: 'Immediate', simple: false },
  { key: 'fortune', label: 'Fortune', incantation: '5+', target: 'Personal', effect: 'The Mystic may reroll a ranged roll to Hit, a melee roll to Hit, a proficiency test, or force an enemy to reroll a successful Overcome Armor roll against them.', duration: 'Full round', simple: true },
  { key: 'frighten', label: 'Frighten', incantation: '7+', target: 'None', effect: 'If the enemy took any casualties this turn, they must roll 1 additional Morale die. No Line of Sight is required.', duration: 'Next Tracking Phase', simple: false },
  { key: 'guidance', label: 'Guidance', incantation: '7+', target: '1 ally', effect: 'The Ally may reroll a single shooting roll to Hit, melee roll to Hit, proficiency test, or force an enemy to reroll a successful Overcome Armor roll — any ally may use the reroll, at any point, once cast. No Line of Sight required.', duration: 'Full round', simple: false },
  { key: 'heal', label: 'Heal', incantation: '6+', target: '1 ally', effect: 'Remove a Wound.', duration: 'Immediate', simple: false },
  { key: 'illuminate', label: 'Illuminate', incantation: '6+', target: 'Personal', effect: 'All characters, features, and items within 12" of the Mystic are visible from any distance.', duration: 'Battle', simple: true },
  { key: 'infuse', label: 'Infuse', incantation: '6+', target: '1 ally that is not Wounded', effect: 'As long as the target remains un-Wounded, they receive the Counter Attack ability.', duration: 'Until Wounded', simple: false },
  { key: 'manipulate', label: 'Manipulate', incantation: '6+', target: '1 item', effect: "An item on the ground, in the Mystic's possession, or in an ally's possession may be moved up to 8\" within Line of Sight. If moved into contact with a character, they may pick it up immediately, free.", duration: 'Immediate', simple: true },
  { key: 'mark', label: 'Mark', incantation: '7+', target: '1 enemy', effect: 'All ranged attacks on the selected target receive a +1 bonus to Hit.', duration: 'Full round', simple: false },
  { key: 'meekness', label: 'Meekness', incantation: '7+', target: '1 enemy', effect: 'Enemy melee attacks do +0/+0 damage.', duration: 'Full round', simple: false },
  { key: 'mobility', label: 'Mobility', incantation: '7+', target: '1 ally', effect: 'The character ignores all movement reductions due to Difficult terrain.', duration: 'Battle', simple: false },
  { key: 'premonition', label: 'Premonition', incantation: '7+', target: 'None', effect: 'When rolling for Initiative, 2 dice may be rerolled.', duration: 'Next Initiative Roll', simple: false },
  { key: 'repel', label: 'Repel', incantation: '7+', target: '1 enemy', effect: 'The enemy is pushed directly away D6+1" (Aberrations subtract their current Monster Points from the roll). Can be used to push a figure into danger.', duration: 'Immediate', simple: false },
  { key: 'shadows', label: 'Shadows', incantation: '6+', target: '1 ally', effect: 'Target may immediately move to any location within 4" of their current position — can move through Impassable obstacles or walls, but both positions must be visible to the Mystic.', duration: 'Immediate', simple: false },
  { key: 'shield', label: 'Shield', incantation: '6+', target: '1 ally', effect: "All ranged attacks aimed at the spell's target, or a character within 3\" of them, will Hit only on a natural 6.", duration: 'Full round', simple: false },
  { key: 'slow', label: 'Slow', incantation: '8+', target: 'Up to 3 enemies within 1" of each other', effect: 'Reduce enemy Speed by -2" and Dashing becomes impossible for them. Negates Flying and Slippery traits.', duration: 'Full round', simple: false },
  { key: 'spellbreak', label: 'Spellbreak', incantation: '7+', target: '1 enemy', effect: 'The enemy is unable to cast any spells.', duration: 'Full round', simple: false },
  { key: 'steelbreak', label: 'Steelbreak', incantation: '7+', target: '1 enemy', effect: 'Enemy counts as Armor 0.', duration: 'Full round', simple: false },
  { key: 'summon', label: 'Summon', incantation: '7+', target: 'Ground', effect: 'Summons a magical creature (Agility 2, Speed 6"/+0", Combat +0, Toughness 4, Armor 0, attacks +0/+0, no equipment) in base contact with the Mystic, able to act immediately. Only usable with fewer than 6 warband members and allies on the table.', duration: 'Battle', simple: false },
  { key: 'tinker', label: 'Tinker', incantation: '6+', target: '1 ally', effect: 'Add +2 to any proficiency test.', duration: 'Full round', simple: false },
  { key: 'torment', label: 'Torment', incantation: '8+', target: '1 enemy', effect: 'If the enemy is engaged in melee while Wounded, their opponent receives a Combat Bonus.', duration: 'Battle', simple: false },
  { key: 'waylay', label: 'Waylay', incantation: '8+', target: '1 enemy patrol (Site Battle scenario, p.142)', effect: 'The patrol does not move this round. When next activated, they will begin moving towards a random Exploration Marker.', duration: 'Full round', simple: false },
  { key: 'weaken', label: 'Weaken', incantation: '8+', target: '1 enemy', effect: 'Negates the Tough trait. Has no effect on Aware figures.', duration: 'Battle', simple: false },
];
export function findFiveLeaguesSpell(key) {
  return FIVE_LEAGUES_SPELLS.find((s) => s.key === key) || null;
}
