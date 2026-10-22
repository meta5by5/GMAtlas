// rulesetGuideDefaults.js — which real sourcebook PDFs (already catalogued
// in data/referenceLibraryManifest.js) back each data/rulesets.js RULESETS
// entry's own default Guide Table of Contents (direct follow-up request:
// "Create a guide ToC for each ruleset against the sourcebooks associated
// to that ruleset as grouped in folders under assets\docs"). Consumed by
// domain/rulesetGuide.js's ensureRulesetGuideDefault(), which writes one
// `- @[title]` bullet per entry below into that ruleset's own Guide child
// doc — `title` must match a real referenceLibraryManifest.js entry's own
// `title` exactly, or the mention won't resolve to a real, openable
// document once a GM clicks "Load" (see drawers/index.js's "Load" button).
//
// Deliberately no `dnd5e` key: its own `doc: null` in rulesets.js is a
// considered choice (the SRD 5.2.1 is CC-BY, a different licensing posture
// than every purchased-rulebook PDF every other ruleset here points at —
// see that entry's own comment), not a staleness bug like `traveller`'s
// was — this file respects that same "no ordinary sourcebook link" posture
// by simply not seeding a Guide default for it either. `hostile`/`swn`
// aren't included either — neither is a RULESETS entry (no "Ruleset for
// Profile" dropdown option exists to anchor a default to).
export const RULESET_GUIDE_DEFAULTS = {
  starforged: [
    { file: 'assets/docs/Starforged/Starforged-reference-guide.pdf', title: 'Starforged Reference Guide' },
    { file: 'assets/docs/Starforged/Ironsworn-Starforged-rulebook.pdf', title: 'Ironsworn Starforged rulebook' },
    { file: 'assets/docs/Starforged/Starsmith-Assets-Mar-5-23.pdf', title: 'Starsmith Assets Mar 5 23' },
    { file: 'assets/docs/Starforged/Starsmith-Expanded-Oracles-May-15-23.pdf', title: 'Starsmith Expanded Oracles May 15 23' },
  ],
  ironsworn: [
    { file: 'assets/docs/ironsworn/Ironsworn-Rulebook.pdf', title: 'Ironsworn Rulebook' },
    { file: 'assets/docs/ironsworn/ironsworn-delve-rulebook-spreads.pdf', title: 'Ironsworn Delve' },
    { file: 'assets/docs/ironsworn/Ironsworn-Assets-Master-Set.pdf', title: 'Ironsworn Assets Master Set' },
  ],
  '5pfh': [
    { file: 'assets/docs/5PFH/Five Parsecs From Home v3.pdf', title: 'Five Parsecs From Home v3' },
    { file: 'assets/docs/5PFH/Five Parsecs - Compendium Includes Bug Hunt.pdf', title: 'Five Parsecs - Compendium Includes Bug Hunt' },
    { file: 'assets/docs/5PFH/Five Parsecs - Planetfall 1.2.pdf', title: 'Five Parsecs - Planetfall 1.2' },
  ],
  traveller: [
    { file: 'assets/docs/Traveller/Traveller-2e-Core-Rulebook.pdf', title: 'Traveller 2e Core Rulebook' },
    { file: 'assets/docs/Traveller-2e-high-guard-2022-update.pdf', title: 'Traveller 2e high guard 2022 update' },
    { file: 'assets/docs/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf', title: 'Traveller 2e the great rift book 4 deep space exploration handbook' },
  ],
  fiveleagues: [
    { file: 'assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf', title: 'Five Leagues from the Borderlands (3rd Edition)' },
    { file: 'assets/docs/5LFB/Five Leagues - Compendium_Final_Digital.pdf', title: 'Five Leagues Compendium' },
    { file: 'assets/docs/5LFB/5LDB Warband Sheet US.pdf', title: 'Five Leagues Warband Sheet' },
  ],
};
