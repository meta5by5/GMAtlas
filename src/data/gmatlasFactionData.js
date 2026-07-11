// gmatlasFactionData.js — the "GMAtlas Core" faction content provider
// (docs/adr/0032-gmatlas-core-faction-provider.md). A full, original-content
// mirror of data/swnFactionData.js: every asset/tag/goal here has the exact
// same mechanical numbers as its SWN counterpart (rating/hp/cost/tl/attack/
// counter/permission/hasAction, difficulty formulas, countable criteria) —
// game mechanics and numeric formulas aren't copyrightable expression — but
// every name and all `special`/`effect`/`description` prose is original
// writing, never a paraphrase of SWN's own wording. This is the ungated,
// safe-by-default provider for a publicly-deployed campaign (see the ADR
// for why "transcribed for personal use," ADR 0031's posture, doesn't hold
// once this app is served from GitHub Pages).
//
// `assetType` category labels (Military Unit/Special Forces/Facility/
// Starship/Tactic/Logistics Facility) are generic game-design terms, kept
// identical to swnFactionData.js on purpose — only creative naming/flavor
// text is original here. Same for the engine's own action-id vocabulary
// (Attack/Buy Asset/Seize Planet/...), referenced in some `effect` text
// below — those are this app's own generic mechanical labels, shared by
// both providers, not SWN content.
//
// Same shape/helper names as swnFactionData.js throughout, so
// data/factionRulesProviders.js can treat both providers symmetrically.

export const GMATLAS_XP_TABLE = {
  1: { xpCost: 0, hpValue: 1 },
  2: { xpCost: 2, hpValue: 2 },
  3: { xpCost: 4, hpValue: 4 },
  4: { xpCost: 6, hpValue: 6 },
  5: { xpCost: 9, hpValue: 9 },
  6: { xpCost: 12, hpValue: 12 },
  7: { xpCost: 16, hpValue: 16 },
  8: { xpCost: 20, hpValue: 20 },
};

export const GMATLAS_BASE_OF_INFLUENCE = {
  id: 'base-of-influence',
  name: 'Base of Influence',
  description: 'A foothold on a world — required before any other asset can be purchased there. Cost equals its own max HP (up to the faction\'s own max HP); damage to it also damages the faction directly.',
};

