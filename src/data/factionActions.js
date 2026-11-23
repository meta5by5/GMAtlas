// factionActions.js — the vocabulary of the Faction Turn (design/Faction-
// baseline.md B4.5, B4.6; FACTION-ROADMAP F3). Data only: the 27 action
// families the SRS names (7.3), the seven outcome bands (7.4), relevance
// weights per Mode, run budgets, and the GMAtlas resolution curve. Every
// sentence here is original GMAtlas wording. domain/factionTurn.js reads
// these lists and never hard-codes a label, weight or threshold.

/** Mode, Pressure and Resolution style (B4.1). */
export const FACTION_MODES = [
  { id: 'passive', label: 'Passive', help: 'Only factions a trigger fired for act, and only to suggest. Nothing moves on its own.' },
  { id: 'standard', label: 'Standard', help: 'Relevant factions act each turn and routine activity resolves itself.' },
  { id: 'advanced', label: 'Advanced', help: 'More factions act, with no cap on loud moves. Assets and territory arrive in a later phase.' },
];
export const FACTION_PRESSURES = [
  { id: 'calm', label: 'Calm', help: 'Fewer loud moves; factions prefer quiet methods.' },
  { id: 'steady', label: 'Steady', help: 'The default balance of quiet and loud moves.' },
  { id: 'dire', label: 'Dire', help: 'More loud moves; factions are quicker to strike and retaliate.' },
];
export const RESOLUTION_STYLES = [
  { id: 'gmatlas', label: 'GMAtlas', help: 'Capability against opposition, adjusted, then 2d6 on a seven-band curve.' },
  { id: 'ruleset', label: 'Campaign ruleset', help: 'The campaign’s own faction rules decide the band. Until those are wrapped (a later phase), GMAtlas style stands in.' },
  { id: 'oracle', label: 'Oracle', help: 'A yes/no oracle roll with a likelihood set by the same factors.' },
  { id: 'gm', label: 'GM decides', help: 'You pick each action’s band in the preview.' },
];
export const FACTION_TURN_TRIGGERS = [
  { id: 'auto', label: 'Automatic', help: 'The campaign turn’s Faction Events step where a workflow has one, otherwise every N Encounters.' },
  { id: 'encounters', label: 'Every N Encounters', help: 'Offer a Faction Turn after every N Encounters.' },
  { id: 'button', label: 'Button only', help: 'Faction Turns run only when you press the button.' },
];

/** The seven outcome bands, best first (SRS 7.4). `progress` is how far an
 *  advancing action moves its project; `effect` scales its effect on the
 *  target; `exposure` and `stability` change the actor's state bands (only
 *  bands already set); `backfire` turns the target against the actor even
 *  when the action wasn't hostile. */
export const OUTCOME_BANDS = [
  { id: 'decisive', label: 'Decisive success', glyph: '★', progress: 2, effect: 1.5, exposure: 0, stability: 0, backfire: false, cost: '' },
  { id: 'cost', label: 'Success with cost', glyph: '✓', progress: 1, effect: 1, exposure: 1, stability: 0, backfire: false, cost: 'It works, but it is noticed and it costs.' },
  { id: 'partial', label: 'Partial success', glyph: '◐', progress: 1, effect: 0.5, exposure: 0, stability: 0, backfire: false, cost: 'Half of what was hoped for.' },
  { id: 'stalemate', label: 'Stalemate', glyph: '＝', progress: 0, effect: 0, exposure: 0, stability: 0, backfire: false, cost: 'Nothing moves either way.' },
  { id: 'setback', label: 'Setback', glyph: '↘', progress: 0, effect: 0, exposure: 1, stability: 0, backfire: false, cost: 'The attempt stalls and leaves traces.' },
  { id: 'failure', label: 'Failure', glyph: '✗', progress: 0, effect: 0, exposure: 1, stability: -1, backfire: true, cost: 'It fails, and the target knows who tried.' },
  { id: 'catastrophic', label: 'Catastrophic reversal', glyph: '⚠', progress: -1, effect: 0, exposure: 2, stability: -1, backfire: true, cost: 'It goes badly wrong and costs ground already won.' },
];
export const SUCCESS_BANDS = ['decisive', 'cost', 'partial'];

