// swnFactionData.js — the reference data half of the SWN Faction Turn
// Engine (docs/adr/0031-swn-faction-turn-engine.md). Same posture as
// data/hostileUwpTables.js: small, citable reference tables transcribed
// from a sourcebook this app's Reference Library already holds
// (assets/docs/Stars Without Number Revised - Deluxe Edition.pdf,
// pp.216-231, "Factions, Assets, and Turns"/"Faction Actions"/"Faction
// Goals"/"Cunning/Force/Wealth Assets"/"Faction Tags"), for the GM's own
// offline use — not a borrowed system needing an ADR-0010-style copyright
// bridge, and not the earlier ADR 0011 "stay proprietary, reimplement
// only the shape" posture either: ADR 0031 explicitly supersedes that
// stance for factions specifically, per a direct request to transcribe
// SWN's real faction content in full. Stat lines (hp/cost/tl/attack/
// counter) are transcribed verbatim since they're the mechanically
// load-bearing numbers; `special`/`description` text is condensed to a
// sentence or two per entry (the same "condensed prose, not verbatim
// paragraphs" house style docs/adr/0026 already established for the
// HOSTILE gazetteer), not copied word-for-word.
//
// Tech Level here matches this app's existing HOSTILE-derived convention
// (a plain 0-5 integer, 0 = no tech requirement) rather than SWN's own
// TL numbering — close enough for "can this world afford this asset yet,"
// which is all a Location's `techLevel` free-text field can offer anyway.

export const SWN_XP_TABLE = {
  1: { xpCost: 0, hpValue: 1 },
  2: { xpCost: 2, hpValue: 2 },
  3: { xpCost: 4, hpValue: 4 },
  4: { xpCost: 6, hpValue: 6 },
  5: { xpCost: 9, hpValue: 9 },
  6: { xpCost: 12, hpValue: 12 },
  7: { xpCost: 16, hpValue: 16 },
  8: { xpCost: 20, hpValue: 20 },
};

// The one special pseudo-asset shared by all three stat tracks (p.216/218/
// 220/222) — purchasable only via the Expand Influence action, never Buy
// Asset; cost always equals its own maxHp (up to the owning faction's own
// max HP); doesn't count against a faction's per-stat asset cap.
export const SWN_BASE_OF_INFLUENCE = {
  id: 'base-of-influence',
  name: 'Base of Influence',
  description: 'A foothold on a world — required before any other asset can be purchased there. Cost equals its own max HP (up to the faction\'s own max HP); damage to it also damages the faction directly.',
};

