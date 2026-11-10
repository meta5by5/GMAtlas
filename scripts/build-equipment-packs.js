// build-equipment-packs.js — writes the five equipment content packs
// (assets/content-packs/*-equipment-content-pack.json) from the lists below:
// every weapon and piece of equipment listed in Five Parsecs from Home
// (3rd ed.), its Compendium (incl. Bug Hunt), Planetfall, Five Leagues from
// the Borderlands (3rd ed.) and its Compendium. Run: node scripts/build-equipment-packs.js
//
// Each item becomes an Item entity with a gear statblock for its game
// (5PFH-family books use the '5pfh' gear template, Five Leagues the
// 'fiveleagues' one) and tags for the list it came from: #weapon (plus
// #melee or #ranged) or #gear (plus the list's own tag, e.g. #implant).
// Weapon and armor profiles are the books' game statistics; effects are
// short summaries in our own words, not the books' text, each citing its
// page. Each pack is tied to its book's license in
// src/data/contentPacksManifest.js, so Settings › Campaigns › Source Data
// offers it only while that book is in use in the campaign.
//
// Import skips an entity whose name the campaign already has, so a variant
// of an item another pack also lists (the Compendium's Dramatic Weapons,
// Bug Hunt's arsenal, Planetfall's colonial weapons, Deep Below's gear) is
// named with its source, e.g. "Hand cannon (Bug Hunt)".

import { writeFileSync } from 'node:fs';
import { FIVE_LEAGUES_WEAPON_CATALOG, FIVE_LEAGUES_ITEM_CATALOG, FIVE_LEAGUES_WEAPON_TRAITS } from '../src/data/fiveLeaguesCharacter.js';

const CREATED = '2026-11-09T00:00:00.000Z';
const SCHEMA = 1;
const PFH_KEYS = ['Range', 'Shots', 'Damage', 'Traits', 'Type', 'Saving Throw', 'Effect', 'Cost'];
const FL_KEYS = ['Type', 'Range', 'Damage', 'Armor', 'Traits', 'Storage', 'Effect', 'Cost'];

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// --- item builders --------------------------------------------------------

/** A 5PFH-family weapon: [name, range, shots, damage, traits]. */
function pfhWeapons(rows, { page, book, variant } = {}) {
  return rows.map(([name, range, shots, damage, traits, note]) => {
    const melee = /^brawl/i.test(range);
    const t = traits && traits !== '-' && traits !== '--' ? traits : '';
    return {
      name, variant, book, page,
      tags: ['weapon', melee ? 'melee' : 'ranged', ...(/single.?use/i.test(t) || /grenade/i.test(name) ? ['grenade'] : [])],
      ruleset: '5pfh',
      stats: { Range: melee ? 'Brawl' : range, Shots: shots === '-' || shots === '--' ? '' : shots, Damage: damage, Traits: t, Type: melee ? 'Melee weapon' : 'Ranged weapon', Effect: note || '' },
      summary: `${melee ? 'Melee' : 'Ranged'} weapon: ${melee ? 'Brawl' : `Range ${range}`}${shots && shots !== '-' && shots !== '--' ? `, Shots ${shots}` : ''}, Damage ${damage}${t ? `. Traits: ${t}` : ''}.${note ? ` ${note}` : ''}`,
    };
  });
}

/** 5PFH-family gear: [name, effect, extra stats]. */
function pfhGear(listTag, typeLabel, rows, { page, book, variant } = {}) {
  return rows.map(([name, effect, extra = {}]) => ({
    name, variant, book, page,
    tags: ['gear', listTag, ...(extra.tags || [])],
    ruleset: '5pfh',
    stats: { Type: extra.type || typeLabel, 'Saving Throw': extra.save || '', Effect: effect, Cost: extra.cost || '', Range: extra.range || '', Shots: extra.shots || '', Damage: extra.damage || '', Traits: extra.traits || '' },
    summary: `${extra.type || typeLabel}. ${effect}`,
  }));
}

/** Five Leagues weapon: [name, 'melee'|'ranged', range, damage, traits, effect, cost]. */
function flWeapons(rows, { page, book, variant, extraTags = [] } = {}) {
  return rows.map(([name, kind, range, damage, traits, effect, cost]) => ({
    name, variant, book, page,
    tags: ['weapon', kind, ...extraTags],
    ruleset: 'fiveleagues',
    stats: { Type: kind === 'melee' ? 'Melee weapon' : 'Ranged weapon', Range: range || '', Damage: damage || '', Traits: traits || '', Effect: effect || '', Cost: cost || '' },
    summary: `${kind === 'melee' ? 'Melee' : 'Ranged'} weapon${range ? `, Range ${range}` : ''}${damage ? `, Damage ${damage} (Overcome Armor / Toughness)` : ''}${traits ? `. Traits: ${traits}` : ''}.${effect ? ` ${effect}` : ''}`,
  }));
}

/** Five Leagues gear: [name, effect, {storage, armor, type, cost}]. */
function flGear(listTag, typeLabel, rows, { page, book, variant, extraTags = [] } = {}) {
  return rows.map(([name, effect, extra = {}]) => ({
    name, variant, book, page,
    tags: ['gear', listTag, ...extraTags, ...(extra.tags || [])],
    ruleset: 'fiveleagues',
    stats: { Type: extra.type || typeLabel, Armor: extra.armor || '', Storage: extra.storage || '', Effect: effect, Cost: extra.cost || '', Range: extra.range || '', Damage: extra.damage || '', Traits: extra.traits || '' },
    summary: `${extra.type || typeLabel}${extra.armor ? `, Armor ${extra.armor}` : ''}${extra.storage ? ` (${extra.storage})` : ''}. ${effect}`,
  }));
}

// --- Five Parsecs from Home (3rd ed.) core -------------------------------

