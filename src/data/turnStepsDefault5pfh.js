// turnStepsDefault5pfh.js — the seed content for a Rules Profile's Turn
// Step workflow (design/adr/rules-profiles-multi-campaign.md), converted
// verbatim from the Guide entry "5PFH Campaign Turn Sequence" (a GM's own
// authored reference doc, not a transcription of the rulebook's actual
// text — matches this repo's existing copyright posture for authored
// content). Every `@[Label|Target]` here is this app's own document-
// mention syntax (src/ui/mentionEditor.js) already, unchanged from the
// source Guide text — src/domain/turnSteps.js's getCurrentTurnStep() reads
// step.text straight through buildMentionEditorHTML for display, no
// separate parsing needed.
//
// Seven step-lists. "Daily Life" is the default/root; a step with a
// `branchTo` sends "Next Step" into another list (src/domain/
// turnSteps.js's advanceTurnStep, with a returnStack to resume where the
// GM left off). This file is DATA, never mutated at runtime — a profile's
// own `turnSteps.groups` starts as a clone of this (loadDefaultTurnSteps),
// then the GM's reordering/text edits live only in that clone.

export const TURN_STEPS_5PFH = [
  {
    id: 'daily-life',
    label: 'Daily Life',
    steps: [
      { id: 'dl1', text: 'Update status (injuries, cargo, heat, rivals, favors, reputation).', branchTo: null },
      { id: 'dl2', text: 'Assign/resolve crew tasks (@[Core p.77|5PFH Five Parsecs From Home v3#79]).', branchTo: null },
      { id: 'dl3', text: 'Determine job offers (@[Core p.83|5PFH Five Parsecs From Home v3#85]).', branchTo: null },
      { id: 'dl4', text: 'Check for Rivals (@[Core p.85|5PFH Five Parsecs From Home v3#87]).', branchTo: null },
      { id: 'dl5', text: 'Select your Job (Patron, Rival, Quest, Salvage, etc.).', branchTo: null },
      { id: 'dl6', text: 'Resolve Rumors (@[Core p.85|5PFH Five Parsecs From Home v3#87]).', branchTo: null },
      { id: 'dl7', text: 'Resolve Mission Steps or Merchant Mission Steps.', branchTo: 'mission-steps' },
      { id: 'dl8', text: 'Story Event/Track if turn without one (@[Core p.66|5PFH Five Parsecs From Home v3#68], @[Core p.153|5PFH Five Parsecs From Home v3#155]).', branchTo: null },
    ],
  },
  {
    id: 'mission-steps',
    label: 'Mission Steps',
    steps: [
      { id: 'ms1', text: 'Determine the objective (may use Expanded Missions, @[CBH p.74|5PFH 3e Compendium/Bug Hunt#76])', branchTo: null },
      { id: 'ms2', text: 'Mission Selection (Salvage Jobs)', branchTo: null },
      { id: 'ms3', text: 'Faction Involvement* (unknown during selection; could be a surprise) (@[CBH p.110|5PFH 3e Compendium/Bug Hunt#110])', branchTo: null },
      { id: 'ms4', text: 'Check for Connections (@[p.164|5PFH Five Parsecs From Home v3#166], or Expanded Connection @[CBH p.80|5PFH 3e Compendium/Bug Hunt#80] – Opportunity mission only)', branchTo: null },
      { id: 'ms5', text: 'Assign equipment (@[p.85|5PFH Five Parsecs From Home v3#87])', branchTo: null },
      { id: 'ms6', text: 'Deployment (@[pp.88-94|5PFH Five Parsecs From Home v3#90]) — see Deployment Steps.', branchTo: 'deployment-considerations' },
      { id: 'ms7', text: 'Battle (go to tabletop)', branchTo: null },
      { id: 'ms8', text: 'Resolve Tabletop Post-battle activities — see Post-battle Activities.', branchTo: 'post-battle-activities' },
    ],
  },
  {
    id: 'deployment-considerations',
    label: 'Deployment Steps',
    steps: [
      { id: 'dc1', text: 'Check deployment conditions (not Salvage)', branchTo: null },
      { id: 'dc2', text: 'Determine notable sights (not Salvage)', branchTo: null },
      { id: 'dc3', text: 'Determine the enemy (@[p.92|5PFH Five Parsecs From Home v3#94])', branchTo: null },
      { id: 'dc4', text: 'Set up the battlefield (@[p.108|5PFH Five Parsecs From Home v3#108]; Terrain Generation, @[CBH 94|5PFH 3e Compendium/Bug Hunt#94])', branchTo: null },
      { id: 'dc5', text: 'Set up Points of interest and Salvage (Salvage mission only)', branchTo: null },
    ],
  },
  {
    id: 'post-battle-activities',
    label: 'Post-battle Steps',
    steps: [
      { id: 'pb-a', text: 'a. Resolve Rival status (@[p.119|5PFH Five Parsecs From Home v3#121])', branchTo: null },
      { id: 'pb-b', text: 'b. Check for illegal Psionic usage (@[p.21|5PFH Five Parsecs From Home v3#23])', branchTo: null },
      { id: 'pb-c', text: 'c. Resolve Patron status (@[p.119|5PFH Five Parsecs From Home v3#121])', branchTo: null },
      { id: 'pb-d', text: 'd. Roll quest progress (@[p.120|5PFH Five Parsecs From Home v3#122], @[CBH p.78|5PFH 3e Compendium/Bug Hunt#78])', branchTo: null },
      { id: 'pb-e', text: 'e. Get paid (@[p.120|5PFH Five Parsecs From Home v3#122])', branchTo: null },
      { id: 'pb-f', text: 'f. Trade Salvage (@[p.147|5PFH Five Parsecs From Home v3#147] — Salvage mission only)', branchTo: null },
      { id: 'pb-g', text: 'g. Battlefield finds (@[p.121|5PFH Five Parsecs From Home v3#123])', branchTo: null },
      { id: 'pb-h', text: 'h. Check for Salvage mission points of interest (@[CBH p.139|5PFH 3e Compendium/Bug Hunt#139] — Salvage mission only)', branchTo: null },
      { id: 'pb-i', text: 'i. Check for World Event Steps', branchTo: 'world-event-steps' },
      { id: 'pb-j', text: 'j. Check for Settlement Event Steps', branchTo: 'settlement-event-steps' },
      { id: 'pb-k', text: 'k. Gather the loot (@[p.121|5PFH Five Parsecs From Home v3#123], @[p.131+|5PFH Five Parsecs From Home v3#133])', branchTo: null },
      { id: 'pb-l', text: 'l. Determine injuries and recovery (@[p.121|5PFH Five Parsecs From Home v3#123])', branchTo: null },
      { id: 'pb-m', text: 'm. EXP and character upgrades (@[p.123|5PFH Five Parsecs From Home v3#125])', branchTo: null },
      { id: 'pb-n', text: 'n. Invest in advanced training (@[p.124|5PFH Five Parsecs From Home v3#126])', branchTo: null },
      { id: 'pb-o', text: 'o. Purchase items (@[p.125|5PFH Five Parsecs From Home v3#127])', branchTo: null },
      { id: 'pb-p', text: 'p. Roll for a character event (@[p.126|5PFH Five Parsecs From Home v3#128], @[p.128|5PFH Five Parsecs From Home v3#130])', branchTo: null },
      { id: 'pb-q', text: 'q. Resolve Heat check', branchTo: null },
    ],
  },
  {
    id: 'travel-steps',
    label: 'Travel Steps',
    steps: [
      { id: 'tr1', text: 'Flee invasion (@[Core p.69|5PFH Five Parsecs From Home v3#71]).', branchTo: null },
      { id: 'tr2', text: 'Check for Factions fleeing (@[CBH p.114|5PFH 3e Compendium/Bug Hunt#114]).', branchTo: null },
      { id: 'tr3', text: 'Decide whether to travel (@[Core p.69|5PFH Five Parsecs From Home v3#71]).', branchTo: null },
      { id: 'tr4', text: 'Resolve steps, Local Travel / Starship Travel (@[Core p.70|5PFH Five Parsecs From Home v3#72]), as applicable.', branchTo: null },
      { id: 'tr5', text: 'Resolve New World Arrival steps (@[Core p.72|5PFH Five Parsecs From Home v3#74])', branchTo: null },
      { id: 'tr6', text: 'Check for Shipping Issues (Starship, Planetary, Overland).', branchTo: null },
      { id: 'tr7', text: 'Check for Settlement Event Steps.', branchTo: 'settlement-event-steps' },
    ],
  },
  {
    id: 'settlement-event-steps',
    label: 'Settlement Event Steps',
    steps: [
      { id: 'se1', text: 'Check for invasion (@[Core p.69|5PFH Five Parsecs From Home v3#71]).', branchTo: null },
      { id: 'se2', text: 'Check for Instability (@[CBH p.148|5PFH 3e Compendium/Bug Hunt#148]).', branchTo: null },
      { id: 'se3', text: 'Roll a Negotiations check.', branchTo: null },
      { id: 'se4', text: 'Check for Faction Conflict', branchTo: null },
      { id: 'se5', text: 'Check for Psionic legality status (@[CBH p.20|5PFH 3e Compendium/Bug Hunt#20])', branchTo: null },
      { id: 'se6', text: 'Resolve Heat Check.', branchTo: null },
    ],
  },
  {
    id: 'world-event-steps',
    label: 'World Event Steps',
    steps: [
      { id: 'we1', text: 'Check for Faction Conflict.', branchTo: null },
      { id: 'we2', text: 'Fringe World Strife / Instability', branchTo: null },
      { id: 'we3', text: 'Roll for a Campaign Event (@[Core p.126|5PFH Five Parsecs From Home v3#128]).', branchTo: null },
      { id: 'we4', text: 'Roll for a District Event.', branchTo: null },
      { id: 'we5', text: 'Roll for a Faction Event (@[CBH p.114|5PFH 3e Compendium/Bug Hunt#114]).', branchTo: null },
      { id: 'we6', text: 'Check for Galactic War progress (@[Core p.126|5PFH Five Parsecs From Home v3#128]).', branchTo: null },
      { id: 'we7', text: 'Resolve Heat Check.', branchTo: null },
    ],
  },
];
