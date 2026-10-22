// fiveLeaguesCharacter.js — Five Leagues from the Borderlands 3rd Edition
// (assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf, read directly)
// catalogs backing the Character Sheet's Character Type / Background /
// Skills / Armor / Weapon / Item fields. Direct follow-up request:
// "update the character sheet for 5lfb to track character type, skills,
// origins, background, armor, gear storage in self, backpack or stash,
// weapon traits, and spells... per the ruleset." Origins already live in
// the sibling data/fiveLeaguesOrigins.js (an earlier request); everything
// else needed for this one is here. Same "data, not code" posture as every
// other catalog in this directory — no game logic, just real rulebook
// content plus the small lookup/availability helpers that content implies.

// Character Types (p.14) — who a figure IS in the warband, not a game
// mechanic with numbers attached. Tracked as a plain label on the sheet;
// its only real mechanical consequence modeled here is gating the Spells
// section below (Mystics only, per "A Mystic is a spell-casting character").
export const FIVE_LEAGUES_CHARACTER_TYPES = [
  { key: 'hero', label: 'Hero', text: 'Heroes are the cornerstone of your warband. They have increased survival chances, can use any weapons you find, and will improve their abilities quickly as you play the campaign game.' },
  { key: 'avatar', label: 'The Avatar', text: 'The Avatar is a stand-in for you as a player. This figure acts as a Hero, but with additional benefits applied (p.27) — gains 1 point each of Will and Luck at warband creation.' },
  { key: 'mystic', label: 'Mystic', text: 'A Mystic is a spell-casting character. They are always Heroes. There is no origin restriction on Mystics; all origins have some tradition of mystical arts.' },
  { key: 'follower', label: 'Follower', text: 'Assorted hired hands, henchmen, and minions. Followers can fight bravely and can progress in the game, but they are assumed to have less initiative and less skill, and tend to be less permanent.' },
  { key: 'friend', label: 'Friend', text: 'Friends do not take the battlefield except in rare circumstances. Instead, they are people you have come to know, who can occasionally be called upon for aid.' },
  { key: 'enemy', label: 'Enemy', text: 'If they are out to kill you, they are an enemy. Enemies are always controlled by the game system. Enemy leaders are given ranks for simplicity: Sergeant, Lieutenant, and Captain.' },
];
export function findFiveLeaguesCharacterType(key) {
  return FIVE_LEAGUES_CHARACTER_TYPES.find((t) => t.key === key) || null;
}

// The 12 named Skills (p.23's Skills Table) — a character either has a
// skill or doesn't; having it grants +2 on a relevant 2D6 Proficiency Test
// (p.52). This app has no generic 2D6-proficiency-test roller to hang that
// +2 on, so (same disclosed-scope posture as fiveLeaguesOrigins.js's own
// traits) Skills are tracked here as a plain checklist + reference "Uses"
// text, not an automated bonus.
export const FIVE_LEAGUES_SKILLS = [
  { key: 'battlewise', label: 'Battlewise', uses: 'Achieving some battlefield objectives; Seizing the Initiative.' },
  { key: 'crafting', label: 'Crafting', uses: 'Repairs, manual labor, and related haggling.' },
  { key: 'devotion', label: 'Devotion', uses: 'Obtaining blessings; enacting rituals; resisting hostile spells.' },
  { key: 'expertise', label: 'Expertise', uses: 'Dexterity and discretion while avoiding hazards.' },
  { key: 'leadership', label: 'Leadership', uses: 'Inspiring action and trust; recruiting warband members.' },
  { key: 'pathwise', label: 'Pathwise', uses: 'Navigate and avoid obstacles, especially while traveling.' },
  { key: 'scholar', label: 'Scholar', uses: 'Valuable in situations requiring obscure knowledge.' },
  { key: 'scouting', label: 'Scouting', uses: 'Awareness of enemy attackers and the surrounding terrain.' },
  { key: 'speech', label: 'Speech', uses: 'Negotiation, persuasion, and understanding motivations.' },
  { key: 'traveling', label: 'Traveling', uses: 'Overcoming hazards and challenges in the wilderness.' },
  { key: 'wilderness', label: 'Wilderness', uses: 'Hunting and foraging for useful herbs.' },
  { key: 'wits', label: 'Wits', uses: 'Deception and guile, risk-taking, and some trap evasion.' },
];
export function findFiveLeaguesSkill(key) {
  return FIVE_LEAGUES_SKILLS.find((s) => s.key === key) || null;
}

