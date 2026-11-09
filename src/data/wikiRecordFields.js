// wikiRecordFields.js — which fields a wiki page lays out for each entity
// type, grouped into the page's record sections (design/WIKI-ROADMAP.md).
// Content, not code: a genre pack or later phase extends a type by adding
// rows here. Every field shows on the page, set or not (unset reads
// "{none}"); any field an entity carries that isn't listed lands in the page's
// "Other fields" section, so nothing a record holds goes unshown.
//
// kind:
//   text    a short string           long    prose, drawn with wiki links
//   number  a number                 bool    yes/no
//   list    an array of strings      ref     one entity id
//   refs    an array of entity ids   items   an array of records, one line each
//   object  one record, one line per field
// A section with `genres` shows only for those genre packs, and one with
// `notGenres` shows for every other pack; either still shows if any of its
// fields is set, so stored data is never hidden.

export const WIKI_COMMON_SECTION = {
  id: 'basics',
  title: 'Basics',
  fields: [
    ['tags', 'Tags', 'list'],
    ['aliases', 'Also known as', 'list'],
    ['visibility', 'Who can see this page', 'text'],
  ],
};

export const WIKI_RECORD_SECTIONS = {
  npc: [
    { id: 'npc', title: 'Character', fields: [['currentGoal', 'Current goal', 'text']] },
  ],
  faction: [
    {
      id: 'faction-profile',
      title: 'Profile',
      fields: [
        ['leadership', 'Leadership', 'text'],
        ['hq', 'HQ', 'text'],
        ['homeworldId', 'Homeworld', 'ref'],
        ['agenda', 'Agenda', 'long'],
        ['scenarioSeed', 'Scenario seed', 'long'],
        ['fear', 'Fear', 'text'],
        ['need', 'Need', 'text'],
        ['secret', 'Secret', 'text'],
      ],
    },
    {
      id: 'faction-ratings',
      title: 'Ratings',
      fields: [
        ['force', 'Force', 'number'],
        ['cunning', 'Cunning', 'number'],
        ['wealth', 'Wealth', 'number'],
        ['hp', 'HP', 'number'],
        ['facCreds', 'FacCreds', 'number'],
        ['xp', 'XP', 'number'],
        ['rulesProvider', 'Rules', 'text'],
      ],
    },
    {
      id: 'faction-holdings',
      title: 'Holdings and goals',
      fields: [
        ['assets', 'Assets', 'list'],
        ['factionAssets', 'Faction assets', 'items'],
        ['basesOfInfluence', 'Bases of influence', 'items'],
        ['governedLocationIds', 'Governs', 'refs'],
        ['factionTags', 'Faction tags', 'items'],
        ['currentGoalId', 'Current goal', 'text'],
        ['seizeProgress', 'Seize progress', 'object'],
        ['busyUntilTurn', 'Busy until turn', 'number'],
      ],
    },
  ],
  location: [
    {
      id: 'location-place',
      title: 'Place',
      fields: [
        ['objectType', 'Kind of world', 'text'],
        ['sector', 'Sector', 'text'],
        ['starSystem', 'Star system', 'text'],
        ['zone', 'Zone', 'text'],
        ['hex', 'Hex', 'text'],
        ['colonyBaseId', 'Colony or base', 'ref'],
        ['districtId', 'District', 'ref'],
        ['developmentLevel', 'Development', 'text'],
        ['biome', 'Biome', 'text'],
        ['bases', 'Bases', 'list'],
        ['tradeCodes', 'Trade codes', 'list'],
      ],
    },
    {
      id: 'location-senses',
      title: 'Story and senses',
      fields: [
        ['locationStory', 'Location story', 'long'],
        ['sights', 'Sights', 'text'],
        ['smells', 'Smells', 'text'],
        ['sounds', 'Sounds', 'text'],
      ],
    },
    {
      id: 'location-uwp',
      title: 'World profile',
      notGenres: ['fantasy'],
      fields: [
        ['starport', 'Starport', 'text'],
        ['worldSize', 'Size', 'text'],
        ['atmosphere', 'Atmosphere', 'text'],
        ['hydrographics', 'Hydrographics', 'text'],
        ['population', 'Population', 'text'],
        ['government', 'Government', 'text'],
        ['lawLevel', 'Law level', 'text'],
        ['techLevel', 'Tech level', 'text'],
        ['gasGiant', 'Gas giant', 'bool'],
      ],
    },
    {
      id: 'location-settlement',
      title: 'Settlement and realm',
      genres: ['fantasy'],
      fields: [
        ['settlementType', 'Settlement type', 'text'],
        ['notableFeature', 'First look', 'text'],
        ['authority', 'Authority', 'text'],
        ['currentTrouble', 'Current trouble', 'text'],
        ['currentProject', 'Current project', 'text'],
        ['localColor', 'Local color', 'text'],
        ['tradeResource', 'Trade', 'text'],
        ['realmType', 'Realm', 'text'],
        ['danger', 'Danger', 'text'],
      ],
    },
  ],
  conflict: [
    {
      id: 'conflict-core',
      title: 'Encounter',
      fields: [
        ['status', 'Status', 'text'],
        ['locationId', 'Takes place at', 'ref'],
        ['sceneNumber', 'From scene', 'number'],
        ['encounterMode', 'Mode', 'text'],
        ['encounterActivity', 'Activity', 'text'],
        ['statedCause', 'Stated cause', 'text'],
        ['rootCause', 'Root cause', 'text'],
        ['causeGapHook', 'Cause gap hook', 'text'],
        ['thirdPartyCasualty', 'Third-party casualty', 'text'],
        ['sessionHooks', 'Session hooks', 'items'],
      ],
    },
    {
      id: 'conflict-depth',
      title: 'Depth',
      fields: [
        ['deepRootSummary', 'Deep root', 'long'],
        ['precipitatingIncident', 'Precipitating incident', 'long'],
        ['lastDeescalationAttempt', 'Last de-escalation attempt', 'long'],
        ['partyLeverage', 'Party leverage', 'long'],
        ['gmNotes', 'GM notes', 'long'],
        ['irreversibleFacts', 'Irreversible facts', 'items'],
        ['factionPostures', 'Faction postures', 'items'],
        ['informationAsymmetry', 'Information asymmetry', 'object'],
      ],
    },
  ],
};

// Keys a page never lists as a record field: identity and bookkeeping, text
// the page already draws as prose (overview, revealed), things the page shows
// in their own sections (relationships, statblocks, place kind), oracle
// side-channels, and inert carried-over fields (CLAUDE.md, migration rule 5).
export const WIKI_RECORD_SKIP = [
  'id', 'type', 'name', 'createdAt', 'updatedAt', 'overview', 'revealed', 'relationships', 'statblocks',
  'placeKind', 'sensorySource', 'fantasyFieldSource', 'starSystemId', 'starId', 'fromComposer', 'sceneId', '_legacy',
];
