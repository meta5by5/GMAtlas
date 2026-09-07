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