const PFH_BOOK = 'Five Parsecs from Home';
const pfhCore = [
  ...pfhWeapons([
    ['Auto rifle', '24"', '2', '0', '-'],
    ['Beam pistol', '10"', '1', '1', 'Pistol, Critical'],
    ['Blade', 'Brawl', '-', '0', 'Melee'],
    ['Blast pistol', '8"', '1', '1', 'Pistol'],
    ['Blast rifle', '16"', '1', '1', '-'],
    ['Boarding saber', 'Brawl', '-', '1', 'Melee, Elegant'],
    ['Brutal melee weapon', 'Brawl', '-', '1', 'Melee, Clumsy'],
    ['Cling fire pistol', '12"', '2', '1', 'Focused, Terrifying'],
    ['Colony rifle', '18"', '1', '0', '-'],
    ['Dazzle grenade', '6"', '1', 'NA', 'Area, Stun, Single use'],
    ['Duelling pistol', '8"', '1', '0', 'Pistol, Critical'],
    ['Flak gun', '8"', '2', '1', 'Focused, Critical'],
    ['Frakk grenade', '6"', '2', '0', 'Heavy, Area, Single use'],
    ['Fury rifle', '24"', '1', '2', 'Heavy, Piercing'],
    ['Glare sword', 'Brawl', '-', '0', 'Melee, Elegant, Piercing'],
    ['Hand cannon', '8"', '1', '2', 'Pistol'],
    ['Hand flamer', '12"', '2', '1', 'Focused, Area'],
    ['Hand laser', '12"', '1', '0', 'Snap Shot, Pistol'],
    ['Hand gun', '12"', '1', '0', 'Pistol'],
    ['Hold out pistol', '4"', '1', '0', 'Pistol, Melee'],
    ['Hunting rifle', '30"', '1', '1', 'Heavy'],
    ['Hyper blaster', '24"', '3', '1', '-'],
    ['Infantry laser', '30"', '1', '0', 'Snap Shot'],
    ['Machine pistol', '8"', '2', '0', 'Pistol, Focused'],
    ["Marksman's rifle", '36"', '1', '0', 'Heavy'],
    ['Military rifle', '24"', '1', '0', '-'],
    ['Needle rifle', '18"', '2', '0', 'Critical'],
    ['Plasma rifle', '20"', '2', '1', 'Focused, Piercing'],
    ['Power claw', 'Brawl', '-', '3', 'Melee, Clumsy'],
    ['Rattle gun', '24"', '3', '0', 'Heavy'],
    ['Ripper sword', 'Brawl', '-', '1', 'Melee'],
    ['Scrap pistol', '9"', '1', '0', 'Pistol'],
    ['Shatter axe', 'Brawl', '-', '2', 'Melee'],
    ['Shell gun', '30"', '2', '0', 'Heavy, Area'],
    ['Shotgun', '12"', '2', '1', 'Focused'],
    ['Suppression maul', 'Brawl', '-', '1', 'Melee, Impact'],
  ], { book: PFH_BOOK, page: 50 }),
  ...pfhGear('gun-mod', 'Gun mod', [
    ['Assault blade', 'Weapon gains the Melee trait and +1 Damage, and wins a Brawl on a draw. Not for Pistols.'],
    ['Beam light', 'In reduced visibility, the user sees +3" further.'],
    ['Bipod', '+1 to Hit beyond 8" when Aiming or firing from Cover. Not for Pistols.'],
    ['Hot shot pack', 'Blast pistol, Blast rifle, Hand laser or Infantry laser only: +1 Damage, but any natural 6 to Hit overheats the weapon for the rest of the fight.'],
    ['Cyber-configurable nano-sludge', 'Permanent +1 to Hit.'],
    ['Stabilizer', 'The weapon ignores the Heavy trait.'],
    ['Shock attachment', 'The weapon has the Impact trait against targets within 8".'],
    ['Upgrade kit', '+2" Range.'],
  ], { book: PFH_BOOK, page: 53 }),
  ...pfhGear('gun-sight', 'Gun sight', [
    ['Laser sight', 'The weapon gains Snap Shot. Pistols only.'],
    ['Quality sight', '+2" Range, and reroll 1s when firing a single shot.'],
    ['Seeker sight', '+1 to Hit if the shooter did not Move this round.'],
    ['Tracker sight', '+1 to Hit against the target fired at in the previous round.'],
    ['Unity battle sight', '+1 to all Hit rolls.'],
  ], { book: PFH_BOOK, page: 53 }),
  ...pfhGear('consumable', 'Consumable (single-use)', [
    ['Booster pills', 'Removes all Stun markers, and the user may move at double Speed this round.'],
    ['Combat serum', '+2" Speed and +2 Reactions for the rest of the battle.'],
    ['Kiranin crystals', 'Dazzles every character within 4" (not the user) who has not yet acted, so they cannot act this round; they still defend in a Brawl.'],
    ['Rage out', '+2" Speed and +1 to Brawling rolls this round and next (all battle for a K\'Erin).'],
    ['Still', '+1 to Hit, but the user cannot Move this round or next.'],
    ['Stim-pack', 'Used reflexively when the character would become a casualty: they stay on the table with one Stun marker instead.'],
  ], { book: PFH_BOOK, page: 54 }),
  ...pfhGear('protective-device', 'Armor', [
    ['Battle dress', 'Counts as +1 Reactions (to a maximum of 4).', { save: '5+', tags: ['armor'] }],
    ['Camo cloak', 'Within 2" of Cover counts as in Cover, unless the shooter is within 4".', { type: 'Screen', tags: ['screen'] }],
    ['Combat armor', 'Armor saving throw.', { save: '5+', tags: ['armor'] }],
    ['Deflector field', 'Automatically deflects one ranged Hit per battle; choose to use it before Toughness or armor rolls.', { type: 'Screen', tags: ['screen'] }],
    ['Flak screen', 'Area weapon hits on the wearer have Damage -1 (to a minimum of +0).', { type: 'Screen', tags: ['screen'] }],
    ['Flex-armor', 'If the wearer did not move on their last activation, +1 Toughness (to a maximum of 6).', { tags: ['armor'] }],
    ['Frag vest', 'Saving throw 6+, improved to 5+ against Area attacks.', { save: '6+ (5+ vs Area)', tags: ['armor'] }],
    ['Screen generator', 'Saving throw against gunfire only; no effect against Area or Melee attacks.', { type: 'Screen', save: '5+ (gunfire)', tags: ['screen'] }],
    ['Stealth gear', 'Enemies shooting from over 9" are -1 to Hit.', { tags: ['armor'] }],
  ], { book: PFH_BOOK, page: 54 }),
  ...pfhGear('implant', 'Implant', [
    ['AI companion', 'Roll Savvy tests twice and keep the better.'],
    ['Body wire', '+1 Reactions.'],
    ['Boosted arm', '+2" Grenade range, and may climb onto an obstacle no taller than the figure as a Free Action at the end of a move.'],
    ['Boosted leg', '+1" to base move and Dash speed.'],
    ['Cyber hand', 'Build one owned Pistol into the hand: half Range, but always +1 to Hit and +1 more when Brawling.'],
    ['Genetic defenses', 'Saving throw 5+ against poison, viruses, gas and disease.'],
    ['Health boost', 'Post-battle Injury recovery of 2+ turns is 1 turn shorter; Toughness 3 becomes 4.'],
    ['Nerve adjuster', 'Saving throw 5+ to avoid any Stun.'],
    ['Neural optimization', 'The character cannot be Stunned.'],
    ['Night sight', 'No visibility reduction from darkness (smoke, gas etc. still apply).'],
    ['Pain suppressor', 'Can do crew tasks while in Sick Bay (but not fight).'],
  ], { book: PFH_BOOK, page: 55 }),
  ...pfhGear('utility-device', 'Utility device', [
    ['Auto sensor', 'When an enemy starts or ends a move within 4" and in sight, fire one Pistol shot at it, hitting only on a natural 6.'],
    ['Battle visor', 'Reroll 1s on the firing dice.'],
    ['Communicator', 'Roll one extra die for Reactions each round, then discard one.'],
    ['Concealed blade', 'Once per battle, if starting the round within 2" of an enemy, throw it as a Free Action (Damage +0); replaced for free afterwards.'],
    ['Displacer', 'Once per mission instead of Moving: teleport 1D6" in a random direction from a point in sight; landing inside an obstacle breaks it until Repaired.'],
    ['Distraction bot', 'Once per battle (Combat Action): an enemy within 12" cannot act on its next activation.'],
    ['Grapple launcher', 'Combat Action: climb a terrain feature within 1", up to 12", to a standable surface.'],
    ['Grav dampener', 'No falling damage; a drop over 6" uses the character\'s Move.'],
    ['Hazard suit', 'Saving throw 5+ against environmental hazard Hits.', { save: '5+ (hazards)' }],
    ['Hover board', 'Move up to 9" over man-height terrain instead of walking; no combat while riding.'],
    ['Insta-wall', 'Once per mission (Combat Action): place a 2" man-height force wall within 3" that blocks attacks; it fades on a 6 each round.'],
    ['Jump belt', 'Instead of Moving, jump up to 9" forward and 3" up, then act normally.'],
    ['Motion tracker', '+1 to Seize the Initiative rolls.'],
    ['Multi-cutter', 'Combat Action: cut a man-sized hole through terrain up to 1" thick (not force fields).'],
    ["Robo-rabbit's foot", 'Luck 0 counts as Luck 1; if the bearer would die, the foot is destroyed instead of an Injury roll.'],
    ['Scanner bot', '+1 to Seize the Initiative rolls for the crew.'],
    ['Snooper bot', 'Before battle, ignore a penalty to Seize the Initiative; the bot is Damaged on a 1.'],
    ['Sonic emitter', 'Enemies within 5" are -1 to Hit when shooting.'],
    ['Steel boots', 'On winning a Brawl with a natural 5-6, kick instead: Damage +0 and knock the target 1D3" back.'],
    ['Time distorter', 'Single-use Free Action: freeze up to 3 enemies until the end of next round.'],
  ], { book: PFH_BOOK, page: 56 }),
  ...pfhGear('on-board-item', 'On-board item', [
    ['Analyzer', '+1 when rolling for Rumors becoming a Quest and for Quest resolution.'],
    ['Colonist ration packs', 'Single-use: skip Upkeep for one turn and gain +1 story point.'],
    ['Duplicator', 'Single-use: copy any one item in inventory (not another Duplicator).'],
    ['Fake ID', '+1 to obtain a license or other legal document.'],
    ['Fixer', 'Single-use: repair one damaged or destroyed personal item for free.'],
    ['Genetic reconfiguration kit', 'Single-use: an ability score upgrade costs 2 XP less (not Bots or Soulless; K\'Erin Toughness only).'],
    ['Loaded dice', 'Each turn one crew member gambles 1D6: 1-4 earns that many credits, 5 nothing, 6 loses the dice and an Injury roll.'],
    ['Lucky dice', 'Each turn one crew member gambles for +1 credit.'],
    ['Mk II translator', 'Roll an extra D6 when Recruiting.'],
    ['Med-patch', 'Single-use: one turn off an Injury recovery.'],
    ['Meditation orb', 'Single-use: +2 story points; Swift and Precursor crew gain +1 XP.'],
    ['Nano-doc', 'Single-use: prevent one post-battle Injury roll (decide before rolling).'],
    ['Novelty stuffed animal', 'Single-use: a crew member (not Soulless, K\'Erin or Bot) gains +1 XP, and +1 story point on a 6.'],
    ['Purifier', 'Each turn, makes clean water worth 1 credit (one Purifier at a time).'],
    ['Repair Bot', '+1 to Repair attempts.'],
    ['Sector permit', 'Where a license is required, roll 1D6 per license: 4+ the permit is accepted.'],
    ['Spare parts', '+1 to Repair attempts; used up on a natural 1.'],
    ['Teach-bot', 'Single-use: a character on the Train crew task earns 1D6 extra XP.'],
    ['Transcender', 'Single-use: the user gains +1 XP and the crew +2 story points.'],
  ], { book: PFH_BOOK, page: 57 }),
];