// Backgrounds (pp.19-23) — which ones are legal depends on the character's
// Origin (and, separately, on being a Mystic — see availableFiveLeaguesBackgrounds
// below). allowedOrigins lists the Origin keys (data/fiveLeaguesOrigins.js)
// that may or must take this background; Mystic is left with an empty list
// since it's selected via character TYPE, never Origin.
// Mountain/Downworlder (Compendium's own "New Backgrounds" section, p.73-74
// — direct follow-up request: "update 5LFB origins to expand also to
// include the origins from Compendium") work exactly like every other
// background above; added here (not just referenced from the new Origins
// themselves) so availableFiveLeaguesBackgrounds' existing allowedOrigins
// matching keeps working unchanged for the new Compendium origins below.
export const FIVE_LEAGUES_BACKGROUNDS = [
  { key: 'frontier', label: 'Frontier', text: 'Available to Human characters and must be selected by Halflings. They tend to be resourceful and skilled.', allowedOrigins: ['human', 'halfling'] },
  { key: 'mystic', label: 'Mystic', text: 'Must be selected by Mystic characters, regardless of origin. They are determined, but hampered by the intense focus on magic.', allowedOrigins: [] },
  { key: 'noble', label: 'Noble', text: 'Only available to Human characters. They often come well-equipped.', allowedOrigins: ['human'] },
  { key: 'outsider', label: 'Outsider', text: 'Must be selected by Feral, Duskling, and Fey-blood characters; also available to (or required for) Elriki, Felid, Kobold, and Winged, and one of three options for Gnawling Renegade. They tend to be survivors, relying on their own talents over any advantages of birth.', allowedOrigins: ['feral', 'duskling', 'feyblood', 'elriki', 'felid', 'kobold', 'winged', 'gnawling'] },
  { key: 'townsfolk', label: 'Townsfolk', text: 'Available to Human characters and must be selected by Preen; also one of three options for Dwarves. They tend to have deep pockets.', allowedOrigins: ['human', 'preen', 'dwarf'] },
  { key: 'zealot', label: 'Zealot', text: 'Only available to Human characters; also one of three options for Gnawling Renegade. They are often lucky, as if someone is watching over them.', allowedOrigins: ['human', 'gnawling'] },
  { key: 'mountain', label: 'Mountain', text: "Covers people who grew up in a rough, mountainous area (Compendium, p.73-74). Must be selected by Skysworn; also available to Dwarf, Duskling, and Human characters, and one of two options for Winged.", allowedOrigins: ['dwarf', 'duskling', 'human', 'skysworn', 'winged'] },
  { key: 'downworlder', label: 'Downworlder', text: "Covers characters who grew up in an underworld environment (Compendium, p.73). Must be selected by Deep Kin (exclusively); also one of three options each for Dwarf and Gnawling Renegade.", allowedOrigins: ['dwarf', 'deepkin', 'gnawling'] },
];
export function findFiveLeaguesBackground(key) {
  return FIVE_LEAGUES_BACKGROUNDS.find((b) => b.key === key) || null;
}
// Pure helper (no campaign needed) resolving which background keys are
// selectable right now: Mystic character type forces 'mystic' outright
// (p.21, "must be selected by Mystic characters, regardless of origin");
// otherwise it's whichever non-Mystic backgrounds list this Origin in
// allowedOrigins, or — with no Origin chosen yet — every non-Mystic
// background, so a GM isn't blocked from picking Background before Origin.
export function availableFiveLeaguesBackgrounds(originKey, characterType) {
  if (characterType === 'mystic') return ['mystic'];
  const nonMystic = FIVE_LEAGUES_BACKGROUNDS.filter((b) => b.key !== 'mystic');
  if (!originKey) return nonMystic.map((b) => b.key);
  const matches = nonMystic.filter((b) => b.allowedOrigins.includes(originKey));
  return (matches.length ? matches : nonMystic).map((b) => b.key);
}

