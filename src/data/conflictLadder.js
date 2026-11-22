// conflictLadder.js — the vocabulary of the Conflict entity (type
// 'faction-conflict', design/Faction-baseline.md B4.8): a struggle between
// factions over something they both want. Original GMAtlas wording; the
// seven-stage shape follows the Living Faction Engine SRS 8.2. Content, not
// code: the domain layer only stores ids and stage numbers.

/** The escalation ladder, 1–7. `meaning` is the one-line help shown on
 *  the stage control. */
export const CONFLICT_STAGES = [
  { n: 1, label: 'Tension', meaning: 'Their interests pull apart, and each side has noticed the other.' },
  { n: 2, label: 'Interference', meaning: 'One side tests or obstructs the other, deniably.' },
  { n: 3, label: 'Confrontation', meaning: 'The contest is out in the open and the stakes are rising.' },
  { n: 4, label: 'Escalation', meaning: 'A serious loss or a hard response shifts the balance.' },
  { n: 5, label: 'Crisis', meaning: 'Costs are severe, time is short, and the choices narrow.' },
  { n: 6, label: 'Climax', meaning: 'A decisive clash, or a settlement, is at hand.' },
  { n: 7, label: 'New status quo', meaning: 'The aftermath: the world has changed, and someone remembers.' },
];
export const CONFLICT_MAX_STAGE = CONFLICT_STAGES.length;

/** How the Conflict stands right now, apart from its stage. */
export const CONFLICT_STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'resolved', label: 'Resolved' },
];

/** What the sides are fighting over. */
export const CONFLICT_STAKES = [
  { id: 'territory', label: 'Territory' },
  { id: 'resources', label: 'Resources' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'ideology', label: 'Ideology' },
  { id: 'survival', label: 'Survival' },
  { id: 'reputation', label: 'Reputation' },
  { id: 'access', label: 'Access' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'control', label: 'Control' },
];

/** How a Conflict ended (or could end). */
export const CONFLICT_RESOLUTION_PATHS = [
  { id: 'negotiation', label: 'Negotiated settlement' },
  { id: 'concession', label: 'Concession' },
  { id: 'arbitration', label: 'Arbitration' },
  { id: 'exposure', label: 'Exposure' },
  { id: 'covert', label: 'Covert action' },
  { id: 'victory', label: 'Victory' },
  { id: 'defeat', label: 'Defeat' },
  { id: 'withdrawal', label: 'Withdrawal' },
  { id: 'stalemate', label: 'Stalemate' },
  { id: 'fragmentation', label: 'Fragmentation' },
];

/** A side's part in the Conflict. */
export const CONFLICT_SIDE_ROLES = [
  { id: 'primary', label: 'Primary' },
  { id: 'ally', label: 'Ally' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'internal', label: 'Internal faction' },
];

/** The pressure gauges, each 0–3 (none, low, high, severe). */
export const CONFLICT_PRESSURES = [
  { key: 'pressureUrgency', label: 'Urgency' },
  { key: 'pressureExposure', label: 'Public exposure' },
  { key: 'pressureDrain', label: 'Resource drain' },
  { key: 'pressureCivilian', label: 'Civilian impact' },
];
export const CONFLICT_PRESSURE_MAX = 3;
