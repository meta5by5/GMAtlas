// factionEventKinds.js — the vocabulary of faction events and change sets
// (design/Faction-baseline.md B4.6, B4.9; FACTION-ROADMAP F2). Data only:
// the domain layer (domain/factionChanges.js) reads these lists and never
// hard-codes a label.

/** SRS 9.1 change types. `inverse` is the type an undo records. */
export const CHANGE_TYPES = [
  { id: 'add', label: 'Add', inverse: 'remove' },
  { id: 'update', label: 'Update', inverse: 'update' },
  { id: 'remove', label: 'Remove', inverse: 'add' },
  { id: 'transfer', label: 'Transfer', inverse: 'transfer' },
  { id: 'create-link', label: 'Create link', inverse: 'close-link' },
  { id: 'close-link', label: 'Close link', inverse: 'create-link' },
  { id: 'adjust-value', label: 'Adjust value', inverse: 'adjust-value' },
  { id: 'append-history', label: 'Append history', inverse: 'append-history' },
  { id: 'create-entity', label: 'Create entity', inverse: 'remove' },
];

/** Impact levels (SRS 9.3). The glyph and word go together, never color alone. */
export const IMPACT_LEVELS = [
  { id: 'low', label: 'Low', glyph: '·' },
  { id: 'moderate', label: 'Moderate', glyph: '◇' },
  { id: 'high', label: 'High', glyph: '◆' },
  { id: 'critical', label: 'Critical', glyph: '⬥' },
];

/** What starts an event (SRS 3.3 Trigger). */
export const TRIGGER_KINDS = [
  { id: 'player-action', label: 'Player action' },
  { id: 'gm', label: 'GM' },
  { id: 'faction-turn', label: 'Faction Turn' },
  { id: 'encounter', label: 'Encounter' },
  { id: 'time', label: 'Time passing' },
  { id: 'follow-on', label: 'Follow-on' },
];

/** How much an event matters. Significant and major events get a journal entry. */
export const EVENT_SIGNIFICANCE = [
  { id: 'minor', label: 'Minor', journal: false },
  { id: 'significant', label: 'Significant', journal: true },
  { id: 'major', label: 'Major', journal: true },
];

/** Hook types (B4.9). */
export const HOOK_TYPES = [
  { id: 'mission', label: 'Mission' },
  { id: 'encounter', label: 'Encounter' },
  { id: 'rumor', label: 'Rumor' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'complication', label: 'Complication' },
  { id: 'open-thread', label: 'Open thread' },
];
export const HOOK_URGENCY = ['low', 'soon', 'urgent'];
export const HOOK_STATUSES = ['open', 'promoted', 'resolved', 'dismissed'];

/** The quick actions on a faction chip (F2): each is a player-action
 *  trigger plus Ledger changes and a memory, recorded through one change
 *  set. `past` reads "The party <past> <faction>". Stance moves −3..+3,
 *  trust −2..+2; `decay` is how fast the feeling fades. */
export const QUICK_ACTIONS = [
  {
    id: 'helped', label: 'Helped', glyph: '🤝', past: 'helped',
    changes: [{ field: 'stance', delta: 1, decay: 'slow' }],
    memory: { kind: 'favor', severity: 1 }, significance: 'minor',
  },
  {
    id: 'hurt', label: 'Hurt', glyph: '✖', past: 'hurt',
    changes: [{ field: 'stance', delta: -1, decay: 'slow' }],
    memory: { kind: 'grievance', severity: 1 }, significance: 'minor',
  },
  {
    id: 'deal', label: 'Struck a deal', glyph: '✍', past: 'struck a deal with',
    changes: [{ field: 'stance', delta: 1, decay: 'slow' }, { field: 'trust', delta: 1, decay: 'slow' }],
    memory: { kind: 'promise', severity: 1 }, significance: 'significant',
  },
  {
    id: 'betrayed', label: 'Betrayed', glyph: '🗡', past: 'betrayed',
    changes: [{ field: 'stance', delta: -2, decay: 'none' }, { field: 'trust', delta: -2, decay: 'none' }],
    memory: { kind: 'betrayal', severity: 3 }, significance: 'major',
  },
  {
    id: 'exposed', label: 'Exposed', glyph: '👁', past: 'exposed',
    changes: [{ field: 'stance', delta: -1, decay: 'slow' }, { field: 'trust', delta: -1, decay: 'fast' }],
    memory: { kind: 'grievance', severity: 2 }, attention: 2, significance: 'significant',
  },
];
