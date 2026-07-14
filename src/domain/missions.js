// missions.js — Phase 10's Mission/Job generator (2026-07-03 ruleset
// review; user priority: "robust missions with balanced risk vs reward").
// Distinct from a Trade contract (domain/trade.js) — a mission isn't tied
// to a route/commodity/patron, it's a general job with payout math. Borrows
// Hostile Crew Expendable's cargo-job formula (destination distance x a
// 2D6 payout-modifier table, explicit damage/lateness penalties) and
// 5PFH's danger-tier-scaled Deployment Conditions, reduced to a single
// pure function since this app has no travel-distance mechanic of its own:
// `danger` is sourced from the existing context.what.threat Narrative
// Tracker by default, so higher ambient threat produces higher-stakes,
// higher-payout missions automatically — risk and reward move together
// instead of being hand-tuned per mission.
//
// Living Faction Engine Phase C: a generated mission can now optionally
// carry a `sourceFactionId` — when given, `danger` is instead derived from
// that faction's own current-goal urgency (its progress track's fill
// ratio), so a faction closing in on its agenda produces a more urgent,
// higher-payout job, and `campaign.missions[]` persists it as a real,
// trackable record instead of a one-shot journal note that's immediately
// discarded (the previous behavior — see `src/ui/shell.js`'s
// `data-generate-mission` button, unchanged, still writes straight to the
// journal for the no-source-faction case).

import { pick, tablesWithOverrides } from './oracles.js';
import { getFactionGoalTrack } from './factionTurnEngine.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

const BASE_PAYOUT = 100;

/** payout scales with danger (0-10): 1x at 0, up to 3x at 10. */
function payoutForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  return Math.round(BASE_PAYOUT * (1 + d * 0.2));
}

/** A more dangerous job is also a more urgent one — the deadline tightens
 *  as danger rises, the same "risk and reward move together" logic as
 *  payout above (7 days at danger 0, down to 2 at danger 10). */
function deadlineForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  return Math.max(1, 7 - Math.round(d * 0.5));
}

/** Explicit lateness/damage penalty, framed the same way Hostile Crew
 *  Expendable's cargo jobs already are — harsher at higher danger. */
function penaltyForDanger(danger) {
  const d = Math.max(0, Math.min(10, Number(danger) || 0));
  if (d >= 6) return 'Late or damaged delivery voids the payout entirely.';
  if (d >= 3) return 'Late or damaged delivery halves the payout.';
  return 'Late delivery costs a modest penalty; damage is negotiable.';
}

/** A faction's own current-goal urgency as a 0-10 "danger" figure — its
 *  goal track's fill ratio, scaled the same way every other 0-10 dial in
 *  this app is read. No current goal (or no faction) falls back to null,
 *  letting the caller's own campaign.context.what.threat default apply
 *  instead, unchanged. */
function dangerFromFactionGoal(campaign, factionId) {
  const track = getFactionGoalTrack(campaign, factionId);
  if (!track || !track.segments) return null;
  return Math.round((track.filled / track.segments) * 10);
}

/** Generate a mission: payout, a complication (rolled from the existing
 *  Miscellaneous > Story Complication oracle table — not a new table),
 *  a deadline in days, and an explicit penalty. `danger` defaults to the
 *  campaign's own context.what.threat so a mission generated mid-session
 *  reflects how dangerous things already are without the GM re-entering
 *  that number by hand — UNLESS `factionId` is given, in which case that
 *  faction's own current-goal urgency is used instead (Living Faction
 *  Engine Phase C), and the mission's `title`/`sourceFactionId` name the
 *  faction as its patron. Pure/RNG-injectable like every other roll here. */
export function generateMission(campaign, { danger, rng = Math.random, factionId = null } = {}) {
  const faction = factionId ? (campaign.entities && campaign.entities.items || []).find((e) => e.id === factionId && e.type === 'faction') : null;
  const d = danger != null ? danger
    : (faction ? dangerFromFactionGoal(campaign, factionId) : null) ?? ((campaign.context && campaign.context.what && campaign.context.what.threat) || 0);
  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  const complicationTable = (tables && tables.Miscellaneous && tables.Miscellaneous['Story Complication']) || [];
  const complication = complicationTable.length ? pick(complicationTable, rng) : '';
  return {
    title: faction ? `${faction.name || 'Unnamed faction'} has work available` : 'New job available',
    danger: d,
    payout: payoutForDanger(d),
    deadlineDays: deadlineForDanger(d),
    complication,
    penalty: penaltyForDanger(d),
    sourceFactionId: faction ? factionId : null,
  };
}

/** Render a generated mission as one Journal-friendly block. */
export function formatMission(m) {
  const lines = [
    `${m.title || 'New job available'} — danger ${m.danger}/10`,
    `Payout: ${m.payout}`,
    `Deadline: ${m.deadlineDays} day${m.deadlineDays === 1 ? '' : 's'}`,
  ];
  if (m.complication) lines.push(`Complication: ${m.complication}`);
  lines.push(m.penalty);
  return lines.join('\n');
}

const MISSION_STATUSES = ['open', 'accepted', 'resolved', 'declined'];

/** Persists a generated mission (generateMission's own output, or any
 *  same-shaped object) as a real, trackable record in
 *  campaign.missions[] — distinct from formatMission's journal-note path,
 *  which stays a one-shot, non-referenceable text block. */
export function addMission(campaign, mission) {
  const next = clone(campaign);
  next.missions = Array.isArray(next.missions) ? next.missions : [];
  next.missions.push({
    id: 'msn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: mission.title || 'New job available',
    danger: mission.danger || 0,
    payout: mission.payout || 0,
    deadlineDays: mission.deadlineDays || 0,
    complication: mission.complication || '',
    penalty: mission.penalty || '',
    sourceFactionId: mission.sourceFactionId || null,
    status: 'open',
    createdAt: new Date().toISOString(),
  });
  return next;
}

export function updateMissionStatus(campaign, missionId, status) {
  const next = clone(campaign);
  const m = (next.missions || []).find((x) => x.id === missionId);
  if (m && MISSION_STATUSES.includes(status)) m.status = status;
  return next;
}

export function removeMission(campaign, missionId) {
  const next = clone(campaign);
  next.missions = (next.missions || []).filter((m) => m.id !== missionId);
  return next;
}

/** Every open (or all, if factionId omitted) mission sourced from a given
 *  faction — used by the Entity Editor's faction card to show "jobs this
 *  faction has put out," and by the Faction Events Missions list to scope
 *  to the Active Location's factions if the caller filters by id first. */
export function missionsForFaction(campaign, factionId) {
  return (campaign.missions || []).filter((m) => m.sourceFactionId === factionId);
}