// --- Five Parsecs Compendium (incl. Bug Hunt) ----------------------------

const CBH_BOOK = 'Five Parsecs from Home Compendium';
const cbh = [
  ...pfhWeapons([
    ['Auto rifle', '24"', '2', '0', '-'],
    ['Beam pistol', '8"', '1', '1', 'Pistol, Critical'],
    ['Blade', 'Brawl', '-', '1', 'Melee'],
    ['Blast pistol', '6"', '1', '1', 'Pistol'],
    ['Blast rifle', '18"', '1', '1', '-'],
    ['Boarding saber', 'Brawl', '-', '2', 'Melee, Elegant'],
    ['Brutal melee weapon', 'Brawl', '-', '2', 'Melee, Clumsy'],
    ['Cling fire pistol', '9"', '2', '1', 'Focused, Burn'],
    ['Colony rifle', '18"', '1', '0', '-'],
    ['Dazzle grenade', '6"', '-', 'NA', 'Area, Stun, Single use'],
    ['Duelling pistol', '6"', '1', '0', 'Pistol, Critical'],
    ['Flak gun', '9"', '2', '1', 'Focused, Shrapnel'],
    ['Frakk grenade', '6"', '-', '0', 'Area, Single use'],
    ['Fury rifle', '24"', '1', '2', 'Heavy, Piercing, Shockwave'],
    ['Glare sword', 'Brawl', '-', '1', 'Melee, Elegant, Piercing'],
    ['Hand cannon', '6"', '1', '2', 'Pistol'],
    ['Hand flamer', '8"', '-', '1', 'Area, Burn'],
    ['Hand gun', '9"', '1', '0', 'Pistol'],
    ['Hand laser', '9"', '1', '0', 'Pistol, Snap Shot'],
    ['Hold out pistol', '4"', '1', '0', 'Melee'],
    ['Hunting rifle', '30"', '1', '1', 'Heavy, Critical'],
    ['Hyper blaster', '24"', '3', '1', 'Overheat'],
    ['Infantry laser', '30"', '1', '0', 'Snap Shot'],
    ['Machine pistol', '6"', '2', '0', 'Pistol, Focused'],
    ["Marksman's rifle", '36"', '1', '0', 'Critical'],
    ['Military rifle', '24"', '1', '0', '-'],
    ['Needle rifle', '18"', '1', '0', 'Critical, Piercing'],
    ['Plasma rifle', '20"', '2', '1', 'Focused, Piercing, Overheat'],
    ['Power claw', 'Brawl', '-', '3', 'Melee, Clumsy, Piercing'],
    ['Rattle gun', '24"', '3', '0', 'Heavy'],
    ['Ripper sword', 'Brawl', '-', '2', 'Melee'],
    ['Scrap pistol', '7"', '1', '0', 'Pistol'],
    ['Shatter axe', 'Brawl', '-', '3', 'Melee, Clumsy, Shockwave'],
    ['Shell gun', '18"', '-', '0', 'Area'],
    ['Shotgun', '8"', '1', '1', 'Critical'],
    ['Suppression maul', 'Brawl', '-', '2', 'Melee, Stun'],
  ], { book: CBH_BOOK, page: 88, variant: 'Dramatic' }).map((i) => ({ ...i, tags: [...i.tags, 'dramatic-weapons'] })),
  ...pfhGear('psionic-equipment', 'Utility', [
    ['Warding Shrel', 'If the wearer would suffer psionic Strain, it is avoided and the device shuts down for the battle. Two Shrels cancel each other out.', { cost: '10 Credits' }],
    ['Psionic Focus', '+1" range to all psionic powers.', { cost: '10 Credits' }],
    ['Nullification surgery', 'The character permanently loses all psionic abilities.', { type: 'Implant', cost: '3 Credits' }],
  ], { book: CBH_BOOK, page: 27 }),
  ...pfhGear('bot-upgrade', 'Bot upgrade', [
    ['Built-in weapon', 'Build any weapon into the chassis, ignoring its Heavy and Clumsy traits; 1 Credit to revert.', { cost: '3 Credits per Shot + 1 per point of Damage' }],
    ['Improved armor casing', "The Bot's built-in Armor save becomes 5+.", { save: '5+', cost: '5 Credits' }],
    ['Deflection module', "The Bot's built-in save counts as both Screen and Armor.", { cost: '8 Credits' }],
    ['Jump module', 'Any part of a move (including Dash) may be a jump of the same distance.', { cost: '6 Credits' }],
    ['Multi-wave scanner', '+1 to Seize the Initiative, cumulative with a Motion Tracker.', { cost: '10 Credits' }],
    ['Broad spectrum vision', 'Sees through darkness, smoke, fog and gas without penalty.', { cost: '6 Credits' }],
  ], { book: CBH_BOOK, page: 26 }),
  ...pfhWeapons([
    ['Service pistol', '14"', '1', '0', 'Pistol'],
    ['Hand cannon', '8"', '1', '1', 'Pistol'],
    ['Carbine', '18"', '1', '0', '-'],
    ['Combat rifle', '26"', '1', '0', '-'],
    ['Shot gun', '12"', '2', '1', 'Focused'],
    ['Sniper rifle', '40"', '1', '1', 'Aimed'],
    ['Light machine gun', '36"', '3', '1', 'Heavy'],
    ['Incinerator', '8"', '3', '1', 'Focused, Area'],
    ['Hyper blaster', '24"', '3', '1', 'Overheat'],
    ['Plasma rifle', '20"', '2', '1', 'Focused, Piercing'],
    ['Boarding sword', 'Brawl', '-', '0', 'Melee'],
    ['Power claw', 'Brawl', '-', '1', 'Melee'],
    ['Flash grenade', '6"', '-', '-', 'Stun'],
    ['Frag grenade', '6"', '2', '0', 'Area'],
    ['Mounted launcher', '18"', '-', '-', 'Launcher', 'Fires any grenade type carried.'],
  ], { book: CBH_BOOK, page: 179, variant: 'Bug Hunt' }).map((i) => ({ ...i, tags: [...i.tags, 'bug-hunt'] })),
  ...pfhGear('protective-device', 'Armor', [
    ['Trooper armor', "Bug Hunt troopers' standard armor.", { save: '5+', tags: ['armor', 'bug-hunt'] }],
  ], { book: CBH_BOOK, page: 176, variant: 'Bug Hunt' }),
];

