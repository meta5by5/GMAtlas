// factionVerbs.js — the one set of verbs every faction, Conflict and
// Overview control uses (design/FACTION-ROADMAP.md U10, SRS 4.7). The same
// word always means the same thing.
export const FACTION_VERBS = [
  { id: 'advance', label: 'Advance', meaning: 'Move a plan or Conflict one step forward.' },
  { id: 'observe', label: 'Observe', meaning: 'Look closer without changing anything.' },
  { id: 'resolve', label: 'Resolve', meaning: 'Settle an outcome and record it.' },
  { id: 'review', label: 'Review', meaning: 'Look over proposed changes before they apply.' },
  { id: 'intervene', label: 'Intervene', meaning: 'Step in as GM and change what happens.' },
  { id: 'negotiate', label: 'Negotiate', meaning: 'Seek terms between the sides.' },
  { id: 'escalate', label: 'Escalate', meaning: 'Raise the stakes one stage.' },
  { id: 'reveal', label: 'Reveal', meaning: 'Make something hidden known to the players.' },
  { id: 'defer', label: 'Defer', meaning: 'Set it aside until later.' },
];
