// contentPacksManifest.js — hand-maintained registry of the real,
// installable packs shipped under /assets/ (mirrors ui/hostileLocations
// Fetch.js's own PACK_URLS: "add a line when a new one lands," no
// dynamic folder listing — a static app can't read a directory at
// runtime). Two purposes read this SAME list: Settings' Content Packs
// section (its own "Available Packs," content-pack kind only, each with a
// live Import button) and the read-only Licenses tab (every entry, both
// kinds, grouped by ruleset).
//
// `kind` picks which importer a pack needs: 'content-pack' entries go
// through domain/contentPack.js's importContentPack (generic — Entities/
// Guide/Journal); 'data-pack' entries are HOSTILE's own canon-location
// zone files, imported through the existing, bespoke
// domain/hostileLocations.js importHostileLocations flow (unchanged by
// this file — listed here only so the Licenses tab can show them
// alongside content packs, not because their import wiring moved).
//
// `licenseStatus` is deliberately a single value today ('included' —
// everything shipped here is free) — the field exists so a future
// server-verified entitlement check (direct request: "will be used to
// verify what content is available to the user for installation from the
// web server") has somewhere real to write its answer, without needing a
// schema change later.
//
// Real finding, deliberately excluded: assets/data-packs/ also holds
// several gmatlas-2026-07-*.json files — those are whole-CAMPAIGN export
// dumps (store.js's own export() shape), not curated packs, and aren't
// listed here.
export const CONTENT_PACKS_MANIFEST = [
  {
    id: 'planetfall-lifeforms',
    file: 'assets/content-packs/5pfh-planetfall-lifeforms-content-pack.json',
    title: 'Planetfall Lifeforms',
    description: "The 4 named example creatures from Planetfall's own \"Campaign Lifeform Encounters table\" (p.146) — Turbostone, Vaportrail, Sirenspine, Golem — as real Lifeform entities with a populated Planetfall Lifeform statblock.",
    ruleset: 'planetfall',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    id: '5pfh-lifeforms',
    file: 'assets/content-packs/5pfh-lifeforms-content-pack.json',
    title: '5PFH Lifeforms & Enemies',
    description: "The 13 named entries from Five Parsecs From Home's own \"Roving Threats\" table (core rulebook p.101) — Converted Acquisition/Infiltrators, Abductor Raiders, Swarm Brood, Haywire Robots, Razor Lizards, Sand Runners, Void Rippers, Krorg, Large Bugs, Carnivore Chasers, Vent Crawlers, Distorts — as real Lifeform entities with a populated 5PFH Lifeform / Enemy statblock.",
    ruleset: 'fivepfh',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    id: '5pfh-cbh-lifeforms',
    file: 'assets/content-packs/5pfh_cbh-lifeforms-content-pack.json',
    title: '5PFH Compendium Lifeforms & Enemies (Bug Hunt)',
    description: "The 16 named entries from the 5PFH Compendium's own Bug Hunt monster table (p.194-195) — Vent-crawlers, Acid Blobs, Face-rippers, Slithering Horrors, Tentacle Creepers, Shambling Reanimations, Razor Lizards (Bug Hunt), Berserk Robots, Converted Assault/Infiltration Teams, Dimensional Distorts, The Swarm, Horde Invasion Force, Shatter-forms, Strangle Worms, Gripper Weeds.",
    ruleset: 'fivepfh',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    // Direct request (D&D 5e work, phase 3): the SRD 5.2.1's own "Monsters
    // A-Z" section (364-page PDF, assets/docs/dnd5e/SRD_CC_v5.2.1.pdf) —
    // all 330 stat blocks, each imported as a #lifeform-tagged NPC entity
    // (type: 'npc', tags: ['lifeform'] per the user's explicit wording —
    // a deliberate departure from every OTHER pack here, which sets
    // type: 'lifeform' directly instead) with a populated D&D 5e Lifeform
    // statblock (data/statblockTemplates.js's 'dnd5e-lifeform'). The SRD
    // 5.2.1 is Creative Commons (CC-BY-4.0), not a purchased sourcebook —
    // the required attribution statement is included verbatim below per
    // the license's own terms; nothing here reproduces any other WotC IP
    // (no Monster Manual art/flavor text/proper-noun lore beyond what the
    // SRD itself already grants for open reuse).
    id: 'dnd5e-srd-monsters',
    file: 'assets/content-packs/dnd5e-srd-monsters-content-pack.json',
    title: 'D&D 5e SRD Monsters A-Z',
    description: "All 330 creatures from the SRD 5.2.1's own \"Monsters A-Z\" section (Aboleth through Wolf, every dragon age category, every animal), each as a #lifeform-tagged NPC with a full D&D 5e Lifeform statblock (AC/Initiative/HP/Speed, all six ability scores, Saving Throws, Skills, Resistances/Immunities/Vulnerabilities, Senses, Languages, Challenge Rating, and free-text Traits/Actions/Bonus Actions/Reactions/Legendary Actions). This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
    ruleset: 'dnd5e',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    // Five Leagues from the Borderlands (assets/docs/5LFB) — every enemy
    // profile from the core rulebook's own "THE ENEMY" chapter (pages
    // 151-186: Ruin Within, Whispers from Beyond, Gnawling Horde, Ice-
    // heart Court, Duskling Warband, the Oldest Kin, Curse of War,
    // Faceless Kingdom, Roadside, Lurking Foes Enemy Tables, plus the
    // Aberration Table), each as a #lifeform-tagged NPC with a full Five
    // Leagues Enemy statblock (data/statblockTemplates.js's
    // 'fiveleagues-lifeform'). Unlike dnd5e's SRD pack above, this is a
    // purchased commercial PDF, not CC-licensed — gated behind
    // `fiveleagues`'s own Game System Activation (ownership confirmation),
    // same posture as swn's transcribed content. Extracted via a throwaway
    // script (not shipped) parsing pdftotext -layout output; the six
    // numeric Enemy Profile fields (Speed/Combat Skill/Damage/Toughness/
    // Armor/Ranged) are independently sanity-checked, but this document's
    // own two-column table rendering means a handful of entries may carry
    // an imperfectly split Name/flavor-text boundary — a disclosed,
    // best-effort automated-extraction limitation, not a data-integrity
    // issue with the stat numbers themselves.
    id: 'fiveleagues-core-enemies',
    file: 'assets/content-packs/fiveleagues-core-enemies-content-pack.json',
    title: 'Five Leagues Enemies (Core Rulebook)',
    description: "121 named entries from the core rulebook's own \"THE ENEMY\" chapter (pages 151-186) — 100 across every regular Enemy Table (Ruin Within, Whispers from Beyond, Gnawling Horde, Ice-heart Court, Duskling Warband, the Oldest Kin, Curse of War, Faceless Kingdom, Roadside, Lurking Foes) plus 21 unique \"boss-tier\" Aberrations (Ogre through Drake, the Aberration Table, p.182-186) with their own Monster Points (MP)/Reward Rating fields, each as a #lifeform-tagged NPC with a full Five Leagues Enemy statblock (Num./Speed/Combat Skill/Damage/Toughness/Armor/Ranged/MP/Reward Rating/Traits).",
    ruleset: 'fiveleagues',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    // Five Leagues from the Borderlands Compendium — the same "THE ENEMY"
    // chapter content, sourced from the Compendium's own two alternate-
    // setting expansions (The Ancient Land of Dust's "The Dust Rises Enemy
    // Table", and Deep Below's Random/Bloodstained/Outlaw Bands/Retinue of
    // the Wolf Prince/Silent Battalion Enemy Tables) rather than the core
    // rulebook — same gating/extraction caveats as the core pack above.
    id: 'fiveleagues-compendium-enemies',
    file: 'assets/content-packs/fiveleagues-compendium-enemies-content-pack.json',
    title: 'Five Leagues Enemies (Compendium)',
    description: "38 named entries from the Compendium's own Enemy Tables — The Ancient Land of Dust's \"The Dust Rises Enemy Table\" and Deep Below's Bloodstained/Outlaw Bands/Retinue of the Wolf Prince Enemy Tables — each as a #lifeform-tagged NPC with a full Five Leagues Enemy statblock.",
    ruleset: 'fiveleagues',
    kind: 'content-pack',
    licenseStatus: 'included',
  },
  {
    id: 'hostile-near-earth-zone',
    file: 'assets/data-packs/hostile-near-earth-zone.json',
    title: 'HOSTILE — Near Earth Zone',
    description: "Canon gazetteer Locations (Bases/Zones/Stars/Worlds) for the Near Earth Zone.",
    ruleset: 'hostile',
    kind: 'data-pack',
    licenseStatus: 'included',
  },
  {
    id: 'hostile-fomalhaut-settlement-zone',
    file: 'assets/data-packs/hostile-fomalhaut-settlement-zone.json',
    title: 'HOSTILE — Fomalhaut Settlement Zone',
    description: "Canon gazetteer Locations for the Fomalhaut Settlement Zone.",
    ruleset: 'hostile',
    kind: 'data-pack',
    licenseStatus: 'included',
  },
];