// --- Planetfall ---------------------------------------------------------

const PF_BOOK = 'Five Parsecs: Planetfall';
const pfWeapon = (name, range, shots, damage, traits, note) => [name, range, shots, damage, traits, note];
const planetfall = [
  ...pfhWeapons([
    pfWeapon('Handgun', '6"', '1', '+0', 'Civilian, Pistol'),
    pfWeapon('Colonial shotgun', '12"', '1', '+0', 'Civilian, Critical'),
    pfWeapon('Colony rifle', '18"', '1', '+0', 'Civilian'),
    pfWeapon('Scout pistol', '9"', '1', '+0', 'Scout, Pistol, Stabilized'),
    pfWeapon('Infantry rifle', '24"', '1', '+0', 'Grunt'),
    pfWeapon('Light machine gun', '36" / 12"', '3 / 4', '+0', 'Grunt, Cumbersome, Hail of Fire'),
    pfWeapon('Trooper rifle', '30"', '1', '+0', 'Trooper, AP Ammo'),
    pfWeapon('Assault gun', '18"', '2', '+0', 'Trooper'),
    pfWeapon('Flame projector', '6"', '-', '+1', 'Trooper, Stream, Burning'),
  ], { book: PF_BOOK, page: 76, variant: 'Planetfall' }).map((i) => ({ ...i, tags: [...i.tags, 'standard-issue'] })),
  ...pfhWeapons([
    pfWeapon('Shard pistol', '9"', '2', '+1', 'Trooper, Tier 1, Focused, Pistol'),
    pfWeapon('Ripper pistol', '9"', '2', '+0', 'Scout, Tier 1, Pistol'),
    pfWeapon('Kill-Break shotgun', '12"', '1', '+2', 'Trooper, Tier 1, Knockback'),
    pfWeapon('Steady rifle', '24"', '1', '+0', 'Civilian, Tier 1, Stabilized'),
    pfWeapon('Carver blade', 'Brawl', '-', '+2', 'Civilian, Tier 1, Flexible, Melee'),
  ], { book: PF_BOOK, page: 77, variant: 'Planetfall' }).map((i) => ({ ...i, tags: [...i.tags, 'tier-1'] })),
  ...pfhWeapons([
    pfWeapon('Bio-gun', '12"', 'Special', '+1', 'Trooper, Tier 2, Area'),
    pfWeapon('Mind-link pistol', '9"', '1', '+0', 'Scientist, Tier 2, Mind-link'),
    pfWeapon('Phase rifle', '16"', '1', '+1', 'Scout, Tier 2, Phased Fire'),
    pfWeapon('Dart pistol', '9"', '1', '+1', 'Civilian, Tier 2, Armor-piercing'),
    pfWeapon('Hyper-rifle', '16"', '1', '+1', 'Trooper, Tier 2, Hyperfire'),
  ], { book: PF_BOOK, page: 78, variant: 'Planetfall' }).map((i) => ({ ...i, tags: [...i.tags, 'tier-2'] })),
  ...pfhGear('grunt-upgrade', 'Grunt upgrade', [
    ['Sharpshooter sight', 'One grunt per fireteam: +1 to Hit when stationary (military rifle only). Needs Early warning system.'],
    ['Adapted armor', 'All grunts get a 6+ saving throw. Needs Locally adapted food production site.', { save: '6+' }],
    ['Bolstered survival kit', 'Post-mission grunt survival: only a 1 is a permanent casualty. Needs Immune System Bio-delineation.'],
    ['Ammo packs', 'Once per battle, every grunt in a fireteam rolls one extra die to Hit, all in the same round. Needs Military barracks.'],
    ['Side arms', 'All grunts also carry a handgun. Needs Shard pistol.'],
    ['Sergeant weaponry', 'One grunt per fireteam also gets a Damage +1 Melee weapon. Needs Carver blade.'],
  ], { book: PF_BOOK, page: 79 }),
  // Artifacts (p.135-136): equipment and weapons a character carries,
  // single-use finds, and colony items.
  ...pfhGear('artifact', 'Artifact equipment', [
    ['Flex-rigid armor vest', 'Armor saving throw.', { save: '4+', tags: ['armor'] }],
    ['Short-range phase displacer', 'When moving, may teleport anywhere within movement range instead.'],
    ['Nervous system override cathode', '+1" to base Move and Dash.'],
    ['Visual Distortion Module', 'Ranged attacks against the bearer are -1 to Hit.'],
    ['Predictive sighting module', 'Reroll all 1s to Hit when firing.'],
    ['Crystalline assault harness', 'Armor saving throw; roll twice when brawling and keep the best.', { save: '5+', tags: ['armor'] }],
    ['Sub-psionic visor', 'Extends all visibility penalties by 4" for the bearer.'],
  ], { book: PF_BOOK, page: 135 }),
  ...pfhWeapons([
    pfWeapon('Inherent core principal carbine', '15"', '1', '2', '', '+1 to hit. Artifact: usable by any class.'),
    pfWeapon('Phase anticipation sword', 'Brawl', '-', '2', 'Melee', 'No penalty for rolling a 1 in a brawl. Artifact.'),
    pfWeapon('Psi-boosted nano-blade', 'Brawl', '-', '2', 'Melee', 'Ignores Saving Throws. Artifact.'),
    pfWeapon('Flexible bolt launcher', '8" or 24"', '2 or 1', '1 or 2', '', 'Each shot, choose Range 8" Shots 2 Damage 1, or Range 24" Shots 1 Damage 2. Artifact.'),
    pfWeapon('Shard projection rifle', '24"', '2', '2', 'Focused', 'Artifact.'),
    pfWeapon('Focused beam emitter', '18"', '1', '4', '', 'Artifact.'),
  ], { book: PF_BOOK, page: 135 }).map((i) => ({ ...i, tags: [...i.tags, 'artifact'] })),
  ...pfhGear('artifact', 'Artifact (single-use)', [
    ['Altered psi-wave emitter', 'Everyone in Sick Bay recovers completely.'],
    ['Alien translation guide', 'The next two research topics cost half their Research Points (rounded up).'],
    ['Bio-present induction schematic', 'Gain 3 Augmentation Points.'],
    ['Programmed restoration settlement module', 'Restore up to 10 Colony Integrity.'],
    ['Ancient language translation aid', 'Gain 3 Story Points and 1 Mission Data.'],
    ['Neo-ancient data cache', 'Counts as completing a campaign Milestone.'],
    ['Bio-frame optimization serum', "Permanently +1 to one character's Toughness."],
    ['Transcendence blueprints', '+4 Colony Morale and +1 Augmentation Point.'],
    ['Time dilution serum', "Permanently +1\" to one character's Speed."],
    ['Organic pattern booster', 'A character who just died is restored to life.'],
    ['Mind induction device', 'A character gains 5 XP; gain 1 Mission Data.'],
  ], { book: PF_BOOK, page: 135 }).map((i) => ({ ...i, tags: [...i.tags, 'single-use'] })),
  ...pfhGear('artifact', 'Artifact (colony item)', [
    ['Preventative nano deployment', 'Colony Repair Rate +1.'],
    ['Ancient AI chip', '+1 Research Point per campaign turn.'],
    ['Mutative nano materials', '+1 Build Point per campaign turn.'],
    ['Adjusted bio-targeting array', 'Colony Defenses +1.'],
    ['Regenerative building material schematic', 'Mitigate 1 point of building damage per campaign turn.'],
  ], { book: PF_BOOK, page: 135 }).map((i) => ({ ...i, tags: [...i.tags, 'colony-item'] })),
];

