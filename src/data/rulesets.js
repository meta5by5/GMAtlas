// rulesets.js — available stat systems derived from the source documents in assets/docs.

// characterTemplate.tracks feed makeStatblock('character', id) in
// domain/statblocks.js as depleting-resource meters (click-to-set boxes,
// roll d6 + value vs 2d10 on double-click). characterTemplate.stats feed the
// same function as rollable attributes (editable number, label-click-to-roll)
// — attributeRollMethod/attributeTarget/attributeFormat pick which dice
// model and display format that ruleset's stats use (see domain/dice.js'
// rollAction/rollFlat/rollTraveller and ROLL_METHODS/FIELD_FORMATS in
// ui/drawers/index.js), so the mechanic stays data, not hardcoded per-system
// UI logic.
export const RULESETS = [
  {
    id: 'starforged',
    label: 'Starforged',
    doc: 'assets/docs/Starforged-reference-guide.pdf',
    characterTemplate: {
      attributeRollMethod: 'action', // d6 + stat vs 2d10
      attributeFormat: 'sign', // "+3"
      stats: [
        { key: 'Edge', value: 1 },
        { key: 'Heart', value: 1 },
        { key: 'Iron', value: 1 },
        { key: 'Shadow', value: 1 },
        { key: 'Wits', value: 1 },
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
      attributeRollMethod: 'flat', // d6 + stat vs target
      attributeTarget: 6,
      attributeFormat: 'sign', // "+3" (Speed uses inches — see statblockTemplates.js Bestiary Speed field)
      stats: [
        { key: 'Reaction', value: 1 },
        { key: 'Speed', value: 1, format: 'inches', rollMethod: 'none' },
        { key: 'Combat', value: 0 },
        { key: 'Savvy', value: 1 },
        { key: 'Tough', value: 3 },
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
