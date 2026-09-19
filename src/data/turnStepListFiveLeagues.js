// turnStepListFiveLeagues.js — seed content for the "Five Leagues" Turn
// Step List (Campaign panel's Warband tab), transcribed via
// `pdftotext -layout` from assets/docs/5LFB/five-leagues-from-the-
// borderlands-3e.pdf's own campaign-turn chapters (THE CAMPAIGN p.67,
// PREPARATION p.75, ADVENTURES p.91, ENCOUNTERS p.113, RESOLUTION p.187) —
// same short-paraphrase-plus-page-citation posture as
// turnStepListPlanetfall.js/turnStepsDefault5pfh.js, not verbatim
// reproduction. Four groups matching the rulebook's own four campaign-turn
// stages, chained via branchTo the same way Planetfall's own three groups
// are (each stage's last step branches into the next) rather than relying
// on array order alone — domain/turnSteps.js's play-position engine only
// ever follows an explicit branchTo or a list's first group.
const DOC = '5LFB Five Leagues from the Borderlands 3e';

export const TURN_STEPS_FIVE_LEAGUES = [
  {
    id: 'preparation-stage',
    label: 'Preparation Stage',
    steps: [
      { id: 'fl1', text: `Local Events — roll on the Local Events table for something happening around your warband's current settlement before you head out (@[Core p.76|${DOC}#76]).`, branchTo: null },
      { id: 'fl2', text: `Hard Times — if the warband has no Gold Marks, check Hard Times for the consequences of being flat broke (@[Core p.81|${DOC}#81]).`, branchTo: null },
      { id: 'fl3', text: `Campaign Activities — assign warband members to Campaign Activities (train, work a job, explore, recruit, craft, and similar) for this turn (@[Core p.81|${DOC}#81]).`, branchTo: null },
      { id: 'fl4', text: `Trade — buy or sell equipment and Valuables using the Trade Tables (@[Core p.85|${DOC}#85]).`, branchTo: null },
      { id: 'fl5', text: `Research — spend time or resources investigating rumors, quests, or points of interest on your map (@[Core p.86|${DOC}#86]).`, branchTo: null },
      { id: 'fl6', text: `Decide Your Adventure — pick this turn's Quest, Contract, or other adventure from what's currently available (@[Core p.87|${DOC}#87]).`, branchTo: null },
      { id: 'fl7', text: `Outfit for Adventures — make final equipment/weapon/armor assignments before heading out (@[Core p.87|${DOC}#87]).`, branchTo: 'adventuring-stage' },
    ],
  },
  {
    id: 'adventuring-stage',
    label: 'Adventuring Stage',
    steps: [
      { id: 'fl8', text: `Encounter Locations — determine which kind of location this adventure heads toward (Enemy Camp/Hideout, Delve, Monster Lair, or an Unexplored Location) (@[Core p.92|${DOC}#92]).`, branchTo: null },
      { id: 'fl9', text: `Resting Up — characters recover Resolve/minor injuries between adventures per the Resting Up rules (@[Core p.96|${DOC}#96]).`, branchTo: null },
      { id: 'fl10', text: `Enemy Threat — track and escalate the current Enemy Threat level as the campaign progresses (@[Core p.97|${DOC}#97]).`, branchTo: null },
      { id: 'fl11', text: `Contracts and Quests — check on any active Contracts or Quests, resolving stages as they come due (@[Core p.100|${DOC}#100]).`, branchTo: null },
      { id: 'fl12', text: `Travel — resolve travel to this turn's chosen location, including any Travel Events along the way (@[Core p.111|${DOC}#111]).`, branchTo: 'encounters-stage' },
    ],
  },
  {
    id: 'encounters-stage',
    label: 'Encounters Stage',
    steps: [
      { id: 'fl13', text: `Traveler Encounters — resolve any non-battle Traveler Encounter rolled for this leg of the adventure (@[Core p.114|${DOC}#114]).`, branchTo: null },
      { id: 'fl14', text: `The Foe — determine which enemy table and specific foe your warband faces this battle (@[Core p.121|${DOC}#121]).`, branchTo: null },
      { id: 'fl15', text: `Terrain and Set-up — lay out the battlefield and deploy both sides per the chosen Scenario Type (@[Core p.128|${DOC}#128]).`, branchTo: null },
      { id: 'fl16', text: `Play the Battle — fight the encounter using the Battle Round sequence (Initiative, Movement, Combat) until the Scenario's end condition is met (@[Core p.130|${DOC}#130]).`, branchTo: null },
      { id: 'fl17', text: `Ending a Scenario — resolve whichever Scenario Type's own end-of-battle rules apply (@[Core p.150|${DOC}#150]).`, branchTo: 'resolution-stage' },
    ],
  },
  {
    id: 'resolution-stage',
    label: 'Resolution Stage',
    steps: [
      { id: 'fl18', text: `Experience Points — award XP to participating characters and spend accumulated XP on Advancements (@[Core p.193|${DOC}#193]).`, branchTo: null },
      { id: 'fl19', text: `Loot — roll for Valuables, weapons, armor, tools, consumables, and Enchanted Items found (@[Core p.196|${DOC}#196]).`, branchTo: null },
      { id: 'fl20', text: `Enemy Plans — advance the current Enemy's own scheme per the Enemy Plans track (@[Core p.207|${DOC}#207]).`, branchTo: null },
      { id: 'fl21', text: `Victory and Defeat — check whether this turn's outcome triggers a Threat's defeat or an Adventure Milestone (@[Core p.210|${DOC}#210]).`, branchTo: null },
      { id: 'fl22', text: `Update Your Warband Sheet — tidy up your Warband Roster before starting the next Campaign Turn (@[Core p.212|${DOC}#212]).`, branchTo: null },
    ],
  },
];