// --- Five Leagues from the Borderlands (3rd ed.) core --------------------

const FL_BOOK = 'Five Leagues from the Borderlands';
const flTraitLabel = (k) => (FIVE_LEAGUES_WEAPON_TRAITS.find((t) => t.key === k) || { label: k }).label;
const flSign = (n) => (n >= 0 ? `+${n}` : String(n));
const STORAGE = { B: 'Backpack', C: 'Campaign', W: 'Worn', S: 'Single-use' };
const fiveLeaguesCore = [
  ...FIVE_LEAGUES_WEAPON_CATALOG.map((w) => flWeapons([[
    w.label.charAt(0).toUpperCase() + w.label.slice(1), w.type, w.range, `${flSign(w.overcomeArmor)} / ${flSign(w.overcomeToughness)}`,
    w.traits.map(flTraitLabel).join(', '), w.category === 'quality' ? 'Quality weapon (Heroes only).' : w.key === 'unarmed' ? 'Improvised.' : 'Basic weapon.',
  ]], { book: FL_BOOK, page: w.category === 'quality' ? 61 : 60 })[0]),
  ...flGear('armor', 'Body armor', [
    ['Light armor', 'Armor rating 1.', { armor: '1', storage: 'Worn' }],
    ['Partial armor', 'Armor rating 2; movement -0" / -1".', { armor: '2', storage: 'Worn' }],
    ['Full armor', 'Armor rating 3; movement -0" / -2".', { armor: '3', storage: 'Worn' }],
    ['Knight armor', 'Armor rating 3; cannot Dash, and enemies get no bonus to Overcome Armor.', { armor: '3', storage: 'Worn' }],
    ['Helmet', 'On a post-game Injury double (11, 22, 33...) the wearer is only knocked out; the helmet is Damaged.', { type: 'Additional armor', storage: 'Worn' }],
    ['Shield', '+1 Armor against ranged attacks, and may Parry in melee.', { type: 'Additional armor', storage: 'Worn', traits: 'Parry' }],
  ], { book: FL_BOOK, page: 62 }),
  ...FIVE_LEAGUES_ITEM_CATALOG.map((it) => flGear('assorted-item', 'Item', [[
    it.label, it.text, { storage: it.storageMarks.map((m) => STORAGE[m] || m).join(', ') },
  ]], { book: FL_BOOK, page: 63 })[0]),
  ...flWeapons([
    ['Battering Storm', 'melee', '', '+1 / +2', '', 'The wielder loses melee on a draw.'],
    ["Champion's Will", 'melee', '', '+0 / +0', '', 'Enemies get no Combat Bonus from allies against the wielder.'],
    ['Finding Knife', 'melee', '9" (thrown)', '+0 / +0', '', 'Can be thrown at -1 / +0 and returns to the wielder.'],
    ['Fury Biter', 'melee', '', '+0 / +0', '', 'Ignores Stun in melee; Flight in the Dark becomes an Injury roll instead.'],
    ['Fury of Life', 'melee', '', '+0 / +0', '', 'Against Undead the wielder gains Parry and Counter Attack.'],
    ['Gleaming Friend', 'melee', '', '+0 / +0', '', 'A drawn melee exchange is won by the wielder.'],
    ['Hate Strike', 'melee', '', '+0 / +0', '', 'When the wielder loses an exchange, they Hit the enemy at the same time.'],
    ['Heart Seeker', 'melee', '', '+0 / +0', '', 'A natural 6 as the Attacker bypasses Armor.'],
    ["Mountain's Bane", 'melee', '', '+0 / +0', '', 'A blow that fails to penetrate Armor Stuns the target.'],
    ['Penetrating Dart', 'ranged', '24"', '+0 / +0', '', 'Slaying the target automatically Hits one more target within 4".'],
    ['Ruin Edge', 'melee', '', '+0 / +0', '', 'Reducing an Aberration\'s MP removes one extra MP.'],
    ['Shadow Flight', 'ranged', '24"', '+0 / +0', '', 'The target always counts as in the open; shoots through forest and bushes, not solid obstacles.'],
    ['Soul Render', 'melee', '', '+1 / +1', '', ''],
    ['Swift Eagle', 'ranged', 'Unlimited', '+0 / +0', '', '+1 to Hit when shooting.'],
    ['Venom Fang', 'melee', '', '+0 / +0', '', 'An opponent it Wounds in melee is slain, unless Fey or Undead.'],
  ], { book: FL_BOOK, page: 199, extraTags: ['enchanted'] }),
  ...flGear('enchanted-armor', 'Enchanted armor', [
    ['Bird Maille', 'Dash +2" extra, no terrain movement penalty, and never rolls on Flight in the Dark when retreating.', { armor: '2', storage: 'Worn' }],
    ['Bright Maille', '+1 to melee rolls against Undead, -1 against Fey.', { armor: '3', storage: 'Worn' }],
    ['Curative Harness', 'Heals any Wound in the Tracking Phase if the wearer did not fight in melee.', { armor: '2', storage: 'Worn' }],
    ['Harness of Vengeance', 'An enemy that Wounds or downs the wearer in melee suffers the same.', { armor: '2', storage: 'Worn' }],
    ['Impervious Plate', 'Hits get no bonus to Overcome Armor.', { armor: '3', storage: 'Worn' }],
    ['Maille of Shadows', 'Enemy shooters ignore the wearer beyond 9", until the wearer makes a ranged attack.', { armor: '2', storage: 'Worn' }],
    ['Plate of Never-Ending Dreams', 'Cannot be Stunned; enemies get no Combat Bonus in melee.', { armor: '3', storage: 'Worn' }],
    ['Radiant Chest-plate', 'Ranged attacks at the wearer or anyone within 2" Hit only on a natural 6.', { armor: '2', storage: 'Worn' }],
    ['Stout Defender', 'The wearer can Parry in melee.', { armor: '3', storage: 'Worn' }],
    ["Traitor's Harness", 'No Armor value: each blow is deflected on 1-5, but on a 6 the wearer is a casualty and the suit turns into ordinary partial armor.', { armor: '0', storage: 'Worn' }],
  ], { book: FL_BOOK, page: 200, extraTags: ['enchanted'] }),
  ...flGear('potion', 'Potion', [
    ['Bear Draught', 'For one battle: heal one Wound each Tracking Phase and cannot be Stunned, but cannot Dash.', { storage: 'Single-use, battle only' }],
    ["Ferret's Drink", 'For one battle: +3" / 0" Speed, no terrain penalties, and no Flight in the Dark roll on retreat.', { storage: 'Single-use, battle only' }],
    ['Fiery Wine', 'For one battle: a 9" fire attack that never runs out, hitting +1 / +0 (+1 / +1 vs Undead).', { storage: 'Single-use, battle only' }],
    ['Potion of Valley Mist', 'An injured character recovers 3 turns sooner.', { storage: 'Single-use, any time' }],
    ['Serpent Water', 'Permanently immune to venom; Poison gives no benefit against them.', { storage: 'Single-use, any time' }],
    ['Shadowy Ale', 'Incorporeal this round and the next two: cannot attack or be attacked, moves through walls.', { storage: 'Single-use, battle only' }],
    ['Spring Vial', 'Heals any Injury Table result, even death; can be given by a companion.', { storage: 'Single-use, any time' }],
    ['Wasp Mead', 'For one battle: attacks gain Poison (a natural 6 to Hit knocks out unless saved by Armor).', { storage: 'Single-use, battle only' }],
    ['Winter Flask', 'Hero only: roll on the post-battle Injury Table at once; if they survive, gain 2D6 XP.', { storage: 'Single-use, any time' }],
    ['Wolf Potion', 'For one battle: melee Hits are +1 / +1, replacing the weapon\'s ratings.', { storage: 'Single-use, battle only' }],
  ], { book: FL_BOOK, page: 202, extraTags: ['enchanted'] }),
  ...flGear('enchanted-jewelry', 'Enchanted jewelry', [
    ['Curing Ward', 'A Wound heals in the Tracking Phase.', { storage: 'Worn' }],
    ['Evasive Silver', 'Enemy ranged attacks Hit only on a natural 6, until the wearer shoots.', { storage: 'Worn' }],
    ['Eyes of the Rat', 'Ignores range limits and Hit penalties from darkness, fog or smoke.', { storage: 'Worn' }],
    ['Gentle Illumination', 'Use Action: removes darkness and fog penalties for both sides for the battle.', { storage: 'Worn' }],
    ['Nullification Token', 'The first spell to affect the wearer each battle has no effect.', { storage: 'Worn' }],
    ["Old King's Dominion", 'Temporary allies fighting with the warband gain +1 Agility and +1 Toughness (max 6).', { storage: 'Worn' }],
    ["Spell Breaker's Seal", 'Immune to all magic, friendly or hostile; can be stowed as a Ready Weapon Action.', { storage: 'Worn' }],
    ['Token of Sacrifice', 'Saves the wearer from death or disappearance on an Injury or Flight in the Dark roll, then breaks.', { storage: 'Worn' }],
    ['Uncontested Fury', 'After slaying an enemy in melee, must move toward the nearest enemy and engage it (once per round).', { storage: 'Worn' }],
    ["Wolf's Fury", 'Use Action: becomes a wolf for the battle (healing any Wound), with its own profile and no items.', { storage: 'Worn' }],
  ], { book: FL_BOOK, page: 202, extraTags: ['enchanted'] }),
  ...flGear('enchanted-clothing', 'Enchanted clothing', [
    ['Belt of the Closed Mind', '1 extra point of Will each battle.', { storage: 'Worn' }],
    ['Belt of the True Warrior', '+1 to melee rolls with no ally within 3".', { storage: 'Worn' }],
    ['Boots of Fey Dancing', '+2" / +2" Speed if not shooting or fighting that Action.', { storage: 'Worn' }],
    ['Boots of the Deep Woods', 'No terrain movement reduction (Impassable still blocks).', { storage: 'Worn' }],
    ['Boots of the Thief', 'Use Action: escape the battle unharmed; never rolls on Flight in the Dark when retreating.', { storage: 'Worn' }],
    ['Cloak of Ancient Times', 'Injury recovery times are 1 turn shorter.', { storage: 'Worn' }],
    ['Cloak of Mist', 'Not set up at the start; in round 1 appears within D6" of any warband member.', { storage: 'Worn' }],
    ['Cloak of Wasp Denial', '+1 Armor against ranged attacks, and ignores Poison on enemy ranged attacks.', { storage: 'Worn' }],
    ['Gauntlets of Iron Grip', 'Opponents cannot Parry or negate the wearer\'s Parry; cannot Ready or use weapons found mid-battle.', { storage: 'Worn' }],
    ['Gauntlets of Unerring Flight', '+1 to Hit when stationary and shooting.', { storage: 'Worn' }],
  ], { book: FL_BOOK, page: 204, extraTags: ['enchanted'] }),
  ...flGear('magical-apparatus', 'Magical apparatus', [
    ['Arcane Research Notes', 'Read In Camp or In Town: one known spell\'s Incantation score drops by 1 permanently.', { storage: 'Single-use, Campaign' }],
    ['Arcane Scroll', 'Cast one random spell as if known (+2 if already known).', { storage: 'Single-use, Backpack' }],
    ['Essence Crystal', 'Use Action: cast a known spell with no Strand and no Casting roll.', { storage: 'Single-use, Backpack' }],
    ['Magical Focus', '+1 to all Casting rolls.', { storage: 'Worn' }],
    ['Magical Tome', 'Read In Camp or In Town: learn a random spell, or +3 XP if already known.', { storage: 'Single-use, Campaign' }],
  ], { book: FL_BOOK, page: 205, extraTags: ['enchanted'] }),
  ...flGear('unique-item', 'Enchanted unique item', [
    ['Bone Knife', 'Before battle: D6 warband members start Wounded, and each Wound raises a Skeleton minion that fights for you.', { storage: 'Single-use, Campaign, battle only' }],
    ["Dragon's Spite", 'Blast at a point within 6": everyone within 2" takes a +1 / +1 Hit and flees D6" (Undead +1 / +2, no flee).', { storage: 'Single-use, Campaign, battle only' }],
    ['Orb of Winter Fog', 'Retreat any characters without Flight in the Dark rolls; visibility drops to 6" for the battle.', { storage: 'Single-use, Campaign, battle only' }],
    ['Seeds of Spring', 'At the start of a campaign turn: may ignore a Camp event, injuries recover 1 turn sooner, and no Upkeep.', { storage: 'Single-use, Campaign, any time' }],
    ['Soul Sphere', 'Revives one character slain this campaign turn.', { storage: 'Single-use, Campaign, any time' }],
    ['Spider Whispers', 'A Hero ally with a bastard sword and partial armor joins the battle, then leaves.', { storage: 'Single-use, Campaign, battle only' }],
    ['Talisman of the Oldest Mother', 'Summons a random Aberration under your control.', { storage: 'Single-use, Campaign, battle only' }],
    ['Teeth of the Stalker', 'Move 9" ignoring rough terrain, possibly into melee, rolling twice in the first exchange.', { storage: 'Single-use, Campaign, battle only' }],
    ['Thorn of Ice', 'Every Wounded character within 3" of a point within 9" is removed as a casualty.', { storage: 'Single-use, Campaign, battle only' }],
    ['Tiny Offering', 'Before battle: every Follower gets +1 Combat Skill and +1 Toughness for the battle.', { storage: 'Single-use, Campaign, battle only' }],
  ], { book: FL_BOOK, page: 205, extraTags: ['enchanted'] }),
];

