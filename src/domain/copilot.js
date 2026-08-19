// copilot.js — the app's "thinking", as a PURE function. No DOM, no store.
//
// advise(campaign) → { observation, consequence, opportunity, suggestedOracle }
// Testable in Node; swappable for an LLM-backed advisor later behind the same
// signature. Phase 0 ships a competent heuristic seeded from the ChatGPT design.

import { overlookedThreads, listThreads } from './threads.js';
import { listFlaggedRelationships, listEntities, getEntity } from './entities.js';
import { factionsUnderPressure } from './factions.js';
import { factionsWithGoalNearCompletion, isFactionRoundDue, getCurrentWhereLocations, factionsPresentAt } from './factionTurnEngine.js';
import { expeditionsInDanger } from './expeditions.js';
import { openForeshadowing } from './foreshadowing.js';

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

  // Faction Turn pacing (Living Faction Engine Phase B): a scene-count
  // nudge, not an urgent signal — ranked below every other Faction Events
  // signal above (a hot faction/goal/world-event is more actionable right
  // now than "it's just been a while"), but still ahead of the generic
  // threat/stress/mystery fallbacks, since "go run a faction round" is a
  // concrete move a GM can act on immediately.
  const factionRoundDue = isFactionRoundDue(doc);

  // Living Faction Engine Phase C: whichever faction signal above is
  // actually driving the observation (same priority order), named
  // explicitly so the UI can offer a one-click "Generate mission from
  // them" — turning the observation from narration into something the
  // GM can actually hand the party, rather than a passive nudge.
  const hotFactionId = hotFaction ? hotFaction.faction.id
    : hotFactionGoal ? hotFactionGoal.faction.id
    : hotWorldEvent ? hotWorldEvent.factionId
    : null;
  const hotFactionName = hotFaction ? hotFaction.faction.name
    : hotFactionGoal ? hotFactionGoal.faction.name
    : hotWorldEvent ? hotWorldEvent.factionName
    : null;

  let observation;
  if (hot && hot.filled / hot.segments >= 0.75) observation = `“${hot.name}” is ${hot.filled}/${hot.segments} — one more push resolves it. Consider paying it off now.`;
  else if (hotFaction) observation = `“${hotFaction.faction.name}” is close to acting on its agenda — a mission tied to them would land naturally now.`;
  else if (hotFactionGoal) observation = `“${hotFactionGoal.faction.name}” is close to completing its faction goal — expect them to act on it soon, and to bank XP when it lands.`;
  else if (hotExpedition) observation = `“${hotExpedition.name}” is running low on supplies or dangerously exposed — force a supply-vs-route dilemma next.`;
  else if (hotWorldEvent) observation = `“${hotWorldEvent.factionName}” has moved directly against the party's own location — faction activity here may force a response scene next.`;
  else if (factionRoundDue) observation = 'It\'s been a few scenes since factions last acted — consider Step or Full Round in Faction Events.';
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

  // Suggested oracle adapts to current pressure. Returns a rollable path so
  // the UI can wire a one-click roll. (Phase 12f: dropped the former
  // active==='who'/'where'/'why' branches — there's no longer a single
  // "currently active W" concept once the 5 tabs were retired in favor of
  // the Dashboard's independent collapsible sections; this dial-based
  // chain was already the general-purpose fallback and now applies always.)
  const suggestedOraclePath = threat >= 6 ? ['Miscellaneous', 'Story Complication']
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

  return { observation, consequence, opportunity, suggestedOracle, suggestedOraclePath, quickActions, overlooked, flaggedRelationships, hotFactionId, hotFactionName };
}

// --- Story Options (docs/adr/0039): a WHO×WHERE×WHY-aware suggestion layer,
// distinct from advise() above. advise() is a single first-match-wins
// priority chain over WHAT's own dials/threads — it never reads entity
// data, Foreshadowing, or World Flags, and never combines signals.
// buildStoryOptions below is genuinely CUMULATIVE: every signal currently
// in play contributes its own option to the same ranked list, all in one
// call, reusing existing per-tab queries rather than re-deriving them
// (WHO/WHERE's own @mention-parsing and presence machinery, this session's
// Location Story work's Conflicts-here query, Foreshadowing/Threads as
// already exposed on WHY). Read-only — nothing here writes to the
// campaign; rolling an option's linked oracle table or turning one into a
// Journal note both go through the existing generic mechanisms
// (session.js's rollOracle/addNote), triggered from the UI, never here. ---

