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
// itself (see that file's header comment). 'bio-genetics' split out from
// the former combined "Wetware / Bio-Genetics" label into its own type on
// direct request; 'gene-modification' keeps its stored id (existing
// installed enhancements of this type must keep resolving correctly) but
// now displays as "Mutation" — a label-only rename, not a re-ID.
export const ENHANCEMENT_TYPES = [
  { id: 'cybernetics', label: 'Cybernetics' },
  { id: 'wetware', label: 'Wetware' },
  { id: 'bio-genetics', label: 'Bio-Genetics' },
  { id: 'psionics', label: 'Psionics' },
  { id: 'gene-modification', label: 'Mutation' },
];

export function enhancementTypeLabel(id) {
  const t = ENHANCEMENT_TYPES.find((t) => t.id === id);
  return t ? t.label : 'Cybernetics';
}