// --- Five Leagues Compendium -------------------------------------------

const FLC_BOOK = 'Five Leagues from the Borderlands Compendium';
const fiveLeaguesCompendium = [
  ...flGear('the-dust', 'Item', [
    ['Desert survival kit', '+1 to Wilderness and Scouting tests while in The Dust.', { storage: 'Backpack' }],
    ['Crystalized morning wind', 'Serpentine Mage only: gain 1D6+1 Drift at once.', { storage: 'Backpack' }],
    ['Invigorating tea', 'Remove Exhaustion from two characters, sell for 2 Gold Marks, or offer it at a General Meeting for +5 on the Interaction roll.', { storage: 'Single-use, Campaign' }],
    ['Bottle of Oasis Flower', '1 temporary point of Will for a battle (no effect on Ferals; a Chitter also heals).', { storage: 'Single-use, Backpack' }],
    ['Akayan pony', 'The warband carries 1 more Backpack item (stacks with a Brave mule, not another pony).', { storage: 'Campaign' }],
    ['Exotic wine', 'Removes Disgruntled, or sells for 1D3+1 Gold Marks in a settlement.', { storage: 'Single-use, Campaign' }],
    ['Gentle shade flower', 'Taken before poisoning: immune to all poison for the battle.', { storage: 'Single-use, Campaign' }],
    ['Thorny rock fruit', '+1 Toughness (max 5) for a battle, or eaten instead of Rations (-3 Gold Marks Upkeep).', { storage: 'Single-use, Campaign' }],
    ['Sage flower', 'A character rolling on the post-game Injury table rolls twice and picks.', { storage: 'Single-use, Campaign' }],
  ], { book: FLC_BOOK, page: 34 }),
  ...flWeapons([
    ['Blade of Torment', 'melee', '', '+1 / +1', 'Bulky', 'Combat Skill -1; ignores Tough, and its Wounds cannot be healed in battle.'],
    ['Fiend-hunting Spear', 'melee', '', '+0 / +0 (+0 / +2 vs Aberrations)', 'Counter Attack', 'Aberrations in range always attack the wielder first.'],
    ['Hammer of the Old War', 'melee', '', '+1 / +0 (+1 / +1 vs Undead)', 'Bulky', 'Cannot use Counter Attack.'],
  ], { book: FLC_BOOK, page: 59, extraTags: ['enchanted', 'the-dust'] }),
  ...flGear('the-dust', 'Item of The Dust', [
    ['Clay Tablet', 'Mystic or Serpentine Mage gains +2 XP.', { storage: 'Single-use, Campaign' }],
    ['Dancing Wind', 'Each activation: +1 to own missile Hits, or -1 to all missile Hits on both sides.', { storage: 'Worn', tags: ['enchanted'] }],
    ['Helmet of Quiet Dominion', 'Undead slain in melee by the wearer rise and fight for them for the battle (one at a time). Not combined with other armor.', { armor: '2', storage: 'Worn', tags: ['enchanted'] }],
    ['Lure Stone', 'Every enemy makes a full move toward a marker placed within 2".', { storage: 'Single-use, battle only' }],
    ['Rod of Desert Wisdom', 'Serpentine Mages start every battle with 2 Drift.', { storage: 'Single-use, Backpack' }],
    ['Safe Roaming', 'Unaffected by The Dust\'s environmental conditions in battle.', { storage: 'Worn', tags: ['enchanted'] }],
    ['Time Gem', 'The user and chosen characters within 6" take an extra full activation.', { storage: 'Single-use, battle only' }],
    ['Tiny Chime', 'Reroll a Camp, Town, News Travels or Enemy Moves event and pick; used up only if the new roll is taken.', { storage: 'Single-use, any time' }],
  ], { book: FLC_BOOK, page: 59 }),
  ...flWeapons([
    ['Scrap weapon', 'melee', '', '+0 / +0', '', 'Breaks permanently if Damaged.', '1 Gold Mark'],
    ['Robust weapon', 'melee', '', '+0 / +0', '', 'If Damaged, becomes a scrap weapon instead.', '3 Gold Marks'],
    ['Staff', 'melee', '', '-1 / +0', 'Parry', '', '3 Gold Marks'],
    ['Bastard sword', 'melee', '', '+0 / +1', '', '', '15 Gold Marks'],
    ['Fencing sword', 'melee', '', '+0 / +0', 'Parry', '', '9 Gold Marks'],
    ['Warhammer', 'melee', '', '+1 / +0', '', '', '10 Gold Marks'],
    ['War spear', 'melee', '', '+0 / +0', 'Counter Attack', '', '12 Gold Marks'],
    ['Self bow', 'ranged', '12" (18" outdoors)', '+0 / +0', '', '', '7 Gold Marks'],
    ['Sling', 'ranged', '10"', '-1 / +0', '', '', '3 Gold Marks'],
    ['Crossbow', 'ranged', '12" (24" outdoors)', '+1 / +0', '', 'Cannot move at all in an activation it is shot.', '8 Gold Marks'],
  ], { book: FLC_BOOK, page: 196, variant: 'Deep Below', extraTags: ['deep-below'] }),
  ...flGear('armor', 'Body armor', [
    ['Light armor', 'Armor rating 1.', { armor: '1', storage: 'Worn', cost: '3 Gold Marks' }],
    ['Partial armor', 'Armor rating 2; Dash -2".', { armor: '2', storage: 'Worn', cost: '8 Gold Marks' }],
    ['Full armor', 'Armor rating 3; Dash -2".', { armor: '3', storage: 'Worn', cost: '15 Gold Marks' }],
    ['Helmet', 'On a post-battle Injury double the wearer is only knocked out; the helmet is destroyed.', { type: 'Additional armor', storage: 'Worn', cost: '3 Gold Marks' }],
    ['Shield', 'May Parry; +1 Armor against ranged attacks (not spells).', { type: 'Additional armor', storage: 'Worn', traits: 'Parry', cost: '5 Gold Marks' }],
  ], { book: FLC_BOOK, page: 197, variant: 'Deep Below', extraTags: ['deep-below'] }),
  ...flGear('rune', 'Function rune', [
    ['Binding rune', 'The target cannot Move or act on its next activation (not constructs).'],
    ['Destruction rune', 'A +1 / +1 Hit (+1 / +2 and pushed 2" vs Undead).'],
    ['Healing rune', 'The target heals a Wound and cannot be Wounded or Stunned this round.'],
    ['Repulsion rune', 'The target is pushed 1D6+6" away from the user.'],
    ['Shifting rune', 'On its next activation the target moves through terrain and obstacles freely.'],
    ['Tunneling rune', 'Opens a 1"-wide, 6" straight passage through terrain.'],
  ], { book: FLC_BOOK, page: 193, extraTags: ['deep-below'] }),
  ...flGear('rune', 'Power rune', [
    ['Duplication rune', 'The spell affects its target twice (or doubles its duration).'],
    ['Reaching rune', 'The spell\'s range increases by 6".'],
    ['Repetition rune', 'The spell takes effect again on the caster\'s next activation.'],
    ['Selection rune', 'The spell affects two different targets.'],
    ['Traversal rune', 'The spell needs no Line of Sight.'],
  ], { book: FLC_BOOK, page: 193, extraTags: ['deep-below'] }),
  ...flGear('potion', 'Potion', [
    ['Potion of Recovery', 'Avoid one post-battle Injury roll.'],
    ['Potion of Flame', 'Throwable (6"): everyone within 2" of the point takes a +1 / +1 Hit; Undead take 2 Hits.', { traits: 'Throwable' }],
    ['Potion of Paralysis', 'Throwable (6"): everyone within 2" cannot act on their next activation.', { traits: 'Throwable' }],
    ['Potion of Speed', '+2" / +2" movement for the rest of the battle.'],
    ['Potion of Might', '+1 / +1 to all hand-to-hand damage rolls.'],
    ['Potion of Invisibility', 'Ignored by enemies until the drinker fights in melee; wears off on a 1 after each activation.'],
    ['Potion of Vision', 'No visibility limits in the dark.'],
    ['Potion of Protection', '+1 Toughness and +1 Armor for the rest of the battle.'],
    ['Potion of Poison', 'Throwable (6"): everyone within 2" is poisoned and becomes a casualty on a 1 each activation.', { traits: 'Throwable' }],
    ['Potion of Explosion', 'Throwable (6"): everyone within 1" is Hit twice at +1 / +1.', { traits: 'Throwable' }],
  ], { book: FLC_BOOK, page: 255, extraTags: ['deep-below'] }),
];

