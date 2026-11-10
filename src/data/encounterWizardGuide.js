// encounterWizardGuide.js — what the Composer's Encounter wizard asks at each
// step (WHO/WHERE/WHAT/WHY/HOW), and which oracle tags it suggests tables
// from. Tags come only from the locked field-link vocabulary
// (data/entityFieldOracleLinks.js), so every one has a seeded table.
// `target` is where a kept oracle result goes: a Composer field ("key.field"
// for domain/context.js's patchContext), or 'npc' for a new NPC; a tag can
// pick its own field (WHERE's surroundings). `fields` are the step's fields a
// kept result can be sent to instead (the Use menu), "key.field" as above or
// 'encounter.<field>' for the Encounter's own fields (context.encounter;
// 'encounter.sessionHooks' adds a hook). The wording is GMAtlas's own.
export const ENCOUNTER_WIZARD_GUIDE = {
  who: {
    hint: 'Add people with 🧑 and factions with 🏛, or roll a character below and make it an NPC.',
    prompts: [
      'Who wants something from the party right now, and what will they offer or threaten?',
      'Who stands in the way? Give them a reason the party could understand.',
      'Who is caught in the middle and could get hurt?',
      'Which faction has a stake in how this ends?',
    ],
    tags: ['character', 'leadership', 'faction', 'agenda'],
    target: 'npc',
    fields: [['npc', 'A new NPC'], ['encounter.thirdPartyCasualty', 'Someone innocent gets hurt']],
  },
  where: {
    hint: 'Pick the place, then roll to describe the site and what surrounds it.',
    prompts: [
      'Where exactly does this happen? Name the one detail that makes it memorable.',
      'What do the senses pick up first: sound, smell, light?',
      'What about this place helps the party, and what gets in their way?',
    ],
    tags: ['site', 'surroundings', 'setting'],
    target: 'where.siteDescription',
    tagTargets: { surroundings: 'where.surroundings' },
    fields: [['where.siteDescription', 'Site description'], ['where.surroundings', 'Immediate surroundings']],
  },
  what: {
    hint: 'Set the Intent first: the suggestions follow it.',
    prompts: [
      'What is unresolved right now, in one sentence?',
      'What happens if nobody acts?',
      'What is the first thing the party notices?',
    ],
    // WHAT also leads with the current Intent's own tags
    // (INTENT_ORACLE_TAGS), ahead of these.
    tags: ['hook', 'discovery'],
    useIntent: true,
    target: 'what.situation',
    fields: [['what.situation', 'Situation'], ['encounter.statedCause', "What people say it's about"], ['encounter.precipitatingIncident', 'What lit the fuse']],
  },
  why: {
    hint: 'Give the party a goal worth chasing and something to lose.',
    prompts: [
      'Why is the party here? What do they want out of this?',
      'What is at stake if they fail, and for whom?',
      'What hidden truth could change their reason for being here?',
    ],
    tags: ['agenda', 'hook', 'secret'],
    target: 'why.summary',
    tagTargets: { secret: 'encounter.rootCause' },
    fields: [['why.summary', 'Objective'], ['encounter.rootCause', "What's actually driving it"], ['encounter.causeGapHook', 'Why the gap matters'], ['encounter.deepRootSummary', 'Deep root'], ['encounter.partyLeverage', 'Party leverage']],
  },
  how: {
    hint: 'Decide the mode of play and what keeps the pressure on.',
    prompts: [
      'How does this play out: talk, sneak, fight, or race the clock?',
      'What pressure keeps the pace up?',
      'What would turn an easy choice into a hard one?',
      'What hooks could pull the party back in later?',
    ],
    tags: ['fear', 'hook', 'discovery', 'trade'],
    target: 'how.summary',
    tagTargets: { hook: 'encounter.sessionHooks' },
    fields: [['how.summary', 'Mode and pacing'], ['encounter.sessionHooks', 'A session hook'], ['encounter.lastDeescalationAttempt', 'Last de-escalation attempt'], ['encounter.gmNotes', 'GM notes']],
  },
};

// The oracle tags a Composer field's 🎲 rolls from (one table chosen at
// random among those carrying any of them), keyed by its wizard target.
export const ENCOUNTER_FIELD_ORACLE_TAGS = {
  'where.siteDescription': ['site', 'setting'],
  'where.surroundings': ['surroundings'],
  'encounter.thirdPartyCasualty': ['character'],
  'encounter.statedCause': ['hook', 'agenda'],
  'encounter.precipitatingIncident': ['discovery', 'hook'],
  'encounter.rootCause': ['secret'],
  'encounter.causeGapHook': ['hook', 'secret'],
  'encounter.deepRootSummary': ['secret', 'agenda'],
  'encounter.partyLeverage': ['trade', 'leadership'],
  'encounter.lastDeescalationAttempt': ['agenda', 'leadership'],
  'encounter.gmNotes': ['hook', 'discovery'],
  'encounter.sessionHooks': ['hook'],
};