// Body Armor (p.62) — a character can only wear one type; this directly
// drives the Character Sheet's existing numeric "Armor" stat field
// (domain/fiveLeagues.js's setEntityFiveLeaguesArmorBody keeps the two in
// sync), since it's a clean, always-active 1:1 number. Shield/Helmet below
// are tracked separately as reference-only booleans — their real benefit
// is situational (ranged-attacks-only, or a specific post-battle Injury
// swap) and this app's Hit resolution doesn't distinguish ranged from
// melee, so folding them into the flat Armor number would overstate it.
export const FIVE_LEAGUES_ARMOR_TYPES = [
  { key: 'unarmored', label: 'Unarmored', armor: 0, note: '' },
  { key: 'light', label: 'Light Armor', armor: 1, note: '' },
  { key: 'partial', label: 'Partial Armor', armor: 2, note: 'Movement is reduced by -0"/-1".' },
  { key: 'full', label: 'Full Armor', armor: 3, note: 'Movement is reduced by -0"/-2".' },
  { key: 'knight', label: 'Knight Armor', armor: 3, note: 'Cannot Dash. Enemies cannot benefit from any bonus to the Overcome Armor roll.' },
];
export function findFiveLeaguesArmorType(key) {
  return FIVE_LEAGUES_ARMOR_TYPES.find((a) => a.key === key) || null;
}
// Improved Armor traits (p.62) — optional add-ons to a worn body armor.
export const FIVE_LEAGUES_ARMOR_TRAITS = [
  { key: 'fine', label: 'Fine', text: 'If Damaged, ignore the damage, but the armor is no longer Fine.' },
  { key: 'feySteel', label: 'Fey Steel', text: 'Partial or full armor only. The armor cannot be Damaged.' },
];
export function findFiveLeaguesArmorTrait(key) {
  return FIVE_LEAGUES_ARMOR_TRAITS.find((t) => t.key === key) || null;
}

// Common Weapon Traits (p.60) plus the Superior Weapon improvement traits
// (p.61) — one combined reference catalog for a Weapon's own "Traits"
// free-text field (unchanged shape, shared with the 5PFH character sheet —
// see data/rulesets.js's own note), surfaced via a <datalist> so a GM
// typing/picking traits sees the real, exact rulebook names rather than
// guessing at wording.
export const FIVE_LEAGUES_WEAPON_TRAITS = [
  { key: 'parry', label: 'Parry', text: 'The item allows the use of the Parry rule (p.42).' },
  { key: 'bulky', label: 'Bulky', text: 'The character cannot use a shield.' },
  { key: 'limitedAmmunition', label: 'Limited Ammunition', text: 'The weapon is subject to the Limited Ammunition rule (p.39).' },
  { key: 'fine', label: 'Fine', text: 'If the weapon would be Damaged, ignore the damage, but the weapon is no longer Fine.' },
  { key: 'balanced', label: 'Balanced', text: 'Melee only. The enemy cannot gain a Counter Attack for any reason.' },
  { key: 'quick', label: 'Quick', text: 'Melee only. The enemy cannot use the Parry ability.' },
  { key: 'feySteel', label: 'Fey Steel', text: 'Standard weapon, fencing sword, or bastard sword only. This weapon cannot be Damaged or broken.' },
  // Not one of the book's own named "Common"/"Superior" Weapon Traits —
  // War Spear's own entry (p.61) just states this ability inline rather
  // than naming a reusable trait the way Parry/Bulky/etc. are. Modeled
  // the same way here anyway (rather than only as free prose in the
  // catalog's own `note`) so it actually appears in a Weapon row's own
  // Traits text when picked (applyFiveLeaguesWeaponCatalogPick, domain/
  // fiveLeagues.js) and so the Combat Tracker's Counter-Attack-available
  // checkbox (direct follow-up request: "Factor in... all other combat
  // conditions... prompt with questions for optional abilities") can
  // detect it automatically as a pre-tick suggestion.
  { key: 'counterAttack', label: 'Counter Attack', text: 'The wielder may strike a Hit even when losing an exchange while in the Defender role (pp.41-42) — normally a terrain-based benefit, but this weapon grants it outright.' },
];
export function findFiveLeaguesWeaponTrait(key) {
  return FIVE_LEAGUES_WEAPON_TRAITS.find((t) => t.key === key) || null;
}

