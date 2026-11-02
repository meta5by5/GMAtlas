// questRewards.js — what a generated quest/contract pays, and how long its
// progress clock is, per stat ruleset (settings.statRuleset). Read by
// domain/trade.js's rollQuestReward when the Navigator's (or Trade/Party's)
// 🎲 Generate button rolls a new quest without a priced trade route. Values
// sit in each game's own currency and at its usual scale for a starting
// party, so a fresh quest never shows a sci-fi "50" in a fantasy campaign —
// they're starting points a GM can edit on the quest itself, not rulings.
//
// dice: { count, sides } rolled and summed, then × multiplier + bonus.
// segments: the quest's progress clock (threads.js caps clocks at 2-12).
// vow: a Starforged/Ironsworn quest is a sworn vow instead — its reward is
// experience by the vow's rank, and its clock is the 10-box progress track.

export const QUEST_REWARD_RULES = {
  // Five Parsecs From Home: a patron job pays a handful of credits.
  '5pfh': { unit: 'credits', dice: { count: 1, sides: 6 }, multiplier: 1, bonus: 1, segments: 4 },
  // Five Leagues from the Borderlands: jobs pay in gold marks, small sums.
  fiveleagues: { unit: 'gold marks', dice: { count: 1, sides: 6 }, multiplier: 1, bonus: 1, segments: 4 },
  // Traveller: patron missions pay in the thousands of credits.
  traveller: { unit: 'Cr', dice: { count: 2, sides: 6 }, multiplier: 1000, bonus: 0, segments: 6 },
  // D&D 5e: a tier-one quest's purse, in gold pieces.
  dnd5e: { unit: 'gp', dice: { count: 2, sides: 6 }, multiplier: 25, bonus: 0, segments: 4 },
  starforged: { vow: true },
  ironsworn: { vow: true },
};

// Fallback for a ruleset with no entry above — the app's old flat default.
export const DEFAULT_QUEST_REWARD = { unit: '', dice: null, multiplier: 1, bonus: 50, segments: 4 };

// Starforged/Ironsworn vow ranks a generated quest can roll (Epic is left
// out — it's a campaign-long vow, not a job), with the experience each
// grants when fulfilled. Ids match data/rulesets.js's
// STARFORGED_PROGRESS_DIFFICULTIES.
export const VOW_RANKS = [
  { id: 'troublesome', label: 'Troublesome', xp: 1 },
  { id: 'dangerous', label: 'Dangerous', xp: 2 },
  { id: 'formidable', label: 'Formidable', xp: 3 },
  { id: 'extreme', label: 'Extreme', xp: 4 },
];
export const VOW_PROGRESS_BOXES = 10;