/** One pure snapshot of "what's actually in the scene right now," reusing
 *  the exact same queries WHO/WHERE/WHY's own workspace blocks already use
 *  (`getCurrentWhereLocations`, `factionsPresentAt`, the generic Threads/
 *  Foreshadowing lists) rather than re-deriving any of them — WHO's own
 *  in-scene NPCs/Factions are read the same way WHERE's current
 *  location(s) already are: @mentions parsed out of the Focus field, not
 *  the largely-vestigial `context.who.entityIds` (see ADR 0039 for why —
 *  the WHO/WHERE redesign earlier this session already established
 *  mention-parsing as the one source of truth for "who/where is in the
 *  scene," this just extends the same convention to WHY). */
export function gatherSceneContext(campaign) {
  const whoText = (campaign.context && campaign.context.who && campaign.context.who.summary) || '';
  const whereCtx = (campaign.context && campaign.context.where) || {};
  const siteDescription = String(whereCtx.siteDescription || '').trim();
  const surroundings = String(whereCtx.surroundings || '').trim();
  // WHO's Actors (docs/adr/0041 WHO redesign) — Protagonists/Antagonists/
  // Bystanders are GM-curated id lists on the current scene (scenes.js),
  // not parsed from free text (WHO's old Focus mention-editor is gone).
  const scenes = campaign.scenes || [];
  const currentScene = scenes[scenes.length - 1];
  const actorIds = currentScene
    ? [...(currentScene.protagonistIds || []), ...(currentScene.antagonistIds || []), ...(currentScene.bystanderIds || [])]
    : [];
  const whoEntities = actorIds.map((id) => getEntity(campaign, id)).filter(Boolean);
  const whereLocations = getCurrentWhereLocations(campaign);
  const factionsHere = new Map();
  for (const loc of whereLocations) for (const f of factionsPresentAt(campaign, loc.id)) factionsHere.set(f.id, f);
  const whereIds = new Set(whereLocations.map((l) => l.id));
  const conflictsHere = listEntities(campaign, ['conflict']).filter((c) => whereIds.has(c.locationId));
  const openThreads = listThreads(campaign).filter((t) => !t.done && !t.kind);
  const foreshadowing = openForeshadowing(campaign);
  const worldFlags = (campaign.worldFlags || []).filter((f) => f.value !== 'confirmed' && f.value !== 'false');
  const activity = (campaign.context && campaign.context.how && campaign.context.how.activity) || '';
  const what = (campaign.context && campaign.context.what) || {};
  return {
    whoEntities, whereLocations, conflictsHere, openThreads, foreshadowing, worldFlags, activity,
    // WHO's own context.who.summary field still exists (schema/migration-
    // safe) but has no editor in the UI anymore (docs/adr/0041 WHO
    // redesign) — kept here for any old campaign that still has text in
    // it, but empty on any campaign using the new Actor-list UI, so it
    // contributes nothing to composeNarrativeDraft in practice going
    // forward.
    whoSummary: whoText.trim(),
    // Site Description/Immediate Surroundings (direct follow-up request:
    // "This would replace FOCUS and be used in its place when building
    // the Scene Summary") — WHERE's own former Focus field
    // (context.where.summary) has had no reachable editor since the
    // WHO/WHERE redesign; these two first-class fields take over its role
    // in composeNarrativeDraft below instead of reviving it.
    whereDetail: [siteDescription, surroundings].filter(Boolean).join(' — '),
    factionsHere: Array.from(factionsHere.values()),
    threat: what.threat || 0,
    mystery: what.mystery || 0,
    resources: what.resources == null ? 5 : what.resources,
    reputation: what.reputation == null ? 5 : what.reputation,
    stress: what.stress == null ? 5 : what.stress,
  };
}

