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

import { getEntity } from './entities.js';
import { addThread, listThreads } from './threads.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

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
 *  a Co-Pilot "this faction is about to act" surfacing, and the future
 *  Faction Rumor -> Mission seed link. */
export function factionsUnderPressure(campaign) {
  return listThreads(campaign)
    .filter((t) => t.kind === 'faction-pressure' && !t.done && t.status !== 'resolved' && t.status !== 'archived' && t.filled / t.segments >= 0.75)
    .map((t) => ({ ...t, faction: getEntity(campaign, t.factionId) }))
    .filter((t) => t.faction);
}