// Weapon Types (pp.60-61) — the real named weapons, each with its Type/
// Range/Overcome Armor/Overcome Toughness profile and inherent traits.
// Used purely as a quick-fill catalog for a Weapon table row (picking one
// fills Name/Range/Damage/Traits via domain/fiveLeagues.js's
// applyFiveLeaguesWeaponCatalogPick) — the row stays a plain free-text
// table afterward, so a GM can still hand-edit anything the catalog can't
// capture (a magic weapon's extra line, a renamed heirloom, ...).
export const FIVE_LEAGUES_WEAPON_CATALOG = [
  { key: 'unarmed', label: 'Unarmed', category: 'basic', type: 'melee', range: '', overcomeArmor: -1, overcomeToughness: -1, traits: [], note: 'Use for an improvised weapon such as a rock, stick, chair leg, saucepan, or simply kicking and punching.' },
  { key: 'light', label: 'Light weapon', category: 'basic', type: 'melee', range: '', overcomeArmor: -1, overcomeToughness: 0, traits: [], note: 'A dagger, cudgel, working tool, or similar.' },
  { key: 'selfBow', label: 'Self bow', category: 'basic', type: 'ranged', range: '18"', overcomeArmor: 0, overcomeToughness: 0, traits: ['bulky', 'limitedAmmunition'], note: 'A light bow often used for hunting.' },
  { key: 'sling', label: 'Sling', category: 'basic', type: 'ranged', range: '10"', overcomeArmor: -1, overcomeToughness: 0, traits: [], note: 'As slings can use simple rocks, characters do not run out of ammunition.' },
  { key: 'staff', label: 'Staff', category: 'basic', type: 'melee', range: '', overcomeArmor: -1, overcomeToughness: 0, traits: ['parry'], note: 'A walking stick that doubles as a defensive implement.' },
  { key: 'standard', label: 'Standard weapon', category: 'basic', type: 'melee', range: '', overcomeArmor: 0, overcomeToughness: 0, traits: [], note: 'A typical short sword, mace, hunting spear, or hatchet.' },
  { key: 'bastardSword', label: 'Bastard sword', category: 'quality', type: 'melee', range: '', overcomeArmor: 0, overcomeToughness: 1, traits: [], note: 'A heavy sword suitable for single- or double-handed use. This profile also covers large war axes.' },
  { key: 'crossbow', label: 'Crossbow', category: 'quality', type: 'ranged', range: '24"', overcomeArmor: 1, overcomeToughness: 0, traits: ['bulky', 'limitedAmmunition'], note: 'The character cannot move and shoot in the same Action.' },
  { key: 'fencingSword', label: 'Fencing sword', category: 'quality', type: 'melee', range: '', overcomeArmor: 0, overcomeToughness: 0, traits: ['parry'], note: 'A quick blade typically intended for single-handed thrusting attacks.' },
  { key: 'longbow', label: 'Longbow', category: 'quality', type: 'ranged', range: '24"', overcomeArmor: 0, overcomeToughness: 0, traits: ['bulky', 'limitedAmmunition'], note: 'A powerful bow, requiring a great deal of strength and training to use.' },
  { key: 'throwingKnives', label: 'Throwing knives', category: 'quality', type: 'ranged', range: '9"', overcomeArmor: -1, overcomeToughness: 0, traits: [], note: 'Single-use, but recovered after the battle if you Hold the Field. Characters may add their Combat Skill, even if they moved.' },
  { key: 'warhammer', label: 'Warhammer', category: 'quality', type: 'melee', range: '', overcomeArmor: 1, overcomeToughness: 0, traits: [], note: 'A spiked hammer, capable of punching through steel plate. This profile can also be used for heavy, thrusting swords.' },
  { key: 'warSpear', label: 'War spear', category: 'quality', type: 'melee', range: '', overcomeArmor: 0, overcomeToughness: 0, traits: ['counterAttack'], note: 'A long spear or other pole arm or long-hafted weapon. The wielder may always Counter Attack in melee combat.' },
];
export function findFiveLeaguesWeapon(key) {
  return FIVE_LEAGUES_WEAPON_CATALOG.find((w) => w.key === key) || null;
}

