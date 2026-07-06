// gearCatalog.js — an extensive cross-system gear/weapon/armor catalog
// (ADR 0012), mined from the actual sourcebooks already in this repo's
// library (assets/docs/): Ironsworn/Starforged rulebook + reference guide,
// 5PFH core + Compendium + Planetfall, HOSTILE (Marine Corps + Tool Kit —
// HOSTILE-TECH2.pdf turned out to be a hard-science setting book with no
// gear tables of its own), the real Traveller 2e Core Rulebook, and the
// real Stars Without Number Deluxe Edition — every entry cites a real page.
//
// Each entry's `stats` only carries the systems that actually name that
// item (or a clear cross-system archetype of it) — nothing is back-filled
// with invented numbers for a system that doesn't cover it. Field keys
// match `data/gearTemplates.js`'s per-system template exactly, so
// `createItemFromCatalog` (domain/entities.js) can drop values straight
// into a fresh `gear` statblock group's fields by key.
//
// Tags drawn from one shared vocabulary across all five research passes:
// handgun, rifle, shotgun, smg, heavy-weapon, melee, blade, blunt,
// explosive, grenade, energy-weapon, launcher, improvised, light-armor,
// medium-armor, heavy-armor, powered-armor, void-suit, shield,
// survival-gear, medical-gear, tool, sensor, communication, hacking-gear,
// wetware, utility, consumable, illegal, restricted.

