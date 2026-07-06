// enhancementTypes.js — the dropdown options for domain/enhancements.js's
// per-item `type` field (docs/adr/next-request.md, 2026-07-06: rename
// "Cybernetics" to the more genre-agnostic "Enhancements" and let each
// installed item say what KIND of augmentation it is). Plain data, same
// spirit as data/tables.js/rulesets.js — a genre pack or future ruleset can
// grow this list without touching domain/UI code.
//
// 'wetware' is Hostile's own native framing (bio-genetic/wetware
// augmentation fits Hostile's body-horror-adjacent tone better than
// hard cybernetics) — original content, not transcribed from any
// sourcebook, same posture as domain/enhancements.js's Strain mechanic
// itself (see that file's header comment).
export const ENHANCEMENT_TYPES = [
  { id: 'cybernetics', label: 'Cybernetics' },
  { id: 'wetware', label: 'Wetware / Bio-Genetics' },
  { id: 'psionics', label: 'Psionics' },
  { id: 'gene-modification', label: 'Gene-Modification' },
];

export function enhancementTypeLabel(id) {
  const t = ENHANCEMENT_TYPES.find((t) => t.id === id);
  return t ? t.label : 'Cybernetics';
}
