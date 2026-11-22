// factionOracles.js — original GMAtlas oracle tables for creating factions
// (design/FACTION-ROADMAP.md F1, design/Faction-baseline.md B4.2, B4.3).
// Content, not code: domain/factionProfile.js's generator only rolls on
// these. Four flavors: generic, fantasy, scifi and cyberpunk. A table a
// flavor doesn't define falls back to generic.

/** A genre pack id to the flavor of these tables. */
export function factionFlavorFor(genrePack) {
  const g = String(genrePack || '');
  if (/fantasy|dnd|shadowdark|league/i.test(g)) return 'fantasy';
  if (/cyber/i.test(g)) return 'cyberpunk';
  if (/sci|hostile|space|star|planetfall|parsec/i.test(g)) return 'scifi';
  return 'generic';
}

/** Behavior axes, each −2..+2 (B4.2). */
export const BEHAVIOR_AXES = [
  { key: 'risk', label: 'Risk', low: 'Cautious', high: 'Reckless' },
  { key: 'patience', label: 'Patience', low: 'Hasty', high: 'Patient' },
  { key: 'aggression', label: 'Aggression', low: 'Peaceable', high: 'Violent' },
  { key: 'pragmatism', label: 'Pragmatism', low: 'Principled', high: 'Pragmatic' },
  { key: 'secrecy', label: 'Secrecy', low: 'Open', high: 'Secretive' },
  { key: 'compromise', label: 'Compromise', low: 'Unyielding', high: 'Accommodating' },
];
export const BEHAVIOR_MIN = -2;
export const BEHAVIOR_MAX = 2;

/** Capabilities: tags with an optional band, no universal scale. */
export const CAPABILITIES = [
  { key: 'force', label: 'Force' },
  { key: 'wealth', label: 'Wealth' },
  { key: 'influence', label: 'Influence' },
  { key: 'cunning', label: 'Cunning' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'arcanaTech', label: 'Arcana / Tech' },
  { key: 'diplomacy', label: 'Diplomacy' },
  { key: 'resilience', label: 'Resilience' },
];
export const CAPABILITY_BANDS = [
  { n: 1, label: 'Weak' }, { n: 2, label: 'Adequate' }, { n: 3, label: 'Strong' }, { n: 4, label: 'Dominant' },
];

/** State bands (B4.2), shown 1–4. */
export const STATE_KEYS = [
  { key: 'stability', label: 'Stability' },
  { key: 'cohesion', label: 'Cohesion' },
  { key: 'exposure', label: 'Exposure' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'readiness', label: 'Readiness' },
];
export const STATE_BANDS = [
  { n: 1, label: 'Low' }, { n: 2, label: 'Moderate' }, { n: 3, label: 'High' }, { n: 4, label: 'Extreme' },
];

/** Reach 0–4, names per flavor. */
export const REACH_LEVELS = {
  generic: ['Street', 'District', 'City', 'Region', 'World'],
  fantasy: ['Street', 'Quarter', 'City', 'Province', 'Realm'],
  scifi: ['Deck', 'Station', 'World', 'System', 'Sector'],
  cyberpunk: ['Block', 'District', 'City', 'Megaregion', 'Global'],
};

/** Sizes, which set reach at creation. */
export const FACTION_SIZES = [
  { id: 'cell', label: 'Cell', reach: 0 },
  { id: 'gang', label: 'Band', reach: 1 },
  { id: 'organization', label: 'Organization', reach: 2 },
  { id: 'power', label: 'Regional power', reach: 3 },
  { id: 'empire', label: 'Empire', reach: 4 },
];

/** Memory kinds (B4.2). */
export const MEMORY_KINDS = [
  { id: 'debt', label: 'Debt' }, { id: 'promise', label: 'Promise' }, { id: 'betrayal', label: 'Betrayal' },
  { id: 'favor', label: 'Favor' }, { id: 'defeat', label: 'Defeat' }, { id: 'grievance', label: 'Grievance' },
];