// --- Cunning Assets (p.218-219) --------------------------------------------
export const SWN_CUNNING_ASSETS = [
  { id: 'smugglers', name: 'Smugglers', rating: 1, hp: 4, cost: 2, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d4' }, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, transports itself and/or one Special Forces unit to a planet up to two hexes away.' },
  { id: 'informers', name: 'Informers', rating: 1, hp: 3, cost: 2, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: true, special: 'Can Attack without naming a target asset — on a successful Cunning vs Cunning hit, every Stealthed asset the target has on the planet is revealed.' },
  { id: 'false-front', name: 'False Front', rating: 1, hp: 2, cost: 1, tl: 0, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Can be sacrificed to nullify a killing blow that would otherwise destroy another asset on the same planet.' },
  { id: 'lobbyists', name: 'Lobbyists', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'Can make an immediate Cunning vs Cunning test against a faction that just gained government permission to buy/move an asset; success withdraws that permission for the turn.' },
  { id: 'saboteurs', name: 'Saboteurs', rating: 2, hp: 6, cost: 5, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d4' }, counter: null, permission: false, hasAction: false, special: 'An asset it attacks (hit or not) cannot use Use Asset Ability until the attacker\'s next turn.' },
  { id: 'blackmail', name: 'Blackmail', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: '1d4+1' }, counter: null, permission: false, hasAction: false, special: 'Any attack or defense against Blackmail loses whatever bonus dice a Tag would normally grant.' },
  { id: 'seductress', name: 'Seductress', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: true, special: 'Deals no damage, but a successful attack forces the target to reveal any other Stealthed assets it has on the planet. Only Special Forces can attack a Seductress.' },
  { id: 'cyberninjas', name: 'Cyberninjas', rating: 3, hp: 4, cost: 6, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d6' }, counter: null, permission: false, hasAction: false, special: 'Personal stealth cyberware makes them hard to detect even unstealthed.' },
  { id: 'stealth', name: 'Stealth', rating: 3, hp: 0, cost: 2, tl: 0, assetType: 'Tactic', attack: null, counter: null, permission: false, hasAction: false, special: 'Not a standalone asset — purchased for another Special Forces asset on the planet. That asset can\'t be detected or attacked until it attacks/defends, at which point Stealth is lost.' },
  { id: 'covert-shipping', name: 'Covert Shipping', rating: 3, hp: 4, cost: 8, tl: 4, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, moves one Special Forces unit between any worlds within three hexes.' },
  { id: 'party-machine', name: 'Party Machine', rating: 4, hp: 10, cost: 8, tl: 0, assetType: 'Logistics Facility', attack: { vs: 'cunning', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Provides 1 FacCred to its owner every turn.' },
  { id: 'vanguard-cadres', name: 'Vanguard Cadres', rating: 4, hp: 12, cost: 8, tl: 3, assetType: 'Military Unit', attack: { vs: 'cunning', dice: '1d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Ideological followers inspired to take up arms for the movement.' },
  { id: 'tripwire-cells', name: 'Tripwire Cells', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Special Forces', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Whenever a Stealthed asset lands or is purchased on this planet, makes an immediate Cunning vs Cunning attack to strip its Stealth.' },
  { id: 'seditionists', name: 'Seditionists', rating: 4, hp: 8, cost: 12, tl: 0, assetType: 'Special Forces', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1d4 FacCreds, attaches to an enemy asset; that asset can\'t attack until Seditionists move on or the asset is destroyed (Seditionists survive either way).' },
  { id: 'organization-moles', name: 'Organization Moles', rating: 5, hp: 8, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: '2d6' }, counter: null, permission: false, hasAction: false, special: 'Subvert and confuse enemy assets, striking at their internal cohesion.' },
  { id: 'cracked-comms', name: 'Cracked Comms', rating: 5, hp: 6, cost: 14, tl: 0, assetType: 'Tactic', attack: null, counter: { dice: 'special' }, permission: false, hasAction: false, special: 'On a successful defense, can force the attacking asset to immediately attack itself for normal damage/counterattack.' },
  { id: 'boltholes', name: 'Boltholes', rating: 5, hp: 6, cost: 12, tl: 4, assetType: 'Logistics Facility', attack: null, counter: { dice: '2d6' }, permission: false, hasAction: false, special: 'A Military Unit/Special Forces asset on the same planet that would be destroyed is instead set to 0 HP and untouchable until repaired, unless the Boltholes themselves are destroyed first.' },
  { id: 'transport-lockdown', name: 'Transport Lockdown', rating: 6, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'On a successful Cunning vs Cunning attack, the target can\'t transport assets onto that planet without paying 1d4 FacCreds and waiting a turn.' },
  { id: 'covert-transit-net', name: 'Covert Transit Net', rating: 6, hp: 15, cost: 18, tl: 4, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves any Special Forces assets between worlds within three hexes as an action.' },
  { id: 'demagogue', name: 'Demagogue', rating: 6, hp: 10, cost: 20, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d8' }, counter: { dice: '1d8' }, permission: false, hasAction: false, special: 'A popular leader whose followers can be pointed toward maximum utility.' },
  { id: 'popular-movement', name: 'Popular Movement', rating: 7, hp: 16, cost: 25, tl: 4, assetType: 'Tactic', attack: { vs: 'cunning', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'A planet-wide surge of support that grants automatic government permission for the faction\'s asset purchases/movement.' },
  { id: 'book-of-secrets', name: 'Book of Secrets', rating: 7, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: null, counter: { dice: '2d8' }, permission: false, hasAction: true, special: 'Once per turn, reroll one die for an action on this world, or force a rival to reroll one die.' },
  { id: 'treachery', name: 'Treachery', rating: 7, hp: 5, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'On a successful attack, Treachery is lost, 5 FacCreds are gained, and the target asset switches sides.' },
  { id: 'panopticon-matrix', name: 'Panopticon Matrix', rating: 8, hp: 20, cost: 30, tl: 5, assetType: 'Logistics Facility', attack: null, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Every rival Stealthed asset here must pass a Cunning vs Cunning test each turn or lose Stealth; the owner gains a bonus die on all Cunning attacks/defenses here.' },
];

// --- Force Assets (p.220-221) ----------------------------------------------
export const SWN_FORCE_ASSETS = [
  { id: 'security-personnel', name: 'Security Personnel', rating: 1, hp: 3, cost: 2, tl: 0, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d3+1' }, counter: { dice: '1d4' }, permission: false, hasAction: false, special: 'Standard civilian guards or policemen.' },
  { id: 'hitmen', name: 'Hitmen', rating: 1, hp: 1, cost: 2, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '1d6' }, counter: null, permission: false, hasAction: false, special: 'Crudely-equipped thugs and assassins aimed at rival leadership.' },
  { id: 'militia-unit', name: 'Militia Unit', rating: 1, hp: 4, cost: 4, tl: 3, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d6' }, counter: { dice: '1d4+1' }, permission: true, hasAction: false, special: 'Lightly-equipped irregulars with rudimentary training.' },
  { id: 'heavy-drop-assets', name: 'Heavy Drop Assets', rating: 2, hp: 6, cost: 4, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, moves any one non-Starship asset (including itself) to a world within one hex.' },
  { id: 'elite-skirmishers', name: 'Elite Skirmishers', rating: 2, hp: 5, cost: 5, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d4' }, counter: { dice: '1d4+1' }, permission: true, hasAction: false, special: 'Guerrilla-trained troops built for quick raids.' },
  { id: 'hardened-personnel', name: 'Hardened Personnel', rating: 2, hp: 4, cost: 4, tl: 3, assetType: 'Special Forces', attack: null, counter: { dice: '1d4+1' }, permission: false, hasAction: false, special: 'Faction employees trained in defensive fighting with hardened fallback positions.' },
  { id: 'guerrilla-populace', name: 'Guerrilla Populace', rating: 2, hp: 6, cost: 4, tl: 0, assetType: 'Military Unit', attack: { vs: 'cunning', dice: '1d4+1' }, counter: null, permission: false, hasAction: false, special: 'Popular support and partisans willing to fight.' },
  { id: 'zealots', name: 'Zealots', rating: 3, hp: 4, cost: 6, tl: 0, assetType: 'Special Forces', attack: { vs: 'force', dice: '2d6' }, counter: { dice: '2d6' }, permission: false, hasAction: false, special: 'Take 1d4 damage every time they launch a successful attack or counterattack.' },
  { id: 'cunning-trap', name: 'Cunning Trap', rating: 3, hp: 2, cost: 5, tl: 0, assetType: 'Tactic', attack: null, counter: { dice: '1d6+3' }, permission: false, hasAction: false, special: 'Induced landslides, spread disease, and other stratagems of war.' },
  { id: 'counterintel-unit', name: 'Counterintel Unit', rating: 3, hp: 4, cost: 6, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '1d4+1' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Code-breaking and internal-security specialists.' },
  { id: 'beachhead-landers', name: 'Beachhead Landers', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves any number of assets on the planet (including itself) to a world within one hex, 1 FacCred each.' },
  { id: 'extended-theater', name: 'Extended Theater', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves one non-Starship asset (including itself) between worlds within two hexes, 1 FacCred.' },
  { id: 'strike-fleet', name: 'Strike Fleet', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Starship', attack: { vs: 'force', dice: '2d6' }, counter: { dice: '1d8' }, permission: false, hasAction: true, special: 'Frigate/cruiser-class vessels; can move to a world within one hex as an action.' },
  { id: 'postech-infantry', name: 'Postech Infantry', rating: 4, hp: 12, cost: 8, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d8' }, counter: { dice: '1d8' }, permission: true, hasAction: false, special: 'The backbone of most planetary armies, mag weaponry and field armor.' },
  { id: 'blockade-fleet', name: 'Blockade Fleet', rating: 5, hp: 8, cost: 10, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d6' }, counter: null, permission: false, hasAction: true, special: 'A successful Attack also steals 1d4 FacCreds from the target (once per turn); can move to a world within one hex.' },
  { id: 'pretech-logistics', name: 'Pretech Logistics', rating: 5, hp: 6, cost: 14, tl: 0, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Allows buying one Force asset (up to TL5) on this world at 1.5x cost, once per turn.' },
  { id: 'psychic-assassins', name: 'Psychic Assassins', rating: 5, hp: 4, cost: 12, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d6+2' }, counter: null, permission: false, hasAction: false, special: 'Start automatically Stealthed when purchased.' },
  { id: 'pretech-infantry', name: 'Pretech Infantry', rating: 6, hp: 16, cost: 20, tl: 5, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d8' }, counter: { dice: '2d8+2' }, permission: true, hasAction: false, special: 'Elite troops in the best pretech weaponry and armor available.' },
  { id: 'planetary-defenses', name: 'Planetary Defenses', rating: 6, hp: 20, cost: 18, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '2d6+6' }, permission: false, hasAction: false, special: 'Can only defend against Starship-type attacks.' },
  { id: 'gravtank-formation', name: 'Gravtank Formation', rating: 6, hp: 14, cost: 25, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d10+4' }, counter: { dice: '1d10' }, permission: true, hasAction: false, special: 'Advanced gravtanks that crack even hardened defensive positions.' },
  { id: 'deep-strike-landers', name: 'Deep Strike Landers', rating: 7, hp: 10, cost: 25, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves one non-Starship asset between worlds within three hexes for 2 FacCreds, even over local objection.' },
  { id: 'integral-protocols', name: 'Integral Protocols', rating: 7, hp: 10, cost: 20, tl: 5, assetType: 'Facility', attack: null, counter: { dice: '2d8+2' }, permission: false, hasAction: false, special: 'Defends only against Cunning attacks, but adds a bonus defense die.' },
  { id: 'space-marines', name: 'Space Marines', rating: 7, hp: 16, cost: 30, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d8+2' }, counter: { dice: '2d8' }, permission: false, hasAction: true, special: 'Ship-boarding specialists; can move to a world within one hex regardless of local permission.' },
  { id: 'capital-fleet', name: 'Capital Fleet', rating: 8, hp: 30, cost: 40, tl: 4, assetType: 'Starship', attack: { vs: 'force', dice: '3d10+4' }, counter: { dice: '3d8' }, permission: true, hasAction: true, special: 'The pride of an empire; costs 2 extra FacCreds/turn maintenance, can move to a world within three hexes.' },
];

// --- Wealth Assets (p.222-223) ----------------------------------------------
export const SWN_WEALTH_ASSETS = [
  { id: 'franchise', name: 'Franchise', rating: 1, hp: 3, cost: 2, tl: 2, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d4' }, counter: { dice: '1d4-1' }, permission: false, hasAction: false, special: 'A successful attack costs the target 1 FacCred, gained by the Franchise\'s owner (once per turn).' },
  { id: 'harvesters', name: 'Harvesters', rating: 1, hp: 4, cost: 2, tl: 0, assetType: 'Facility', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Roll 1d6 as an action; on a 3+, gain 1 FacCred.' },
  { id: 'local-investments', name: 'Local Investments', rating: 1, hp: 2, cost: 1, tl: 2, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d4-1' }, counter: null, permission: false, hasAction: false, special: 'Any rival buying an asset on this world pays 1 extra FacCred (lost, not gained by the owner).' },
  { id: 'freighter-contract', name: 'Freighter Contract', rating: 2, hp: 4, cost: 5, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d4' }, counter: null, permission: false, hasAction: true, special: 'Moves one non-Force asset (including itself) to a world within two hexes for 1 FacCred.' },
  { id: 'lawyers', name: 'Lawyers', rating: 2, hp: 4, cost: 6, tl: 0, assetType: 'Special Forces', attack: { vs: 'wealth', dice: '2d4' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Cannot attack or counterattack Force assets.' },
  { id: 'union-toughs', name: 'Union Toughs', rating: 2, hp: 6, cost: 4, tl: 0, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d4+1' }, counter: { dice: '1d4' }, permission: false, hasAction: false, special: 'Lightly-armed bruisers willing to sabotage on the faction\'s word.' },
  { id: 'surveyors', name: 'Surveyors', rating: 2, hp: 4, cost: 4, tl: 4, assetType: 'Special Forces', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Grants a bonus die on Expand Influence rolls on this world; can move to a world within two hexes.' },
  { id: 'postech-industry', name: 'Postech Industry', rating: 3, hp: 4, cost: 8, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Roll 1d6 as an action: 1 loses a FacCred (destroyed if unpayable), 2-4 gains one, 5-6 gains two.' },
  { id: 'laboratory', name: 'Laboratory', rating: 3, hp: 4, cost: 6, tl: 0, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'This world counts as Tech Level 4 for asset purchases.' },
  { id: 'mercenaries', name: 'Mercenaries', rating: 3, hp: 6, cost: 8, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d4+2' }, counter: { dice: '1d6' }, permission: true, hasAction: true, special: '1 FacCred/turn maintenance; can move to a world within one hex.' },
  { id: 'shipping-combine', name: 'Shipping Combine', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Moves any number of non-Force assets (including itself) to a world within two hexes, 1 FacCred each.' },
  { id: 'monopoly', name: 'Monopoly', rating: 4, hp: 12, cost: 8, tl: 3, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d6' }, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Forces one rival with unstealthed assets here to pay 1 FacCred or lose an asset of their choice.' },
  { id: 'medical-center', name: 'Medical Center', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Once between turns, restores a destroyed Special Forces/Military Unit here to 1 HP for half cost; Repair Asset costs 1 less FacCred here.' },
  { id: 'bank', name: 'Bank', rating: 4, hp: 8, cost: 12, tl: 3, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Once per turn, ignore one cost or FacCred loss imposed by another faction (no action required).' },
  { id: 'marketers', name: 'Marketers', rating: 5, hp: 8, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'wealth', dice: '1d6' }, counter: null, permission: false, hasAction: true, special: 'On a successful Cunning vs Wealth test against a rival asset, it must pay half its purchase cost or become disabled.' },
  { id: 'pretech-researchers', name: 'Pretech Researchers', rating: 5, hp: 6, cost: 14, tl: 4, assetType: 'Special Forces', attack: null, counter: null, permission: false, hasAction: false, special: '1 FacCred/turn maintenance; this world counts as TL5 for Cunning/Wealth asset purchases.' },
  { id: 'blockade-runners', name: 'Blockade Runners', rating: 5, hp: 6, cost: 12, tl: 4, assetType: 'Starship', attack: null, counter: { dice: '2d4' }, permission: false, hasAction: true, special: 'Moves itself or one Military/Special Forces asset to a world within three hexes for 2 FacCreds, even past local permission.' },
  { id: 'venture-capital', name: 'Venture Capital', rating: 6, hp: 10, cost: 15, tl: 4, assetType: 'Facility', attack: { vs: 'wealth', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Roll 1d8 as an action: 1 destroys the asset, 2-3 gains 1 FacCred, 4-7 gains two, 8 gains three.' },
  { id: 'rd-department', name: 'R&D Department', rating: 6, hp: 15, cost: 18, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Every planet counts as TL4 for Wealth asset purchases.' },
  { id: 'commodities-broker', name: 'Commodities Broker', rating: 6, hp: 10, cost: 20, tl: 0, assetType: 'Special Forces', attack: { vs: 'wealth', dice: '2d8' }, counter: { dice: '1d8' }, permission: false, hasAction: true, special: 'Roll 1d8 as an action; that many FacCreds come off the next asset purchase\'s cost (min half price).' },
  { id: 'pretech-manufactory', name: 'Pretech Manufactory', rating: 7, hp: 16, cost: 25, tl: 5, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Rare functioning pretech industry; roll 1d8 as an action, gain half that many FacCreds (rounded up).' },
  { id: 'hostile-takeover', name: 'Hostile Takeover', rating: 7, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: { vs: 'wealth', dice: '2d10' }, counter: { dice: '2d8' }, permission: false, hasAction: false, special: 'If it destroys a target, that asset is instead reduced to 1 HP and acquired by the owner.' },
  { id: 'transit-web', name: 'Transit Web', rating: 7, hp: 5, cost: 15, tl: 5, assetType: 'Facility', attack: { vs: 'cunning', dice: '1d12' }, counter: null, permission: false, hasAction: false, special: 'For 1 FacCred, freely moves any non-Starship Cunning/Wealth assets between worlds within three hexes.' },
  { id: 'scavenger-fleet', name: 'Scavenger Fleet', rating: 8, hp: 20, cost: 30, tl: 5, assetType: 'Starship', attack: { vs: 'wealth', dice: '2d10+4' }, counter: { dice: '2d10' }, permission: false, hasAction: true, special: '2 FacCreds/turn maintenance; can move to a world within three hexes.' },
];

export const SWN_FACTION_ASSETS = {
  force: SWN_FORCE_ASSETS,
  cunning: SWN_CUNNING_ASSETS,
  wealth: SWN_WEALTH_ASSETS,
};

// Assets whose special ability is a simple, self-contained numeric effect
// (a dice-for-FacCreds swing, or a pure relocate-an-asset move) that
// domain/factionTurnEngine.js's useAssetAbility() can resolve mechanically
// without a GM call. Every other asset with hasAction:true surfaces its
// `special` text and asks the GM to adjudicate the outcome directly — SWN's
// own stated philosophy is that "this is not meant to be a standalone game
// that doesn't require GM involvement," and simulating all ~25 hasAction
// assets' bespoke effects (Marketers' disable-until-paid, Monopoly's
// forced-sale, Treachery's side-switch, ...) is out of scope for this pass.
export const SWN_AUTOMATIC_ASSET_ABILITIES = {
  harvesters: { roll: '1d6', effect: (n) => (n >= 3 ? { facCreds: 1 } : { facCreds: 0 }) },
  'postech-industry': { roll: '1d6', effect: (n) => (n === 1 ? { facCreds: -1 } : n <= 4 ? { facCreds: 1 } : { facCreds: 2 }) },
  'venture-capital': { roll: '1d8', effect: (n) => (n === 1 ? { destroyed: true } : n <= 3 ? { facCreds: 1 } : n <= 7 ? { facCreds: 2 } : { facCreds: 3 }) },
  'pretech-manufactory': { roll: '1d8', effect: (n) => ({ facCreds: Math.ceil(n / 2) }) },
  'commodities-broker': { roll: '1d8', effect: (n) => ({ discountNextPurchase: n }) },
};

// --- Faction Tags (p.224-225) -----------------------------------------------
// `repeatable: true` marks Planetary Government, the one tag SWN says can
// be held "multiple times, once for each planet" — modeled separately from
// the flat factionTags list via a Faction entity's own governedLocationIds
// (see docs/adr/0031), not as a repeated entry here.
export const SWN_FACTION_TAGS = [
  { id: 'colonists', name: 'Colonists', effect: 'Has all the benefits of Planetary Government on its homeworld (no other government exists on a fresh colony); homeworld counts as at least TL4.' },
  { id: 'deep-rooted', name: 'Deep Rooted', effect: 'Rolls an extra d10 when defending against attacks on assets on its homeworld. Lost if the faction ever changes homeworlds.' },
  { id: 'eugenics-cult', name: 'Eugenics Cult', effect: 'Can buy the Gengineered Slaves asset (Force 1, 6 HP, 2 FacCred, TL4, Force vs Force 1d6/1d4 counter); once per turn rolls an extra d10 on that asset\'s attack or defense.' },
  { id: 'exchange-consulate', name: 'Exchange Consulate', effect: 'Completing Peaceable Kingdom grants a bonus XP on a 1d6 roll of 4+; once per turn rolls an extra d10 defending against a Wealth attack.' },
  { id: 'fanatical', name: 'Fanatical', effect: 'Always rerolls a natural 1, but always loses ties during attacks.' },
  { id: 'imperialists', name: 'Imperialists', effect: 'Rolls an extra d10 for attacks made as part of a Seize Planet action.' },
  { id: 'machiavellian', name: 'Machiavellian', effect: 'Once per turn, rolls an extra d10 on a Cunning attack.' },
  { id: 'mercenary-group', name: 'Mercenary Group', effect: 'Every asset gains a move-to-a-world-within-one-hex action.' },
  { id: 'perimeter-agency', name: 'Perimeter Agency', effect: 'Once per turn, rolls an extra d10 attacking a TL5+ asset, and an extra die detecting Stealthed assets.' },
  { id: 'pirates', name: 'Pirates', effect: 'Any asset moved onto a world where this faction has a Base of Influence costs the mover 1 extra FacCred, paid to this faction.' },
  { id: 'plutocratic', name: 'Plutocratic', effect: 'Once per turn, rolls an extra d10 on a Wealth attack.' },
  { id: 'preceptor-archive', name: 'Preceptor Archive', effect: 'TL4+ asset purchases cost 1 less FacCred; can spend 2 FacCreds and roll 1d12 to permanently raise a world to TL4 on a 12.' },
  { id: 'psychic-academy', name: 'Psychic Academy', effect: 'Once per turn, forces a rival to reroll any one d10, whether or not they were involved in that roll.' },
  { id: 'savage', name: 'Savage', effect: 'Once per turn, rolls an extra die defending with a TL0 asset.' },
  { id: 'scavengers', name: 'Scavengers', effect: 'Gains 1 FacCred whenever the faction destroys an asset or has one of its own destroyed.' },
  { id: 'secretive', name: 'Secretive', effect: 'Every newly purchased asset begins Stealthed automatically.' },
  { id: 'technical-expertise', name: 'Technical Expertise', effect: 'Every world with a Base of Influence counts as at least TL4; can build Starship-type assets on any world with 10,000+ occupants.' },
  { id: 'theocratic', name: 'Theocratic', effect: 'Once per turn, rolls an extra d10 defending against a Cunning attack.' },
  { id: 'warlike', name: 'Warlike', effect: 'Once per turn, rolls an extra d10 on a Force attack.' },
  { id: 'planetary-government', name: 'Planetary Government', effect: 'The legitimate government of a world — its permission is required for any asset there marked "needs permission." Repeatable, once per world governed (see governedLocationIds).', repeatable: true },
];

// --- Faction Goals (p.217) --------------------------------------------------
// `difficulty` is either a flat number or a small pure function of the
// acting faction's own stats, matching the book's own per-goal formula.
// `xpAward` always equals the resolved difficulty (SWN: "gains experience
// points equal to the goal's difficulty").
export const SWN_FACTION_GOALS = [
  { id: 'military-conquest', name: 'Military Conquest', description: 'Destroy a number of rival Force assets equal to your own Force rating.', difficulty: (f) => Math.max(1, Math.ceil((f.force || 0) / 2)), countable: { statTypeDestroyed: 'force', per: 1 } },
  { id: 'commercial-expansion', name: 'Commercial Expansion', description: 'Destroy a number of rival Wealth assets equal to your own Wealth rating.', difficulty: (f) => Math.max(1, Math.ceil((f.wealth || 0) / 2)), countable: { statTypeDestroyed: 'wealth', per: 1 } },
  { id: 'intelligence-coup', name: 'Intelligence Coup', description: 'Destroy a number of rival Cunning assets equal to your own Cunning rating.', difficulty: (f) => Math.max(1, Math.ceil((f.cunning || 0) / 2)), countable: { statTypeDestroyed: 'cunning', per: 1 } },
  { id: 'planetary-seizure', name: 'Planetary Seizure', description: 'Take control of a planet, becoming its legitimate government.', difficulty: () => 1, countable: { seizePlanet: true } },
  { id: 'expand-influence-goal', name: 'Expand Influence', description: 'Plant a Base of Influence on a new planet.', difficulty: () => 1, countable: { expandInfluence: true } },
  { id: 'blood-the-enemy', name: 'Blood the Enemy', description: 'Inflict HP damage on enemy assets/bases equal to your total Force + Cunning + Wealth.', difficulty: () => 2, countable: { hpDamageDealt: true } },
  { id: 'peaceable-kingdom', name: 'Peaceable Kingdom', description: 'Take no Attack action for four consecutive turns.', difficulty: () => 1, countable: { turnsWithoutAttack: 4 } },
  { id: 'destroy-the-foe', name: 'Destroy the Foe', description: 'Destroy a rival faction outright.', difficulty: () => 2, countable: { destroyRivalFaction: true } },
  { id: 'inside-enemy-territory', name: 'Inside Enemy Territory', description: 'Have Stealthed assets equal to your Cunning score on worlds ruled by other governments.', difficulty: () => 2, countable: { stealthedOnRivalGovWorlds: true } },
  { id: 'invincible-valor', name: 'Invincible Valor', description: 'Destroy a Force asset with a higher minimum purchase rating than your own Force rating.', difficulty: () => 2, countable: { destroyHigherRatedForceAsset: true } },
  { id: 'wealth-of-worlds', name: 'Wealth of Worlds', description: 'Spend FacCreds equal to four times your Wealth rating on bribes and influence.', difficulty: () => 2, countable: { facCredsSpent: true } },
];

// Per-turn maintenance FacCred cost — SWN: most assets have none ("sometimes
// a maintenance cost"); these four are the ones the sourcebook calls out by
// name. Anything not listed here defaults to 0 in the engine.
export const SWN_ASSET_MAINTENANCE = {
  'capital-fleet': 2,
  mercenaries: 1,
  'scavenger-fleet': 2,
  'pretech-researchers': 1,
};

export function findSwnAsset(statType, id) {
  const list = SWN_FACTION_ASSETS[statType] || [];
  return list.find((a) => a.id === id) || null;
}
export function findSwnAssetAnyStat(id) {
  for (const statType of ['force', 'cunning', 'wealth']) {
    const found = findSwnAsset(statType, id);
    if (found) return { ...found, statType };
  }
  return null;
}
export function findSwnTag(id) { return SWN_FACTION_TAGS.find((t) => t.id === id) || null; }
export function findSwnGoal(id) { return SWN_FACTION_GOALS.find((g) => g.id === id) || null; }
export function findSwnXp(rating) { return SWN_XP_TABLE[rating] || null; }
