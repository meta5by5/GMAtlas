// copilot.js — the app's "thinking", as a PURE function. No DOM, no store.
//
// advise(campaign) → { observation, consequence, opportunity, suggestedOracle }
// Testable in Node; swappable for an LLM-backed advisor later behind the same
// signature. Phase 0 ships a competent heuristic seeded from the ChatGPT design.

export function advise(doc) {
  const c = (doc && doc.context && doc.context.what) || { threat: 0, mystery: 0 };
  const threat = c.threat || 0;
  const mystery = c.mystery || 0;
  const active = (doc && doc.context && doc.context.active) || 'what';

  // Thread awareness (NEW): a clock nearly full is the most actionable signal.
  const threads = Array.isArray(doc && doc.threads) ? doc.threads.filter((t) => !t.done) : [];
  const hot = threads.slice().sort((a, b) => (b.filled / b.segments) - (a.filled / a.segments))[0];

  let observation;
  if (hot && hot.filled / hot.segments >= 0.75) observation = `“${hot.name}” is ${hot.filled}/${hot.segments} — one more push resolves it. Consider paying it off now.`;
  else if (threat >= 7) observation = 'Threat is high — the situation is exposed, watched, or already tipping over.';
  else if (threat >= 4) observation = 'There is enough pressure that lingering here now has a cost.';
  else if (mystery >= 6) observation = 'Something here reads as wrong in a way that invites investigation.';
  else if (hot) observation = `“${hot.name}” is at ${hot.filled}/${hot.segments}. Look for a scene that advances it.`;
  else observation = 'There is room to observe before danger closes in.';

  const consequence = threat >= 6
    ? 'Opposition arrives or the deadline lands. A hard choice gets forced on the party.'
    : 'The moment cools and a thread quietly advances offscreen.';

  const opportunity = mystery >= 4
    ? 'A nearby detail can become a clue that links this scene to an existing entity or thread.'
    : 'An alternate route or ally could open if the party spends time or leverage.';

  // Suggested oracle adapts to the active question and pressure. Returns a
  // rollable path so the UI can wire a one-click roll.
  const suggestedOraclePath = active === 'who' ? ['Characters', 'Disposition']
    : active === 'where' ? ['Location Themes', 'Sensory Detail']
    : active === 'why' ? ['Plot Engine', 'Plot Target']
    : threat >= 6 ? ['Miscellaneous', 'Story Complication']
    : mystery >= 5 ? ['Miscellaneous', 'Story Clue']
    : ['Plot Engine', 'Scene Driver'];
  const suggestedOracle = suggestedOraclePath.join(' → ');

  // Quick-apply shifts most relevant to the current pressure.
  const quickActions = threat >= 6 ? ['Complicate', 'Advance Time']
    : mystery >= 5 ? ['Reveal Clue', 'Raise Threat']
    : ['Reveal Clue', 'Advance Time'];

  return { observation, consequence, opportunity, suggestedOracle, suggestedOraclePath, quickActions };
}
