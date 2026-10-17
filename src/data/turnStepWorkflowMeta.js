// turnStepWorkflowMeta.js — per-step metadata for the Navigator workflow
// manager (direct follow-up request: "Incorporate the campaign workflow
// functionality of 5LFB and 5PFH currently in Campaign Guide under the
// Campaign panel into the Navigator as a workflow manager... with each
// campaign step, incorporate suggestion links to oracles. Add choice to
// select from a list or create a new map when the campaign step involves
// a location."). Keyed by the real, stable step ids in
// data/turnStepsDefault5pfh.js / data/turnStepListPlanetfall.js /
// data/turnStepListFiveLeagues.js (confirmed via tests/domain.test.js's
// own data-integrity check that every id here is real).
//
// TURN_STEP_ORACLE_LINKS reuses data/oracleTagSeeds.js's own existing tag
// vocabulary (character/leadership/secret/fear/hook/agenda/faction/trade/
// discovery/site/surroundings/setting) rather than inventing a parallel
// one — every tag here already resolves on a real table in BOTH the
// sci-fi (SCENE_TABLES) and fantasy (FANTASY_FULL_TABLES) packs, since the
// fantasy pack was built as a structural "full equivalent duplicate" of
// the sci-fi one (same top-level group names throughout) — so the exact
// same tag set works whether a tagged step belongs to a 5PFH/Planetfall
// (sci-fi) or Five Leagues (fantasy) list, with no genre-specific
// branching needed. Deliberately NOT every step has an entry: a step
// that's pure bookkeeping (update a sheet, spend XP, roll injuries) gets
// no tag at all, same "no icon when nothing genuinely fits" posture
// data/entityFieldOracleLinks.js's own oracleLinkTagsFor already has for
// entity fields — forcing a tag onto every single step regardless of fit
// would just be noise.
export const TURN_STEP_ORACLE_LINKS = {
  // -- 5PFH (data/turnStepsDefault5pfh.js) --
  dl3: ['hook'], dl4: ['fear'], dl5: ['hook'], dl6: ['secret'], dl8: ['hook'],
  ms1: ['hook'], ms2: ['hook'], ms3: ['faction'], ms4: ['character'],
  dc2: ['setting', 'surroundings'], dc3: ['fear'], dc4: ['setting'], dc5: ['site'],
  'pb-a': ['fear'], 'pb-c': ['character'], 'pb-d': ['hook'], 'pb-f': ['trade'], 'pb-g': ['discovery'], 'pb-h': ['site'], 'pb-o': ['trade'], 'pb-p': ['character'], 'pb-q': ['fear'],
  tr1: ['fear'], tr2: ['faction'], tr5: ['setting'],
  se1: ['fear'], se2: ['faction'], se3: ['leadership'], se4: ['faction'], se6: ['fear'],
  we1: ['faction'], we2: ['faction'], we3: ['hook'], we4: ['setting'], we5: ['faction'], we6: ['faction'], we7: ['fear'],
  // -- Planetfall (data/turnStepListPlanetfall.js) --
  pf3: ['discovery', 'setting'], pf4: ['fear'], pf5: ['hook'], pf6: ['hook'], pf8: ['setting'],
  pf11: ['fear'], pf12: ['discovery'], pf16: ['fear'], pf17: ['character'],
  // -- Five Leagues (data/turnStepListFiveLeagues.js) --
  fl1: ['hook'], fl2: ['trade'], fl4: ['trade'], fl5: ['secret', 'site'], fl6: ['hook'],
  fl8: ['site'], fl10: ['fear'], fl11: ['hook'], fl12: ['surroundings'],
  fl13: ['discovery'], fl14: ['fear'], fl15: ['setting'], fl19: ['discovery'], fl20: ['faction'],
};

// Steps that trigger the "pick or create a map" affordance (direct
// instruction: "Add choice to select from a list or create a new map when
// the campaign step involves a location") — a deliberately curated
// SUBSET of the location-flavored steps above (dc2/tr5/pf3/pf4/pf8/fl5/
// fl12/fl15 are location-flavored narration/setup but don't name a
// specific PLACE worth mapping; the ones below are the steps that
// genuinely determine or arrive at a concrete place).
export const TURN_STEP_LOCATION_STEPS = new Set([
  'dc4', 'dc5', // 5PFH: battlefield / points of interest set-up
  'tr5', // 5PFH: New World Arrival
  'pf3', 'pf8', // Planetfall: sector scouting / mission battlefield
  'fl8', 'fl12', 'fl15', // Five Leagues: Encounter Locations / Travel / Terrain Set-up
]);