export const GEAR_CATALOG = [
  // ---- Weapons: cross-system archetypes -----------------------------------
  {
    id: 'sidearm-pistol', name: 'Sidearm Pistol', category: 'weapon', tags: ['handgun'],
    stats: {
      '5pfh': { Range: '12"', Shots: '1', Damage: '+0', Traits: 'Pistol', Type: 'Weapon', Cost: '' },
      traveller: { TL: '5-6', Damage: '3D-3', Range: '10-20m', Magazine: '6-15 (Cr5-10)', Weight: '1kg', Cost: 'Cr150-200', Traits: '' },
      hostile: { Damage: '2D6+1', ROF: '1/4', Range: 'pistol', Recoil: '8+', Rounds: '16', Weight: '0.8kg', Cost: '$200', Traits: '10mm Corta' },
      swn: { Damage: '1d8', Range: '30/100m', Ammo: '6 (Magazine)', Attribute: 'Dex', Encumbrance: '1', 'Tech Level': '2', Cost: '50cr', Traits: '' },
    },
  },
  {
    id: 'assault-rifle', name: 'Assault Rifle', category: 'weapon', tags: ['rifle'],
    stats: {
      '5pfh': { Range: '24"', Shots: '1', Damage: '+0', Traits: 'Military-only', Type: 'Weapon' },
      traveller: { TL: '7', Damage: '3D', Range: '200m', Magazine: '30 (Cr15)', Weight: '4kg', Cost: 'Cr500', Traits: 'Auto 2' },
      hostile: { Damage: '3D6+2', ROF: '1/4/10', Range: 'assault', Recoil: '7+', Rounds: '30-60', Weight: '3.6-4.6kg', Cost: '$1200-2000', Traits: 'M8/M24A1, some with underslung grenade launcher' },
      swn: { Damage: '1d12', Range: '100/300m', Ammo: '30 (Magazine)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '3', Cost: '300cr', Traits: 'Can fire burst (Combat Rifle)' },
    },
  },
  {
    id: 'shotgun', name: 'Shotgun', category: 'weapon', tags: ['shotgun'],
    stats: {
      '5pfh': { Range: '12"', Shots: '2', Damage: '+1', Traits: 'Focused', Type: 'Weapon' },
      traveller: { TL: '4', Damage: '4D', Range: '50m', Magazine: '6 (Cr10)', Weight: '4kg', Cost: 'Cr200', Traits: 'Bulky, doubles Armour vs. pellets' },
      hostile: { Damage: '4D6', ROF: '1/4', Range: 'shotgun', Recoil: '9+', Rounds: '4-6', Weight: '3-5.2kg', Cost: '$600-2000', Traits: 'M12 has underslung 20mm grenade launcher' },
      swn: { Damage: '3d4 (2d6 slug)', Range: '10/30m', Ammo: '2 (Magazine)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '2', Cost: '50cr', Traits: '' },
    },
  },
  {
    id: 'submachine-gun', name: 'Submachine Gun', category: 'weapon', tags: ['smg'],
    stats: {
      '5pfh': { Range: '8"', Shots: '2', Damage: '+0', Traits: 'Pistol, Focused', Type: 'Weapon' },
      swn: { Damage: '1d8', Range: '30/100m', Ammo: '20 (Magazine)', Attribute: 'Dex', Encumbrance: '1', 'Tech Level': '3', Cost: '200cr', Traits: 'Can fire burst, +2 to-hit/damage' },
    },
  },
  {
    id: 'sniper-rifle', name: 'Sniper / Marksman Rifle', category: 'weapon', tags: ['rifle', 'heavy-weapon'],
    stats: {
      '5pfh': { Range: '36-40"', Shots: '1', Damage: '+0/+1', Traits: 'Heavy, Aimed', Type: 'Weapon' },
      hostile: { Damage: '4D6+2', ROF: '1', Range: 'rifle', Recoil: '8+', Rounds: '10', Weight: '5.5kg', Cost: '$3000', Traits: 'M33 Coilgun, electromagnetic, AP sabot' },
      swn: { Damage: '2d8', Range: '1000/2000m', Ammo: '1 (Magazine)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '3', Cost: '400cr', Traits: 'Instant-kill execution attack on mortal wound' },
    },
  },
  {
    id: 'laser-pistol', name: 'Laser Pistol', category: 'weapon', tags: ['handgun', 'energy-weapon'],
    stats: {
      traveller: { TL: '9', Damage: '3D', Range: '20m', Magazine: '100 shots (Cr1000 pack)', Weight: '3kg', Cost: 'Cr2000', Traits: 'Zero-G' },
      swn: { Damage: '1d6', Range: '100/300m', Ammo: '10 (Type A cell)', Attribute: 'Dex', Encumbrance: '1', 'Tech Level': '4', Cost: '200cr', Traits: '+1 to-hit (non-Heavy energy weapon)' },
    },
  },
  {
    id: 'laser-rifle', name: 'Laser Rifle', category: 'weapon', tags: ['rifle', 'energy-weapon'],
    stats: {
      traveller: { TL: '9', Damage: '5D', Range: '200m', Magazine: '100 shots (Cr1500 pack)', Weight: '8kg', Cost: 'Cr3500', Traits: 'Zero-G' },
      hostile: { Damage: '4D6+2', ROF: '1', Range: 'rifle', Recoil: 'none', Rounds: '10 (battery)', Weight: '4.2kg', Cost: '$3500', Traits: 'M1000 30MW Combat Laser' },
      swn: { Damage: '1d10', Range: '300/500m', Ammo: '20 (Type A cell)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '4', Cost: '300cr', Traits: 'Can fire burst' },
    },
  },
  {
    id: 'plasma-weapon', name: 'Plasma Weapon', category: 'weapon', tags: ['heavy-weapon', 'energy-weapon', 'restricted'],
    stats: {
      '5pfh': { Range: '20"', Shots: '2', Damage: '+1', Traits: 'Focused, Piercing', Type: 'Weapon' },
      traveller: { TL: '12-16', Damage: '1DD-6D', Range: '250-300m', Weight: '10kg', Cost: 'Cr20000-100000', Traits: 'PGMP/Plasma Rifle, Very Bulky at TL12' },
      hostile: { Damage: '10D6', ROF: '1 (cool-down)', Range: 'rifle', Recoil: '8+', Rounds: '38 (hopper, 2-crew)', Weight: '15kg', Cost: '$20,000', Traits: 'Zenith XM4 40MW ATPG' },
      swn: { Damage: '2d8', Range: '50/100m', Ammo: '6 (Type A cell)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '4', Cost: '400cr', Traits: '' },
    },
  },
  {
    id: 'fusion-gun', name: 'Fusion Gun (Man-Portable)', category: 'weapon', tags: ['heavy-weapon', 'energy-weapon', 'restricted'],
    stats: { traveller: { TL: '14', Damage: '2DD (x10)', Range: '450m', Weight: '12kg', Cost: 'Cr100000', Traits: 'Radiation, Very Bulky' } },
  },
  {
    id: 'machine-gun', name: 'Machine Gun / Support Weapon', category: 'weapon', tags: ['heavy-weapon', 'rifle'],
    stats: {
      traveller: { TL: '6', Damage: '3D', Range: '500m', Magazine: '60 (Cr100)', Weight: '12kg', Cost: 'Cr1500', Traits: 'Auto 4' },
      hostile: { Damage: '3D6+4', ROF: '4/10', Range: 'rifle', Recoil: 'Min Str 7 (gimbal-mounted)', Rounds: '250 (drum, HE)', Weight: '16kg', Cost: '$5000', Traits: 'M3 Hydra IMAG, +1 DM auto-tracking' },
    },
  },
  {
    id: 'rocket-launcher', name: 'Rocket / Missile Launcher', category: 'weapon', tags: ['launcher', 'heavy-weapon', 'explosive', 'restricted'],
    stats: {
      swn: { Damage: '3d10', Range: '2000/4000m', Ammo: '1 missile (50cr)', Attribute: 'Dex', Encumbrance: '2', 'Tech Level': '3', Cost: '4,000cr', Traits: '-4 to-hit vs. human-sized; shoulder-fired' },
      hostile: { Damage: '8D6 (halves target Armor)', ROF: '1', Range: 'rocket', Rounds: '1 (fire-and-forget, IR guided +3 DM)', Weight: '3.2kg', Cost: '$2000', Traits: 'M9 Eagle-Eye; blast radius 6m, 3D6 backblast within 2m' },
    },
  },
  {
    id: 'grenade-launcher', name: 'Grenade Launcher', category: 'weapon', tags: ['launcher', 'grenade'],
    stats: {
      hostile: { Damage: 'varies by grenade', ROF: '1', Range: 'assault', Recoil: '6+', Rounds: '6 (revolving)', Weight: '4.5kg', Cost: '$800', Traits: 'Maverick G6, integral laser rangefinder' },
    },
  },
  {
    id: 'flame-weapon', name: 'Flame Weapon', category: 'weapon', tags: ['heavy-weapon'],
    stats: {
      '5pfh': { Range: '12"', Shots: '2', Damage: '+1', Traits: 'Focused, Area', Type: 'Weapon' },
      hostile: { Damage: '2D6 + burning (2D6/round)', ROF: '4', Range: 'pistol (direct 30m/indirect 50m)', Recoil: '5+', Rounds: '6', Weight: '2.5kg', Cost: '$500', Traits: 'MLT Flame Unit' },
    },
  },
  {
    id: 'stun-weapon', name: 'Stun Weapon (melee)', category: 'weapon', tags: ['melee', 'blunt'],
    stats: {
      traveller: { TL: '8', Damage: '2D', Range: 'Melee', Weight: '1kg', Cost: 'Cr300', Traits: 'Stunstick — Stun' },
      swn: { Damage: '1d8 (non-lethal)', Range: 'Melee', Attribute: 'Str/Dex', Cost: '50cr', Encumbrance: '1', 'Tech Level': '4', Shock: '1 pt/AC 15', Traits: 'Drops target to 0 HP without killing' },
    },
  },
  {
    id: 'stunner-ranged', name: 'Stunner (ranged)', category: 'weapon', tags: ['handgun', 'energy-weapon'],
    stats: { traveller: { TL: '8', Damage: '2D', Range: '5m', Magazine: '100 shots (Cr200 pack)', Weight: '0.5kg', Cost: 'Cr500', Traits: 'Stun, Zero-G' } },
  },
  {
    id: 'combat-knife', name: 'Combat Knife / Blade', category: 'weapon', tags: ['melee', 'blade'],
    stats: {
      '5pfh': { Range: 'Brawl', Shots: '-', Damage: '+0', Traits: 'Melee', Type: 'Weapon' },
      traveller: { TL: '1-2', Damage: '1D+2 to 2D', Range: 'Melee', Weight: '1-2kg', Cost: 'Cr10-100', Traits: 'Dagger / Blade' },
      hostile: { Damage: '2D6', ROF: '-', Range: 'close quarters', Recoil: 'DM +1', Weight: '0.25kg', Cost: '$120', Traits: '' },
      swn: { Damage: '1d4-1d8+1', Range: 'Melee', Attribute: 'Str/Dex', Cost: '0-60cr', Encumbrance: '1', 'Tech Level': '0-4', Shock: '1-2 pts', Traits: 'Small Primitive to Medium Advanced' },
    },
  },
  {
    id: 'heavy-blade', name: 'Broadsword / Heavy Melee Weapon', category: 'weapon', tags: ['melee', 'blade'],
    stats: {
      traveller: { TL: '2', Damage: '4D', Range: 'Melee', Weight: '8kg', Cost: 'Cr500', Traits: 'Bulky' },
      '5pfh': { Range: 'Brawl', Shots: '-', Damage: '+1 to +3', Traits: 'Melee, Ripper Sword/Power Claw (Clumsy)', Type: 'Weapon' },
      swn: { Damage: '1d10+1', Range: 'Melee', Attribute: 'Str', Cost: '80cr', Encumbrance: '2', 'Tech Level': '4', Shock: '2 pts/AC 15', Traits: 'Large Advanced Weapon; ignores primitive armor' },
    },
  },
  {
    id: 'improvised-melee', name: 'Improvised Melee Tool (machete/spade)', category: 'weapon', tags: ['melee', 'improvised', 'tool'],
    stats: {
      hostile: { Damage: '2D6-3D6', Range: 'close/extended', Recoil: 'DM -1 to -2', Weight: '0.35-1.5kg', Cost: '$30-50', Traits: 'Machete; Folding Spade doubles as a saw' },
    },
  },
  {
    id: 'monoblade', name: 'Monoblade / Kinetic Melee Weapon', category: 'weapon', tags: ['melee', 'blade', 'illegal'],
    stats: {
      swn: { Damage: '1d8+1', Range: 'Melee', Attribute: 'Str/Dex', Cost: '60cr', Encumbrance: '1', 'Tech Level': '4', Shock: '2 pts/AC 13', Traits: 'Monoblade edge, ignores primitive armor' },
      hostile: { Damage: '3D6', Range: 'extended reach', Recoil: 'DM +0', Weight: '1.5kg', Cost: '$500', Traits: 'Retractable Katana; illegal weapon' },
    },
  },
  {
    id: 'suit-ripper', name: 'Suit Ripper', category: 'weapon', tags: ['melee', 'blade', 'illegal'],
    stats: { swn: { Damage: '1d6', Range: 'Melee', Attribute: 'Str/Dex', Cost: '75cr', Encumbrance: '1', 'Tech Level': '4', Traits: 'Every hit tears a vacc suit; illegal in space' } },
  },
  {
    id: 'frag-grenade', name: 'Fragmentation Grenade', category: 'weapon', tags: ['grenade', 'explosive'],
    stats: {
      '5pfh': { Range: '6"', Shots: '2', Damage: '+0', Traits: 'Heavy, Area, Single use', Type: 'Weapon' },
      traveller: { TL: '6', Damage: '5D', Range: '20m (thrown)', Weight: '0.5kg', Cost: 'Cr30', Traits: 'Blast 9' },
      hostile: { Damage: '5D6/3D6/1D6 (3m/6m/9m)', Cost: '$180 per case of 6', Weight: '0.5kg each', Traits: 'M4, thrown, 4-second delay' },
      swn: { Damage: '2d6 (5m, Evasion for half)', Range: '10/30m', Attribute: 'Dex', Cost: '25cr', Encumbrance: '1', 'Tech Level': '3', Traits: 'Miss scatters 1d10m' },
    },
  },
  {
    id: 'stun-grenade', name: 'Stun / Flash Grenade', category: 'weapon', tags: ['grenade'],
    stats: {
      '5pfh': { Range: '6"', Shots: '1', Damage: 'NA', Traits: 'Area, Stun, Single use', Type: 'Weapon' },
      traveller: { TL: '7', Damage: '3D', Range: '20m (thrown)', Weight: '0.5kg', Cost: 'Cr30', Traits: 'Blast 9, Stun' },
      hostile: { Damage: '2D6 stun', Cost: '$180 per case of 6', Weight: '0.5kg each', Traits: 'M3; Endurance check vs. incapacitation 1-3 rounds' },
    },
  },
  {
    id: 'plastic-explosive', name: 'Plastic Explosive', category: 'weapon', tags: ['explosive', 'restricted'],
    stats: { hostile: { Damage: '3D6', Range: '2D6m radius', Weight: '1kg block', Cost: '$200', Traits: 'Stern C-4, detonator-only initiation' } },
  },

  // ---- Armor: cross-system archetypes -------------------------------------
  {
    id: 'light-armor', name: 'Light Armor / Ballistic Vest', category: 'armor', tags: ['light-armor'],
    stats: {
      '5pfh': { Type: 'Armor', 'Saving Throw': '6+ (5+ vs Area)', Traits: 'Frag Vest', Cost: '' },
      traveller: { TL: '1-6', Protection: '+1 to +5', Weight: '1-10kg', Cost: 'Cr50-250', Traits: 'Jack / Mesh / Cloth Armour' },
      hostile: { 'Armor Rating': '5', Weight: '2kg', Cost: '$450', Traits: 'Stern B Ballistic Vest, torso only' },
      swn: { 'Armor Class': '13', Cost: '10-600cr', Encumbrance: '0-1', 'Tech Level': '0-4', Traits: 'Leather Jacks / Armored Undersuit' },
    },
  },
  {
    id: 'combat-armor', name: 'Combat Armor', category: 'armor', tags: ['medium-armor'],
    stats: {
      '5pfh': { Type: 'Armor', 'Saving Throw': '5+', Effect: 'Counts as in Cover if within 2" of Cover; Battle Dress grants +1 Reactions', Cost: '' },
      traveller: { TL: '7-10', Protection: '+8', Weight: '5-10kg', Cost: 'Cr500', Traits: 'Cloth Armour (TL10 version)' },
      hostile: { 'Armor Rating': '9', Weight: '4kg', Cost: '$3250', Traits: 'Enforcer M21 ERPA, military/paramilitary only' },
      swn: { 'Armor Class': '15-16', Cost: '400-1,000cr', Encumbrance: '1-2', 'Tech Level': '3-4', Traits: 'Combat Field Uniform / Woven Body Armor' },
    },
  },
  {
    id: 'powered-armor', name: 'Powered / Heavy Combat Armor', category: 'armor', tags: ['powered-armor', 'heavy-armor', 'restricted'],
    stats: {
      traveller: { TL: '13', Protection: '+22', Weight: '100kg (weightless while active)', Cost: 'Cr200000', 'Required Skill': 'Vacc Suit 2', Traits: 'Battle Dress, supports its own weight' },
      hostile: { 'Armor Rating': '11', Weight: '18kg', Cost: '$20,000', Traits: 'Hewison M5 Integrated Combat Suit — full vacuum/thermal/rad protection' },
      swn: { 'Armor Class': '18-19', Cost: '10,000-20,000cr', Encumbrance: '2', 'Tech Level': '4-5', Traits: 'Assault Suit / Storm Armor, +4 Str for encumbrance' },
    },
  },
  {
    id: 'vacc-suit', name: 'Vacc Suit / Environment Suit', category: 'armor', tags: ['void-suit', 'survival-gear'],
    stats: {
      starforged: { Description: 'Sealed environment suit — default free "Spacer Kit" item enabling survival in vacuum/hostile atmosphere', 'Linked Move': 'Check Your Gear', Bonus: '', Notes: 'No numeric protection value; invoked narratively' },
      traveller: { TL: '8', Protection: '+4', Rad: '10', Weight: '17kg', Cost: 'Cr12000', 'Required Skill': 'Vacc Suit 1', Traits: 'Sealed life support' },
      hostile: { 'Armor Rating': '6-8', Weight: '9-40kg', Cost: '$9000-18,000', Traits: 'Tharsis A38/H200, McConnell 720 — 6-8hr life support, -40 to -90 rads/hr' },
      swn: { 'Armor Class': '13 (no other armor)', Cost: '100cr', Encumbrance: '2', 'Tech Level': '4', Traits: '6hr O2, -2 to-hit/movement unless experienced' },
    },
  },
  {
    id: 'deflector-shield', name: 'Deflector Shield / Screen', category: 'armor', tags: ['shield', 'light-armor'],
    stats: {
      '5pfh': { Type: 'Screen', Effect: 'Automatically deflects one ranged Hit per battle (Deflector Field); Camo Cloak: enemies past 9" are -1 to Hit', Cost: '' },
      swn: { 'Armor Class': '15 (+1 bonus)', Cost: '10,000cr', Encumbrance: '1', 'Tech Level': '5', Traits: 'Force Pavis — absorbs small arms fire, immune to first melee Shock hit; requires one free hand' },
    },
  },

  // ---- Gear: cross-system archetypes --------------------------------------
  {
    id: 'medkit', name: 'Medkit / First Aid Kit', category: 'gear', tags: ['medical-gear'],
    stats: {
      starforged: { Description: 'Default free "Spacer Kit" item providing baseline first-aid supplies for the Heal move', 'Linked Move': 'Heal', Bonus: '', Notes: '' },
      traveller: { TL: '8-14', Weight: '1kg', Cost: 'Cr1000-10000', Traits: 'Requires Medic skill; higher-TL grants DM+1/+2/+3' },
      hostile: { Cost: '$50-350', Weight: '0.5-6kg', Traits: 'Haruna First Aid Kit (2 treatments) / Surgical Kit (6 major treatments)' },
      swn: { Cost: '1,000cr', Encumbrance: '1', 'Tech Level': '4', Traits: '2d6 roll per patient per day of care, kit depletes on a 12' },
    },
  },
  {
    id: 'communicator', name: 'Personal Communicator', category: 'gear', tags: ['communication'],
    stats: {
      starforged: { Description: 'Default free "Spacer Kit" item for staying in contact with allies/ship', 'Linked Move': '', Bonus: '', Notes: 'Purely narrative unless a move calls for it' },
      '5pfh': { Type: 'Utility Device', Effect: 'Roll one additional die on Reaction roll each round, discard one', Cost: '' },
      traveller: { TL: '6-10', Cost: 'Cr50-500', Traits: 'Audio/Visual/Data/Computer-1 depending on TL' },
      swn: { Cost: '100cr', Encumbrance: '* (negligible)', 'Tech Level': '4', Traits: 'Compad — requires nearby comm grid/server' },
    },
  },
  {
    id: 'toolkit', name: 'Toolkit', category: 'gear', tags: ['tool', 'utility'],
    stats: {
      starforged: { Description: 'Default free "Spacer Kit" item — attempt repairs/mundane fixes without a roll', 'Linked Move': 'Check Your Gear', Bonus: '', Notes: '' },
      traveller: { TL: '7', Weight: '2kg', Cost: 'Cr2000', Traits: 'DM+2 if 2+ TL higher than task, DM-2 if lower' },
      swn: { Cost: '200-300cr', Encumbrance: '1-3', 'Tech Level': '4', Traits: 'Metatool (wrist-mounted, packs 3) / Postech Toolkit' },
    },
  },
  {
    id: 'motion-tracker', name: 'Motion Tracker / Sensor', category: 'gear', tags: ['sensor'],
    stats: {
      '5pfh': { Type: 'Utility Device', Effect: '+1 to all rolls to Seize the Initiative (Motion Tracker); Auto Sensor grants a free shot on close approach', Cost: '' },
      hostile: { Cost: '$1680', Weight: '1kg', Traits: 'Inferno Electronics J34 — 10-20m indoors/600-800m open, 100° cone' },
      swn: { Cost: '300cr', Encumbrance: '1', 'Tech Level': '4', Traits: 'Bioscanner — detects internal bleeding/toxins untrained' },
    },
  },
  {
    id: 'hacking-rig', name: 'Hacking Rig / Security Kit', category: 'gear', tags: ['hacking-gear', 'restricted'],
    stats: {
      starforged: { Description: 'Datapad for interfacing with systems and writing code (TECH path signature item)', 'Linked Move': '', Bonus: '', Notes: 'Card ability text not reproduced in source' },
      hostile: { Cost: '$1000', Weight: '0.2kg', Traits: 'IE 505 Military Security Kit — spoofs card-lock readers; military/intel only' },
      swn: { Cost: '10,000cr', Encumbrance: '1', 'Tech Level': '4', Traits: 'Black Slab — disguised dataslab, +1 to hacking attempts, black market only' },
    },
  },
  {
    id: 'jammer', name: 'Signal Jammer', category: 'gear', tags: ['communication', 'hacking-gear', 'utility'],
    stats: { hostile: { Cost: '$1000-20,000', Weight: '1-3kg', Traits: 'Novomo PLT-6320/PLT-7000 — disrupts radio & security motion sensors, 100m-3km range' } },
  },
  {
    id: 'grav-belt', name: 'Grav Belt', category: 'gear', tags: ['survival-gear', 'utility'],
    stats: { traveller: { TL: '12', Weight: '6kg', Cost: 'Cr100000', Traits: '' } },
  },
  {
    id: 'grapple-launcher', name: 'Grapple Launcher', category: 'gear', tags: ['tool', 'utility'],
    stats: { '5pfh': { Type: 'Utility Device', Effect: 'Combat Action; scale terrain within 1", ascend up to 12"', Cost: '' } },
  },
  {
    id: 'binoculars', name: 'Binoculars / Optics', category: 'gear', tags: ['sensor', 'tool'],
    stats: { traveller: { TL: '3-12', Weight: '1kg', Cost: 'Cr75-3500', Traits: 'TL8 adds light-intensification; TL12 full EM-spectrum (PRIS)' } },
  },
  {
    id: 'geiger-counter', name: 'Geiger Counter', category: 'gear', tags: ['sensor', 'survival-gear'],
    stats: { traveller: { TL: '5', Weight: '2kg', Cost: 'Cr250', Traits: 'Detects radiation' } },
  },
  {
    id: 'survival-kit', name: 'Survival Kit', category: 'gear', tags: ['survival-gear', 'tool'],
    stats: { swn: { Cost: '60cr', Encumbrance: '1', 'Tech Level': '4', Traits: 'Fire lighter, water filter, flares, knife, blanket, tarp, distress beacon; +1 to Survive checks' } },
  },
  {
    id: 'lazarus-patch', name: 'Trauma Stabilizer Patch', category: 'gear', tags: ['medical-gear', 'consumable'],
    stats: {
      swn: { Cost: '30cr', Encumbrance: '1', 'Tech Level': '4', Traits: 'Single-use; Int/Heal or Dex/Heal (diff.6) to stabilize a character at 0 HP' },
      '5pfh': { Type: 'On-board Item', Effect: 'Reduce post-battle Injury recovery time by 1 campaign turn (Med-Patch)', Cost: '' },
    },
  },
  {
    id: 'combat-stim', name: 'Combat Stimulant', category: 'gear', tags: ['medical-gear', 'consumable'],
    stats: {
      '5pfh': { Type: 'Consumable', Effect: '+2" Speed and +1 to Brawling this and the following round (Stim-Pack); Booster Pills remove Stun and allow double Speed', Cost: '' },
      hostile: { Cost: '$300', Traits: 'Synthetic Endorphin Analog — cancels wound penalties/unconsciousness 1hr; addictive; side-effect on failed Medical roll' },
    },
  },
  {
    id: 'power-cell', name: 'Power Cell', category: 'gear', tags: ['utility', 'consumable'],
    stats: { swn: { Cost: '10cr', Encumbrance: '1 (packs 6)', 'Tech Level': '4', Traits: 'Type A cell — powers personal equipment, 30min recharge off ship power' } },
  },
  {
    id: 'translator', name: 'Translator Device', category: 'gear', tags: ['communication', 'utility'],
    stats: { swn: { Cost: '200cr', Encumbrance: '* (negligible)', 'Tech Level': '4', Traits: 'Translator Torc — 2 languages, -2 social checks while worn, 1 Type A cell = 1 week' } },
  },

  // ---- Gear: wetware / cyberware (SWN, kept distinct — each a specific
  // implant rather than a mergeable archetype) ------------------------------
  {
    id: 'dermal-armor', name: 'Dermal Armor (Cyberware)', category: 'gear', tags: ['wetware', 'medium-armor'],
    stats: { swn: { Cost: '20,000cr (100,000cr TL5)', 'System Strain': '2', 'Tech Level': '4', Traits: 'AC 16, immune to Shock from primitive melee (TL5: immune to primitive weapons entirely)' } },
  },
  {
    id: 'prosthetic-limb', name: 'Prosthetic Limb (Cyberware)', category: 'gear', tags: ['wetware', 'medical-gear'],
    stats: { swn: { Cost: '2,500cr', 'System Strain': '1', 'Tech Level': '4', Traits: 'Replaces a lost limb/organ, near-indistinguishable from natural' } },
  },
  {
    id: 'panspectral-optics', name: 'Panspectral Optics (Cyberware)', category: 'gear', tags: ['wetware', 'sensor'],
    stats: { swn: { Cost: '15,000cr', 'System Strain': '1', 'Tech Level': '4', Traits: 'Low-light/thermal vision, sees radiation/lasers/radio as color flares' } },
  },
  {
    id: 'ghost-talker', name: 'Ghost Talker Transceiver (Cyberware)', category: 'gear', tags: ['wetware', 'communication'],
    stats: { swn: { Cost: '15,000cr', 'System Strain': '1', 'Tech Level': '4', Traits: 'Built-in compad with A/V, 20km range off-grid / 100km reception' } },
  },
  {
    id: 'toxin-injector', name: 'Toxin Injector (Cyberware)', category: 'gear', tags: ['wetware', 'illegal', 'restricted'],
    stats: { swn: { Cost: '20,000cr', 'System Strain': '2 (+2/use)', 'Tech Level': '4', Traits: 'Injects poison via touch/Punch; Physical save (-2) or incapacitated, death in 1d6 rounds' } },
  },
  {
    id: 'cognitive-augmentation', name: 'Cognitive Augmentation (Cyberware)', category: 'gear', tags: ['wetware'],
    stats: { traveller: { TL: '12-16', Cost: 'Cr500000-5000000', Traits: 'INT +1 (TL12) up to +3 (TL16)' } },
  },
  {
    id: 'pdt-implant', name: 'Personal Data Transmitter (Implant)', category: 'gear', tags: ['wetware', 'communication', 'illegal'],
    stats: { hostile: { Cost: '$400', Traits: 'Surgically implanted, dormant until remotely activated; ~5km signal range' } },
  },
  {
    id: 'cortex-bomb', name: 'Cortex Bomb (Implant)', category: 'gear', tags: ['wetware', 'illegal', 'restricted'],
    stats: { hostile: { Cost: '$2000', Traits: 'Surgically implanted neural-cortex explosive; remote-detonated up to 100m, kills instantly' } },
  },
  {
    id: 'ai-companion-implant', name: 'AI Companion Implant', category: 'gear', tags: ['wetware', 'tool'],
    stats: { '5pfh': { Type: 'Implant (max 2/character)', Effect: 'Roll twice and pick better on Savvy rolls', Cost: '' } },
  },
  {
    id: 'night-sight-implant', name: 'Night Sight Implant', category: 'gear', tags: ['wetware', 'sensor'],
    stats: { '5pfh': { Type: 'Implant', Effect: 'No visibility reduction from darkness (smoke/gas still apply)', Cost: '' } },
  },

  // ---- Starforged Path-asset gear (narrative bonuses, no numeric stats) ---
  {
    id: 'healers-field-kit', name: "Healer's Field Kit", category: 'gear', tags: ['medical-gear', 'tool'],
    stats: { starforged: { Description: "HEALER path asset — a well-stocked medical kit", 'Linked Move': 'Heal / Gather Information', Bonus: '+1 (and +1 momentum on a hit) to Heal when giving medical care; +1/+1 momentum to Gather Information via medical analysis', Notes: 'Once per day-ish, Sacrifice Resources (-1) to give +1 health to all allies above 0 health' } },
  },
  {
    id: 'scavengers-kit', name: "Scavenger's Ad Hoc Kit", category: 'gear', tags: ['improvised', 'tool', 'utility'],
    stats: { starforged: { Description: 'SCAVENGER path asset — cobbled-together tools/devices/weapons', 'Linked Move': 'Face Danger / Gather Information / Check Your Gear', Bonus: '+1 to a move aided by the item on a hit; rolling 1 on the action die breaks/depletes it', Notes: '+1/+1 momentum to Gather Information/Resupply by scavenging wrecks' } },
  },
  {
    id: 'navigators-charts', name: "Navigator's Charts", category: 'gear', tags: ['sensor', 'tool', 'utility'],
    stats: { starforged: { Description: 'NAVIGATOR path asset — detailed local charts', 'Linked Move': 'Set a Course', Bonus: '+2 momentum (fastest path) or +1 (safest path) on a hit', Notes: '+1/+1 momentum to Secure an Advantage/Face Danger/Gather Information when using charts' } },
  },
  {
    id: 'kinetic-manipulator', name: 'Kinetic Manipulator', category: 'weapon', tags: ['energy-weapon', 'utility'],
    stats: { starforged: { Description: 'KINETIC path asset — push/pull/lift/constrict objects about your size or smaller', 'Linked Move': 'any risky move', Bonus: '+2 and Lose Momentum on the move; upgrades apply after the roll or grant an automatic strong hit at 8+ momentum', Notes: 'Rulebook suggests reflavoring as a technological device/power-armor gauntlet in non-magic settings' } },
  },
  {
    id: 'field-toolkit-path', name: 'Field Toolkit (Gearhead)', category: 'gear', tags: ['tool', 'utility'],
    stats: { starforged: { Description: 'GEARHEAD path signature item — always has a toolkit at the ready', 'Linked Move': '', Bonus: '', Notes: 'Full ability text is on the physical Assets-deck card, not reproduced in the source PDFs' } },
  },
];

export function findCatalogItem(id) {
  return GEAR_CATALOG.find((c) => c.id === id) || null;
}
