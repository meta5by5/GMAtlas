// crewTasksDefault5pfh.js — the seed content for a Rules Profile's Crew
// Tasks list (design/adr/rules-profiles-multi-campaign.md), the eight jobs
// a crew member can be assigned during "Daily Life" step 2 ("Assign/resolve
// crew tasks") — same authored-summary posture turnStepsDefault5pfh.js
// already uses: a short, actionable paraphrase of the mechanic plus a page
// citation, not a verbatim transcription of the rulebook's own prose. Every
// `@[Label|Target]` here is this app's own document-mention syntax
// (src/ui/mentionEditor.js) — src/domain/crewTasks.js reads a task's text
// straight through buildMentionEditorHTML for display, no separate parsing
// needed. Page numbers verified against assets/docs/5PFH-Five-Parsecs-
// From-Home-v3.pdf ("2. Assign and Resolve Crew Tasks," printed p.76-78 —
// printed page + 2 = the PDF's own page index, matching dl2's own existing
// @[Core p.77|...v3#79] mention in turnStepsDefault5pfh.js).
//
// A flat list, not grouped/branching like Turn Step — crew jobs are picked
// independently each campaign turn, not stepped through in sequence. This
// file is DATA, never mutated at runtime — a profile's own `crewTasks.tasks`
// starts as a clone of this (loadDefaultCrewTasks), then the GM's
// reordering/text edits live only in that clone.

export const CREW_TASKS_5PFH = [
  { id: 'find-a-patron', label: 'Find a Patron', text: 'Roll 1D6 + crew members looking (+1 per existing Patron contact, +1 per credit spent). 5+ finds one job offer; 6+ finds two, pick either. (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'train', label: 'Train', text: 'The character earns 1 XP; resolve a Character Upgrade immediately if this earns one. (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'trade', label: 'Trade', text: 'Each Trading crew member rolls once on the Trade Table (p.79); +1 extra roll per 3 credits spent, at least one crew member must be Trading. (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'recruit', label: 'Recruit', text: 'Under 6 crew: auto-recruit one new character per crew member sent Recruiting. 6+ crew: roll 1D6 + crew sent, 6+ adds a recruit (basic profile + Handgun, no background table rolls). (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'explore', label: 'Explore', text: 'Each exploring crew member rolls once on the Exploration Table (p.80). (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'track', label: 'Track', text: 'Roll 1D6 + crew members Tracking (+1 per credit spent beforehand). 6+ locates a Rival of your choice for a battle this campaign turn. (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'repair-your-kit', label: 'Repair Your Kit', text: 'Roll 1D6 + the character\'s Savvy (+1 if an Engineer, +1 per credit spent on spare parts). 6+ repairs the item; a natural 1 always fails. (@[Core p.77|5PFH Five Parsecs From Home v3#79])' },
  { id: 'decoy', label: 'Decoy', text: '+1 to the Rival-tracking roll for every crew member sent to act as a Decoy. (@[Core p.78|5PFH Five Parsecs From Home v3#80])' },
];