/** Action families a faction prefers (its `methods`). */
export const METHODS = [
  { id: 'diplomacy', label: 'Diplomacy' },
  { id: 'trade', label: 'Trade' },
  { id: 'legal', label: 'Legal pressure' },
  { id: 'propaganda', label: 'Propaganda' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'espionage', label: 'Espionage' },
  { id: 'infiltration', label: 'Infiltration' },
  { id: 'sabotage', label: 'Sabotage' },
  { id: 'bribery', label: 'Bribery' },
  { id: 'blackmail', label: 'Blackmail' },
  { id: 'intimidation', label: 'Intimidation' },
  { id: 'force', label: 'Open force' },
  { id: 'raid', label: 'Raids' },
  { id: 'smuggling', label: 'Smuggling' },
  { id: 'research', label: 'Research' },
  { id: 'construction', label: 'Building' },
  { id: 'charity', label: 'Patronage' },
  { id: 'ritual', label: 'Ritual / Technology' },
];

/** Behavior profiles: a named temperament, rolled as a whole. */
export const BEHAVIOR_PROFILES = [
  { label: 'Careful accumulators', behavior: { risk: -2, patience: 2, aggression: -1, pragmatism: 1, secrecy: 0, compromise: 1 }, methods: ['trade', 'legal', 'bribery'] },
  { label: 'Zealous and certain', behavior: { risk: 1, patience: 0, aggression: 1, pragmatism: -2, secrecy: -1, compromise: -2 }, methods: ['propaganda', 'recruitment', 'force'] },
  { label: 'Quiet schemers', behavior: { risk: -1, patience: 2, aggression: -1, pragmatism: 2, secrecy: 2, compromise: 0 }, methods: ['espionage', 'blackmail', 'infiltration'] },
  { label: 'Hungry opportunists', behavior: { risk: 2, patience: -1, aggression: 1, pragmatism: 2, secrecy: 0, compromise: 0 }, methods: ['raid', 'smuggling', 'bribery'] },
  { label: 'Proud traditionalists', behavior: { risk: -1, patience: 1, aggression: 0, pragmatism: -1, secrecy: -1, compromise: -1 }, methods: ['legal', 'diplomacy', 'charity'] },
  { label: 'Desperate survivors', behavior: { risk: 1, patience: -2, aggression: 0, pragmatism: 2, secrecy: 1, compromise: 1 }, methods: ['smuggling', 'sabotage', 'diplomacy'] },
  { label: 'Iron-fisted enforcers', behavior: { risk: 0, patience: 0, aggression: 2, pragmatism: 0, secrecy: -1, compromise: -2 }, methods: ['intimidation', 'force', 'construction'] },
  { label: 'Patient builders', behavior: { risk: -1, patience: 2, aggression: -2, pragmatism: 0, secrecy: -1, compromise: 2 }, methods: ['construction', 'charity', 'research'] },
  { label: 'Paranoid watchers', behavior: { risk: -2, patience: 1, aggression: 0, pragmatism: 1, secrecy: 2, compromise: -1 }, methods: ['espionage', 'sabotage', 'legal'] },
  { label: 'Charismatic movers', behavior: { risk: 1, patience: 0, aggression: -1, pragmatism: 1, secrecy: -2, compromise: 1 }, methods: ['propaganda', 'diplomacy', 'recruitment'] },
];

export const MOTIVATIONS = [
  'Wealth', 'Power', 'Faith', 'Survival', 'Knowledge', 'Freedom', 'Order', 'Revenge', 'Legacy', 'Purity', 'Belonging', 'Prestige',
];

/** One-word drives the generator rolls (B4.2). */
export const DRIVES = [
  'Hoard', 'Purify', 'Expand', 'Endure', 'Unveil', 'Avenge', 'Shelter', 'Convert', 'Bargain', 'Dominate', 'Escape', 'Restore',
];

export const FEARS = [
  'Being forgotten', 'Exposure of an old crime', 'A rival with nothing to lose', 'Its own members turning',
  'Running out of something it cannot replace', 'A prophecy, forecast or projection it half believes',
  'Losing its patron', 'Open war it cannot win', 'Its founder\'s return', 'Being made irrelevant by something new',
];

export const TABOOS = [
  'Never harm a child of the founders', 'Never break a sealed contract', 'Never deal with the old enemy',
  'Never abandon a member in custody', 'Never spend from the reserve', 'Never speak the true name aloud',
  'Never strike first in daylight', 'Never let outsiders see the inner rite',
];