/** The GMAtlas resolution curve: 2d6 + modifier (clamped −3..+3), its own
 *  table, not a published one. A total of `min` or more lands in the band. */
export const GMATLAS_CURVE = [
  { min: 12, band: 'decisive' },
  { min: 10, band: 'cost' },
  { min: 8, band: 'partial' },
  { min: 7, band: 'stalemate' },
  { min: 5, band: 'setback' },
  { min: 3, band: 'failure' },
  { min: -Infinity, band: 'catastrophic' },
];
export const RESOLUTION_MOD_MIN = -3;
export const RESOLUTION_MOD_MAX = 3;
/** The band a capability is treated as when it has no rating (SRS 14.3). */
export const UNRATED_BAND = 2;

/** The 27 action families (SRS 7.3).
 *  - cap: the capability that drives it; defend: what the target resists with.
 *  - target: 'self' | 'faction' (any other faction) | 'rival' (one it is
 *    hostile to) | 'friend' (one it is friendly to) | 'party' | 'location'.
 *  - loud: visible and counted against the loud-move budget.
 *  - risk 0–3; fit: weights on the behavior axes (−2..+2 each), so a
 *    cautious, peaceable faction scores open violence low (SRS 7.3).
 *  - advances: success moves the faction's project.
 *  - stance: how the target's stance toward the actor shifts on success.
 *  - methods: the faction `methods` that point to it; stakes: the
 *    objective stakes it suits.
 *  - when: a special condition ('weak' = own stability 1, 'wronged' = a
 *    recent grievance or betrayal, 'ally-weak' = a friend at stability 1,
 *    'rival-weak', 'kin' = a faction it is allied to (merge), 'endgame').
 *  - impact: a floor on the impact level. */
