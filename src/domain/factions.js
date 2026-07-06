// factions.js — Phase 10's Faction Pressure Track: Hostile Colony Builder's
// Stability/Instability escalation ladder and 5PFH Compendium's Power/
// Influence/Faction Activity table both reduce to the same shape Threads
// already model — a filling clock with GM-set state, not a live
// simulation. A faction's pressure track is a Thread tagged
// `kind: 'faction-pressure'` with a `factionId` reference, exactly the
// pattern domain/trade.js's Contracts already established for "reuse
// Threads' clock/lifecycle instead of a second implementation" — every
// existing thread mutator (advanceThread, setThreadStatus, setThreadPriority,
// removeThread) works on one unchanged, since it lives in the same
// campaign.threads array as any other thread.
//
// Reconciled against gameplay-mechanics.md's four-dial Influence/Resources/
// Patience/Agenda-Progress proposal (ADR 0008): kept the single-clock
// design deliberately — split later if something concrete needs the
// distinction, not speculatively now.
//
// advanceFactionTurns() below is "faction-turn/rumor automation" scoped
// small and deliberately manual: a GM-triggered bulk advance-and-roll-a-
// rumor action, not a background scheduler or live simulation.

import { getEntity, setFactionStat, addFactionAsset } from './entities.js';
import { addThread, listThreads, advanceThread } from './threads.js';
import { tablesWithOverrides, pick } from './oracles.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

// --- Faction turn mini-game (2026-07-06, docs/adr/0011-swn-cwn-content.md)
// -------------------------------------------------------------------------
// A faction's Force/Cunning/Wealth stats (entities.js) drive a small dice
// resolution instead of pure narration — the concrete "turn-based mini-
// game" a GM can run for a tracked faction, one stat check at a time,
// rather than opposed faction-vs-faction combat (which would need a
// target-faction picker and a second faction's own stats; out of scope for
// this pass — see the ADR's Alternatives Considered). Each action type is
// resolved against whichever stat it plays to; a d10 + that stat vs. a
// flat difficulty (12 for a clean win, 8 to avoid an outright setback)
// keeps the math identical in shape to this app's existing flat/Traveller
// checks (domain/dice.js) rather than inventing a new curve.
export const FACTION_ACTION_TYPES = {
  attack: { stat: 'force', verb: 'moves against a rival with open force' },
  scheme: { stat: 'cunning', verb: 'schemes and maneuvers in the shadows' },
  expand: { stat: 'wealth', verb: 'expands its economic reach' },
};

/** Pick an action type weighted toward whichever stat is currently
 *  strongest (a faction plays to its strength more often than not, without
 *  ever being forced into always the same move). */
function pickActionType(faction, rng) {
  const weights = [
    ['attack', Math.max(1, faction.force || 0)],
    ['scheme', Math.max(1, faction.cunning || 0)],
    ['expand', Math.max(1, faction.wealth || 0)],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [type, w] of weights) { if ((roll -= w) <= 0) return type; }
  return weights[0][0];
}

/** Resolve one faction's turn as a stat check: d10 + the acting stat vs a
 *  flat difficulty. >=12 is a strong success (the acting stat ticks up, to
 *  a max of 10); 8-11 a partial success (no change); <8 a setback (the
 *  faction's Pressure Track — if it has one — advances an extra tick, on
 *  top of the ordinary per-turn advance). Pure and RNG-injectable, like
 *  every other roll in this app. Returns null for a non-faction/missing
 *  entity. */
export function resolveFactionTurn(campaign, factionId, { rng = Math.random, actionType } = {}) {
  const faction = getEntity(campaign, factionId);
  if (!faction || faction.type !== 'faction') return null;
  const type = (actionType && FACTION_ACTION_TYPES[actionType]) ? actionType : pickActionType(faction, rng);
  const { stat, verb } = FACTION_ACTION_TYPES[type];
  const statValue = faction[stat] || 0;
  const roll = Math.floor(rng() * 10) + 1;
  const total = roll + statValue;
  const outcome = total >= 12 ? 'strong success' : total >= 8 ? 'partial success' : 'setback';
  return { factionId, factionName: faction.name || 'Unnamed faction', type, verb, stat, statValue, roll, total, outcome };
}

/** Apply a resolveFactionTurn() result to the campaign: a strong success
 *  raises the acting stat by 1 (capped 10); a setback advances the
 *  faction's Pressure Track by one extra tick if it has one (nothing to
 *  advance otherwise — a faction nobody's tracking just gets the narrative
 *  result with no numeric consequence). */
function applyFactionTurnResult(campaign, result) {
  let next = campaign;
  if (result.outcome === 'strong success') {
    next = setFactionStat(next, result.factionId, result.stat, (getEntity(next, result.factionId)[result.stat] || 0) + 1);
  } else if (result.outcome === 'setback') {
    const track = getPressureTrack(next, result.factionId);
    if (track) next = advanceThread(next, track.id, 1);
  }
  return next;
}

/** Render one resolveFactionTurn() result as a Journal-friendly line. */
export function formatFactionTurnResult(r) {
  const label = { attack: 'Attack', scheme: 'Scheme', expand: 'Expand' }[r.type] || r.type;
  return `${r.factionName} ${r.verb} (${label}, ${r.stat} ${r.statValue} + d10 ${r.roll} = ${r.total}) — ${r.outcome}.`;
}

