// factionRelations.js — the vocabulary of faction relationships and the
// Ledger (design/Faction-baseline.md B4.4, B4.10, B4.11). Original GMAtlas
// wording. Content, not code: the domain layer stores only ids and numbers.

/** Stance, −3..+3, from one faction toward another (or the party). The
 *  number is always shown beside the label (B4.4). */
export const STANCE_LEVELS = [
  { n: -3, label: 'At war' },
  { n: -2, label: 'Hostile' },
  { n: -1, label: 'Wary' },
  { n: 0, label: 'Neutral' },
  { n: 1, label: 'Cordial' },
  { n: 2, label: 'Friendly' },
  { n: 3, label: 'Allied' },
];
export const STANCE_MIN = -3;
export const STANCE_MAX = 3;

/** Trust, −2..+2, kept apart from stance ("friendly but distrustful"). */
export const TRUST_MIN = -2;
export const TRUST_MAX = 2;

/** Intensity, 1..3: how much the relationship matters to its holder. */
export const INTENSITY_MIN = 1;
export const INTENSITY_MAX = 3;

/** Story importance, 0..3, a GM's own weight for the edge. */
export const STORY_IMPORTANCE_MAX = 3;

/** Ties: structural facts held alongside stance, zero or more per edge.
 *  Each may carry a free-text condition ("ends when the war ends"). */
export const FACTION_TIES = [
  { id: 'rival-claimant', label: 'Rival claimant' },
  { id: 'dependent', label: 'Dependent' },
  { id: 'patron', label: 'Patron' },
  { id: 'client', label: 'Client' },
  { id: 'superior', label: 'Superior' },
  { id: 'subordinate', label: 'Subordinate' },
  { id: 'trade-partner', label: 'Trade partner' },
  { id: 'treaty-bound', label: 'Treaty-bound' },
  { id: 'indebted', label: 'Indebted' },
  { id: 'blackmail', label: 'Blackmail' },
  { id: 'infiltrated', label: 'Infiltrated' },
  { id: 'shared-threat', label: 'Shared threat' },
  { id: 'proxy-conflict', label: 'Proxy conflict' },
];

/** The six visibility states every faction record and edge carries
 *  (B4.10). 'gm' is the default; players see only public and player-known. */
export const VISIBILITY_STATES = [
  { id: 'gm', label: 'GM only' },
  { id: 'faction', label: 'Faction-known' },
  { id: 'public', label: 'Public' },
  { id: 'player', label: 'Player-known' },
  { id: 'secret', label: 'Secret' },
  { id: 'hidden', label: 'Hidden' },
];
export const PLAYER_VISIBLE_STATES = ['public', 'player'];

/** How firmly a territory edge holds (B4.11). */
export const TERRITORY_HOLDS = [
  { id: 'temporary', label: 'Temporary' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'secret', label: 'Secret' },
  { id: 'permanent', label: 'Permanent' },
];

/** The Ledger's fixed vocabularies (B4.4). */
export const LEDGER_FIELDS = ['stance', 'trust'];
export const LEDGER_DECAY = ['none', 'slow', 'fast'];
export const LEDGER_SOURCES = ['event', 'gm', 'hook', 'migrated'];

/** What a pre-F0 `allied_with` / `rival_of` edge is worth when it seeds
 *  the Ledger (B4.12). */
export const MIGRATED_STANCE = { allied_with: 2, rival_of: -2 };
