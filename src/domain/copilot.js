// copilot.js — the app's "thinking", as a PURE function. No DOM, no store.
//
// advise(campaign) → { observation, consequence, opportunity, suggestedOracle }
// Testable in Node; swappable for an LLM-backed advisor later behind the same
// signature. Phase 0 ships a competent heuristic seeded from the ChatGPT design.

import { overlookedThreads } from './threads.js';
import { listFlaggedRelationships } from './entities.js';
import { factionsUnderPressure } from './factions.js';
import { factionsWithGoalNearCompletion } from './factionTurnEngine.js';
import { expeditionsInDanger } from './expeditions.js';

export function advise(doc) {
  const c = (doc && doc.context && doc.context.what) || { threat: 0, mystery: 0, resources: 5, reputation: 5, stress: 5 };
  const threat = c.threat || 0;
  const mystery = c.mystery || 0;
  // Narrative Trackers (pack 18): campaign-level dials, same "GM-set gauge
  // the Co-Pilot reads" pattern as threat/mystery — an old save missing them
  // reads as the neutral midpoint (5), not 0 ("out of everything").
  const resources = c.resources == null ? 5 : c.resources;
  const reputation = c.reputation == null ? 5 : c.reputation;
  // Stress/Tension (Hostile Setting pp.211-219: uncertainty/isolation/timing
  // as the three horror levers) — same neutral-midpoint pattern.
  const stress = c.stress == null ? 5 : c.stress;
  const active = (doc && doc.context && doc.context.active) || 'what';

  // Thread awareness (NEW): a clock nearly full is the most actionable signal.
  // Excludes any thread carrying a `kind` tag (a Trade contract, a faction's
  // pressure track, ...) — those are ordinary Threads repurposed by another
  // subsystem (domain/trade.js, domain/factions.js), each with its own
  // dedicated surfacing below, not a WHY-question thread the GM is tracking
  // directly; without this, a nearly-full contract or faction pressure
  // track would get flagged here using the generic thread-name phrasing
  // instead of its own subsystem's message.
  const threads = Array.isArray(doc && doc.threads) ? doc.threads.filter((t) => !t.done && !t.kind) : [];
  const hot = threads.slice().sort((a, b) => (b.filled / b.segments) - (a.filled / a.segments))[0];

  // Faction Rumor -> Mission seed link (Phase 10): Starforged frames Faction
  // Rumors explicitly as vow/mission seeds (reference guide p.79) — once a
  // faction's own pressure track (domain/factions.js) is nearly full, that's
  // the same "one more push" signal threadUnderPressure() already surfaces
  // for ordinary threads, just pointing at a concrete "generate a mission
  // tied to them now" move instead of "pay off this thread." Observation
  // only, same as every other signal here — never auto-generates anything.
  const hotFaction = factionsUnderPressure(doc)[0];

  // SWN Faction Turn Engine (docs/adr/0031): a faction's current Goal is
  // also a `kind`-tagged Thread (kind:'faction-goal'), so it's excluded
  // from the generic `threads` filter above the same way the Pressure
  // Track already is — this is its own dedicated "about to pay off"
  // signal, mirroring hotFaction's exact shape and priority slot.
  const hotFactionGoal = factionsWithGoalNearCompletion(doc)[0];

  // Expedition trackers (docs/adr/0009-situation-engine-revisited.md,
  // Decision item 1): a GM-set danger threshold (Supplies <=2 or Exposure
  // >=8) on any expedition-tagged Thread, surfaced the same "one signal,
  // one observation" way Stress/Resources thresholds already work below —
  // just scoped per-expedition instead of campaign-wide, since more than
  // one could be running in parallel.
  const hotExpedition = expeditionsInDanger(doc)[0];

  // Faction Events world-scale activity (docs/adr/0032): the most recent
  // COMMITTED event that's both witnessed (the party's own location) and
  // faction-vs-world scoped (Expand Influence's contested roll, Seize
  // Planet) — the same signal that already nudges Threat on commit
  // (factionTurnEngine.js's pushEvent), surfaced here too so the Co-Pilot
  // names it explicitly rather than the GM only seeing a raised number.
  const factionEvents = Array.isArray(doc && doc.factionEvents) ? doc.factionEvents : [];
  const hotWorldEvent = factionEvents.slice().reverse().find((e) => e.witnessed && e.scope === 'faction-vs-world');

  let observation;
  if (hot && hot.filled / hot.segments >= 0.75) observation = `“${hot.name}” is ${hot.filled}/${hot.segments} — one more push resolves it. Consider paying it off now.`;
  else if (hotFaction) observation = `“${hotFaction.faction.name}” is close to acting on its agenda — a mission tied to them would land naturally now.`;
  else if (hotFactionGoal) observation = `“${hotFactionGoal.faction.name}” is close to completing its faction goal — expect them to act on it soon, and to bank XP when it lands.`;
  else if (hotExpedition) observation = `“${hotExpedition.name}” is running low on supplies or dangerously exposed — force a supply-vs-route dilemma next.`;
  else if (hotWorldEvent) observation = `“${hotWorldEvent.factionName}” has moved directly against the party's own location — faction activity here may force a response scene next.`;
  else if (threat >= 7) observation = 'Threat is high — the situation is exposed, watched, or already tipping over.';
  else if (stress >= 7) observation = 'Stress is high — a scene without combat should follow, or someone breaks.';
  else if (resources <= 2) observation = 'Supplies are critically low — the next scene should address resupply, or someone pays for the shortage.';
  else if (threat >= 4) observation = 'There is enough pressure that lingering here now has a cost.';
  else if (mystery >= 6) observation = 'Something here reads as wrong in a way that invites investigation.';
  else if (reputation <= 2) observation = 'Reputation has soured — doors that used to open easily may now be closed.';
  else if (hot) observation = `“${hot.name}” is at ${hot.filled}/${hot.segments}. Look for a scene that advances it.`;
  else observation = 'There is room to observe before danger closes in.';

  const consequence = threat >= 6
    ? 'Opposition arrives or the deadline lands. A hard choice gets forced on the party.'
    : stress >= 6
    ? 'Someone cracks under the pressure — a mistake, a breakdown, or a boundary gets crossed.'
    : resources <= 2
    ? 'A resource shortage bites — someone goes without, or a debt gets called in to cover the gap.'
    : reputation <= 2
    ? 'A contact refuses to help, or word of the party\'s reputation precedes them somewhere unfavorable.'
    : 'The moment cools and a thread quietly advances offscreen.';

  const opportunity = mystery >= 4
    ? 'A nearby detail can become a clue that links this scene to an existing entity or thread.'
    : reputation >= 8
    ? 'Good standing opens a favor, a discount, or a trusted introduction.'
    : resources >= 8
    ? 'Surplus supply opens room to be generous, or to take a risk that would otherwise cost too much.'
    : stress <= 2
    ? 'The calm holds — a quiet scene here costs nothing and can set up the next scare.'
    : 'An alternate route or ally could open if the party spends time or leverage.';

  // Suggested oracle adapts to the active question and pressure. Returns a
  // rollable path so the UI can wire a one-click roll.
  const suggestedOraclePath = active === 'who' ? ['Characters', 'Disposition']
    : active === 'where' ? ['Location Themes', 'Sensory Detail']
    : active === 'why' ? ['Plot Engine', 'Plot Target']
    : threat >= 6 ? ['Miscellaneous', 'Story Complication']
    : stress >= 6 ? ['Horror Escalation', 'Escalation Beat']
    : resources <= 2 ? ['Trade & Cargo', 'Cargo Problem']
    : mystery >= 5 ? ['Miscellaneous', 'Story Clue']
    : ['Plot Engine', 'Scene Driver'];
  const suggestedOracle = suggestedOraclePath.join(' → ');

  // Quick-apply shifts most relevant to the current pressure.
  const quickActions = threat >= 6 ? ['Complicate', 'Advance Time']
    : stress >= 6 ? ['Ease Stress', 'Advance Time']
    : mystery >= 5 ? ['Reveal Clue', 'Raise Threat']
    : ['Reveal Clue', 'Advance Time'];

  // "What did I overlook?" (pack 13/76) — threads gone quiet (Dormant, or
  // untouched since creation), surfaced as an observation only. Never
  // auto-advanced or auto-archived here; the GM decides what to do with them.
  const overlooked = overlookedThreads(doc).map((t) => t.name);

  // "Flag, don't delete" invalid relationships (pack 9): a typed
  // relationship (Member Of, Owns, ...) whose target entity's type no
  // longer matches what that type implies — surfaced for review, same
  // observation-only posture as `overlooked` above. Never auto-corrected.
  const flaggedRelationships = listFlaggedRelationships(doc).map((r) => `${r.entityName} —${r.type}→ ${r.toName}`);

  return { observation, consequence, opportunity, suggestedOracle, suggestedOraclePath, quickActions, overlooked, flaggedRelationships };
}