export const ACTION_FAMILIES = [
  { id: 'observe', label: 'Observe', verb: 'watches', cap: 'cunning', defend: 'cunning', target: 'faction', loud: false, risk: 0, fit: { patience: 1, secrecy: 1 }, advances: false, stance: 0, methods: ['espionage'], stakes: ['knowledge'], intent: 'learn what {target} is planning', failure: 'its watchers are spotted' },
  { id: 'investigate', label: 'Investigate', verb: 'investigates', cap: 'cunning', defend: 'cunning', target: 'faction', loud: false, risk: 1, fit: { patience: 1, pragmatism: 1 }, advances: true, stance: 0, methods: ['espionage', 'research', 'ritual'], stakes: ['knowledge'], intent: 'dig into what {target} is hiding', failure: 'the trail goes cold and someone notices the digging' },
  { id: 'recruit', label: 'Recruit', verb: 'recruits', cap: 'influence', defend: 'influence', target: 'self', loud: false, risk: 0, fit: { compromise: 1, patience: 1 }, advances: true, stance: 0, methods: ['recruitment', 'propaganda'], stakes: ['ideology', 'survival'], intent: 'swell its ranks', failure: 'the new recruits are unreliable' },
  { id: 'negotiate', label: 'Negotiate', verb: 'negotiates with', cap: 'diplomacy', defend: 'diplomacy', target: 'faction', loud: false, risk: 0, fit: { compromise: 2, aggression: -1 }, advances: true, stance: 1, methods: ['diplomacy'], stakes: ['access', 'leadership'], intent: 'reach terms with {target}', failure: 'talks collapse in mutual suspicion' },
  { id: 'trade', label: 'Trade', verb: 'trades with', cap: 'wealth', defend: 'wealth', target: 'faction', loud: false, risk: 0, fit: { pragmatism: 1, compromise: 1, aggression: -1 }, advances: true, stance: 1, methods: ['trade', 'smuggling'], stakes: ['resources'], intent: 'profit from dealings with {target}', failure: 'the deal sours and goods go missing' },
  { id: 'invest', label: 'Invest', verb: 'invests in', cap: 'wealth', defend: 'wealth', target: 'self', loud: false, risk: 1, fit: { patience: 2, risk: 1 }, advances: true, stance: 0, methods: ['trade', 'construction'], stakes: ['resources', 'control'], intent: 'put money to work for its plan', failure: 'the investment is lost' },
  { id: 'build', label: 'Build', verb: 'builds up', cap: 'logistics', defend: 'logistics', target: 'self', loud: false, risk: 0, fit: { patience: 2, aggression: -1 }, advances: true, stance: 0, methods: ['construction', 'research', 'ritual'], stakes: ['survival', 'territory'], intent: 'build what its plan needs', failure: 'work stalls for want of hands and materials' },
  { id: 'expand', label: 'Expand', verb: 'expands toward', cap: 'logistics', defend: 'resilience', target: 'location', loud: true, risk: 2, fit: { risk: 1, aggression: 1, patience: -1 }, advances: true, stance: -1, methods: ['construction', 'force'], stakes: ['territory', 'access'], intent: 'push its presence into {target}', failure: 'it overreaches and has to pull back' },
  { id: 'protect', label: 'Protect', verb: 'protects', cap: 'force', defend: 'force', target: 'friend', loud: false, risk: 1, fit: { compromise: 1, aggression: -1, risk: -1 }, advances: false, stance: 1, methods: ['charity', 'force'], stakes: ['survival'], intent: 'shield {target} from harm', failure: 'the protection arrives too late' },
  { id: 'infiltrate', label: 'Infiltrate', verb: 'infiltrates', cap: 'cunning', defend: 'cunning', target: 'rival', loud: false, risk: 2, fit: { secrecy: 2, patience: 1 }, advances: true, stance: 0, methods: ['infiltration', 'espionage'], stakes: ['knowledge', 'control'], intent: 'place its people inside {target}', failure: 'an agent is caught and questioned' },
  { id: 'influence', label: 'Influence', verb: 'sways opinion against', cap: 'influence', defend: 'influence', target: 'faction', loud: false, risk: 1, fit: { pragmatism: 1, secrecy: -1 }, advances: true, stance: -1, methods: ['propaganda', 'legal', 'bribery'], stakes: ['reputation', 'leadership', 'ideology'], intent: 'turn officials and public opinion its way', failure: 'the campaign is traced back to it' },
  { id: 'threaten', label: 'Threaten', verb: 'threatens', cap: 'force', defend: 'resilience', target: 'rival', loud: true, risk: 2, fit: { aggression: 2, compromise: -1 }, advances: false, stance: -1, methods: ['intimidation', 'blackmail'], stakes: ['control'], intent: 'make {target} back down', failure: 'the threat is called and it looks weak' },
  { id: 'sabotage', label: 'Sabotage', verb: 'sabotages', cap: 'cunning', defend: 'resilience', target: 'rival', loud: false, risk: 2, fit: { secrecy: 2, aggression: 1 }, advances: true, stance: -1, methods: ['sabotage'], stakes: ['resources', 'control'], intent: 'quietly wreck what {target} relies on', failure: 'a saboteur is taken alive' },
  { id: 'steal', label: 'Steal', verb: 'steals from', cap: 'cunning', defend: 'cunning', target: 'rival', loud: false, risk: 2, fit: { pragmatism: 2, risk: 1 }, advances: true, stance: -1, methods: ['raid', 'smuggling'], stakes: ['resources', 'knowledge'], intent: 'take what {target} guards', failure: 'the thieves are recognized' },
  { id: 'expose', label: 'Expose', verb: 'exposes', cap: 'influence', defend: 'influence', target: 'rival', loud: true, risk: 1, fit: { secrecy: -1, aggression: 1 }, advances: false, stance: -2, methods: ['propaganda', 'blackmail'], stakes: ['reputation'], intent: 'drag {target}’s secrets into the open', failure: 'the evidence is dismissed as a smear' },
  { id: 'blockade', label: 'Blockade', verb: 'blockades', cap: 'logistics', defend: 'logistics', target: 'rival', loud: true, risk: 2, fit: { patience: 1, aggression: 1 }, advances: true, stance: -2, methods: ['legal', 'force'], stakes: ['access', 'resources'], intent: 'cut {target} off from what it needs', failure: 'the blockade leaks and hurts its own people' },
  { id: 'attack', label: 'Attack', verb: 'attacks', cap: 'force', defend: 'force', target: 'rival', loud: true, risk: 3, fit: { aggression: 2, risk: 2, compromise: -1 }, advances: true, stance: -2, methods: ['force', 'raid'], stakes: ['territory', 'control'], intent: 'strike {target} openly', failure: 'the attack is repulsed with losses', impact: 'high' },
  { id: 'defend', label: 'Defend', verb: 'fortifies against', cap: 'resilience', defend: 'force', target: 'rival', loud: false, risk: 0, fit: { risk: -2, patience: 1 }, advances: false, stance: 0, methods: ['force', 'construction'], stakes: ['survival'], intent: 'brace for what {target} might do', failure: 'the defenses have a gap' },
  { id: 'retreat', label: 'Retreat', verb: 'withdraws from', cap: 'logistics', defend: 'force', target: 'rival', loud: false, risk: 0, fit: { risk: -2, pragmatism: 1 }, advances: false, stance: 0, methods: [], stakes: [], when: 'weak', intent: 'pull back from {target} before it loses more', failure: 'the withdrawal turns into a rout', impact: 'moderate' },
  { id: 'consolidate', label: 'Consolidate', verb: 'consolidates', cap: 'resilience', defend: 'resilience', target: 'self', loud: false, risk: 0, fit: { patience: 1, risk: -1 }, advances: false, stance: 0, methods: ['construction', 'charity'], stakes: ['survival'], intent: 'shore up what it already holds', failure: 'old quarrels inside it flare up' },
  { id: 'deceive', label: 'Deceive', verb: 'deceives', cap: 'cunning', defend: 'cunning', target: 'faction', loud: false, risk: 1, fit: { secrecy: 2, pragmatism: 1, compromise: -1 }, advances: true, stance: 0, methods: ['espionage', 'blackmail', 'bribery'], stakes: ['knowledge', 'reputation'], intent: 'lead {target} to believe something false', failure: 'the lie unravels' },
  { id: 'rescue', label: 'Rescue', verb: 'comes to the aid of', cap: 'force', defend: 'force', target: 'friend', loud: true, risk: 2, fit: { compromise: 1, risk: 1 }, advances: false, stance: 2, methods: ['charity'], stakes: ['survival'], when: 'ally-weak', intent: 'save {target} from collapse', failure: 'it is dragged into its friend’s troubles', impact: 'moderate' },
  { id: 'retaliate', label: 'Retaliate', verb: 'retaliates against', cap: 'force', defend: 'resilience', target: 'wronged', loud: true, risk: 2, fit: { aggression: 1, compromise: -2 }, advances: false, stance: -1, methods: ['intimidation', 'force', 'sabotage'], stakes: [], when: 'wronged', intent: 'answer a wrong done to it by {target}', failure: 'the reprisal misfires', impact: 'moderate' },
  { id: 'reconcile', label: 'Reconcile', verb: 'seeks peace with', cap: 'diplomacy', defend: 'diplomacy', target: 'rival', loud: false, risk: 1, fit: { compromise: 2, aggression: -2 }, advances: false, stance: 1, methods: ['diplomacy', 'charity'], stakes: [], intent: 'mend things with {target}', failure: 'the olive branch is refused publicly' },
  { id: 'abandon', label: 'Abandon', verb: 'abandons', cap: 'resilience', defend: 'resilience', target: 'self', loud: true, risk: 1, fit: { pragmatism: 2, risk: -1 }, advances: false, stance: 0, methods: [], stakes: [], when: 'endgame', intent: 'give up its current plan to survive', failure: 'it cannot let go in time', impact: 'critical' },
  { id: 'split', label: 'Split', verb: 'splinters', cap: 'resilience', defend: 'resilience', target: 'self', loud: true, risk: 2, fit: { compromise: -2 }, advances: false, stance: 0, methods: [], stakes: [], when: 'endgame', intent: 'break apart as a hardline wing walks out', failure: 'the schism is papered over for now', impact: 'critical' },
  { id: 'merge', label: 'Merge', verb: 'moves to merge with', cap: 'diplomacy', defend: 'diplomacy', target: 'kin', loud: true, risk: 1, fit: { compromise: 2, pragmatism: 1 }, advances: false, stance: 1, methods: [], stakes: [], when: 'kin', intent: 'fold itself into {target}', failure: 'pride on both sides wrecks the talks', impact: 'critical' },
];

