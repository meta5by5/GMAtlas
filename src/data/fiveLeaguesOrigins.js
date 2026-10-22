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

// The Compendium's own "New Origins" chapter (Five Leagues from the
// Borderlands: Compendium, read directly — pp.65-73, the "Paths in the
// Wilderness" expansion) — direct follow-up request: "update 5LFB origins
// to expand also to include the origins from Compendium if that is
// enabled license." Gated behind the 'fiveleagues-compendium' Supplement
// Activation (data/rulesConstitution.js's GAME_SYSTEM_SUPPLEMENTS) rather
// than always-on, same ownership-confirmation posture as the base
// `fiveleagues` system itself — the UI origin picker (drawers/index.js's
// fiveLeaguesTypeAndOriginRowHtml) only offers these when that supplement
// is active; findFiveLeaguesOrigin below still resolves them unconditionally
// so a character who already has one set keeps displaying it correctly
// even if the supplement is later deactivated.
//
// Deliberately excludes this SAME chapter's "Chitters" origin and the
// Duster/Dustling/Dizhar origin VARIANTS (pp.10-13) — those are specific to
// recruiting in "The Dust," a separate standalone supplement region with
// its own chargen caveats (e.g. a Human must additionally choose Outlander-
// vs-Duster), not a clean drop-in addition to this flat Origin list the way
// the 8 below are. Not modeled; can be added later as its own thing if
// asked for.
//
// Will/Luck caps: none of these 8 states its own override except Skysworn
// ("They do not receive the Driven trait" — explicitly denying the one
// Human-only rule that permits >1 Will — so it gets the SAME willMaxOverride
// as every other non-Human core origin); none mentions a Luck restriction,
// so all 8 use the same null/1 shape Duskling/Preen/Halfling/Feral already
// use above. `skillExpertise` is usually one skill, but Deep Kin's is three
// at once and Elriki's book text is explicit that they get none at all
// (`null`) — the UI (drawers/index.js) renders both shapes.
export const FIVE_LEAGUES_COMPENDIUM_ORIGINS = [
  {
    key: 'deepkin',
    label: 'Deep Kin',
    background: 'Downworlder (exclusively — cannot select any other background)',
    skillExpertise: 'Scouting, Crafting, Wits',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Born Below', text: 'When Dashing, may move through any figures in their path, whether friend or foe, for the entire move (not just the Dash segment). No movement penalty underground, and can see in darkness (even magical darkness) out to 9".' },
      { name: 'Deep Kin Fate', text: 'Cannot learn any skill under any circumstances, during character creation or the campaign — instead receive a Deep Token each time they would, usable at any time to avoid a roll just made on the post-game injury table (even after healing remedies). Multiple Deep Kin in the same warband share one pool of Deep Tokens.' },
      { name: 'No Magic', text: 'Deep Kin cannot be Mystics under any circumstances.' },
    ],
  },
  {
    key: 'dwarf',
    label: 'Dwarf',
    background: 'Downworlder, Mountain, or Townsfolk (may also be Mystics without changing background)',
    skillExpertise: 'Pathwise',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Adapted to the Underworld', text: 'Sense all living creatures within 12" — no darkness, fog, or magical effect reduces this (does not detect Undead-trait creatures or constructs). No movement penalty underground or in Delves.' },
      { name: 'Bitter Fighting', text: 'Any opponent that knocks out a warband member gets a Vengeance marker for the rest of the battle; Dwarves get a Combat Bonus in melee against a Vengeance-marked enemy, but cannot fight defensively or evasively against one.' },
      { name: 'Stalwart', text: 'Immune to all fear effects, even magical. Cannot be physically moved by magic (even friendly) or pushed/knocked back by any enemy ability, and do not normally retreat during melee — movement-related magical items still work normally.' },
      { name: 'Deliberate', text: 'Dash move is reduced by 2" (minimum 0").' },
    ],
  },
  {
    key: 'elriki',
    label: 'Elriki',
    background: 'Outsider (exclusively — cannot begin as a Mystic, but may learn during the campaign)',
    skillExpertise: null,
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Swamp Home', text: 'No movement penalty in water or swamp terrain, and endure substantial heat — never affected by Exhaustion.' },
      { name: 'Awkward Gait', text: 'Dash move is adjusted by -1" compared to normal. Cannot gain a Combat Advantage from nearby allies (though can still provide one to another character).' },
      { name: 'Forceful Throw', text: 'May throw sharp rocks or wood while moving at full speed, adding Combat Skill to the attack roll; damage is +0/+0 with normal ammunition rules.' },
    ],
  },
  {
    key: 'felid',
    label: 'Felid',
    background: 'Outsider (must take, even if a Mystic)',
    skillExpertise: 'Wilderness',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Natural Weapons', text: 'Never unarmed in melee combat (razor claws/fangs). Striking an opponent with no allies within 1" deals +0/+1 damage with claws; +0/+0 otherwise.' },
      { name: 'Stalking', text: 'If at least partially obscured by terrain with no allies within 4", missile attacks (including magical ones using a standard hit roll) only hit on a natural 6, regardless of the attacker\'s Combat Skill.' },
      { name: 'Curiosity', text: 'If an unexplored/unrevealed token or marker is on the battlefield, a Felid activating in the Fast Actions Phase must move closer to the nearest accessible one (may move around obstacles in the way).' },
    ],
  },
  {
    key: 'gnawling',
    label: 'Gnawling Renegade',
    background: 'Outsider, Downworlder, or Zealot (cannot begin as a Mystic, but may learn during the campaign)',
    skillExpertise: 'Devotion',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Group Loyalty', text: 'If a Gnawling activates in the Fast Actions Phase without engaging in combat, it provides a Combat Bonus to allies within 2" instead of the usual 1" (the ally must activate after the Gnawling, in either Phase).' },
      { name: 'Skitter and Crawl', text: 'Not slowed by Difficult terrain or by fighting underground (including Delves). Crosses water features at normal speed but cannot take actions or Dash while in the water.' },
      { name: 'Enmity', text: 'When fighting another Gnawling in melee, all blows from both combatants deal +0/+1 damage — this does not apply to follow-up effects such as injury rolls or secondary effects.' },
    ],
  },
  {
    key: 'kobold',
    label: 'Kobold',
    background: 'Outsider (may be Mystics, but must then use the Mystic background instead)',
    skillExpertise: 'Expertise',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Discretion is the Better Part of Being a Kobold', text: 'With no enemies in Line of Sight, may flee the battlefield when selected to act (removed from play as if having moved off a battlefield edge) — even in scenarios requiring a specific location to escape, though this cannot satisfy a scenario victory condition. Any required roll on the Flight in the Dark table is always treated as no effect.' },
      { name: 'Danger Sense', text: 'When hit, or subjected to a trap/hazard effect, hostile spell, or harmful random event, may roll 1D6 — a 6 avoids the effect completely (follow-up effects still apply normally).' },
      { name: 'Lacking Strength', text: 'Cannot use warhammers, bastard swords, or longbows, and cannot wear Full or Knight Armor.' },
    ],
  },
  {
    key: 'skysworn',
    label: 'Skysworn',
    background: 'Mountain (exclusively — may be Mystics, but still uses the Mountain background)',
    skillExpertise: 'Battlewise',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Treated as Human', text: 'Any rule, spell, or ability that singles out human characters applies to Skysworn too — but they do NOT receive the Driven trait (so, unlike Humans, they stay capped at 1 point of Will).' },
      { name: 'Daring', text: 'When fighting hand to hand against an enemy with a higher base Combat Skill (before modifiers on either side), may add +1 to either the roll against Toughness or Armor per hit inflicted — cumulative with weapon bonuses.' },
      { name: 'Pragmatic Outlook', text: 'Take a -2 penalty to Devotion and Scholar Proficiency Tests (though training can still raise the final modifier to +0). If targeted by a hostile spell or magical attack, roll 1D6 — on a 6, it is nullified entirely, even for other targets.' },
      { name: 'Hazy Touch of Winter', text: 'If a Skysworn Mystic fails to cast a spell, they cannot cast again that battle, but may immediately take another full activation (move + act) instead — not if the spell was cancelled by an enemy ability.' },
    ],
  },
  {
    key: 'winged',
    label: 'Winged',
    background: 'Mountain or Outsider (may be Mystics without being required to pick the Mystic background)',
    skillExpertise: 'Leadership',
    willMaxOverride: 1,
    luckMaxOverride: null,
    traits: [
      { name: 'Charmed Existence', text: 'If an injury\'s initial recovery time would be 3+ turns, reduce it by one. Never affected by disease of any kind, including magical.' },
      { name: 'Winged Movement', text: 'Takes no falling/jumping damage from a ledge, and may land anywhere within half the obstacle\'s height below, moving normally from there. When Dashing, may ignore terrain that can be moved over (water, chasms, mud) — not Entangling terrain like ruins or woods, which blocks this entirely. May opt to move normally on the ground instead.' },
      { name: 'Armor Limitations', text: 'Cannot wear armor (including magical) with a base Armor rating above 1; protective items with no Armor rating are unaffected.' },
    ],
  },
];

export function findFiveLeaguesOrigin(key) {
  return FIVE_LEAGUES_ORIGINS.find((o) => o.key === key) || FIVE_LEAGUES_COMPENDIUM_ORIGINS.find((o) => o.key === key) || null;
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