/** Faction types per flavor. */
export const FACTION_TYPES = {
  generic: ['Merchant league', 'Religious order', 'Criminal syndicate', 'Ruling council', 'Rebel movement', 'Mercenary company', 'Scholarly circle', 'Noble family', 'Labor union', 'Secret society', 'Militia', 'Charitable society'],
  fantasy: ['Merchant guild', 'Temple order', 'Thieves\' brotherhood', 'Noble house', 'Wizards\' conclave', 'Free company', 'Druidic circle', 'Peasant league', 'Knightly order', 'Smugglers\' ring', 'Cult of a forgotten god', 'Crown agency'],
  scifi: ['Shipping cartel', 'Colonial authority', 'Pirate fleet', 'Research institute', 'Mining consortium', 'Separatist front', 'Mercenary outfit', 'Machine cult', 'Free-trader co-op', 'Navy remnant', 'Terraforming trust', 'Pilgrim flotilla'],
  cyberpunk: ['Megacorp division', 'Street gang', 'Hacker collective', 'Fixer network', 'Police contractor', 'Media conglomerate', 'Medtech cartel', 'Neighborhood council', 'Data broker', 'Eco-terror cell', 'Private security firm', 'Augment cult'],
};

/** Names: an adjective-ish part and a noun-ish part per flavor. */
export const NAME_PARTS = {
  generic: { a: ['Silver', 'Crimson', 'Quiet', 'Iron', 'Open', 'Last', 'Grey', 'Bright', 'Hollow', 'Sworn', 'Patient', 'Ashen'], b: ['Hand', 'Compact', 'Circle', 'Lantern', 'League', 'Covenant', 'Assembly', 'Company', 'Choir', 'Ledger', 'Banner', 'Gate'] },
  fantasy: { a: ['Gilded', 'Thorned', 'Moonlit', 'Oaken', 'Ravenous', 'Sable', 'Hallowed', 'Briar', 'Emberforged', 'Weeping', 'Saltmarsh', 'Lantern-bearing'], b: ['Chalice', 'Brotherhood', 'Crown', 'Coin', 'Hearth', 'Vigil', 'Grove', 'Spire', 'Fellowship', 'Tithe', 'Wardens', 'Court'] },
  scifi: { a: ['Helios', 'Pale', 'Deepline', 'Meridian', 'Vanta', 'Kestrel', 'Ninefold', 'Halcyon', 'Rustbelt', 'Lumen', 'Driftward', 'Corvid'], b: ['Syndicate', 'Combine', 'Concord', 'Directorate', 'Flotilla', 'Union', 'Trust', 'Collective', 'Front', 'Authority', 'Array', 'Exchange'] },
  cyberpunk: { a: ['Neon', 'Static', 'Chrome', 'Black Ice', 'Zero', 'Velvet', 'Ghostwire', 'Redline', 'Afterhours', 'Mirrorshade', 'Undertow', 'Halfprice'], b: ['Saints', 'Holdings', 'Kids', 'Protocol', 'Dynamics', 'Choir', 'Crew', 'Solutions', 'Network', 'Syndicate', 'Ward', 'Bureau'] },
};

/** Faces: the person players meet (title, then a manner). */
export const FACE_ROLES = {
  generic: ['Spokesperson', 'Treasurer', 'Enforcer', 'Recruiter', 'Envoy', 'Second-in-command', 'Fixer', 'Archivist'],
  fantasy: ['Herald', 'Guildmaster\'s clerk', 'Sworn blade', 'High acolyte', 'Steward', 'Spymaster', 'Hedge-witch advisor', 'Quartermaster'],
  scifi: ['Liaison officer', 'Quartermaster', 'Fleet captain', 'Chief analyst', 'Union steward', 'Security chief', 'Broker', 'Chaplain-engineer'],
  cyberpunk: ['Fixer', 'Corporate liaison', 'Crew boss', 'Netrunner', 'PR handler', 'Street doc', 'Bagman', 'Talent scout'],
};
export const FACE_MANNERS = [
  'warm and evasive', 'blunt and tired', 'charming, watching for weakness', 'nervous, out of their depth', 'courteous to a fault',
  'quietly devout', 'ambitious, wants a promotion', 'loyal past reason', 'bored until money is mentioned', 'secretly sympathetic to a rival',
];

/** Public faces and hidden agendas. */
export const PUBLIC_FACES = [
  'Respectable benefactors of the poor', 'Honest traders who keep the roads open', 'Guardians of an old tradition', 'Defenders of the common folk',
  'Reformers with a plan', 'Neutral brokers no one can do without', 'Pious servants of a higher cause', 'Hard but fair keepers of order',
  'Scholars who only want to understand', 'Survivors who ask to be left alone',
];
export const HIDDEN_AGENDAS = [
  'Bankrolling both sides of a coming war', 'Hiding a leader who died months ago', 'Preparing to sell out its own members',
  'Searching for a relic or prototype it lost', 'Planning to replace the local authority', 'Paying off a debt to something dangerous',
  'Covering up a disaster it caused', 'Breeding a successor no one has met', 'Secretly owned by a rival', 'Hoarding for a famine only it foresees',
];