// --- Cunning Assets ----------------------------------------------------
export const GMATLAS_CUNNING_ASSETS = [
  { id: 'blackwake-couriers', name: 'Blackwake Couriers', rating: 1, hp: 4, cost: 2, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d4' }, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, ferries itself and/or one Special Forces unit to a world up to two hexes distant.' },
  { id: 'whisper-net', name: 'Whisper Net', rating: 1, hp: 3, cost: 2, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: true, special: 'May Attack without naming a target asset — a successful Cunning hit exposes every Stealthed asset the target holds on that world.' },
  { id: 'cutout-office', name: 'Cutout Office', rating: 1, hp: 2, cost: 1, tl: 0, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Can be sacrificed to absorb a killing blow that would otherwise destroy another asset on the same world.' },
  { id: 'access-brokers', name: 'Access Brokers', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'Makes an immediate Cunning contest against a faction that just won government permission to buy or move an asset; a win withdraws that permission for the turn.' },
  { id: 'wrench-crews', name: 'Wrench Crews', rating: 2, hp: 6, cost: 5, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d4' }, counter: null, permission: false, hasAction: false, special: 'Any asset it attacks, hit or not, can\'t use its own ability until this faction\'s next turn.' },
  { id: 'leverage-file', name: 'Leverage File', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: '1d4+1' }, counter: null, permission: false, hasAction: false, special: 'Any attack or defense made against it loses whatever bonus dice a Tag would normally grant.' },
  { id: 'honey-trap-cell', name: 'Honey Trap Cell', rating: 2, hp: 4, cost: 4, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: true, special: 'Deals no damage, but a successful attack forces the target to reveal any other Stealthed assets on that world. Only a Special Forces asset can attack it back.' },
  { id: 'ghostblade-cadre', name: 'Ghostblade Cadre', rating: 3, hp: 4, cost: 6, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d6' }, counter: null, permission: false, hasAction: false, special: 'Personal stealth augmentation makes them difficult to detect even while unstealthed.' },
  { id: 'cloak-protocol', name: 'Cloak Protocol', rating: 3, hp: 0, cost: 2, tl: 0, assetType: 'Tactic', attack: null, counter: null, permission: false, hasAction: false, special: 'Not a standalone asset — purchased for another Special Forces asset on the world. That asset can\'t be detected or attacked until it attacks or defends, at which point the protocol is spent.' },
  { id: 'shadow-lane-depot', name: 'Shadow Lane Depot', rating: 3, hp: 4, cost: 8, tl: 4, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, moves one Special Forces unit between any worlds within three hexes.' },
  { id: 'ward-machine', name: 'Ward Machine', rating: 4, hp: 10, cost: 8, tl: 0, assetType: 'Logistics Facility', attack: { vs: 'cunning', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'A grassroots political machine that funnels 1 FacCred to its owner every turn.' },
  { id: 'true-believer-cadres', name: 'True Believer Cadres', rating: 4, hp: 12, cost: 8, tl: 3, assetType: 'Military Unit', attack: { vs: 'cunning', dice: '1d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Ideological followers inspired to take up arms for the cause.' },
  { id: 'tripline-cells', name: 'Tripline Cells', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Special Forces', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Whenever a Stealthed asset lands or is purchased on this world, makes an immediate Cunning contest to strip its Stealth.' },
  { id: 'agitator-ring', name: 'Agitator Ring', rating: 4, hp: 8, cost: 12, tl: 0, assetType: 'Special Forces', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1d4 FacCreds, attaches to an enemy asset; that asset can\'t attack until the ring moves on or the asset is destroyed (the ring survives either way).' },
  { id: 'sleeper-moles', name: 'Sleeper Moles', rating: 5, hp: 8, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: '2d6' }, counter: null, permission: false, hasAction: false, special: 'Subvert and confuse enemy assets, striking at their internal cohesion.' },
  { id: 'spoofed-channel', name: 'Spoofed Channel', rating: 5, hp: 6, cost: 14, tl: 0, assetType: 'Tactic', attack: null, counter: { dice: 'special' }, permission: false, hasAction: false, special: 'On a successful defense, can force the attacking asset to immediately attack itself for normal damage or counterattack.' },
  { id: 'deep-bunkers', name: 'Deep Bunkers', rating: 5, hp: 6, cost: 12, tl: 4, assetType: 'Logistics Facility', attack: null, counter: { dice: '2d6' }, permission: false, hasAction: false, special: 'A Military Unit or Special Forces asset on the same world that would be destroyed is instead set to 0 HP and untouchable until repaired, unless the bunkers are destroyed first.' },
  { id: 'transit-freeze', name: 'Transit Freeze', rating: 6, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'On a successful Cunning attack, the target can\'t transport assets onto that world without paying 1d4 FacCreds and waiting a turn.' },
  { id: 'undernet-relay', name: 'Undernet Relay', rating: 6, hp: 15, cost: 18, tl: 4, assetType: 'Logistics Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves any Special Forces assets between worlds within three hexes as an action.' },
  { id: 'firebrand-orator', name: 'Firebrand Orator', rating: 6, hp: 10, cost: 20, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d8' }, counter: { dice: '1d8' }, permission: false, hasAction: false, special: 'A popular leader whose followers can be pointed toward maximum effect.' },
  { id: 'groundswell-front', name: 'Groundswell Front', rating: 7, hp: 16, cost: 25, tl: 4, assetType: 'Tactic', attack: { vs: 'cunning', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'A world-wide surge of support that grants automatic government permission for this faction\'s asset purchases and movement.' },
  { id: 'dossier-vault', name: 'Dossier Vault', rating: 7, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: null, counter: { dice: '2d8' }, permission: false, hasAction: true, special: 'Once per turn, reroll one die for an action on this world, or force a rival to reroll one of theirs.' },
  { id: 'turned-loyalty', name: 'Turned Loyalty', rating: 7, hp: 5, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'cunning', dice: 'special' }, counter: null, permission: false, hasAction: false, special: 'On a successful attack, it is spent, 5 FacCreds are gained, and the target asset switches sides.' },
  { id: 'panoptic-array', name: 'Panoptic Array', rating: 8, hp: 20, cost: 30, tl: 5, assetType: 'Logistics Facility', attack: null, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Every rival Stealthed asset here must pass a Cunning test each turn or lose Stealth; the owner gains a bonus die on all Cunning attacks and defenses here.' },
];

// --- Force Assets --------------------------------------------------------
export const GMATLAS_FORCE_ASSETS = [
  { id: 'garrison-guards', name: 'Garrison Guards', rating: 1, hp: 3, cost: 2, tl: 0, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d3+1' }, counter: { dice: '1d4' }, permission: false, hasAction: false, special: 'Standard civilian guards or municipal police.' },
  { id: 'contract-blades', name: 'Contract Blades', rating: 1, hp: 1, cost: 2, tl: 0, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '1d6' }, counter: null, permission: false, hasAction: false, special: 'Crudely-equipped thugs and assassins aimed at rival leadership.' },
  { id: 'levy-militia', name: 'Levy Militia', rating: 1, hp: 4, cost: 4, tl: 3, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d6' }, counter: { dice: '1d4+1' }, permission: true, hasAction: false, special: 'Lightly-equipped irregulars with rudimentary training.' },
  { id: 'drop-cradle', name: 'Drop Cradle', rating: 2, hp: 6, cost: 4, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'For 1 FacCred, moves any one non-Starship asset (including itself) to a world within one hex.' },
  { id: 'raider-vanguard', name: 'Raider Vanguard', rating: 2, hp: 5, cost: 5, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d4' }, counter: { dice: '1d4+1' }, permission: true, hasAction: false, special: 'Guerrilla-trained troops built for fast raids.' },
  { id: 'bunker-cadre', name: 'Bunker Cadre', rating: 2, hp: 4, cost: 4, tl: 3, assetType: 'Special Forces', attack: null, counter: { dice: '1d4+1' }, permission: false, hasAction: false, special: 'Faction employees trained in defensive fighting from hardened fallback positions.' },
  { id: 'partisan-network', name: 'Partisan Network', rating: 2, hp: 6, cost: 4, tl: 0, assetType: 'Military Unit', attack: { vs: 'cunning', dice: '1d4+1' }, counter: null, permission: false, hasAction: false, special: 'Popular support and partisans willing to fight.' },
  { id: 'fervent-legion', name: 'Fervent Legion', rating: 3, hp: 4, cost: 6, tl: 0, assetType: 'Special Forces', attack: { vs: 'force', dice: '2d6' }, counter: { dice: '2d6' }, permission: false, hasAction: false, special: 'Take 1d4 damage every time they land a successful attack or counterattack.' },
  { id: 'field-stratagem', name: 'Field Stratagem', rating: 3, hp: 2, cost: 5, tl: 0, assetType: 'Tactic', attack: null, counter: { dice: '1d6+3' }, permission: false, hasAction: false, special: 'Induced landslides, spread disease, and other stratagems of war.' },
  { id: 'signal-watch', name: 'Signal Watch', rating: 3, hp: 4, cost: 6, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '1d4+1' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Code-breaking and internal-security specialists.' },
  { id: 'beachhead-pods', name: 'Beachhead Pods', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves any number of assets on this world (including itself) to a world within one hex, 1 FacCred each.' },
  { id: 'forward-staging-yard', name: 'Forward Staging Yard', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves one non-Starship asset (including itself) between worlds within two hexes, 1 FacCred.' },
  { id: 'lance-squadron', name: 'Lance Squadron', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Starship', attack: { vs: 'force', dice: '2d6' }, counter: { dice: '1d8' }, permission: false, hasAction: true, special: 'Frigate- and cruiser-class vessels; can move to a world within one hex as an action.' },
  { id: 'line-infantry', name: 'Line Infantry', rating: 4, hp: 12, cost: 8, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d8' }, counter: { dice: '1d8' }, permission: true, hasAction: false, special: 'The backbone of most planetary armies, kitted with mag weaponry and field armor.' },
  { id: 'cordon-fleet', name: 'Cordon Fleet', rating: 5, hp: 8, cost: 10, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d6' }, counter: null, permission: false, hasAction: true, special: 'A successful Attack also steals 1d4 FacCreds from the target (once per turn); can move to a world within one hex.' },
  { id: 'relic-quartermastery', name: 'Relic Quartermastery', rating: 5, hp: 6, cost: 14, tl: 0, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Allows buying one Force asset (up to TL5) on this world at 1.5x cost, once per turn.' },
  { id: 'mindstrike-agents', name: 'Mindstrike Agents', rating: 5, hp: 4, cost: 12, tl: 4, assetType: 'Special Forces', attack: { vs: 'cunning', dice: '2d6+2' }, counter: null, permission: false, hasAction: false, special: 'Start automatically Stealthed when purchased.' },
  { id: 'vanguard-relic-troopers', name: 'Vanguard Relic Troopers', rating: 6, hp: 16, cost: 20, tl: 5, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d8' }, counter: { dice: '2d8+2' }, permission: true, hasAction: false, special: 'Elite troops fielding the best relic-tech weaponry and armor available.' },
  { id: 'orbital-shield-grid', name: 'Orbital Shield Grid', rating: 6, hp: 20, cost: 18, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '2d6+6' }, permission: false, hasAction: false, special: 'Can only defend against Starship-type attacks.' },
  { id: 'gravtread-armor', name: 'Gravtread Armor', rating: 6, hp: 14, cost: 25, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d10+4' }, counter: { dice: '1d10' }, permission: true, hasAction: false, special: 'Advanced grav-suspension armor that cracks even hardened defensive positions.' },
  { id: 'deep-strike-drop-yard', name: 'Deep Strike Drop Yard', rating: 7, hp: 10, cost: 25, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'Moves one non-Starship asset between worlds within three hexes for 2 FacCreds, even over local objection.' },
  { id: 'hardened-protocols', name: 'Hardened Protocols', rating: 7, hp: 10, cost: 20, tl: 5, assetType: 'Facility', attack: null, counter: { dice: '2d8+2' }, permission: false, hasAction: false, special: 'Defends only against Cunning attacks, but adds a bonus defense die.' },
  { id: 'boarding-marines', name: 'Boarding Marines', rating: 7, hp: 16, cost: 30, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d8+2' }, counter: { dice: '2d8' }, permission: false, hasAction: true, special: 'Ship-boarding specialists; can move to a world within one hex regardless of local permission.' },
  { id: 'dreadnought-armada', name: 'Dreadnought Armada', rating: 8, hp: 30, cost: 40, tl: 4, assetType: 'Starship', attack: { vs: 'force', dice: '3d10+4' }, counter: { dice: '3d8' }, permission: true, hasAction: true, special: 'The pride of an empire; costs 2 extra FacCreds/turn in maintenance, can move to a world within three hexes.' },
];

// --- Wealth Assets ---------------------------------------------------------
export const GMATLAS_WEALTH_ASSETS = [
  { id: 'chain-outpost', name: 'Chain Outpost', rating: 1, hp: 3, cost: 2, tl: 2, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d4' }, counter: { dice: '1d4-1' }, permission: false, hasAction: false, special: 'A successful attack costs the target 1 FacCred, gained by this asset\'s owner (once per turn).' },
  { id: 'reclamation-crews', name: 'Reclamation Crews', rating: 1, hp: 4, cost: 2, tl: 0, assetType: 'Facility', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Roll 1d6 as an action; on a 3+, gain 1 FacCred.' },
  { id: 'entrenched-holdings', name: 'Entrenched Holdings', rating: 1, hp: 2, cost: 1, tl: 2, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d4-1' }, counter: null, permission: false, hasAction: false, special: 'Any rival buying an asset on this world pays 1 extra FacCred (lost, not gained by this asset\'s owner).' },
  { id: 'haulage-contract', name: 'Haulage Contract', rating: 2, hp: 4, cost: 5, tl: 4, assetType: 'Starship', attack: { vs: 'wealth', dice: '1d4' }, counter: null, permission: false, hasAction: true, special: 'Moves one non-Force asset (including itself) to a world within two hexes for 1 FacCred.' },
  { id: 'litigation-house', name: 'Litigation House', rating: 2, hp: 4, cost: 6, tl: 0, assetType: 'Special Forces', attack: { vs: 'wealth', dice: '2d4' }, counter: { dice: '1d6' }, permission: false, hasAction: false, special: 'Cannot attack or counterattack Force assets.' },
  { id: 'dockworker-toughs', name: 'Dockworker Toughs', rating: 2, hp: 6, cost: 4, tl: 0, assetType: 'Military Unit', attack: { vs: 'force', dice: '1d4+1' }, counter: { dice: '1d4' }, permission: false, hasAction: false, special: 'Lightly-armed bruisers willing to sabotage on the faction\'s word.' },
  { id: 'prospecting-teams', name: 'Prospecting Teams', rating: 2, hp: 4, cost: 4, tl: 4, assetType: 'Special Forces', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Grants a bonus die on Expand Influence rolls on this world; can move to a world within two hexes.' },
  { id: 'assembly-works', name: 'Assembly Works', rating: 3, hp: 4, cost: 8, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '1d4' }, permission: false, hasAction: true, special: 'Roll 1d6 as an action: a 1 loses a FacCred (the asset is destroyed if unpayable), 2-4 gains one, 5-6 gains two.' },
  { id: 'research-annex', name: 'Research Annex', rating: 3, hp: 4, cost: 6, tl: 0, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'This world counts as Tech Level 4 for asset purchases.' },
  { id: 'hired-guns', name: 'Hired Guns', rating: 3, hp: 6, cost: 8, tl: 4, assetType: 'Military Unit', attack: { vs: 'force', dice: '2d4+2' }, counter: { dice: '1d6' }, permission: true, hasAction: true, special: '1 FacCred/turn maintenance; can move to a world within one hex.' },
  { id: 'freight-cartel', name: 'Freight Cartel', rating: 4, hp: 10, cost: 10, tl: 4, assetType: 'Facility', attack: null, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Moves any number of non-Force assets (including itself) to a world within two hexes, 1 FacCred each.' },
  { id: 'market-lockout', name: 'Market Lockout', rating: 4, hp: 12, cost: 8, tl: 3, assetType: 'Facility', attack: { vs: 'wealth', dice: '1d6' }, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Forces one rival with unstealthed assets here to pay 1 FacCred or lose an asset of their choice.' },
  { id: 'trauma-clinic', name: 'Trauma Clinic', rating: 4, hp: 8, cost: 12, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Once between turns, restores a destroyed Special Forces/Military Unit here to 1 HP for half cost; Repair Asset costs 1 less FacCred here.' },
  { id: 'clearing-house', name: 'Clearing House', rating: 4, hp: 8, cost: 12, tl: 3, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Once per turn, ignore one cost or FacCred loss imposed by another faction (no action required).' },
  { id: 'brand-war-team', name: 'Brand War Team', rating: 5, hp: 8, cost: 10, tl: 0, assetType: 'Tactic', attack: { vs: 'wealth', dice: '1d6' }, counter: null, permission: false, hasAction: true, special: 'On a successful Cunning vs Wealth test against a rival asset, it must pay half its purchase cost or become disabled.' },
  { id: 'relic-science-cadre', name: 'Relic Science Cadre', rating: 5, hp: 6, cost: 14, tl: 4, assetType: 'Special Forces', attack: null, counter: null, permission: false, hasAction: false, special: '1 FacCred/turn maintenance; this world counts as TL5 for Cunning/Wealth asset purchases.' },
  { id: 'smoke-lane-runners', name: 'Smoke Lane Runners', rating: 5, hp: 6, cost: 12, tl: 4, assetType: 'Starship', attack: null, counter: { dice: '2d4' }, permission: false, hasAction: true, special: 'Moves itself or one Military/Special Forces asset to a world within three hexes for 2 FacCreds, even past local permission.' },
  { id: 'speculation-fund', name: 'Speculation Fund', rating: 6, hp: 10, cost: 15, tl: 4, assetType: 'Facility', attack: { vs: 'wealth', dice: '2d6' }, counter: { dice: '1d6' }, permission: false, hasAction: true, special: 'Roll 1d8 as an action: a 1 destroys the asset, 2-3 gains 1 FacCred, 4-7 gains two, an 8 gains three.' },
  { id: 'innovation-directorate', name: 'Innovation Directorate', rating: 6, hp: 15, cost: 18, tl: 4, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: false, special: 'Every world counts as TL4 for Wealth asset purchases.' },
  { id: 'exchange-fixer', name: 'Exchange Fixer', rating: 6, hp: 10, cost: 20, tl: 0, assetType: 'Special Forces', attack: { vs: 'wealth', dice: '2d8' }, counter: { dice: '1d8' }, permission: false, hasAction: true, special: 'Roll 1d8 as an action; that many FacCreds come off the next asset purchase\'s cost (minimum half price).' },
  { id: 'relic-forgeworks', name: 'Relic Forgeworks', rating: 7, hp: 16, cost: 25, tl: 5, assetType: 'Facility', attack: null, counter: null, permission: false, hasAction: true, special: 'A rare functioning relic-tech manufactory; roll 1d8 as an action, gain half that many FacCreds (rounded up).' },
  { id: 'proxy-buyout', name: 'Proxy Buyout', rating: 7, hp: 10, cost: 20, tl: 4, assetType: 'Tactic', attack: { vs: 'wealth', dice: '2d10' }, counter: { dice: '2d8' }, permission: false, hasAction: false, special: 'If it would destroy a target, that asset is instead reduced to 1 HP and acquired by this asset\'s owner.' },
  { id: 'transit-lattice', name: 'Transit Lattice', rating: 7, hp: 5, cost: 15, tl: 5, assetType: 'Facility', attack: { vs: 'cunning', dice: '1d12' }, counter: null, permission: false, hasAction: false, special: 'For 1 FacCred, freely moves any non-Starship Cunning/Wealth assets between worlds within three hexes.' },
  { id: 'salvage-armada', name: 'Salvage Armada', rating: 8, hp: 20, cost: 30, tl: 5, assetType: 'Starship', attack: { vs: 'wealth', dice: '2d10+4' }, counter: { dice: '2d10' }, permission: false, hasAction: true, special: '2 FacCreds/turn maintenance; can move to a world within three hexes.' },
];

export const GMATLAS_FACTION_ASSETS = {
  force: GMATLAS_FORCE_ASSETS,
  cunning: GMATLAS_CUNNING_ASSETS,
  wealth: GMATLAS_WEALTH_ASSETS,
};

// Mechanically identical to swnFactionData.js's SWN_AUTOMATIC_ASSET_
// ABILITIES (same 5 dice-for-FacCreds/relocate formulas), keyed by this
// provider's own asset ids.
export const GMATLAS_AUTOMATIC_ASSET_ABILITIES = {
  'reclamation-crews': { roll: '1d6', effect: (n) => (n >= 3 ? { facCreds: 1 } : { facCreds: 0 }) },
  'assembly-works': { roll: '1d6', effect: (n) => (n === 1 ? { facCreds: -1 } : n <= 4 ? { facCreds: 1 } : { facCreds: 2 }) },
  'speculation-fund': { roll: '1d8', effect: (n) => (n === 1 ? { destroyed: true } : n <= 3 ? { facCreds: 1 } : n <= 7 ? { facCreds: 2 } : { facCreds: 3 }) },
  'relic-forgeworks': { roll: '1d8', effect: (n) => ({ facCreds: Math.ceil(n / 2) }) },
  'exchange-fixer': { roll: '1d8', effect: (n) => ({ discountNextPurchase: n }) },
};

// --- Faction Tags ------------------------------------------------------
export const GMATLAS_FACTION_TAGS = [
  { id: 'settler-stock', name: 'Settler Stock', effect: 'Has all the benefits of Ruling Authority on its homeworld (no other government exists on a fresh colony); homeworld counts as at least TL4.' },
  { id: 'entrenched', name: 'Entrenched', effect: 'Rolls an extra d10 when defending against attacks on assets on its homeworld. Lost if the faction ever changes homeworlds.' },
  { id: 'bloodline-cult', name: 'Bloodline Cult', effect: 'Can buy the Engineered Thralls asset (Force 1, 6 HP, 2 FacCred, TL4, Force vs Force 1d6/1d4 counter); once per turn rolls an extra d10 on that asset\'s attack or defense.' },
  { id: 'trade-legation', name: 'Trade Legation', effect: 'Completing Uneasy Peace grants a bonus XP on a 1d6 roll of 4+; once per turn rolls an extra d10 defending against a Wealth attack.' },
  { id: 'true-fanatics', name: 'True Fanatics', effect: 'Always rerolls a natural 1, but always loses ties during attacks.' },
  { id: 'annexationists', name: 'Annexationists', effect: 'Rolls an extra d10 for attacks made as part of a Seize Planet action.' },
  { id: 'schemers', name: 'Schemers', effect: 'Once per turn, rolls an extra d10 on a Cunning attack.' },
  { id: 'free-company', name: 'Free Company', effect: 'Every asset gains a move-to-a-world-within-one-hex action.' },
  { id: 'border-watch', name: 'Border Watch', effect: 'Once per turn, rolls an extra d10 attacking a TL5+ asset, and an extra die detecting Stealthed assets.' },
  { id: 'corsairs', name: 'Corsairs', effect: 'Any asset moved onto a world where this faction has a Base of Influence costs the mover 1 extra FacCred, paid to this faction.' },
  { id: 'oligarchs', name: 'Oligarchs', effect: 'Once per turn, rolls an extra d10 on a Wealth attack.' },
  { id: 'archivists', name: 'Archivists', effect: 'TL4+ asset purchases cost 1 less FacCred; can spend 2 FacCreds and roll 1d12 to permanently raise a world to TL4 on a 12.' },
  { id: 'mind-college', name: 'Mind College', effect: 'Once per turn, forces a rival to reroll any one d10, whether or not they were involved in that roll.' },
  { id: 'wildlanders', name: 'Wildlanders', effect: 'Once per turn, rolls an extra die defending with a TL0 asset.' },
  { id: 'salvagers', name: 'Salvagers', effect: 'Gains 1 FacCred whenever the faction destroys an asset or has one of its own destroyed.' },
  { id: 'shrouded', name: 'Shrouded', effect: 'Every newly purchased asset begins Stealthed automatically.' },
  { id: 'artisan-engineers', name: 'Artisan Engineers', effect: 'Every world with a Base of Influence counts as at least TL4; can build Starship-type assets on any world with 10,000+ occupants.' },
  { id: 'faithful-order', name: 'Faithful Order', effect: 'Once per turn, rolls an extra d10 defending against a Cunning attack.' },
  { id: 'warbound', name: 'Warbound', effect: 'Once per turn, rolls an extra d10 on a Force attack.' },
  { id: 'ruling-authority', name: 'Ruling Authority', effect: 'The legitimate government of a world — its permission is required for any asset there marked "needs permission." Repeatable, once per world governed (see governedLocationIds).', repeatable: true },
];

// --- Faction Goals -------------------------------------------------------
export const GMATLAS_FACTION_GOALS = [
  { id: 'warpath', name: 'Warpath', description: 'Destroy a number of rival Force assets equal to your own Force rating.', difficulty: (f) => Math.max(1, Math.ceil((f.force || 0) / 2)), countable: { statTypeDestroyed: 'force', per: 1 } },
  { id: 'market-domination', name: 'Market Domination', description: 'Destroy a number of rival Wealth assets equal to your own Wealth rating.', difficulty: (f) => Math.max(1, Math.ceil((f.wealth || 0) / 2)), countable: { statTypeDestroyed: 'wealth', per: 1 } },
  { id: 'shadow-coup', name: 'Shadow Coup', description: 'Destroy a number of rival Cunning assets equal to your own Cunning rating.', difficulty: (f) => Math.max(1, Math.ceil((f.cunning || 0) / 2)), countable: { statTypeDestroyed: 'cunning', per: 1 } },
  { id: 'world-seizure', name: 'World Seizure', description: 'Take control of a planet, becoming its legitimate government.', difficulty: () => 1, countable: { seizePlanet: true } },
  { id: 'new-foothold', name: 'New Foothold', description: 'Plant a Base of Influence on a new planet.', difficulty: () => 1, countable: { expandInfluence: true } },
  { id: 'draw-blood', name: 'Draw Blood', description: 'Inflict HP damage on enemy assets/bases equal to your total Force + Cunning + Wealth.', difficulty: () => 2, countable: { hpDamageDealt: true } },
  { id: 'uneasy-peace', name: 'Uneasy Peace', description: 'Take no Attack action for four consecutive turns.', difficulty: () => 1, countable: { turnsWithoutAttack: 4 } },
  { id: 'end-the-rival', name: 'End the Rival', description: 'Destroy a rival faction outright.', difficulty: () => 2, countable: { destroyRivalFaction: true } },
  { id: 'behind-the-lines', name: 'Behind the Lines', description: 'Have Stealthed assets equal to your Cunning score on worlds ruled by other governments.', difficulty: () => 2, countable: { stealthedOnRivalGovWorlds: true } },
  { id: 'giant-killer', name: 'Giant Killer', description: 'Destroy a Force asset with a higher minimum purchase rating than your own Force rating.', difficulty: () => 2, countable: { destroyHigherRatedForceAsset: true } },
  { id: 'deep-pockets', name: 'Deep Pockets', description: 'Spend FacCreds equal to four times your Wealth rating on bribes and influence.', difficulty: () => 2, countable: { facCredsSpent: true } },
];

// Per-turn maintenance FacCred cost — mirrors SWN_ASSET_MAINTENANCE's same
// 4 called-out costs, keyed by this provider's own asset ids.
export const GMATLAS_ASSET_MAINTENANCE = {
  'dreadnought-armada': 2,
  'hired-guns': 1,
  'salvage-armada': 2,
  'relic-science-cadre': 1,
};

export function findGmatlasAsset(statType, id) {
  const list = GMATLAS_FACTION_ASSETS[statType] || [];
  return list.find((a) => a.id === id) || null;
}
export function findGmatlasAssetAnyStat(id) {
  for (const statType of ['force', 'cunning', 'wealth']) {
    const found = findGmatlasAsset(statType, id);
    if (found) return { ...found, statType };
  }
  return null;
}
export function findGmatlasTag(id) { return GMATLAS_FACTION_TAGS.find((t) => t.id === id) || null; }
export function findGmatlasGoal(id) { return GMATLAS_FACTION_GOALS.find((g) => g.id === id) || null; }
export function findGmatlasXp(rating) { return GMATLAS_XP_TABLE[rating] || null; }
