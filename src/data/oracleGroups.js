// oracleGroups.js — parent-category grouping over a genre pack's own
// top-level keys, purely for the Oracle drawer's collapsible tree UI.
// Ported concept from the old prototype's `layout` manifest (see
// PROGRESS.md ISSUES/FINDINGS #3) — any top-level key not listed here
// still shows up under an automatic "Other" category (see domain/oracles.js
// buildGroupedOracleTree), so a new table never disappears silently.
//
// Each group's `children` entries are normally a plain string (the exact
// SCENE_TABLES-shaped key both the data lookup AND the displayed label use)
// — but MAY instead be a `{ key, label }` object when the displayed name
// needs to differ from the real data key (buildGroupedOracleTree, below,
// reads `.key` for the actual table lookup/roll-dispatch path and `.label`
// only for what's shown/searched). This is what lets a genre pack rename a
// group's own DISPLAY without touching the real key any code elsewhere
// (copilot.js's suggestedOraclePath, the "load-bearing categories" domain
// test) still looks up by its original, stable name.
export const ORACLE_GROUPS = [
  { label: '⭐ Core Solo', children: ['Campaign', 'Core Oracles', 'Core Solo Engine', 'Campaign Intelligence Engine'] },
  { label: '☠ Threats & Conflict', children: ['Conflict', 'Conflict Architecture', 'Danger Situations', 'Fear and Dread', 'Horror Escalation', 'Miscellaneous', 'Faction Encounter'] },
  { label: '📚 Story Beats', children: ['Plot Engine', 'Story', 'Adventure', 'Adventure Seed', 'Missions', 'Mission Aftermath', 'Mysteries & Coverups', 'Scenario Framing', 'Starforged Oracles'] },
  { label: '👥 Characters & Society', children: ['Characters', 'Factions', 'Frontier Society', 'Corporate Powers', 'Stars Without Number', 'Augmentation', 'Crew & NPCs', 'Law, Marshals & Crime', 'Marines & Security', 'Androids & AI'] },
  { label: '🌌 Locations', children: ['Planets', 'Settlements', 'Districts', 'Location Themes', 'Site Concept', 'Sector & System Creation', 'Worlds & Colonies', 'Colonies and Expeditions', 'Vaults / Ruins', 'Derelicts'] },
  { label: '🚀 Space Operations', children: ['Starships', 'Space Encounters', 'Space Operations', 'Trade & Cargo', 'Industrial Hazards', 'Exploration', 'Environmental Hazards'] },
  { label: '👹 Creatures & Xeno', children: ['Creatures', 'Xeno-Biology', 'Xenobestiary'] },
];

// Direct follow-up request: "adjust the sci-fi genre to fantasy equivalents
// for oracle section header and subheader descriptions such that 'space
// operations', 'trade & cargo' and 'creatures & xeno'" [read as fantasy
// equivalents]. The 'fantasy' pack's own tables-fantasy-full.js already
// renamed most sci-fi-specific CATEGORY keys to fantasy ones (Starships ->
// "Vessels & Caravans", Xenobestiary -> "Bestiary", etc.) — this is the
// matching fantasy-flavored GROUPING layer on top of those renamed keys,
// used instead of ORACLE_GROUPS whenever the active genre pack is
// 'fantasy' (see drawers/index.js's oracle()). 'Trade & Cargo' itself was
// deliberately NOT renamed at the data-key level (copilot.js's
// suggestedOraclePath and a domain test both look it up by that exact
// name across every pack) — its {key, label} entry below only changes what
// the GM sees, not what anything looks up.
export const ORACLE_GROUPS_FANTASY = [
  { label: '⭐ Core Solo', children: ['Campaign', 'Core Oracles', 'Core Solo Engine', 'Campaign Intelligence Engine'] },
  { label: '☠ Threats & Conflict', children: ['Conflict', 'Conflict Architecture', 'Danger Situations', 'Fear and Dread', 'Horror Escalation', 'Miscellaneous', 'Faction Encounter'] },
  { label: '📚 Story Beats', children: ['Plot Engine', 'Story', 'Adventure', 'Adventure Seed', 'Missions', 'Mission Aftermath', 'Mysteries & Coverups', 'Scenario Framing', 'Twist & Gambit Oracles'] },
  { label: '👥 Characters & Society', children: ['Characters', 'Factions', 'Frontier Society', 'Noble Houses & Guilds', 'Faction Turns', 'Enchantment', 'Party & NPCs', 'Law, Marshals & Crime', 'Guards & Soldiers', 'Golems & Constructs'] },
  { label: '🗺️ Locations', children: ['Realms', 'Settlements', 'Districts', 'Location Themes', 'Site Concept', 'Realm & Kingdom Creation', 'Kingdoms & Settlements', 'Settlements and Expeditions', 'Vaults / Ruins', 'Ruined Holds'] },
  { label: '🐎 Roads & Trade', children: ['Vessels & Caravans', 'Road Encounters', 'Keep Operations', { key: 'Trade & Cargo', label: 'Trade & Caravans' }, 'Workshop & Mine Hazards', 'Exploration', 'Environmental Hazards'] },
  { label: '🐉 Bestiary & Monsters', children: ['Creatures', 'Monster Biology', 'Bestiary'] },
];

// A composite Journal generator button (worldbuilding.js) rolls several
// leaf tables from one group at once and gives the result its own
// user-facing name — "Creature Concept" for Xenobestiary's four sub-tables,
// e.g. — which never appears as a literal node label in the Oracle tree, so
// searching for it found nothing (not a regression; the name simply never
// existed as searchable data). This maps a group's real name to whatever
// generator label(s) a GM might search for instead, consulted by
// filterOracleTree below.
export const GROUP_ALIASES = {
  Xenobestiary: ['Creature Concept'],
  // The fantasy pack's own renamed counterpart (tables-fantasy-full.js) —
  // same "Creature Concept" generator alias, since a GM searching for that
  // button's own name should find its source table group either way.
  Bestiary: ['Creature Concept'],
};

// Optional "(source)" suffix shown next to a SCENE_TABLES top-level group's
// label in the Oracle tree — display-only lookup, keyed by the same string
// used as the group's `label`/`path` for roll dispatch and search, so it
// never touches functional behavior (see ADR 0030). Not every group needs
// an entry; unlisted groups render with no suffix.
export const ORACLE_TABLE_SOURCES = {
  'Stars Without Number': 'SWN',
  'Starforged Oracles': 'Starforged/StarSmith-inspired',
};
