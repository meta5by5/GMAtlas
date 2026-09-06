// turnStepListPlanetfall.js — seed content for the "Planetfall" Turn Step
// List (direct follow-up request: "make an equivalent Turn Step list from
// the Planetfall Campaign Turn Sequence on p.58"), transcribed via
// `pdftotext -layout` from assets/docs/5PFH Planetfall 1.2.pdf's own
// "Campaign Turn Sequence" (printed p.57 onward — confirmed PDF-to-printed
// page offset of +2, matching this app's existing turn-step/crew-task
// content). The rulebook's own sequence is linear ("you must progress
// through in order") across three groups (Pre-Battle/Battle/Post-Battle
// Steps, its own section headings) — direct follow-up request ("revise the
// Planetfall profile using the same configuration design as for the
// mapping under the 5PFH profile"): chained via branchTo, the same
// group-linking mechanism TURN_STEPS_5PFH already uses, instead of relying
// on array order alone (which the play-position engine, domain/
// turnSteps.js, never assumes — a group is only reachable by being the
// list's first group or by another step's explicit branchTo). Pre-Battle
// Steps' last step (pf6, Mission Determination) branches to Battle Steps;
// Battle Steps' last step (pf8, Play Out Your Mission) branches to
// Post-Battle Steps — the true end of the workflow (after Post-Battle's
// last step, pf18) is what actually prompts "start the next Campaign
// Turn." Short paraphrases, not
// verbatim reproduction, each with a real `@[Label|Target]` page-citation
// mention (src/ui/mentionEditor.js) — same authored-content posture
// turnStepsDefault5pfh.js/crewTasksDefault5pfh.js already use. Loaded into
// the shared appConfig.turnStepLists inventory (domain/turnStepLists.js)
// via "Load Planetfall Default Steps" in Settings, or auto-seeded for a
// first-time install / backfilled for an existing one missing it (see
// core/migrate.js, core/store.js).

const DOC = '5PFH Planetfall 1.2';

export const PLANETFALL_TURN_STEPS = [
  {
    id: 'pre-battle-steps',
    label: 'Pre-Battle Steps',
    steps: [
      { id: 'pf1', text: `Recovery — every character in Sick Bay heals, reducing remaining recovery time by 1 turn; a character fully healed this step is ready for deployment (@[Core p.57|${DOC}#59]).`, branchTo: null },
      { id: 'pf2', text: `Repairs — restore lost Colony Integrity up to your repair rate (1/turn to start), spending up to 3 Raw Materials (1 point repaired each); a Broken colony bot is also repaired here, but can't deploy this turn (@[Core p.58|${DOC}#60]).`, branchTo: null },
      { id: 'pf3', text: `Scout Reports — perform one Scout Explore action (roll 2D6 twice, lowest each time, for a sector's Resource/Hazard levels) and roll once on the Scout Discovery table (@[Core p.58|${DOC}#60]).`, branchTo: null },
      { id: 'pf4', text: `Enemy Activity — if any Tactical Enemies are on the map, randomly pick one and roll on the Enemy Activity table (Patrol/Relocate/Occupy/Rapid Expansion/Attack/Raid); skip if none are present (@[Core p.60|${DOC}#62]).`, branchTo: null },
      { id: 'pf5', text: `Colony Events — roll on the Colony Events table and apply the result immediately; an impossible-to-implement result is simply ignored (no event this turn) (@[Core p.61|${DOC}#63]).`, branchTo: null },
      { id: 'pf6', text: `Mission Determination — review your scout/enemy reports and pick this turn's mission (Pitched Battle if attacked, or Exploration/Science/Skirmish/Strike/Assault/Delve/Rescue/Patrol/Scouting as circumstances allow) (@[Core p.63|${DOC}#65]).`, branchTo: 'battle-steps' },
    ],
  },
  {
    id: 'battle-steps',
    label: 'Battle Steps',
    steps: [
      { id: 'pf7', text: `Lock and Load — choose which characters (and how many bots/civvies) deploy for this turn's mission; anyone in Sick Bay can't be selected (@[Core p.64|${DOC}#66]).`, branchTo: null },
      { id: 'pf8', text: `Play Out Your Mission — set up the table and play the mission chosen in Mission Determination, tracking casualties and notable events as you go (@[Core p.65|${DOC}#67]).`, branchTo: 'post-battle-steps' },
    ],
  },
  {
    id: 'post-battle-steps',
    label: 'Post-Battle Steps',
    steps: [
      { id: 'pf9', text: `Injuries — roll on the Injury table for each character casualty; a grunt casualty instead rolls 1D6 (1-2: lost, 3-6: recovers for the next mission) (@[Core p.65|${DOC}#67]).`, branchTo: null },
      { id: 'pf10', text: `Experience Progression — award Mission XP to every eligible character, then spend accumulated XP (5 per roll) on the Advancement table to improve ability scores (@[Core p.66|${DOC}#68]).`, branchTo: null },
      { id: 'pf11', text: `Colony Morale Adjustments — Morale automatically drops 1 (regardless of actions taken), plus 1 more per battle casualty; test for Colony Morale if now at -10 or worse (@[Core p.67|${DOC}#69]).`, branchTo: null },
      { id: 'pf12', text: `Track Enemy Information and Mission Data — a won battle against a Tactical Enemy adds 1 Enemy Information for that enemy; note any Mission Data obtained, resolved at the next Campaign Milestone (@[Core p.67|${DOC}#69]).`, branchTo: null },
      { id: 'pf13', text: `Replacement Phase — if under a full roster, roll 2D6 (bonus per Milestone achieved) to see whether a replacement character becomes available (@[Core p.67|${DOC}#69]).`, branchTo: null },
      { id: 'pf14', text: `Research Phase — receive this turn's earned Research Points (added to any saved up) and spend RP to research new technologies (@[Core p.68|${DOC}#70]).`, branchTo: null },
      { id: 'pf15', text: `Building Phase — receive this turn's earned Build Points (added to any saved up) and spend BP to construct (or reclaim, for partial BP back) buildings (@[Core p.68|${DOC}#70]).`, branchTo: null },
      { id: 'pf16', text: `Colony Integrity Phase — if Colony Integrity is -3 or worse, check the Integrity Failure table for the consequences (@[Core p.68|${DOC}#70]).`, branchTo: null },
      { id: 'pf17', text: `Character Event — randomly select one eligible character and roll on the Character Event table; a character absent from the campaign (e.g. on R&R) can't be selected (@[Core p.68|${DOC}#70]).`, branchTo: null },
      { id: 'pf18', text: `Update Colony Sheet — tidy up your Colony Tracking Sheet to reflect everything that happened this turn before starting the next one (@[Core p.70|${DOC}#72]).`, branchTo: null },
    ],
  },
];