// Equipment Storage (p.59) — Self is whatever a character is wearing/
// carrying on their person; the Backpack is a SHARED warband pool (holds
// 8 items total, across the whole warband, not per-character); the Stash
// is the warband's unlimited permanent store back at a settlement. This
// app tracks the location as a per-gear-row tag on whichever character's
// sheet the row lives on (no separate cross-entity inventory UI exists),
// so the Backpack's real 8-item cap is surfaced as reference text next to
// the picker rather than mechanically enforced across every party member.
export const FIVE_LEAGUES_GEAR_LOCATIONS = [
  { key: 'self', label: 'Self (worn/carried)' },
  { key: 'backpack', label: 'Backpack (shared, 8-item limit)' },
  { key: 'stash', label: 'Stash (shared, unlimited)' },
];
export function findFiveLeaguesGearLocation(key) {
  return FIVE_LEAGUES_GEAR_LOCATIONS.find((l) => l.key === key) || null;
}

// Assorted Items (pp.63-65) — a quick-fill catalog for the Items table,
// same posture as the Weapon catalog above: picking one just prefills a
// new row's Name/Notes (the row stays freely hand-editable afterward).
// storageMarks reproduces the book's own B/C/W/S letter codes (p.63):
// B = must be in the Backpack to use; C = a Campaign item, usable even
// while Stashed; W = Worn, assigned to one character; S = Single-use.
export const FIVE_LEAGUES_ITEM_CATALOG = [
  { key: 'bandages', label: 'Bandages', storageMarks: ['S', 'B'], text: 'Take a Use Action during battle to negate the effects of 1 Wound.' },
  { key: 'braveMule', label: 'Brave mule', storageMarks: ['C'], text: 'The warband can carry 1 additional Backpack item, for a total of 9 (cannot stack with a second mule).' },
  { key: 'bottleOfRedDuck', label: 'Bottle of Red Duck', storageMarks: ['S', 'B'], text: 'Gives the drinker 1 point of Will, usable any time during a battle; lost when the battle ends.' },
  { key: 'campGear', label: 'Camp gear', storageMarks: ['B'], text: 'When in camp, add +1 to all proficiency tests required by campaign activities or camp events.' },
  { key: 'coilOfRope', label: 'Coil of rope', storageMarks: ['S', 'B'], text: 'When making a [Wilderness] test, you may use the rope to reroll one or both dice.' },
  { key: 'craftingMaterials', label: 'Crafting materials', storageMarks: ['S', 'C'], text: 'Give any one weapon or armor piece the Fine quality.' },
  { key: 'delversKit', label: "Delver's kit", storageMarks: ['S', 'B'], text: 'Automatically pass a failed [Wits] or [Expertise] test during a Site Battle.' },
  { key: 'fineWine', label: 'Fine wine', storageMarks: ['S', 'C'], text: 'Give to a Disgruntled character to remove the status, or sell for D3 Gold Marks.' },
  { key: 'fineArrowsBolts', label: 'Fine Arrows/Bolts', storageMarks: ['W'], text: 'Increase the range of a self bow, longbow, or crossbow by +3".' },
  { key: 'congealedStrands', label: 'Congealed Strands', storageMarks: ['S', 'C'], text: 'Used to cast spells, in place of a normal Strand, at any time — does not expire until used.' },
  { key: 'holyWater', label: 'Holy water', storageMarks: ['S', 'B'], text: 'Requires a Use Action, only usable against Fey or Undead within 6". Hits automatically with +3/+1 to Overcome Armor/Toughness.' },
  { key: 'icon', label: 'Icon', storageMarks: ['W'], text: 'Add +1 to [Devotion] tests.' },
  { key: 'largeQuiver', label: 'Large quiver', storageMarks: ['W'], text: 'A character who would have run out of ranged ammunition may make one additional shot during the battle.' },
  { key: 'mapMakingKit', label: 'Map-making kit', storageMarks: ['S', 'C'], text: 'After traveling between two Map Areas, chart a secure route; traveling that route again may skip the Travel roll.' },
  { key: 'mistyWaterFlower', label: 'Misty water-flower', storageMarks: ['S', 'C'], text: 'A character recovering from a Poison/similar casualty skips the post-battle Injury Table roll.' },
  { key: 'mysticTrinket', label: 'Mystic trinket', storageMarks: ['S', 'B'], text: 'A Mystic may use this to cast a second spell in the same battle round.' },
  { key: 'mysticalRing', label: 'Mystical ring', storageMarks: ['W'], text: 'Each time the wearing Hero gains an experience advancement roll, roll 2D6 — on an 11 or 12, receive a vision granting a Quest.' },
  { key: 'potionOfFortune', label: 'Potion of fortune', storageMarks: ['S', 'B'], text: 'The first time the character suffers any ill effect (Stun, Wound, or casualty) from a physical source, ignore it completely.' },
  { key: 'ironshieldRoot', label: 'Ironshield root', storageMarks: ['S', 'C'], text: 'Use before an encounter for a +1 Toughness bonus (max 6) for the duration of the battle.' },
  { key: 'oldDustyManual', label: 'Old dusty manual', storageMarks: ['S', 'C'], text: 'Studying it grants a permanent +1 bonus to proficiency tests using one randomly-selected skill, cumulative with the normal skill bonus. The book falls apart after use.' },
  { key: 'rangersCloak', label: "Ranger's cloak", storageMarks: ['W'], text: 'Grants +1 to [Wilderness] and [Scouting] tests (non-cumulative with the skill bonus if the character has either skill).' },
  { key: 'rations', label: 'Rations', storageMarks: ['S', 'C'], text: 'When rolling for Upkeep Costs, consume rations to reduce the cost by 3 Gold Marks (once per roll).' },
  { key: 'repairKit', label: 'Repair kit', storageMarks: ['S', 'C'], text: 'Use this to fix any one Damaged item.' },
  { key: 'scoutsCloak', label: "Scout's cloak", storageMarks: ['W'], text: "Rolls to spot this character during a Raid scenario's Sneak Up step are at a -2 modifier." },
  { key: 'setOfAlarmTraps', label: 'Set of alarm traps', storageMarks: ['S', 'B'], text: 'During a Defensive Battle, add +1 to every spotting roll made during the Enemy Infiltration step.' },
  { key: 'silvertreeLeaf', label: 'Silvertree leaf', storageMarks: ['S', 'C'], text: 'One dose rerolls a post-game Injury result; if the character would have died, recovery time increases by +D3 campaign turns instead. No effect on Flight in the Dark Tables.' },
  { key: 'spellBreakerHerb', label: 'Spell-breaker herb', storageMarks: ['S', 'C'], text: 'When targeted by a spell, use these herbs to nullify the effect entirely for this character.' },
  { key: 'springwindBerries', label: 'Springwind berries', storageMarks: ['S', 'C'], text: 'Use before an encounter — increase Speed by +1"/+1" for the duration of the encounter.' },
  { key: 'strangeMap', label: 'Strange map', storageMarks: ['S', 'B'], text: 'Add an Unexplored Location to the Wilderness of your campaign map.' },
  { key: 'talisman', label: 'Talisman', storageMarks: ['S', 'W'], text: 'If a post-battle Injury/Flight in the Dark roll would kill the character, roll D6 — on a 5-6 they miraculously survive. The talisman is lost either way.' },
  { key: 'thiefTools', label: 'Thief tools', storageMarks: ['W'], text: 'Grants a +1 bonus to all [Expertise] tests, cumulative with a skill bonus.' },
  { key: 'tonic', label: 'Tonic', storageMarks: ['S', 'C'], text: "Reduce a character's recovery time by 1 campaign turn (one tonic per character per campaign turn)." },
  { key: 'torch', label: 'Torch', storageMarks: ['S', 'B'], text: 'A warband member not using a shield or a Bulky weapon may carry a torch, creating 6" of visibility.' },
  { key: 'vitalInformation', label: 'Vital information', storageMarks: ['S', 'C'], text: 'Roll D6 for one of several campaign benefits — revealing a Hidden location, bonus Adventure Points, an early Quest Find roll, and more.' },
];
export function findFiveLeaguesItem(key) {
  return FIVE_LEAGUES_ITEM_CATALOG.find((i) => i.key === key) || null;
}
