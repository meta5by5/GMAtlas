// fiveLeaguesOrigins.js — Five Leagues from the Borderlands' "Character
// Origins" (assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf,
// pp.15-19, read directly) — direct follow-up request: "Include racial
// tracking and apply NPC modifiers for the 5LFB ruleset." The real book's
// own 6 origins: Human (the default) plus 5 non-Human origins (Fey-blood,
// Duskling, Preen, Halfling, Feral), each with a Background restriction, a
// Skill expertise (+1 to one named Proficiency Test skill — 5LFB's own 12
// Skills are tracked as free text on this app's character sheet, see data/
// rulesets.js's own doc comment on why, so this is reference text here, not
// an auto-applied numeric bonus), and 2-3 named traits.
//
// What's auto-APPLIED vs. what's reference-only: every trait below is
// surfaced as plain reference text (domain/fiveLeagues.js's
// setEntityFiveLeaguesOrigin doesn't try to simulate melee tactics,
// terrain-triggered Counter Attack, forced movement, or similar tabletop-
// positioning mechanics this app has no model of) EXCEPT the two that
// resolve to a plain, closed-form NUMBER already sitting on this app's own
// flat 5LFB character template (data/rulesets.js — Luck/Will are tracks
// with a `max`): Human's "Driven" (p.18 — "the only characters that can
// ever attain more than one point of Will") and Fey-blood's "Cursed" (p.18
// — "cannot ever attain Luck points"). `willMaxOverride`/`luckMaxOverride`
// (null = no change from the template's own default) are what
// setEntityFiveLeaguesOrigin actually writes back onto the character's own
// Will/Luck track fields when an Origin is set.
export const FIVE_LEAGUES_ORIGINS = [
  {
    key: 'human',
    label: 'Human',
    background: 'Townsfolk, Noble, Frontier, or Zealot',
    skillExpertise: 'Speech',
    willMaxOverride: null, // template default (3) stands — Human is the one origin NOT capped at 1
    luckMaxOverride: null,
    traits: [
      { name: 'Driven', text: 'The only origin that can ever attain more than one point of Will. If a Human Hero gains a Will increase from an Advancement, they also immediately gain 2 Experience Points.' },
    ],
  },
  {
    key: 'feyblood',
    label: 'Fey-blood',
    background: 'Outsider',
    skillExpertise: 'Wits',
    willMaxOverride: 1,
    luckMaxOverride: 0, // Cursed — can never attain Luck points at all
    traits: [
      { name: 'Foresight', text: 'If assigned an initiative die above their Agility, may reroll it (the new roll must remain assigned to them).' },
      { name: 'Aura of Winter', text: 'Melee opponents cannot gain a Combat Bonus for allies when fighting this character.' },
      { name: 'Cursed', text: 'Can never attain Luck points — treat any Luck increase as a skill instead.' },
    ],
  },
  {
    key: 'duskling',
    label: 'Duskling',
    background: 'Outsider',
    skillExpertise: 'Traveling',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Brute charge', text: 'Cannot Parry when moving into melee; may reroll their die in the first exchange.' },
      { name: 'Oath of life', text: 'Gains the Counter Attack ability in melee against undead opponents.' },
      { name: 'Distrust', text: 'Cannot have spells cast on them by other warband members, and may carry only a single magical item at a time.' },
    ],
  },
  {
    key: 'preen',
    label: 'Preen',
    background: 'Townsfolk',
    skillExpertise: 'Crafting',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Outburst', text: 'Becomes Angry if an ally within 6" becomes a casualty, or if Hit by a ranged attack or targeted by a spell — while Angry, must move full Speed + Dash directly at the nearest enemy and engage in melee if contact is made.' },
      { name: 'Swift-footed', text: 'Speed increases by +0" / +1" (Dash).' },
      { name: 'Slight', text: 'Cannot use higher ground to Counter Attack.' },
    ],
  },
  {
    key: 'halfling',
    label: 'Halfling',
    background: 'Frontier',
    skillExpertise: 'Wilderness',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Lucky shot', text: 'Hits a concealed or Cover target on a 5+ when shooting.' },
      { name: 'Slip away', text: 'Never has to roll on the Flight in the Dark table after a battle.' },
      { name: 'Lacking strength', text: 'Cannot use warhammers, bastard swords, or long bows.' },
    ],
  },
  {
    key: 'feral',
    label: 'Feral',
    background: 'Outsider',
    skillExpertise: 'Scouting',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Hunting instincts', text: '+1 to the Enemy Infiltration roll on a Defensive Battle; -1 to the enemy’s roll to spot this character Sneaking Up on a Raid.' },
      { name: 'Loping run', text: 'May move up to a full move and still make ranged attacks (half move if the weapon would normally prohibit movement).' },
      { name: 'Alien', text: 'Receives only a +1 bonus (not the usual +2) from the Leadership, Speech, and Scholar skills on Proficiency Tests.' },
    ],
  },
];

export function findFiveLeaguesOrigin(key) {
  return FIVE_LEAGUES_ORIGINS.find((o) => o.key === key) || null;
}

// Character Origin Table (p.15, D100) — for a GM who wants to randomize an
// Origin rather than pick one. Ranges are inclusive on both ends.
export const FIVE_LEAGUES_ORIGIN_TABLE = [
  { min: 1, max: 40, key: 'human' },
  { min: 41, max: 50, key: 'feyblood' },
  { min: 51, max: 60, key: 'duskling' },
  { min: 61, max: 75, key: 'preen' },
  { min: 76, max: 90, key: 'halfling' },
  { min: 91, max: 100, key: 'feral' },
];

export function originForD100(roll) {
  const n = Math.max(1, Math.min(100, Number(roll) || 1));
  const row = FIVE_LEAGUES_ORIGIN_TABLE.find((r) => n >= r.min && n <= r.max);
  return row ? row.key : 'human';
}