// --- writing the packs ----------------------------------------------------

const PACKS = [
  { id: '5pfh-equipment', file: 'assets/content-packs/5pfh-equipment-content-pack.json', items: pfhCore },
  { id: 'fiveleagues-equipment', file: 'assets/content-packs/fiveleagues-equipment-content-pack.json', items: fiveLeaguesCore },
  { id: '5pfh-compendium-equipment', file: 'assets/content-packs/5pfh-compendium-equipment-content-pack.json', items: cbh },
  { id: 'planetfall-equipment', file: 'assets/content-packs/planetfall-equipment-content-pack.json', items: planetfall },
  { id: 'fiveleagues-compendium-equipment', file: 'assets/content-packs/fiveleagues-compendium-equipment-content-pack.json', items: fiveLeaguesCompendium },
];

// A name another (earlier) pack already uses gets its variant in brackets,
// so importing both packs keeps both items.
const taken = new Set();
for (const pack of PACKS) {
  const seen = new Set();
  const entities = [];
  for (const it of pack.items) {
    let name = it.name;
    if (taken.has(norm(name)) && it.variant) name = `${it.name} (${it.variant})`;
    if (seen.has(norm(name))) continue;
    seen.add(norm(name));
    const keys = it.ruleset === 'fiveleagues' ? FL_KEYS : PFH_KEYS;
    entities.push({
      id: `ent_eq_${slug(pack.id)}_${slug(name)}`,
      type: 'item',
      name,
      tags: [...new Set(it.tags)],
      overview: `${it.summary} (${it.book}, p.${it.page})`,
      revealed: '',
      relationships: [],
      createdAt: CREATED,
      statblocks: [{ kind: 'gear', ruleset: it.ruleset, fields: keys.map((key) => ({ key, value: String(it.stats[key] == null ? '' : it.stats[key]) })) }],
    });
  }
  for (const e of entities) taken.add(norm(e.name));
  pack.count = entities.length;
  writeFileSync(new URL(`../${pack.file}`, import.meta.url), `${JSON.stringify({ app: 'GMAtlas', kind: 'content-pack', schemaVersion: SCHEMA, entities }, null, 2)}\n`);
  console.log(`${pack.file}: ${entities.length} items`);
}