/** Objectives: what a faction wants now, each with its project's Signs.
 *  `stake` matches data/conflictLadder.js's CONFLICT_STAKES ids, which is
 *  how the collision rule pairs objectives. `{place}` is replaced by the
 *  contested Location's name (or a generic phrase). */
export const OBJECTIVES = {
  generic: [
    { title: 'Take control of {place}', stake: 'territory', signs: ['Strangers loiter near {place}', 'New faces on the gate', 'Rival notices torn down', 'Its banner flies over {place}'] },
    { title: 'Corner the trade in {place}', stake: 'resources', signs: ['Prices creep upward', 'Small sellers close their doors', 'Contracts signed in private', 'Nothing moves without its mark'] },
    { title: 'Install its own candidate as leader', stake: 'leadership', signs: ['Pamphlets praise a newcomer', 'An old official resigns', 'Votes or favors change hands', 'The candidate takes the seat'] },
    { title: 'Win the city to its creed', stake: 'ideology', signs: ['Street preachers appear', 'Converts wear its sign', 'Rival meeting halls empty', 'Its creed is the common talk'] },
    { title: 'Secure a safe haven', stake: 'survival', signs: ['Supplies bought in bulk', 'Members go quiet', 'A building changes hands', 'Doors sealed, guards posted'] },
    { title: 'Ruin a rival\'s good name', stake: 'reputation', signs: ['Whispers in the market', 'A scandal sheet circulates', 'Old allies keep their distance', 'The rival is a punchline'] },
    { title: 'Open a closed route through {place}', stake: 'access', signs: ['Surveyors seen on the road', 'Toll keepers bribed', 'A first caravan slips through', 'The route is open and taxed'] },
    { title: 'Steal a secret others guard', stake: 'knowledge', signs: ['Archives visited at night', 'A clerk goes missing', 'Coded letters intercepted', 'The secret is in its hands'] },
    { title: 'Make the watch answer to it', stake: 'control', signs: ['Watch officers dine with its people', 'Arrests fall on its rivals', 'Patrols avoid its streets', 'The watch takes its orders'] },
  ],
  fantasy: [
    { title: 'Claim the old keep at {place}', stake: 'territory', signs: ['Hunters report lights in the keep', 'Masons hired in secret', 'The road to {place} is watched', 'Its standard on the battlements'] },
    { title: 'Seize the guild charter', stake: 'leadership', signs: ['A guild elder falls ill', 'Dues go unpaid', 'A rival vote fails', 'The charter changes hands'] },
    { title: 'Recover a saint\'s relic', stake: 'knowledge', signs: ['Pilgrims questioned on the road', 'A reliquary is robbed', 'Barrow mounds disturbed', 'Bells ring for the relic\'s return'] },
  ],
  scifi: [
    { title: 'Seize the docking rights at {place}', stake: 'access', signs: ['New livery on the docks', 'Berth fees doubled', 'Rival ships held for inspection', 'Only its ships dock at {place}'] },
    { title: 'Control the water supply of {place}', stake: 'resources', signs: ['Ice haulers rerouted', 'Rationing notices posted', 'Recyclers fail in rival sectors', 'Water carries its seal'] },
    { title: 'Recover a lost survey core', stake: 'knowledge', signs: ['Salvagers hired for a deep run', 'A data broker is found dead', 'Encrypted traffic spikes', 'The survey core is decrypted'] },
  ],
  cyberpunk: [
    { title: 'Own the network backbone under {place}', stake: 'control', signs: ['Maintenance vans with no logos', 'Outages in rival buildings', 'New nodes humming in basements', 'Every packet passes its routers'] },
    { title: 'Buy out the block around {place}', stake: 'territory', signs: ['Eviction notices', 'Graffiti painted over', 'Rent doubles overnight', 'Its security patrols the block'] },
    { title: 'Bury a product recall', stake: 'reputation', signs: ['Influencers paid to post', 'A whistleblower goes offline', 'Clinic records vanish', 'The story dies quietly'] },
  ],
};