/** Roll a Faction Asset (Corporate Powers group) and append it directly to
 *  the faction's Assets list — the "roll and structurally add" action, same
 *  shape as generateContract/generateMission rolling a table into a
 *  concrete record instead of just journaling flavor text. No-op (returns
 *  the campaign unchanged, empty asset) if the entity isn't a faction. */
export function rollFactionAsset(campaign, factionId, { rng = Math.random } = {}) {
  const faction = getEntity(campaign, factionId);
  if (!faction || faction.type !== 'faction') return { campaign, asset: '' };
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  const list = (tables && tables['Corporate Powers'] && tables['Corporate Powers']['Faction Asset']) || [];
  const asset = list.length ? pick(list, rng) : '';
  if (!asset) return { campaign, asset: '' };
  return { campaign: addFactionAsset(campaign, factionId, asset), asset };
}

/** A faction's pressure track, if one has been added — at most one per
 *  faction. Returns null if the faction doesn't exist or has none yet
 *  (opt-in, GM-triggered — not every faction automatically gets a clock
 *  cluttering the WHY question's thread list). */
export function getPressureTrack(campaign, factionId) {
  return listThreads(campaign).find((t) => t.kind === 'faction-pressure' && t.factionId === factionId) || null;
}

/** Add a pressure track to a faction entity. No-op if the entity isn't a
 *  faction, or already has one (never creates a duplicate). */
export function createPressureTrack(campaign, factionId, segments = 4) {
  const entity = getEntity(campaign, factionId);
  if (!entity || entity.type !== 'faction' || getPressureTrack(campaign, factionId)) return clone(campaign);
  const next = addThread(campaign, `${entity.name || 'Faction'} — Pressure`, segments);
  const t = next.threads[next.threads.length - 1];
  t.kind = 'faction-pressure';
  t.factionId = factionId;
  return next;
}

/** Every faction whose pressure track is filled or nearly filled (>=75%,
 *  the same "one more push" threshold copilot.js's threadUnderPressure
 *  already uses for ordinary threads) and not yet Resolved/Archived — for
 *  a Co-Pilot "this faction is about to act" surfacing, and the
 *  Faction Rumor -> Mission seed link (copilot.js's advise()). */
export function factionsUnderPressure(campaign) {
  return listThreads(campaign)
    .filter((t) => t.kind === 'faction-pressure' && !t.done && t.status !== 'resolved' && t.status !== 'archived' && t.filled / t.segments >= 0.75)
    .map((t) => ({ ...t, faction: getEntity(campaign, t.factionId) }))
    .filter((t) => t.faction);
}

/** "Advance Faction Turns" — a GM-triggered bulk action (a button press,
 *  not a background scheduler; Article II, the GM always retains creative
 *  authority), the concrete, small-scoped shape "faction-turn automation"
 *  takes here rather than a live simulation: every faction that already
 *  has a pressure track (skips ones nobody's tracking) advances by one
 *  tick, rolls a "rumor" — a Faction Activity oracle entry (the same table
 *  the Faction card's own 🎲 button rolls) describing what it did — and
 *  (2026-07-06) also resolves one stat-based turn (resolveFactionTurn
 *  above) against its own Force/Cunning/Wealth, so the mini-game's dice
 *  outcome is part of the same bulk action rather than a separate click per
 *  faction. The per-tick advancement itself stays deterministic (+1,
 *  matching the existing per-faction advance button, plus one more on a
 *  mechanical setback) — only the flavor text and the stat check are
 *  randomized. Returns the new campaign plus the rumors rolled, for the UI
 *  to journal (formatFactionTurnRumors below). */
export function advanceFactionTurns(campaign, { rng = Math.random } = {}) {
  let next = clone(campaign);
  const tables = tablesWithOverrides(next.oracles && next.oracles.overrides, next.settings && next.settings.genrePack);
  const activityTable = (tables && tables['Corporate Powers'] && tables['Corporate Powers']['Faction Activity']) || [];
  const tracks = listThreads(next).filter((t) => t.kind === 'faction-pressure' && !t.done);
  const rumors = [];
  for (const track of tracks) {
    const faction = getEntity(next, track.factionId);
    if (!faction) continue;
    next = advanceThread(next, track.id, 1);
    const activity = activityTable.length ? pick(activityTable, rng) : '';
    const result = resolveFactionTurn(next, track.factionId, { rng });
    if (result) next = applyFactionTurnResult(next, result);
    if (activity || result) rumors.push({ factionName: faction.name || 'Unnamed faction', activity, result });
  }
  return { campaign: next, rumors };
}

/** Render a faction turn's rumors as one Journal-friendly block — each
 *  faction's flavor rumor on one line, its mechanical turn result on the
 *  next. */
export function formatFactionTurnRumors(rumors) {
  if (!rumors.length) return 'Faction turn: no factions are being tracked yet — add a Pressure Track to a faction first.';
  const lines = ['Faction turn:'];
  for (const r of rumors) {
    if (r.activity) lines.push(`${r.factionName} ${r.activity}.`);
    if (r.result) lines.push(formatFactionTurnResult(r.result));
  }
  return lines.join('\n');
}
