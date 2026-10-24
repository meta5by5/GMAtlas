// licenses.js — the Licenses registry (design/adr/licenses-and-rules-
// constitution.md). Pure data, no imports: rulesConstitution.js holds the
// logic that reads it (kept there to avoid a circular import).
//
// One entry per license a GM can own. Each sourcebook license stands alone:
// owning a Compendium never requires owning its core rulebook. A game's
// plain supplements (Hostile's books, Traveller's, Starsmith for Starforged,
// Delve for Ironsworn) ride on that game's one license.
//
//   systems   Game System / Supplement ids (RULES_PROVIDERS, GAME_SYSTEM_
//             SUPPLEMENTS, RULESETS) this license grants. Its PDFs show in a
//             campaign's Docs library only while one of these is in use
//             there (Module for Profile, or picked in the Rules Constitution).
//   alsoWith  For a license with no game system of its own in this app:
//             related systems whose use also brings its PDFs along.
//   open      Openly licensed (CC-BY) — always owned, no checkbox. Still only
//             shows in a campaign that actually uses it.
//   docs      Reference Library `file` keys (data/referenceLibraryManifest.js)
//             — each gets a Load button under its license in Settings.
//   family    Product-line header the Licenses tab groups entries under.
//   text      The ownership statement next to the checkbox.
export const LICENSES = [
  {
    id: 'starforged', label: 'Ironsworn: Starforged', family: 'Ironsworn', open: true,
    systems: ['starforged'],
    text: 'Creative Commons (CC-BY 4.0) — the default sci-fi rules. Available to any campaign that designates it.',
    docs: [
      'assets/docs/Starforged/Ironsworn-Starforged-rulebook.pdf',
      'assets/docs/Starforged/Starforged-reference-guide.pdf',
      'assets/docs/Starforged/Starsmith-Assets-Mar-5-23.pdf',
      'assets/docs/Starforged/Starsmith-Expanded-Oracles-May-15-23.pdf',
    ],
  },
  {
    id: 'ironsworn', label: 'Ironsworn', family: 'Ironsworn', open: true,
    systems: ['ironsworn'],
    text: 'Creative Commons (CC-BY 4.0) — the default fantasy rules. Available to any campaign that designates it.',
    docs: [
      'assets/docs/ironsworn/Ironsworn-Rulebook.pdf',
      'assets/docs/ironsworn/ironsworn-delve-rulebook-spreads.pdf',
      'assets/docs/ironsworn/Ironsworn-Assets-Master-Set.pdf',
    ],
  },
  {
    id: 'fivepfh', label: 'Core Rules', family: 'Five Parsecs from Home',
    systems: ['fivepfh'],
    text: 'I own Five Parsecs from Home (3rd Edition core rules).',
    docs: ['assets/docs/5PFH/Five Parsecs From Home v3.pdf'],
  },
  {
    id: 'fivepfh-compendium', label: 'Compendium (incl. Bug Hunt)', family: 'Five Parsecs from Home',
    systems: ['fivepfh-compendium'],
    text: 'I own the Five Parsecs from Home Compendium — a standalone game (Bug Hunt) as well as 5PFH expansions — and will use its transcribed content for my own personal GM reference, not for redistribution.',
    docs: ['assets/docs/5PFH/Five Parsecs - Compendium Includes Bug Hunt.pdf'],
  },
  {
    id: 'planetfall', label: 'Planetfall', family: 'Five Parsecs from Home',
    systems: ['planetfall'],
    text: 'I own Five Parsecs: Planetfall — a standalone colony game.',
    docs: ['assets/docs/5PFH/Five Parsecs - Planetfall 1.2.pdf'],
  },
  {
    id: 'fiveleagues', label: 'Core Rules', family: 'Five Leagues from the Borderlands',
    systems: ['fiveleagues'],
    text: 'I own Five Leagues from the Borderlands (3rd Edition) and will use its transcribed content for my own personal GM reference, not for redistribution.',
    docs: [
      'assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf',
      'assets/docs/5LFB/5LFB Warband Sheet US.pdf',
    ],
  },
  {
    id: 'fiveleagues-compendium', label: 'Compendium', family: 'Five Leagues from the Borderlands',
    systems: ['fiveleagues-compendium'],
    text: 'I own the Five Leagues from the Borderlands Compendium and will use its transcribed content (Enemy tables, new Origins) for my own personal GM reference, not for redistribution. Its content only applies to a campaign that also uses Five Leagues.',
    docs: ['assets/docs/5LFB/Five Leagues - Compendium_Final_Digital.pdf'],
  },
  {
    id: 'hostile', label: 'Hostile', family: 'Hostile',
    systems: ['hostile'],
    text: 'I own Hostile — the setting book and its supplements, all under this one license.',
    docs: [
      'assets/docs/Hostile/Hostile setting.pdf',
      'assets/docs/Hostile/Hostile_Introduction_to_HOSTILE3.pdf',
      'assets/docs/Hostile/Hostile_marinecorps8.pdf',
      'assets/docs/Hostile/Hostile_marine-sheet.pdf',
      'assets/docs/Hostile/Hostile_tool-kit9.pdf',
      'assets/docs/Hostile/HOSTILE-TECH2.pdf',
      'assets/docs/Hostile/Hostile_Alien-Breeds3.pdf',
      'assets/docs/Hostile/Hostile_colony-builder4.pdf',
      'assets/docs/Hostile/Hostile_Crew_Expendable3.pdf',
      'assets/docs/Hostile/Hostile_EXPLORERS-2.pdf',
      'assets/docs/Hostile/HOSTILE_SHORTS-001GhostShip.pdf',
      'assets/docs/Hostile/HOSTILE_SHORTS-002Snakehead.pdf',
      'assets/docs/Hostile/HOSTILE_SHORTS-003Repellant.pdf',
      'assets/docs/Hostile/HOSTILE_SHORTS-005OneOfUs.pdf',
    ],
  },
  {
    id: 'swn', label: 'Stars Without Number', family: 'Without Number',
    systems: ['swn'],
    text: 'I own Stars Without Number Revised (Deluxe Edition) and will use its transcribed faction content for my own personal GM reference, not for redistribution.',
    docs: ['assets/docs/WithoutNumber/Stars Without Number Revised - Deluxe Edition.pdf'],
  },
  {
    id: 'cwn', label: 'Cities Without Number', family: 'Without Number',
    systems: [], alsoWith: ['swn'],
    text: 'I own Cities Without Number (Deluxe Edition). No rules of its own in GMAtlas — its book comes along with Stars Without Number.',
    docs: ['assets/docs/WithoutNumber/CitiesWithoutNumber_Deluxe.pdf'],
  },
  {
    id: 'traveller', label: 'Traveller', family: 'Traveller',
    systems: ['traveller'],
    text: 'I own Traveller (2nd Edition) and its supplements, all under this one license.',
    docs: [
      'assets/docs/Traveller/Traveller-2e-Core-Rulebook.pdf',
      'assets/docs/Traveller/Traveller-2e-high-guard-2022-update.pdf',
      'assets/docs/Traveller/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf',
    ],
  },
  {
    id: 'ist', label: 'Intergalactic Space Trader', family: 'Intergalactic Space Trader',
    systems: [], alsoWith: ['traveller', 'hostile'],
    text: 'I own Intergalactic Space Trader. No rules of its own in GMAtlas — its trade books come along with Traveller or Hostile.',
    docs: [
      'assets/docs/Intergalactic Space Trader (IST) 01_PlanetEconomy.pdf',
      'assets/docs/Intergalactic Space Trader (IST) 02 Travel.pdf',
      'assets/docs/Intergalactic Space Trader (IST) 03_Trade.pdf',
    ],
  },
  {
    id: 'dnd5e', label: 'D&D 5e', family: 'D&D 5e', open: true,
    systems: ['dnd5e'],
    text: 'The System Reference Document is Creative Commons (CC-BY 4.0). Available to any campaign that designates D&D 5e.',
    docs: [
      'assets/docs/dnd5e/SRD_CC_v5.2.1.pdf',
      'assets/docs/dnd5e/Monster Manual.pdf',
    ],
  },
];
