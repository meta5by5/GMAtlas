// rulesets.js — available stat systems derived from the source documents in assets/docs.

// characterTemplate.tracks feed makeStatblock('character', id) in
// domain/statblocks.js as depleting-resource meters (click-to-set boxes,
// roll d6 + value vs 2d10 on double-click). characterTemplate.stats feed the
// same function as rollable attributes (editable number, label-click-to-roll)
// — attributeRollMethod/attributeTarget/attributeFormat pick which dice
// model and display format that ruleset's stats use (see domain/dice.js'
// rollAction/rollFlat/rollTraveller and ROLL_METHODS/FIELD_FORMATS in
// ui/drawers/index.js), so the mechanic stays data, not hardcoded per-system
// UI logic.
export const RULESETS = [
  {
    id: 'starforged',
    label: 'Starforged',
    doc: 'assets/docs/Starforged-reference-guide.pdf',
    characterTemplate: {
      attributeRollMethod: 'action', // d6 + stat vs 2d10
      attributeFormat: 'sign', // "+3"
      stats: [
        { key: 'Edge', value: 1 },
        { key: 'Heart', value: 1 },
        { key: 'Iron', value: 1 },
        { key: 'Shadow', value: 1 },
        { key: 'Wits', value: 1 },
      ],
      tracks: [
        { key: 'Health', value: 5, max: 5 },
        { key: 'Spirit', value: 5, max: 5 },
        { key: 'Supply', value: 5, max: 5 },
        { key: 'Momentum', value: 2, max: 10 },
      ],
    },
  },
  {
    id: '5pfh',
    label: '5PFH',
    doc: 'assets/docs/5PFH-Five-Parsecs-From-Home-v3.pdf',
    characterTemplate: {
      attributeRollMethod: 'flat', // d6 + stat vs target
      attributeTarget: 6,
      attributeFormat: 'sign', // "+3" (Speed uses inches — see statblockTemplates.js Bestiary Speed field)
      stats: [
        { key: 'Reaction', value: 1 },
        { key: 'Speed', value: 1, format: 'inches', rollMethod: 'none' },
        // Direct follow-up request: "change the target number from 6 to 4
        // for 5PFH 'combat' dice rolls" — a per-stat target overrides the
        // ruleset-wide attributeTarget (6, unchanged for Reaction/Savvy/
        // Tough), same override mechanism Speed's own rollMethod/format
        // already use above (domain/statblocks.js's makeStatblock).
        { key: 'Combat', value: 0, target: 4 },
        { key: 'Savvy', value: 1 },
        { key: 'Tough', value: 3 },
      ],
      tracks: [
        { key: 'Luck', value: 1, max: 3 },
        { key: 'XP', value: 0, max: 10 },
      ],
    },
  },
  {
    // No sourcebook exists in this repo's assets/docs/ (confirmed by the
    // 2026-07-03 ruleset library review — see rulesConstitution.js's
    // honesty note) — `doc` is deliberately left unset rather than pointing
    // at a PDF that isn't here; the Settings drawer shows a plain "no
    // sourcebook" note instead of a reference link for any ruleset without
    // one. These stats are original content inspired by classic Traveller's
    // six characteristics, not a transcription: real Traveller stores each
    // as a raw 2-12 score and derives a separate small dice modifier (DM)
    // from it for task checks — using the raw score directly in this app's
    // 2d6-vs-target formula would make every check trivially easy, so it's
    // collapsed to the same "small rollable modifier" abstraction every
    // other ruleset here already uses (Starforged's Edge/Heart, 5PFH's
    // Reaction/Speed/...), just under the six classic characteristic names
    // for recognizability. attributeTarget: 8 matches "classic Traveller
    // task resolution defaults to an 8+" (domain/dice.js's rollTraveller
    // doc comment) — the mechanic this ruleset was added to actually use.
    id: 'traveller',
    label: 'Traveller',
    doc: null,
    characterTemplate: {
      attributeRollMethod: 'traveller', // 2d6 + stat vs target
      attributeTarget: 8,
      attributeFormat: 'sign', // "+1"
      stats: [
        { key: 'STR', value: 1 },
        { key: 'DEX', value: 1 },
        { key: 'END', value: 1 },
        { key: 'INT', value: 1 },
        { key: 'EDU', value: 1 },
        { key: 'SOC', value: 1 },
      ],
      tracks: [
        // Classic Traveller deducts damage from STR/DEX/END directly, with
        // no separate hit-point pool — replicating three parallel damage
        // tracks tied back to the stats above is more precision than this
        // abstraction needs, so it's collapsed to one depleting resource.
        { key: 'Stamina', value: 8, max: 8 },
      ],
    },
  },
  {
    // Direct request: a ruleset "dedicated to D&D 5e" whose character sheet
    // "captures all the data from a d&dbeyond charactersheet" — the flat
    // stats/tracks shape every other ruleset above uses can't express that
    // (a real sheet has Ability Scores/Saves/Skills/Combat/Spellcasting/
    // Features/Equipment as distinct labeled groupings, not one undivided
    // list). `characterTemplate.sections` is the one new, backward-
    // compatible extension point this ruleset introduces: an array of
    // {id, label, fields} instead of the plain stats/tracks pair —
    // domain/statblocks.js's makeStatblock() branches on whichever shape is
    // present, so Starforged/5PFH/Traveller above are completely untouched.
    // Each field here is the same {key, kind, rollMethod, format, value}
    // shape Bestiary templates already use (data/statblockTemplates.js),
    // reusing templateFieldToStatblockField rather than a parallel mapper.
    // Two new roll methods power this (domain/dice.js): 'd20' (a plain
    // d20 + the field's own already-final bonus — a save/skill/initiative
    // value read straight off the sheet) and 'd20-score' (Ability Scores
    // store the raw 1-30 score, the way a GM reads it off a real sheet;
    // the modifier is derived at roll time, not stored). No sourcebook
    // link — the SRD 5.2.1 PDF this app's D&D content is sourced from is
    // Creative Commons (CC-BY-4.0), a different licensing situation than
    // the purchased-rulebook PDFs every other `doc` here points at, so it's
    // referenced by its own attribution note (see the SRD lifeform content
    // pack) rather than linked here as if it were an ordinary sourcebook.
    id: 'dnd5e',
    label: 'D&D 5e',
    doc: null,
    characterTemplate: {
      sections: [
        { id: 'abilityScores', label: 'Ability Scores', fields: [
          { key: 'Strength', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
          { key: 'Dexterity', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
          { key: 'Constitution', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
          { key: 'Intelligence', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
          { key: 'Wisdom', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
          { key: 'Charisma', kind: 'attribute', rollMethod: 'd20-score', format: 'plain', value: 10 },
        ]},
        { id: 'savingThrows', label: 'Saving Throws', fields: [
          { key: 'Strength Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Dexterity Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Constitution Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Intelligence Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Wisdom Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Charisma Save', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
        ]},
        { id: 'skills', label: 'Skills', fields: [
          { key: 'Acrobatics', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Animal Handling', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Arcana', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Athletics', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Deception', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'History', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Insight', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Intimidation', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Investigation', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Medicine', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Nature', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Perception', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Performance', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Persuasion', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Religion', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Sleight of Hand', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Stealth', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Survival', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
        ]},
        { id: 'combat', label: 'Combat', fields: [
          { key: 'Armor Class', kind: 'text', value: '' },
          { key: 'Initiative', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Speed', kind: 'text', value: '' },
          { key: 'Proficiency Bonus', kind: 'text', value: '' },
          { key: 'Hit Points', kind: 'track', value: 0, max: 0 },
          { key: 'Temp HP', kind: 'text', value: '' },
          { key: 'Hit Dice', kind: 'text', value: '' },
        ]},
        // Spells/Equipment are deliberately free-text (direct scope trim,
        // not an oversight) — a fully structured, per-row editable table
        // for every PDF column (Prep/Name/Source/Save/Time/Range/Comp/
        // Duration/Page for spells) is its own feature. The Attacks table
        // is the one exception: group.attacks (see makeStatblock/
        // addStatblockAttack below) mirrors 5PFH's existing weapons-table
        // mechanism instead of a new generalized "table field kind".
        { id: 'spellcasting', label: 'Spellcasting', fields: [
          { key: 'Spellcasting Ability', kind: 'text', value: '' },
          { key: 'Spell Save DC', kind: 'text', value: '' },
          { key: 'Spell Attack Bonus', kind: 'attribute', rollMethod: 'd20', format: 'sign', value: 0 },
          { key: 'Spells', kind: 'text', value: '' },
        ]},
        { id: 'featuresAndTraits', label: 'Features & Traits', fields: [
          { key: 'Features & Traits', kind: 'text', value: '' },
        ]},
        { id: 'equipment', label: 'Equipment', fields: [
          { key: 'Equipment', kind: 'text', value: '' },
          { key: 'Currency (CP/SP/EP/GP/PP)', kind: 'text', value: '' },
          { key: 'Weight Carried', kind: 'text', value: '' },
        ]},
        { id: 'characterInfo', label: 'Character Info', fields: [
          { key: 'Species', kind: 'text', value: '' },
          { key: 'Background', kind: 'text', value: '' },
          { key: 'Alignment', kind: 'text', value: '' },
          { key: 'Personality Traits', kind: 'text', value: '' },
          { key: 'Ideals', kind: 'text', value: '' },
          { key: 'Bonds', kind: 'text', value: '' },
          { key: 'Flaws', kind: 'text', value: '' },
          { key: 'Backstory', kind: 'text', value: '' },
        ]},
      ],
    },
  },
  // Five Leagues from the Borderlands (assets/docs/5LFB) — confirmed in the
  // rulebook's own text to be "the sister game of Five Parsecs from Home...
  // Both games use a similar campaign structure, character profiles and
  // game rules" (same publisher/designer, a fantasy-genre parallel to
  // 5PFH). The character sheet (p.15, Deep Below Warband Sheet) is a
  // single-page profile just like 5PFH's — not D&D 5e's sectioned shape —
  // so this reuses the exact same flat stats/tracks template idiom as
  // 5PFH above, field-for-field:
  //   Agility (initiative), Speed (base movement in inches — a Dash bonus
  //     exists in the real rules but isn't tracked per character, the same
  //     simplification 5PFH's own Speed already makes), Combat Skill
  //     (added to a D6 roll, p.15), Toughness (a threshold rolled against
  //     by attackers), Armor (a worn rating, also rolled against, not
  //     rolled by the character — rollMethod 'none', same idiom as
  //     5PFH-lifeform's KP or Planetfall-lifeform's Melee Damage), and
  //     Mystics' extra Casting score (same shape as Combat Skill).
  //   Luck/Will (small spendable/regenerating point pools, p.53) and XP
  //     are tracks, same shape as 5PFH's own Luck/XP.
  // The rulebook's 12 named Skills (p.23 — Battlewise/Crafting/Devotion/
  // Expertise/Leadership/Pathwise/Scholar/Scouting/Speech/Traveling/
  // Wilderness/Wits) are a character either-has-or-doesn't list granting
  // +2 to a 2D6 Proficiency Test, not an individually-valued numeric stat
  // — the old flat stats[]/tracks[] shape (domain/statblocks.js's
  // makeStatblock, non-sections branch) has no free-text field option at
  // all (every stats[] entry is forced attribute:true; every tracks[]
  // entry is a depleting resource box), so Skills doesn't fit either array
  // — same scope-trim posture as D&D 5e's own free-text Spells/Equipment.
  // Reuses the existing 5PFH group.gear free-text field (see
  // domain/statblocks.js's makeStatblock and
  // ui/drawers/index.js's characterSheetWeaponsAndGearHtml, both widened
  // below to also gate on ruleset.id === 'fiveleagues') for the Skills
  // list rather than inventing a new field or a sections-shape template
  // just to hold one line of text.
  {
    id: 'fiveleagues',
    label: 'Five Leagues',
    doc: 'assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf',
    characterTemplate: {
      attributeRollMethod: 'flat', // d6 + stat vs target
      attributeTarget: 6,
      attributeFormat: 'sign',
      stats: [
        { key: 'Agility', value: 1 },
        { key: 'Speed', value: 4, format: 'inches', rollMethod: 'none' },
        { key: 'Combat Skill', value: 0 },
        { key: 'Toughness', value: 3 },
        { key: 'Armor', value: 0, rollMethod: 'none', format: 'plain' },
        { key: 'Casting', value: 0 },
      ],
      tracks: [
        { key: 'Luck', value: 1, max: 3 },
        { key: 'Will', value: 1, max: 3 },
        { key: 'XP', value: 0, max: 10 },
      ],
    },
  },
];

export function findRuleset(id) {
  return RULESETS.find((r) => r.id === id) || RULESETS[0];
}

export function rulesetLabel(id) {
  return findRuleset(id).label;
}

// Starforged's Progress Track difficulty ranks (rulebook p.42): a track
// fills to 40 ticks (10 boxes of 4); the rank sets how many ticks a single
// mark adds, not the box count — Troublesome resolves in as few as 4 marks,
// Epic can take 40. Used by a Party Tracker "Counter" when the campaign's
// stat ruleset is Starforged (see domain/party.js's addPartyTracker/
// stepPartyTracker) so a party-wide progress clock (a faction's plan, a
// countdown) steps by the same rank math a Vow/quest would, instead of a
// plain +1 that means nothing in Starforged terms.
export const STARFORGED_PROGRESS_DIFFICULTIES = [
  { id: 'troublesome', label: 'Troublesome', ticks: 12 },
  { id: 'dangerous', label: 'Dangerous', ticks: 8 },
  { id: 'formidable', label: 'Formidable', ticks: 4 },
  { id: 'extreme', label: 'Extreme', ticks: 2 },
  { id: 'epic', label: 'Epic', ticks: 1 },
];
export const STARFORGED_PROGRESS_TRACK_MAX = 40;

export function findProgressDifficulty(id) {
  return STARFORGED_PROGRESS_DIFFICULTIES.find((d) => d.id === id) || null;
}

// Starforged's two party-wide resource tracks (rulebook p.42/p.44) — auto-
// populated onto a fresh Party Tracker list under the Starforged ruleset
// (domain/party.js's ensurePartyStarforgedTrackers). Momentum is bidirect-
// ional (a burn can drop it negative) and reset to +2, unlike every other
// tracker in this app which floors at 0 — it's the one 'gauge'-kind tracker
// (a single current-value POSITION, not a fill-from-zero count).
export const STARFORGED_MOMENTUM_MIN = -6;
export const STARFORGED_MOMENTUM_MAX = 10;
export const STARFORGED_MOMENTUM_RESET = 2;
export const STARFORGED_SUPPLY_MAX = 5;
