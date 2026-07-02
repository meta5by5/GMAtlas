// rulesets.js — available stat systems derived from the source documents in assets/docs.

// characterTemplate.stats/tracks feed makeStatblock('character', id) in
// domain/statblocks.js — every field renders as a click-to-set track that
// rolls (d6 + value vs 2d10) on double-click, same engine for every
// ruleset. Stats and tracks are both "track" fields; the split is only
// which section of the character sheet they render in (see 'group' below).
export const RULESETS = [
  {
    id: 'starforged',
    label: 'Starforged',
    doc: 'assets/docs/Starforged-reference-guide.pdf',
    characterTemplate: {
      stats: [
        { key: 'Edge', value: 1, max: 5 },
        { key: 'Heart', value: 1, max: 5 },
        { key: 'Iron', value: 1, max: 5 },
        { key: 'Shadow', value: 1, max: 5 },
        { key: 'Wits', value: 1, max: 5 },
      ],
      tracks: [
        { key: 'Health', value: 5, max: 5 },
        { key: 'Spirit', value: 5, max: 5 },
        { key: 'Supply', value: 5, max: 5 },
        { key: 'Momentum', value: 2, max: 10 },
      ],
    },
  },
  {
    id: '5pfh',
    label: '5PFH',
    doc: 'assets/docs/5PFH-Five-Parsecs-From-Home-v3.pdf',
    characterTemplate: {
      stats: [
        { key: 'Reaction', value: 1, max: 5 },
        { key: 'Speed', value: 1, max: 5 },
        { key: 'Combat', value: 0, max: 5 },
        { key: 'Savvy', value: 1, max: 5 },
        { key: 'Tough', value: 3, max: 5 },
      ],
      tracks: [
        { key: 'Luck', value: 1, max: 3 },
        { key: 'XP', value: 0, max: 10 },
      ],
    },
  },
];

export function findRuleset(id) {
  return RULESETS.find((r) => r.id === id) || RULESETS[0];
}

export function rulesetLabel(id) {
  return findRuleset(id).label;
}
