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
    // Repointed to the real current subfolder location (Ruleset Guide ToC
    // + "Load" sourcebook button follow-up) — assets/docs/ was reorganized
    // into per-game subfolders and this stale flat path no longer exists on
    // disk; see data/referenceLibraryManifest.js's own comment on why the
    // OLD catalog entry at that stale path is left in place, unused, rather
    // than repointed in-place.
    doc: 'assets/docs/Starforged/Starforged-reference-guide.pdf',
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
  // Direct follow-up request: "revise the Ironsworn ruleset to use the
  // actual Ironsworn rules instead of Starforged" — read directly from
  // assets/docs/ironsworn/Ironsworn-Rulebook.pdf (Chapter 2, "Character
  // Basics," p.33-38). Starforged DOES inherit Edge/Heart/Iron/Shadow/Wits
  // and the d6-vs-2d10 Action Roll verbatim from Ironsworn (confirmed
  // accurate, not a mix-up) — Starforged is the sci-fi adaptation of this
  // exact system by the same author — but the earlier version of this
  // entry was a straight clone of 'starforged' above, which missed two
  // real mechanical differences the rulebook is explicit about:
  //  - Momentum is NOT a 0-to-max depleting track like Health/Spirit/
  //    Supply (trackRow, ui/drawers/index.js, only ever renders a [0,max]
  //    click-to-set meter) — real Momentum ranges from -6 (minimum
  //    momentum, p.13) to +10 (max momentum, p.14), starting at +2. Moved
  //    out of `tracks` into `stats` as a signed, non-rollable attribute
  //    (attrRow's free-text numeric input has no min/max clamp at all, so
  //    it genuinely holds -6..+10) instead of a track.
  //  - Max Momentum (+10, reduced by 1 per marked debility) and Momentum
  //    Reset (+2, down to +1 with one debility, 0 with more than one) are
  //    each their OWN recorded value on a real Ironsworn character sheet
  //    (p.35), not derived — added as their own plain-format attributes.
  //  - Debilities (Conditions: Wounded/Shaken/Unprepared/Encumbered;
  //    Banes: Maimed/Corrupted; Burdens: Cursed/Tormented — p.36-38) have
  //    exactly one MECHANICAL effect on the sheet itself (each marked one
  //    reduces Max Momentum by 1); the WHICH-debility narrative detail
  //    belongs in the entity's own Notes field (every entity already has
  //    one), same posture as every other ruleset here not itemizing its
  //    own narrative-only state on the stat sheet. "Debilities Marked" is
  //    a plain count so that mechanical effect stays visible and trackable.
  // This flat stats/tracks shape (not the `sections` shape D&D 5e uses) is
  // kept deliberately, matching Starforged/5PFH/Five Leagues' own simple
  // sheet layout rather than introducing a structurally different template
  // just for Ironsworn.
  {
    id: 'ironsworn',
    label: 'Ironsworn',
    doc: 'assets/docs/ironsworn/Ironsworn-Rulebook.pdf',
    characterTemplate: {
      attributeRollMethod: 'action', // d6 + stat vs 2d10 — Ironsworn's own Action Roll (p.8), inherited unchanged by Starforged
      attributeFormat: 'sign', // "+3"
      stats: [
        // "To start, arrange these bonuses across your five stats in any
        // order: 3, 2, 2, 1, 1" (p.33) — a player's own chargen choice,
        // not a fixed-per-stat array; defaulted to 1 each like every other
        // ruleset's own placeholder starting values here.
        { key: 'Edge', value: 1 },
        { key: 'Heart', value: 1 },
        { key: 'Iron', value: 1 },
        { key: 'Shadow', value: 1 },
        { key: 'Wits', value: 1 },
        { key: 'Momentum', value: 2, rollMethod: 'none', format: 'sign' },
        { key: 'Max Momentum', value: 10, rollMethod: 'none', format: 'plain' },
        { key: 'Momentum Reset', value: 2, rollMethod: 'none', format: 'plain' },
        { key: 'Debilities Marked', value: 0, rollMethod: 'none', format: 'plain' },
      ],
      tracks: [
        // Health/Spirit/Supply: "ranked from 0 to +5... to start, set your
        // [track] to +5" (p.33-34) — unchanged from Starforged's own
        // identical ranges (Starforged really did inherit these verbatim).
        { key: 'Health', value: 5, max: 5 },
        { key: 'Spirit', value: 5, max: 5 },
        { key: 'Supply', value: 5, max: 5 },
      ],
    },
  },
  {
    id: '5pfh',
    label: 'Five Parsecs from Home',
    // Repointed to the real current subfolder location — see the
    // 'starforged' entry's own comment above for why.
    doc: 'assets/docs/5PFH/5PFH-Five-Parsecs-From-Home-v3.pdf',
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
    // Stale as of the 2026-07-03 ruleset library review this comment used
    // to cite: "no sourcebook exists in this repo's assets/docs/" is no
    // longer true — assets/docs/Traveller/ now has 3 real Traveller 2e
    // PDFs (Ruleset Guide ToC + "Load" sourcebook button follow-up found
    // this while mapping assets/docs/'s real per-game subfolders). `doc`
    // now points at the real core rulebook. These stats remain original
    // content inspired by classic Traveller's
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
    doc: 'assets/docs/Traveller/Traveller-2e-Core-Rulebook.pdf',
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
    label: 'Five Leagues from Borderlands',
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

// Direct bug report: "The new oracle groups for Ironsworn do not show in
// the Oracle panel. They should show when the default ruleset is
// Ironsworn." Root cause: shell.js's data-settings-stat-ruleset change
// handler already auto-syncs Genre Pack to whatever
// rulesConstitution.js's genrePackIdForRuleset(statRuleset) resolves to
// (fixing the exact same class of bug for every OTHER ruleset, per that
// function's own comment) — but Ironsworn is deliberately NOT registered
// in rulesConstitution.js's RULES_PROVIDERS (it has no Game System
// Activation/Rules Constitution footprint, by design — see rulesets.js's
// own `ironsworn` entry comment), so that lookup returns null for it and
// picking "Ironsworn" from the Game System Ruleset dropdown never flipped
// Genre Pack to 'fantasy', leaving the Oracle drawer still reading
// whatever (sci-fi) table set was active before — the Ironsworn Oracle
// groups live only in FANTASY_FULL_TABLES, so they're not just mis-grouped
// in that case, they're genuinely absent from the loaded table set.
// This small, explicit map is the fix, kept OUT of rulesConstitution.js
// on purpose (no Game System Activation/Licenses footprint for Ironsworn)
// — shell.js's handler and drawers/index.js's oracle() both consult it.
export const RULESET_GENRE_PACK_HINTS = { ironsworn: 'fantasy' };

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