/** Turns gatherSceneContext's snapshot into a ranked list of concrete
 *  story options — `{id, label, detail, source, entityId?, oracleGroup,
 *  oracleTable}`. Every signal that's currently ACTUALLY present
 *  contributes its own entry (this is the "cumulative" part: a scene with
 *  an agenda-bearing faction present, an open Conflict here, AND an unpaid
 *  Foreshadowing plant gets three distinct options in one call, not just
 *  the single highest-priority one advise() would pick). Each option
 *  names an Oracle table already used elsewhere in this app (Suggestion
 *  Lenses/Faction Conflict/Scene generation all draw from the same
 *  `data/tables.js` groups) so a GM can roll for inspiration on that
 *  specific angle — the UI is responsible for actually rolling it
 *  (session.js's existing `rollOracle`), never this function. Weighted,
 *  not randomized: `activity === 'negotiate'` boosts a present faction's
 *  fear/need angle to the top, realizing the idea named but not built in
 *  docs/adr/0009 ("surface the active faction's fear/need as a suggested
 *  angle when Activity is Negotiate") — generalized here to every in-scene
 *  faction, not just one. */
export function buildStoryOptions(campaign, { limit = 6 } = {}) {
  const ctx = gatherSceneContext(campaign);
  const negotiating = ctx.activity === 'negotiate';
  const options = [];

  for (const f of ctx.factionsHere) {
    if (f.agenda) {
      options.push({ id: `faction-agenda-${f.id}`, label: `${f.name || 'Unnamed faction'} — agenda`, detail: f.agenda, source: 'faction-agenda', entityId: f.id, weight: negotiating ? 9 : 5, oracleGroup: 'Factions', oracleTable: 'Relationship' });
    }
    const fearNeed = [f.fear, f.need].filter(Boolean).join(' / ');
    if (fearNeed) {
      options.push({ id: `faction-fearneed-${f.id}`, label: `${f.name || 'Unnamed faction'} — fear/need`, detail: fearNeed, source: 'faction-fear-need', entityId: f.id, weight: negotiating ? 10 : 4, oracleGroup: 'Factions', oracleTable: 'Relationship' });
    }
  }

  for (const e of ctx.whoEntities) {
    if (e.type === 'npc' && e.currentGoal) {
      options.push({ id: `npc-goal-${e.id}`, label: `${e.name || 'Unnamed'} — current goal`, detail: e.currentGoal, source: 'npc-goal', entityId: e.id, weight: 6, oracleGroup: 'Characters', oracleTable: 'Goal' });
    }
  }

  for (const c of ctx.conflictsHere) {
    const gap = c.causeGapHook || (c.statedCause && c.rootCause ? `${c.statedCause} vs. ${c.rootCause}` : '');
    options.push({ id: `conflict-${c.id}`, label: `${c.name || 'Unnamed conflict'} — the gap`, detail: gap || 'What people say is happening vs. what actually is.', source: 'conflict', entityId: c.id, weight: 7, oracleGroup: 'Faction Conflict', oracleTable: 'Starter Session Hook' });
  }

  for (const fs of ctx.foreshadowing) {
    options.push({ id: `foreshadowing-${fs.id}`, label: 'Pay off a planted detail', detail: fs.text, source: 'foreshadowing', weight: 6, oracleGroup: 'Miscellaneous', oracleTable: 'Story Clue' });
  }

  for (const wf of ctx.worldFlags) {
    options.push({ id: `worldflag-${wf.id}`, label: 'Surface a known/unknown fact', detail: wf.description, source: 'world-flag', weight: 5, oracleGroup: 'Plot Engine', oracleTable: 'Plot Reveals' });
  }

  for (const t of ctx.openThreads) {
    if (t.segments > 0 && t.filled / t.segments >= 0.6) {
      options.push({ id: `thread-${t.id}`, label: `“${t.name}” is under pressure`, detail: `${t.filled}/${t.segments} filled — consider a scene that pays it off or forces a cost.`, source: 'thread-pressure', weight: 8, oracleGroup: 'Miscellaneous', oracleTable: 'Pay the Price' });
    }
  }

  // Tie-break by oracle usage (docs/adr/0039 Phase 2) — campaign.oracles.
  // usage[topLevelGroup] is already tracked on every real roll
  // (session.js's rollOracle), previously read by nothing ("drives
  // Co-Pilot suggestions later," per its own write-site comment — this is
  // that later). Only breaks an EXACT weight tie; it never outranks a
  // higher-weighted option just because its table gets rolled more, so
  // e.g. Negotiate's fear/need-over-agenda boost above is unaffected.
  const usage = (campaign.oracles && campaign.oracles.usage) || {};
  return options
    .sort((a, b) => (b.weight - a.weight) || ((usage[b.oracleGroup] || 0) - (usage[a.oracleGroup] || 0)))
    .slice(0, limit)
    .map(({ weight, ...rest }) => rest);
}