/** Fallback families when a faction has no methods (SRS 14.3). */
export const DEFAULT_FAMILIES = ['observe', 'consolidate', 'influence', 'build'];

/** Relevance weights per Mode (B4.5 EVALUATE). Relevance = trigger +
 *  interest + objective + proximity + capability + urgency + history +
 *  stage − constraints − cooldown. `threshold` is the score a faction needs
 *  to act; Passive acts only on triggers. */
export const RELEVANCE_WEIGHTS = {
  passive: { trigger: 4, interest: 1, objective: 1, proximity: 0.5, capability: 0.5, urgency: 1, history: 0.5, stage: 2, cooldown: 1, threshold: 4, triggerOnly: true },
  standard: { trigger: 3, interest: 1.5, objective: 1, proximity: 1, capability: 0.5, urgency: 1.5, history: 0.5, stage: 2, cooldown: 1, threshold: 2.5, triggerOnly: false },
  advanced: { trigger: 3, interest: 1.5, objective: 1, proximity: 1, capability: 0.75, urgency: 1.5, history: 0.75, stage: 2, cooldown: 0.5, threshold: 2, triggerOnly: false },
};

/** Candidate scoring (B4.5 DECIDE). */
export const DECISION_WEIGHTS = {
  behavior: 0.6,       // per point of behavior × fit
  method: 2,           // the family is one of the faction's methods
  stake: 1.5,          // suits the active objective's stake
  advances: 1,         // moves a project the faction has
  riskTolerance: 0.8,  // per point of risk above the faction's tolerance
  variety: 2.5,        // used by this faction in the last two turns
  fingerprint: 3,      // the same family against the same target last turn
  jitter: 0.4,         // seeded tie-breaker, never more than this
  wronged: 2,          // a fresh grievance or betrayal (retaliate)
};
export const PRESSURE_LOUD_BIAS = { calm: -1.5, steady: 0, dire: 1 };

