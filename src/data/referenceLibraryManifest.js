// referenceLibraryManifest.js — the permanent, COMMITTED catalog of every
// known Reference Library PDF (docs/adr/0039-reference-library-release-
// hosting.md). Unlike src/data/docsManifest.js (gitignored, regenerated at
// every build by scanning assets/docs/ on disk), this file is checked in —
// it's what lets scripts/build.js describe the full Reference Library even
// on a machine that never checked out the actual PDF bytes (CI, or a fresh
// clone that hasn't fetched Git LFS objects/downloaded the GitHub Release).
//
// `file` is the STABLE IDENTITY every other part of the app keys off
// (campaign.documents.refOverrides, a ref: tab key, etc.) — always the
// local-style "assets/docs/<name>" path, regardless of whether that file
// actually exists on the machine building right now. Never repoint this at
// a URL; that would silently orphan any campaign's saved title/tag
// overrides for the file. `releaseAsset` is the raw filename used to build
// a GitHub Release asset URL (releaseConfig.js's releaseAssetUrl()) when
// the real file isn't present locally — GitHub itself sanitizes an
// uploaded release asset's filename (verified via the real
// reference-library-v1 upload, 2026-07-15): whitespace and characters
// like parentheses collapse to a single `.`, so 5 of the 29 entries below
// have a `releaseAsset` that deliberately does NOT match their `file`'s
// basename — that's correct, not a typo; it's what GitHub actually named
// the asset. Re-verify against `GET /repos/<owner>/<repo>/releases/tags/
// <tag>`'s real `assets[].name` values (not just what you uploaded) if
// this catalog is ever regenerated for a re-upload.
//
// Regenerate by re-running the one-off scan scripts/build.js's own
// docsManifest logic already does (readdirSync('assets/docs') + stat +
// titleFromFilename), then updating this list — only needed when a PDF is
// added/removed from the Reference Library, not on every build.
export const REFERENCE_LIBRARY_MANIFEST = [
  { file: 'assets/docs/5PFH-3e-Compendium-Includes-Bug-Hunt.pdf', title: '5PFH 3e Compendium Includes Bug Hunt', ext: 'pdf', sizeBytes: 50678570, releaseAsset: '5PFH-3e-Compendium-Includes-Bug-Hunt.pdf' },
  { file: 'assets/docs/5PFH-Five-Parsecs-From-Home-v3.pdf', title: '5PFH Five Parsecs From Home v3', ext: 'pdf', sizeBytes: 9703190, releaseAsset: '5PFH-Five-Parsecs-From-Home-v3.pdf' },
  { file: 'assets/docs/5PFH Planetfall 1.2.pdf', title: '5PFH Planetfall 1.2', ext: 'pdf', sizeBytes: 43722123, releaseAsset: '5PFH.Planetfall.1.2.pdf' },
  { file: 'assets/docs/CitiesWithoutNumber_Deluxe.pdf', title: 'CitiesWithoutNumber Deluxe', ext: 'pdf', sizeBytes: 8751275, releaseAsset: 'CitiesWithoutNumber_Deluxe.pdf' },
  { file: 'assets/docs/Hostile_Alien-Breeds3.pdf', title: 'Hostile Alien Breeds3', ext: 'pdf', sizeBytes: 4683108, releaseAsset: 'Hostile_Alien-Breeds3.pdf' },
  { file: 'assets/docs/Hostile_colony-builder4.pdf', title: 'Hostile colony builder4', ext: 'pdf', sizeBytes: 7236679, releaseAsset: 'Hostile_colony-builder4.pdf' },
  { file: 'assets/docs/Hostile_Crew_Expendable3.pdf', title: 'Hostile Crew Expendable3', ext: 'pdf', sizeBytes: 7039616, releaseAsset: 'Hostile_Crew_Expendable3.pdf' },
  { file: 'assets/docs/Hostile_EXPLORERS-2.pdf', title: 'Hostile Explorers 2', ext: 'pdf', sizeBytes: 6314070, releaseAsset: 'Hostile_EXPLORERS-2.pdf' },
  { file: 'assets/docs/Hostile_Introduction_to_HOSTILE3.pdf', title: 'Hostile Introduction to Hostile3', ext: 'pdf', sizeBytes: 5045626, releaseAsset: 'Hostile_Introduction_to_HOSTILE3.pdf' },
  { file: 'assets/docs/Hostile_marine-sheet.pdf', title: 'Hostile marine sheet', ext: 'pdf', sizeBytes: 244769, releaseAsset: 'Hostile_marine-sheet.pdf' },
  { file: 'assets/docs/Hostile_marinecorps8.pdf', title: 'Hostile marinecorps8', ext: 'pdf', sizeBytes: 7603018, releaseAsset: 'Hostile_marinecorps8.pdf' },
  { file: 'assets/docs/Hostile setting.pdf', title: 'Hostile setting', ext: 'pdf', sizeBytes: 66869289, releaseAsset: 'Hostile.setting.pdf' },
  { file: 'assets/docs/HOSTILE_SHORTS-001GhostShip.pdf', title: 'Hostile Shorts 001GhostShip', ext: 'pdf', sizeBytes: 580866, releaseAsset: 'HOSTILE_SHORTS-001GhostShip.pdf' },
  { file: 'assets/docs/HOSTILE_SHORTS-002Snakehead.pdf', title: 'Hostile Shorts 002Snakehead', ext: 'pdf', sizeBytes: 662922, releaseAsset: 'HOSTILE_SHORTS-002Snakehead.pdf' },
  { file: 'assets/docs/HOSTILE_SHORTS-003Repellant.pdf', title: 'Hostile Shorts 003Repellant', ext: 'pdf', sizeBytes: 628088, releaseAsset: 'HOSTILE_SHORTS-003Repellant.pdf' },
  { file: 'assets/docs/HOSTILE_SHORTS-005OneOfUs.pdf', title: 'Hostile Shorts 005OneOfUs', ext: 'pdf', sizeBytes: 578976, releaseAsset: 'HOSTILE_SHORTS-005OneOfUs.pdf' },
  { file: 'assets/docs/HOSTILE-TECH2.pdf', title: 'Hostile Tech2', ext: 'pdf', sizeBytes: 3432837, releaseAsset: 'HOSTILE-TECH2.pdf' },
  { file: 'assets/docs/Hostile_tool-kit9.pdf', title: 'Hostile tool kit9', ext: 'pdf', sizeBytes: 2174407, releaseAsset: 'Hostile_tool-kit9.pdf' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 01_PlanetEconomy.pdf', title: 'Intergalactic Space Trader (ist) 01 PlanetEconomy', ext: 'pdf', sizeBytes: 938945, releaseAsset: 'Intergalactic.Space.Trader.IST.01_PlanetEconomy.pdf' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 02 Travel.pdf', title: 'Intergalactic Space Trader (ist) 02 Travel', ext: 'pdf', sizeBytes: 1520484, releaseAsset: 'Intergalactic.Space.Trader.IST.02.Travel.pdf' },
  { file: 'assets/docs/Intergalactic Space Trader (IST) 03_Trade.pdf', title: 'Intergalactic Space Trader (ist) 03 Trade', ext: 'pdf', sizeBytes: 1639110, releaseAsset: 'Intergalactic.Space.Trader.IST.03_Trade.pdf' },
  { file: 'assets/docs/Ironsworn-Starforged-rulebook.pdf', title: 'Ironsworn Starforged rulebook', ext: 'pdf', sizeBytes: 32245844, releaseAsset: 'Ironsworn-Starforged-rulebook.pdf' },
  { file: 'assets/docs/Starforged-reference-guide.pdf', title: 'Starforged reference guide', ext: 'pdf', sizeBytes: 19779875, releaseAsset: 'Starforged-reference-guide.pdf' },
  { file: 'assets/docs/Stars Without Number Revised - Deluxe Edition.pdf', title: 'Stars Without Number Revised   Deluxe Edition', ext: 'pdf', sizeBytes: 11074701, releaseAsset: 'Stars.Without.Number.Revised.-.Deluxe.Edition.pdf' },
  { file: 'assets/docs/Starsmith-Assets-Mar-5-23.pdf', title: 'Starsmith Assets Mar 5 23', ext: 'pdf', sizeBytes: 31570395, releaseAsset: 'Starsmith-Assets-Mar-5-23.pdf' },
  { file: 'assets/docs/Starsmith-Expanded-Oracles-May-15-23.pdf', title: 'Starsmith Expanded Oracles May 15 23', ext: 'pdf', sizeBytes: 22045227, releaseAsset: 'Starsmith-Expanded-Oracles-May-15-23.pdf' },
  { file: 'assets/docs/Traveller-2e-Core-Rulebook.pdf', title: 'Traveller 2e Core Rulebook', ext: 'pdf', sizeBytes: 56988103, releaseAsset: 'Traveller-2e-Core-Rulebook.pdf' },
  { file: 'assets/docs/Traveller-2e-high-guard-2022-update.pdf', title: 'Traveller 2e high guard 2022 update', ext: 'pdf', sizeBytes: 77816836, releaseAsset: 'Traveller-2e-high-guard-2022-update.pdf' },
  { file: 'assets/docs/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf', title: 'Traveller 2e the great rift book 4 deep space exploration handbook', ext: 'pdf', sizeBytes: 9233647, releaseAsset: 'Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf' },
  // Direct follow-up request ("create a guide ToC for each ruleset against
  // the sourcebooks associated to that ruleset as grouped in folders under
  // assets/docs"): `assets/docs/` was reorganized into per-game subfolders
  // at some point and this catalog was never updated to match — the 10
  // entries below are genuinely NEW additions (ironsworn/5LFB/dnd5e's own
  // subfolders had no entry at all for any of their real files) plus 3
  // freshly-added, correctly-pathed entries for Starforged/5PFH/Traveller's
  // own primary rulebook (their EXISTING entries above still point at the
  // old flat path that no longer exists on disk — left untouched rather
  // than repointed, per this file's own "never repoint, it orphans a
  // campaign's saved refOverrides" warning above; those old entries simply
  // stay unused). See data/rulesetGuideDefaults.js for which of these back
  // each RULESETS entry's own Guide ToC default.
  { file: 'assets/docs/ironsworn/Ironsworn-Rulebook.pdf', title: 'Ironsworn Rulebook', ext: 'pdf', sizeBytes: 40942519, releaseAsset: 'Ironsworn-Rulebook.pdf' },
  { file: 'assets/docs/ironsworn/ironsworn-delve-rulebook-spreads.pdf', title: 'Ironsworn Delve', ext: 'pdf', sizeBytes: 22965403, releaseAsset: 'ironsworn-delve-rulebook-spreads.pdf' },
  { file: 'assets/docs/ironsworn/Ironsworn-Assets-Master-Set.pdf', title: 'Ironsworn Assets Master Set', ext: 'pdf', sizeBytes: 496644, releaseAsset: 'Ironsworn-Assets-Master-Set.pdf' },
  { file: 'assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf', title: 'Five Leagues from the Borderlands (3rd Edition)', ext: 'pdf', sizeBytes: 19595101, releaseAsset: 'five-leagues-from-the-borderlands-3e.pdf' },
  { file: 'assets/docs/5LFB/Five Leagues - Compendium_Final_Digital.pdf', title: 'Five Leagues Compendium', ext: 'pdf', sizeBytes: 45108472, releaseAsset: 'Five.Leagues.-.Compendium_Final_Digital.pdf' },
  { file: 'assets/docs/5LFB/5LDB Warband Sheet US.pdf', title: 'Five Leagues Warband Sheet', ext: 'pdf', sizeBytes: 45674, releaseAsset: '5LDB.Warband.Sheet.US.pdf' },
  { file: 'assets/docs/dnd5e/SRD_CC_v5.2.1.pdf', title: 'D&D 5e SRD 5.2.1', ext: 'pdf', sizeBytes: 6031375, releaseAsset: 'SRD_CC_v5.2.1.pdf' },
  { file: 'assets/docs/Starforged/Starforged-reference-guide.pdf', title: 'Starforged Reference Guide', ext: 'pdf', sizeBytes: 19779875, releaseAsset: 'Starforged-reference-guide.pdf' },
  { file: 'assets/docs/5PFH/5PFH-Five-Parsecs-From-Home-v3.pdf', title: 'Five Parsecs From Home (3rd Edition)', ext: 'pdf', sizeBytes: 9703190, releaseAsset: '5PFH-Five-Parsecs-From-Home-v3.pdf' },
  { file: 'assets/docs/Traveller/Traveller-2e-Core-Rulebook.pdf', title: 'Traveller 2e Core Rulebook', ext: 'pdf', sizeBytes: 56988103, releaseAsset: 'Traveller-2e-Core-Rulebook.pdf' },
  // Secondary sourcebooks data/rulesetGuideDefaults.js's own starforged/
  // 5pfh/traveller lists reference alongside each ruleset's primary PDF
  // above — same "add a correctly-pathed duplicate, leave the old stale
  // flat-path entry alone" treatment.
  { file: 'assets/docs/Starforged/Ironsworn-Starforged-rulebook.pdf', title: 'Ironsworn Starforged rulebook', ext: 'pdf', sizeBytes: 32245844, releaseAsset: 'Ironsworn-Starforged-rulebook.pdf' },
  { file: 'assets/docs/Starforged/Starsmith-Assets-Mar-5-23.pdf', title: 'Starsmith Assets Mar 5 23', ext: 'pdf', sizeBytes: 31570395, releaseAsset: 'Starsmith-Assets-Mar-5-23.pdf' },
  { file: 'assets/docs/Starforged/Starsmith-Expanded-Oracles-May-15-23.pdf', title: 'Starsmith Expanded Oracles May 15 23', ext: 'pdf', sizeBytes: 22045227, releaseAsset: 'Starsmith-Expanded-Oracles-May-15-23.pdf' },
  { file: 'assets/docs/5PFH/5PFH-3e-Compendium-Includes-Bug-Hunt.pdf', title: '5PFH 3e Compendium Includes Bug Hunt', ext: 'pdf', sizeBytes: 50678570, releaseAsset: '5PFH-3e-Compendium-Includes-Bug-Hunt.pdf' },
  { file: 'assets/docs/5PFH/5PFH Planetfall 1.2.pdf', title: '5PFH Planetfall 1.2', ext: 'pdf', sizeBytes: 43722123, releaseAsset: '5PFH.Planetfall.1.2.pdf' },
  { file: 'assets/docs/Traveller/Traveller-2e-high-guard-2022-update.pdf', title: 'Traveller 2e high guard 2022 update', ext: 'pdf', sizeBytes: 77816836, releaseAsset: 'Traveller-2e-high-guard-2022-update.pdf' },
  { file: 'assets/docs/Traveller/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf', title: 'Traveller 2e the great rift book 4 deep space exploration handbook', ext: 'pdf', sizeBytes: 9233647, releaseAsset: 'Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf' },
];
