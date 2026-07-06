// mechanicsTerms.js — the curated seed list the Guide's Game Mechanics
// Index (docs/adr/0014-mechanics-index-pdfjs.md) searches for across the
// Reference Library's PDFs. Plain strings, not code — matched case-
// insensitively as whole words against each page's extracted text by
// ui/mechanicsScan.js. Deliberately a starting set (the request's own
// examples: "strain, Supply, Momentum, etc."), not exhaustive — a GM can
// ask for more to be added the same way any other data file grows.
export const MECHANICS_TERMS = [
  'Strain', 'Supply', 'Momentum', 'Stress', 'Heat', 'Vow', 'Bonds',
  'Legacy Track', 'Faction Turn', 'Faction Action', 'Morale', 'Panic',
  'Colony Support', 'Tech Level', 'Jump Drive', 'Trade Classification',
  'Cargo', 'Wetware', 'Psionics', 'Progress Track',
];