/** Run budgets per Mode (B4.5). Loud moves per Pressure in Standard. */
export const RUN_BUDGETS = {
  passive: { factions: 3, events: 3, loud: { calm: 1, steady: 1, dire: 2 } },
  standard: { factions: 5, events: 12, loud: { calm: 2, steady: 3, dire: 4 } },
  advanced: { factions: 8, events: 20, loud: { calm: Infinity, steady: Infinity, dire: Infinity } },
};
/** How many candidate actions a faction considers (SRS 7.3: a small set). */
export const CANDIDATES_MIN = 3;
export const CANDIDATES_MAX = 5;
/** Follow-on reactions propagate this deep, queued for the next run. */
export const PROPAGATION_DEPTH = 2;
/** Runs kept in the campaign; older ones are trimmed. */
export const RUNS_KEPT = 12;

/** Campaign-turn workflow steps where the world's other powers move, so the
 *  Navigator's workflow card offers ▶ Run Faction Turn inline (B4.7). Step
 *  ids from the turn-step lists; a list that later gains its own Faction
 *  Events step adds its id here. */
export const FACTION_TURN_STEPS = [
  'fl10', // Five Leagues: Enemy Threat
  'fl20', // Five Leagues: Enemy Plans
  'pf4',  // Planetfall: Enemy Activity
  'ms3',  // Five Parsecs: Faction Involvement
];

/** The three involvement levels (SRS 5.2), by impact. */
export const INVOLVEMENT = [
  { id: 'background', label: 'Background', impacts: ['low'] },
  { id: 'brief', label: 'Brief', impacts: ['moderate'] },
  { id: 'decision', label: 'Decision', impacts: ['high', 'critical'] },
];