/** Story Dashboard's Narrative Composer (docs/adr/0040 Phase 12b, fixed in
 *  Phase 12f) — generalizes two existing, proven precedents into one
 *  reusable composer: `scenes.js`'s `recomposeSceneText` (structured
 *  fields → live narrative text) and `recap.js`'s `buildSessionRecap`/
 *  `formatSessionRecap` (assemble several signals → readable prose).
 *  Pulls WHERE/WHO's raw Focus text verbatim, WHAT's situation, whichever
 *  Story Option(s) the GM has marked "in play" (`selectedOptionIds` —
 *  UI-layer ephemeral state, NOT persisted; distinct from
 *  `docs/adr/0039`'s `dismissedStoryOptionIds`, a different concept), and
 *  WHY's objective into one composed paragraph.
 *
 *  Phase 12f fix: originally re-derived a synthetic "the scene is set at
 *  X"/"Y is present" sentence from WHO/WHERE's parsed @mentions instead
 *  of using the Focus text itself — so any free prose the GM actually
 *  typed (not just an @mention) was silently dropped from the draft. Since
 *  the mention list is itself always parsed FROM that same text (there is
 *  no other source), using the raw text directly is strictly more
 *  complete, not just a different derivation.
 *
 *  Deliberately returns a PLAIN STRING carrying the exact same raw
 *  markup (`@[Name]` mentions, `**bold**`/etc.) the source fields
 *  already use — no stripping/cleaning — because that format is already
 *  what both consumers of this string expect: `mentionEditor.js`'s
 *  `buildMentionEditorHTML` (for a live preview that renders mentions as
 *  real clickable badges) and `session.js`'s `addNote` (which auto-links
 *  any `@[Name]` mention on save, same as every other Journal entry).
 *
 *  Deliberately NOT live-editable in place on the dashboard (the ADR's
 *  original sketch called for an editable field) — this function is
 *  recomputed fresh on every render (same as `buildStoryOptions`), and a
 *  contenteditable field showing its output would have its content
 *  silently clobbered by the next unrelated re-render (ticking a
 *  different Story Option's checkbox, editing a WHO/WHERE field
 *  elsewhere) the moment the GM started hand-editing it. The UI instead
 *  offers a read-only live preview (via `buildMentionEditorHTML`, not a
 *  real `contenteditable`) with Copy/Send-to-Journal — hand-polishing
 *  happens after Send, in the Journal note itself (already a real,
 *  fully-editable field), matching Article II at that stage instead. */
export function composeNarrativeDraft(campaign, { selectedOptionIds = [] } = {}) {
  const ctx = gatherSceneContext(campaign);
  const parts = [];

  // WHERE's Site Description/Immediate Surroundings (whereDetail,
  // gatherSceneContext above) and WHO's own raw Focus text — used verbatim
  // instead of a synthetic "the scene is set at X"/"Y is present" sentence,
  // so the GM's own written context reaches the draft. Falls back to
  // nothing when both WHERE fields are empty, same as before.
  if (ctx.whereDetail) parts.push(ctx.whereDetail);
  if (ctx.whoSummary) parts.push(ctx.whoSummary);

  const situation = String((campaign.context && campaign.context.what && campaign.context.what.situation) || '').trim();
  if (situation) parts.push(situation);

  const selected = new Set(selectedOptionIds);
  if (selected.size) {
    for (const o of buildStoryOptions(campaign, { limit: 20 })) {
      if (selected.has(o.id) && o.detail) parts.push(o.detail);
    }
  }

  const objective = String((campaign.context && campaign.context.why && campaign.context.why.summary) || '').trim();
  if (objective) parts.push(`The party's aim right now: ${objective}`);

  return parts.join(' ');
}
