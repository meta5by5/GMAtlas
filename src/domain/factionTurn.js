// factionTurn.js — the Faction Turn (design/Faction-baseline.md B4.5–B4.7;
// FACTION-ROADMAP F3). `proposeFactionTurn` is pure and read-only: it runs
// TRIGGER → EVALUATE → DECIDE → ACT → RESOLVE and the planning half of
// PROPAGATE and INVOLVE PLAYER, and returns a run. Nothing changes until the
// GM commits: `commitFactionRun` records each kept action as an event with
// its own change set (domain/factionChanges.js), so every consequence is
// explained and undoable, and queues follow-on triggers for the next run
// rather than running them now (SRS 7.5).
//
// Choice and resolution are deterministic for the same campaign and seed.
// Each faction draws from its own seeded stream, so adding an unrelated
// faction doesn't reshuffle everyone else. A reroll is a new run with a new
// id; the old run is kept (SRS 7.3, 12.4).
//
// Pure and DOM-free: every mutator takes a campaign and returns a new one.

import { getEntity, listEntities } from './entities.js';
import { normalizeFactionsState, factionsState } from './factionState.js';
import {
  factionProfile, stanceOf, currentFactionTurn, changeStanding, setFactionProfile, addFactionMemory,
  advanceFactionProject, factionObjectives,
} from './factionProfile.js';
import { recordEvent, describeChange, diffChanges } from './factionChanges.js';
import { listEncounters } from './encounters.js';
import { makeRng } from './oracles.js';
import { CAPABILITIES, CAPABILITY_BANDS, METHODS } from '../data/factionOracles.js';
import {
  FACTION_MODES, FACTION_PRESSURES, RESOLUTION_STYLES, FACTION_TURN_TRIGGERS, OUTCOME_BANDS, SUCCESS_BANDS,
  GMATLAS_CURVE, RESOLUTION_MOD_MIN, RESOLUTION_MOD_MAX, UNRATED_BAND, ACTION_FAMILIES, DEFAULT_FAMILIES,
  RELEVANCE_WEIGHTS, DECISION_WEIGHTS, PRESSURE_LOUD_BIAS, RUN_BUDGETS, CANDIDATES_MIN, CANDIDATES_MAX,
  PROPAGATION_DEPTH, RUNS_KEPT, INVOLVEMENT,
} from '../data/factionActions.js';
import { IMPACT_LEVELS } from '../data/factionEventKinds.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rid = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const FAMILY = new Map(ACTION_FAMILIES.map((f) => [f.id, f]));
const BAND = new Map(OUTCOME_BANDS.map((b) => [b.id, b]));
const IMPACT_ORDER = IMPACT_LEVELS.map((l) => l.id);
const maxImpact = (a, b) => (IMPACT_ORDER.indexOf(a) >= IMPACT_ORDER.indexOf(b) ? a : b);
const capLabel = (k) => (CAPABILITIES.find((c) => c.key === k) || { label: k }).label;
const bandLabel = (n) => (CAPABILITY_BANDS.find((b) => b.n === n) || { label: 'Unrated' }).label;

/** A 32-bit hash of a string, for per-faction seed streams. */
export function hashSeed(s) {
  let h = 2166136261 >>> 0;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Settings (U11).

export function factionSettings(campaign) {
  const s = factionsState(campaign).settings || {};
  return {
    mode: FACTION_MODES.some((m) => m.id === s.mode) ? s.mode : 'standard',
    pressure: FACTION_PRESSURES.some((p) => p.id === s.pressure) ? s.pressure : 'steady',
    resolution: RESOLUTION_STYLES.some((r) => r.id === s.resolution) ? s.resolution : 'gmatlas',
    trigger: {
      kind: FACTION_TURN_TRIGGERS.some((t) => t.id === (s.trigger && s.trigger.kind)) ? s.trigger.kind : 'auto',
      everyEncounters: clamp(Math.round(Number(s.trigger && s.trigger.everyEncounters)) || 3, 1, 20),
    },
    autoApplyQuiet: s.autoApplyQuiet !== false,
    stageCap: clamp(Math.round(Number(s.stageCap)) || 7, 1, 7),
    retaliation: s.retaliation !== false,
    relationshipRoll: s.relationshipRoll !== false,
    approval: { ...(s.approval || {}) },
  };
}

/** Sets one Settings › Factions value, validated. Keys: mode, pressure,
 *  resolution, triggerKind, everyEncounters, autoApplyQuiet, stageCap,
 *  retaliation, relationshipRoll. */
export function setFactionSetting(campaign, key, value) {
  const next = normalizeFactionsState(clone(campaign));
  const s = next.factions.settings;
  const on = value === true || value === 'true' || value === 'on';
  if (key === 'mode' && FACTION_MODES.some((m) => m.id === value)) s.mode = value;
  else if (key === 'pressure' && FACTION_PRESSURES.some((p) => p.id === value)) s.pressure = value;
  else if (key === 'resolution' && RESOLUTION_STYLES.some((r) => r.id === value)) s.resolution = value;
  else if (key === 'triggerKind' && FACTION_TURN_TRIGGERS.some((t) => t.id === value)) s.trigger = { ...(s.trigger || {}), kind: value };
  else if (key === 'everyEncounters') { const n = Math.round(Number(value)); if (Number.isFinite(n)) s.trigger = { ...(s.trigger || {}), everyEncounters: clamp(n, 1, 20) }; }
  else if (key === 'stageCap') { const n = Math.round(Number(value)); if (Number.isFinite(n)) s.stageCap = clamp(n, 1, 7); }
  else if (['autoApplyQuiet', 'retaliation', 'relationshipRoll'].includes(key)) s[key] = on;
  return next;
}

// ---------------------------------------------------------------------------
// TRIGGER: what has happened since the last processed point.

/** Triggers not yet answered by a Faction Turn, from the last three turns.
 *  The Faction Turn's own triggers never count (they are answered as they
 *  are made); follow-ons it queued do. */
export function pendingTriggers(campaign) {
  const turn = currentFactionTurn(campaign);
  return factionsState(campaign).triggers.filter((t) => t && !t.processedRunId && t.kind !== 'faction-turn' && (Number(t.turn) || 0) >= turn - 3);
}

/** Encounters played since the last committed Faction Turn (B4.7). */
export function encountersSinceTurn(campaign) {
  const last = factionsState(campaign).runs.filter((r) => r.status === 'committed').map((r) => r.committedAt || '').sort().pop() || '';
  return listEncounters(campaign).filter((e) => String(e.createdAt || '') > last).length;
}

/** Whether a Faction Turn is due under the trigger setting, and why. */
export function factionTurnDue(campaign) {
  const s = factionSettings(campaign);
  if (s.trigger.kind === 'button') return { due: false, reason: '' };
  const n = encountersSinceTurn(campaign);
  if (n >= s.trigger.everyEncounters) return { due: true, reason: `${n} Encounter${n === 1 ? '' : 's'} since the last Faction Turn` };
  const pend = pendingTriggers(campaign).length;
  return { due: false, reason: pend ? `${pend} event${pend === 1 ? '' : 's'} waiting for a response` : '' };
}

// ---------------------------------------------------------------------------
// History reads used by EVALUATE and DECIDE.

function turnEvents(campaign) {
  const f = factionsState(campaign);
  const trig = new Map(f.triggers.map((t) => [t.id, t]));
  return f.events.filter((e) => e.status === 'applied' && (trig.get(e.triggerId) || {}).kind === 'faction-turn');
}

function activeObjective(campaign, factionId) {
  const list = factionObjectives(campaign, factionId).filter((o) => o.status === 'active');
  list.sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0)
    || ((b.thread ? b.thread.filled / b.thread.segments : 0) - (a.thread ? a.thread.filled / a.thread.segments : 0)));
  return list[0] || null;
}

function wrongsAgainst(campaign, f, turn) {
  const p = factionProfile(f);
  const answered = new Set(turnEvents(campaign).filter((e) => e.action.actorId === f.id && e.action.verb === 'retaliate').flatMap((e) => (e.action.targetIds || []).map((t) => `${t}@${e.turn}`)));
  const out = [];
  for (const m of p.memories) {
    if (!['grievance', 'betrayal', 'defeat'].includes(m.kind) || !m.aboutId) continue;
    if ((Number(m.turn) || 0) < turn - 3) continue;
    const already = [...answered].some((k) => { const [t, at] = k.split('@'); return t === m.aboutId && Number(at) >= (Number(m.turn) || 0); });
    if (already) continue;
    if (m.aboutId !== 'party' && !getEntity(campaign, m.aboutId)) continue;
    out.push({ targetId: m.aboutId, severity: Number(m.severity) || 1, memoryId: m.id, text: m.text });
  }
  return out.sort((a, b) => b.severity - a.severity);
}

// ---------------------------------------------------------------------------
// EVALUATE: who is relevant, with the top three reasons.

/** Relevance of one faction (B4.5): { score, reasons[3], parts, skip }. */
export function factionRelevance(campaign, f, { triggers, mode, others } = {}) {
  const p = factionProfile(f);
  const w = RELEVANCE_WEIGHTS[mode] || RELEVANCE_WEIGHTS.standard;
  if (p.paused) return { score: 0, reasons: [], parts: [], skip: 'paused' };
  if (p.muted) return { score: 0, reasons: [], parts: [], skip: 'muted' };
  if (p.excluded) return { score: 0, reasons: [], parts: [], skip: 'excluded from automatic turns' };
  if (p.stage === 'off') return { score: 0, reasons: [], parts: [], skip: 'off stage' };
  const turn = currentFactionTurn(campaign);
  const parts = [];
  const add = (key, value, text) => { if (value) parts.push({ key, value: Math.round(value * 100) / 100, text }); };
  const list = triggers || pendingTriggers(campaign);
  const facs = others || listEntities(campaign, ['faction']);
  // Trigger: an event names this faction, or names a faction it cares about.
  const direct = list.filter((t) => (t.refs || []).includes(f.id));
  if (direct.length) add('trigger', w.trigger * Math.min(2, direct.length) / (direct.length > 1 ? 1.5 : 1), `Responding to: ${direct[0].summary}`);
  else {
    const close = list.find((t) => (t.refs || []).some((r) => r !== f.id && facs.some((o) => o.id === r) && Math.abs(stanceOf(campaign, f.id, r)) >= 2));
    if (close) add('trigger', w.trigger / 2, `Something touched a faction it cares about: ${close.summary}`);
  }
  // Interest and objective alignment.
  const obj = activeObjective(campaign, f.id);
  if (obj) {
    add('interest', w.interest, `Pursuing "${obj.title}"`);
    if (obj.thread) {
      const frac = obj.thread.filled / obj.thread.segments;
      add('objective', w.objective * (frac >= 0.5 ? 1.5 : 1), frac >= 0.5 ? `Its plan is past halfway (${obj.thread.filled}/${obj.thread.segments})` : 'It has a project under way');
    }
  }
  // Relationship proximity: strong feelings toward other factions.
  const strong = facs.filter((o) => o.id !== f.id && Math.abs(stanceOf(campaign, f.id, o.id)) >= 2);
  if (strong.length) add('proximity', w.proximity * Math.min(2, strong.length), `Strong ties: ${strong.slice(0, 2).map((o) => o.name || 'a faction').join(', ')}`);
  // Capability fit.
  const rated = Object.values(p.capabilities).filter((v) => Number.isFinite(v));
  if (rated.length) add('capability', w.capability * Math.max(...rated) / 2, `Capable (best band ${bandLabel(Math.max(...rated))})`);
  // Urgency.
  let urgency = 0; const urgent = [];
  if (p.attention >= 5) { urgency += 1; urgent.push(`watching the party closely (attention ${p.attention})`); }
  if (obj && obj.thread && obj.thread.segments - obj.thread.filled === 1) { urgency += 1; urgent.push('one step from its goal'); }
  if (p.state.stability === 1) { urgency += 1; urgent.push('its stability is failing'); }
  const wrongs = wrongsAgainst(campaign, f, turn);
  if (wrongs.length) { urgency += 1; urgent.push(`it has a wrong to answer (${wrongs[0].targetId === 'party' ? 'the party' : (getEntity(campaign, wrongs[0].targetId) || {}).name || 'a rival'})`); }
  if (urgency) add('urgency', w.urgency * urgency, `Urgent: ${urgent.join('; ')}`);
  // History: recent events involving it.
  const recent = factionsState(campaign).events.filter((e) => e.status === 'applied' && (Number(e.turn) || 0) >= turn - 2
    && ((e.actorIds || []).includes(f.id) || (e.targetRefs || []).includes(f.id))).length;
  if (recent) add('history', w.history * Math.min(2, recent), `Recently involved in ${recent} event${recent === 1 ? '' : 's'}`);
  // Stage and cooldown.
  if (p.stage === 'on') add('stage', w.stage, 'On stage');
  const actedLast = turnEvents(campaign).some((e) => e.action.actorId === f.id && (Number(e.turn) || 0) >= turn);
  if (actedLast) add('cooldown', -w.cooldown, 'Acted last turn');
  const score = Math.round(parts.reduce((s, x) => s + x.value, 0) * 100) / 100;
  const reasons = parts.filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 3).map((x) => x.text);
  let skip = '';
  if (w.triggerOnly && !parts.some((x) => x.key === 'trigger')) skip = 'no trigger fired for it (Passive mode)';
  else if (score < w.threshold && p.stage !== 'on') skip = `not relevant enough this turn (${score} < ${w.threshold})`;
  return { score, reasons, parts, skip };
}

// ---------------------------------------------------------------------------
// DECIDE: candidates, scored by behavior, objective, risk, Pressure, variety.

function factionTargets(campaign, f, facs) {
  const others = facs.filter((o) => o.id !== f.id);
  const byStance = others.map((o) => ({ o, s: stanceOf(campaign, f.id, o.id) }))
    .sort((a, b) => a.s - b.s || String(a.o.name).localeCompare(String(b.o.name)) || a.o.id.localeCompare(b.o.id));
  const rival = byStance.find((x) => x.s <= -1) || null;
  const friends = byStance.filter((x) => x.s >= 1).reverse();
  const obj = activeObjective(campaign, f.id);
  // The faction its objective collides with, then the strongest feeling.
  const collide = obj && obj.collidesWith && getEntity(campaign, obj.collidesWith.factionId);
  const any = (collide && collide.type === 'faction' && collide.id !== f.id ? collide : null)
    || (byStance.slice().sort((a, b) => Math.abs(b.s) - Math.abs(a.s))[0] || {}).o || null;
  const kin = byStance.find((x) => x.s >= 3) || null;
  const weakFriend = friends.find((x) => factionProfile(x.o).state.stability === 1) || null;
  // A location: the objective's target, else a rival's turf.
  let location = obj ? (obj.targetRefs || []).map((id) => getEntity(campaign, id)).find((e) => e && e.type === 'location') : null;
  if (!location && rival) {
    const turf = (rival.o.relationships || []).find((r) => ['controls', 'owns', 'occupies', 'claims'].includes(r.type) && (getEntity(campaign, r.to) || {}).type === 'location');
    if (turf) location = getEntity(campaign, turf.to);
  }
  return { rival: rival && rival.o, friend: friends[0] && friends[0].o, any, kin: kin && kin.o, weakFriend: weakFriend && weakFriend.o, location, obj };
}

function resolveTarget(fam, ctx) {
  switch (fam.target) {
    case 'self': return { kind: 'self', id: '' };
    case 'faction': return ctx.any ? { kind: 'faction', id: ctx.any.id } : null;
    case 'rival': return ctx.rival ? { kind: 'faction', id: ctx.rival.id } : null;
    case 'friend': return (fam.when === 'ally-weak' ? ctx.weakFriend : ctx.friend) ? { kind: 'faction', id: (fam.when === 'ally-weak' ? ctx.weakFriend : ctx.friend).id } : null;
    case 'kin': return ctx.kin ? { kind: 'faction', id: ctx.kin.id } : null;
    case 'location': return ctx.location ? { kind: 'location', id: ctx.location.id } : null;
    case 'wronged': return ctx.wrong ? { kind: ctx.wrong.targetId === 'party' ? 'party' : 'faction', id: ctx.wrong.targetId } : null;
    default: return null;
  }
}

function conditionMet(fam, p, ctx) {
  if (!fam.when) return true;
  if (fam.when === 'weak') return p.state.stability === 1 || p.state.readiness === 1;
  if (fam.when === 'wronged') return !!ctx.wrong && ctx.retaliation;
  if (fam.when === 'ally-weak') return !!ctx.weakFriend;
  if (fam.when === 'kin') return !!ctx.kin && p.behavior.compromise >= 1;
  if (fam.when === 'endgame') return p.state.stability === 1 && (p.state.cohesion === 1 || (ctx.obj && ctx.obj.thread && ctx.obj.thread.filled === 0 && p.state.readiness === 1));
  return false;
}

/** Scores one family for one faction: { score, why[] }. */
function scoreFamily(fam, p, ctx) {
  const w = DECISION_WEIGHTS;
  const parts = [];
  let behavior = 0;
  for (const [axis, weight] of Object.entries(fam.fit || {})) behavior += weight * (p.behavior[axis] || 0);
  if (behavior) parts.push({ v: behavior * w.behavior, t: behavior > 0 ? 'suits its temperament' : 'goes against its temperament' });
  if (fam.methods.some((m) => p.methods.includes(m))) parts.push({ v: w.method, t: `one of its methods (${(METHODS.find((m) => fam.methods.includes(m.id) && p.methods.includes(m.id)) || {}).label})` });
  if (ctx.obj && ctx.obj.stake && fam.stakes.includes(ctx.obj.stake)) parts.push({ v: w.stake, t: `fits its stake in "${ctx.obj.title}"` });
  if (fam.advances && ctx.obj && ctx.obj.thread) parts.push({ v: w.advances, t: 'moves its plan forward' });
  const tolerance = (p.behavior.risk || 0) + 2;
  const excess = Math.max(0, fam.risk - tolerance);
  if (excess) parts.push({ v: -excess * w.riskTolerance * 2, t: 'riskier than it likes' });
  if (fam.loud) { const b = PRESSURE_LOUD_BIAS[ctx.pressure] || 0; if (b) parts.push({ v: b, t: b > 0 ? 'Pressure favors loud moves' : 'Pressure favors quiet moves' }); }
  if (fam.when === 'wronged' && ctx.wrong) parts.push({ v: w.wronged * ctx.wrong.severity, t: 'a fresh wrong to answer' });
  if (ctx.recentFamilies.has(fam.id)) parts.push({ v: -w.variety, t: 'used recently (variety)' });
  return parts;
}

/** The candidate actions for one faction, best first (3–5, SRS 7.3). */
export function candidateActions(campaign, f, { pressure = 'steady', rng = Math.random, facs, settings } = {}) {
  const p = factionProfile(f);
  const list = facs || listEntities(campaign, ['faction']);
  const turn = currentFactionTurn(campaign);
  const ctx = factionTargets(campaign, f, list);
  ctx.pressure = pressure;
  ctx.retaliation = !settings || settings.retaliation !== false;
  ctx.wrong = wrongsAgainst(campaign, f, turn)[0] || null;
  const recent = turnEvents(campaign).filter((e) => e.action.actorId === f.id && (Number(e.turn) || 0) >= turn - 1);
  ctx.recentFamilies = new Set(recent.map((e) => e.action.verb));
  const lastPrints = new Set(recent.filter((e) => (Number(e.turn) || 0) >= turn).map((e) => `${e.action.verb}|${(e.action.targetIds || [])[0] || ''}`));
  // The pool: its methods, its stake, conditions, a little of everything else.
  const pool = new Set();
  for (const fam of ACTION_FAMILIES) {
    if (fam.methods.some((m) => p.methods.includes(m))) pool.add(fam.id);
    if (ctx.obj && ctx.obj.stake && fam.stakes.includes(ctx.obj.stake)) pool.add(fam.id);
    if (fam.when && conditionMet(fam, p, ctx)) pool.add(fam.id);
  }
  if (ctx.rival) { pool.add('defend'); if (p.behavior.aggression >= 1) pool.add('threaten'); if (p.behavior.compromise >= 1) pool.add('reconcile'); }
  if (ctx.friend) pool.add('negotiate');
  for (const id of DEFAULT_FAMILIES) pool.add(id);
  const cands = [];
  for (const id of pool) {
    const fam = FAMILY.get(id);
    if (!fam || !conditionMet(fam, p, ctx)) continue;
    const target = resolveTarget(fam, ctx);
    if (!target) continue;
    const parts = scoreFamily(fam, p, ctx);
    if (lastPrints.has(`${fam.id}|${target.id}`)) parts.push({ v: -DECISION_WEIGHTS.fingerprint, t: 'the same move as last turn' });
    const score = parts.reduce((s, x) => s + x.v, 0);
    cands.push({ family: fam.id, target, parts, score });
  }
  // Seeded tie-breaking, in a fixed order so the stream is stable.
  cands.sort((a, b) => a.family.localeCompare(b.family));
  for (const c of cands) { c.score = Math.round((c.score + rng() * DECISION_WEIGHTS.jitter) * 100) / 100; }
  cands.sort((a, b) => b.score - a.score || a.family.localeCompare(b.family));
  const top = cands.slice(0, CANDIDATES_MAX);
  if (top.length < CANDIDATES_MIN) {
    for (const c of cands.slice(CANDIDATES_MAX)) { if (top.length >= CANDIDATES_MIN) break; top.push(c); }
  }
  return top.map((c) => ({
    family: c.family, target: c.target, score: c.score,
    why: c.parts.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map((x) => x.t),
  }));
}

// ---------------------------------------------------------------------------
// RESOLVE: an outcome band and the factors behind it (SRS 7.4).

function oppositionFor(campaign, fam, target) {
  if (!target || target.kind === 'self') return { band: UNRATED_BAND, name: 'the task itself', rated: false };
  if (target.kind === 'party') return { band: UNRATED_BAND, name: 'the party', rated: false };
  const e = getEntity(campaign, target.id);
  if (!e) return { band: UNRATED_BAND, name: 'unknown opposition', rated: false };
  if (e.type === 'faction') {
    const v = factionProfile(e).capabilities[fam.defend];
    return { band: Number.isFinite(v) ? v : UNRATED_BAND, name: e.name || 'a faction', rated: Number.isFinite(v), reach: factionProfile(e).reach };
  }
  // A location: whoever holds it opposes.
  const holder = listEntities(campaign, ['faction']).find((x) => (x.relationships || []).some((r) => r.to === e.id && ['controls', 'owns', 'occupies'].includes(r.type)));
  if (holder) { const v = factionProfile(holder).capabilities[fam.defend]; return { band: Number.isFinite(v) ? v : UNRATED_BAND, name: holder.name || 'its holder', rated: Number.isFinite(v), reach: factionProfile(holder).reach }; }
  return { band: UNRATED_BAND, name: e.name || 'the place', rated: false };
}

/** The resolution modifier and its factors, shared by every style. */
export function resolutionFactors(campaign, f, fam, target) {
  const p = factionProfile(f);
  const own = p.capabilities[fam.cap];
  const capBand = Number.isFinite(own) ? own : UNRATED_BAND;
  const opp = oppositionFor(campaign, fam, target);
  const factors = [];
  let mod = capBand - opp.band;
  factors.push(`${capLabel(fam.cap)} ${Number.isFinite(own) ? `${bandLabel(own)} (${own})` : `unrated (treated as ${UNRATED_BAND})`} against ${opp.name}${opp.rated ? ` ${bandLabel(opp.band)} (${opp.band})` : ` (${opp.band})`}: ${mod >= 0 ? '+' : ''}${mod}`);
  if (p.behavior.patience >= 1) { mod += 1; factors.push('Careful preparation: +1'); }
  if (fam.loud && p.behavior.patience <= -1) { mod -= 1; factors.push('Hasty and in the open: −1'); }
  if (Number.isFinite(opp.reach) && opp.reach > p.reach) { mod -= 1; factors.push('Outmatched in reach: −1'); }
  if (p.state.readiness >= 3) { mod += 1; factors.push('High readiness: +1'); }
  if (!fam.loud && p.state.exposure >= 3) { mod -= 1; factors.push('Too exposed to move quietly: −1'); }
  const unratedAll = !Object.values(p.capabilities).some((v) => Number.isFinite(v));
  if (unratedAll) factors.push('No capability ratings: resolved at the narrative level (SRS 14.3)');
  return { mod: clamp(mod, RESOLUTION_MOD_MIN, RESOLUTION_MOD_MAX), factors };
}

/** Rolls the band for one action in the given style. */
export function resolveAction(campaign, f, fam, target, { style = 'gmatlas', rng = Math.random } = {}) {
  const { mod, factors } = resolutionFactors(campaign, f, fam, target);
  if (style === 'gm') return { style, band: '', roll: null, mod, factors: [...factors, 'GM decides: pick the band'] };
  if (style === 'oracle') {
    const chance = clamp(50 + 10 * mod, 10, 90);
    const roll = 1 + Math.floor(rng() * 100);
    let band;
    if (roll <= Math.ceil(chance / 5)) band = 'decisive';
    else if (roll <= Math.round(chance * 0.6)) band = 'cost';
    else if (roll <= chance) band = 'partial';
    else if (roll <= chance + 10) band = 'stalemate';
    else if (roll > 100 - Math.ceil((100 - chance) / 5)) band = 'catastrophic';
    else if (roll > chance + (100 - chance) / 2) band = 'failure';
    else band = 'setback';
    return { style, band, roll: { d100: roll, chance }, mod, factors: [...factors, `Oracle: ${chance}% likely, rolled ${roll}`] };
  }
  const d1 = 1 + Math.floor(rng() * 6); const d2 = 1 + Math.floor(rng() * 6);
  const total = d1 + d2 + mod;
  const band = GMATLAS_CURVE.find((r) => total >= r.min).band;
  const note = style === 'ruleset' ? ['The campaign ruleset’s faction rules arrive in a later phase; GMAtlas style stood in'] : [];
  return { style, band, roll: { dice: [d1, d2], total }, mod, factors: [...factors, ...note, `2d6 ${d1}+${d2} ${mod >= 0 ? '+' : '−'} ${Math.abs(mod)} = ${total}`] };
}

// ---------------------------------------------------------------------------
// ACT and PROPAGATE: the action, its impact, its effects as a mutator.

function targetName(campaign, target) {
  if (!target || target.kind === 'self') return 'itself';
  if (target.kind === 'party') return 'the party';
  return (getEntity(campaign, target.id) || {}).name || 'someone';
}

function impactFor(fam, band, target) {
  let impact = fam.impact || 'low';
  if (fam.loud) impact = maxImpact(impact, 'moderate');
  if (target && target.kind === 'party') impact = maxImpact(impact, 'high');
  if (band === 'catastrophic') impact = maxImpact(impact, fam.loud ? 'high' : 'moderate');
  if (band === 'decisive' && fam.loud && fam.stance < 0) impact = maxImpact(impact, 'high');
  return impact;
}

function involvementFor(impact) { return (INVOLVEMENT.find((i) => i.impacts.includes(impact)) || INVOLVEMENT[0]).id; }

function visibilityFor(fam, band) {
  if (fam.loud) return 'public';
  if (['infiltrate', 'sabotage', 'steal', 'deceive', 'observe', 'investigate'].includes(fam.id)) return SUCCESS_BANDS.includes(band) || band === 'stalemate' ? 'secret' : 'public';
  return 'gm';
}

function hookFor(campaign, fam, action, band) {
  const actor = (getEntity(campaign, action.factionId) || {}).name || 'A faction';
  const tn = targetName(campaign, action.target);
  const refs = [action.factionId, action.target.kind === 'faction' || action.target.kind === 'location' ? action.target.id : ''].filter(Boolean);
  if (action.target.kind === 'party') return { type: 'complication', summary: `${actor} moves against the party: ${action.intent}`, refs, urgency: 'urgent' };
  if (!fam.loud && action.impact === 'low') return null;
  if (['attack', 'blockade', 'threaten', 'expand', 'retaliate'].includes(fam.id)) return { type: 'complication', summary: `${actor} ${fam.verb} ${tn} (${BAND.get(band).label.toLowerCase()})`, refs, urgency: band === 'decisive' ? 'urgent' : 'soon' };
  if (['rescue', 'protect'].includes(fam.id)) return { type: 'mission', summary: `${actor} wants help to ${action.intent}`, refs, urgency: 'soon' };
  if (['expose', 'investigate', 'observe'].includes(fam.id)) return { type: 'rumor', summary: `Word spreads: ${actor} ${fam.verb} ${tn}`, refs, urgency: 'low' };
  if (['split', 'merge', 'abandon'].includes(fam.id)) return { type: 'open-thread', summary: `${actor} ${fam.verb}${action.target.kind === 'self' ? '' : ` ${tn}`}`, refs, urgency: 'soon' };
  return null;
}

/** The effects of an action and its band, as a pure mutator for
 *  recordEvent (its difference becomes the change set). */
export function actionMutator(action, band) {
  const fam = FAMILY.get(action.family);
  const b = BAND.get(band) || BAND.get('stalemate');
  return (c, { eventId, turn }) => {
    let x = c;
    const actor = getEntity(x, action.factionId);
    if (!actor) return x;
    const actorName = actor.name || 'A faction';
    const tgt = action.target;
    const tgtFaction = tgt.kind === 'faction' ? getEntity(x, tgt.id) : null;
    // Project progress.
    if (fam.advances && action.threadId && b.progress) {
      for (let i = 0; i < Math.abs(b.progress); i += 1) x = advanceFactionProject(x, action.threadId, b.progress > 0 ? 1 : -1);
    }
    // Abandon gives up the plan.
    if (fam.id === 'abandon' && SUCCESS_BANDS.includes(band) && action.objectiveId) {
      const f = x.factions; const o = f && f.objectives.find((y) => y.id === action.objectiveId);
      if (o) o.status = 'abandoned';
      const t = (x.threads || []).find((y) => y.id === action.threadId); if (t) t.status = 'abandoned';
    }
    // The target's view of the actor.
    if (tgtFaction && fam.stance && b.effect > 0) {
      const raw = fam.stance * b.effect;
      const delta = Math.sign(raw) * Math.max(1, Math.round(Math.abs(raw)));
      x = changeStanding(x, { fromId: tgtFaction.id, toId: actor.id, field: 'stance', delta, decay: 'slow', reason: `${actorName} ${fam.verb} it`, source: 'event', eventId, turn, visibility: visibilityFor(fam, band) });
      if (fam.stance < 0) x = addFactionMemory(x, tgtFaction.id, { kind: 'grievance', aboutId: actor.id, severity: Math.min(3, Math.abs(fam.stance)), text: `${actorName} ${fam.verb} it`, turn, eventId, id: `mem_${eventId}_t` });
    }
    if (tgtFaction && b.backfire) {
      x = changeStanding(x, { fromId: tgtFaction.id, toId: actor.id, field: 'stance', delta: -1, decay: 'slow', reason: `${actorName} tried to ${action.intent}`, source: 'event', eventId, turn, visibility: 'public' });
    }
    // Moving against the party raises attention.
    if (tgt.kind === 'party' && fam.stance < 0 && b.effect > 0) {
      x = setFactionProfile(x, actor.id, 'attention', factionProfile(getEntity(x, actor.id)).attention + 1);
    }
    // The actor's own state (only bands already set).
    const st = factionProfile(getEntity(x, actor.id)).state;
    if (b.exposure && Number.isFinite(st.exposure)) x = setFactionProfile(x, actor.id, 'state.exposure', st.exposure + b.exposure);
    let stability = b.stability;
    if (['consolidate', 'defend', 'recruit'].includes(fam.id) && SUCCESS_BANDS.includes(band)) stability += 1;
    if (stability && Number.isFinite(st.stability)) x = setFactionProfile(x, actor.id, 'state.stability', st.stability + stability);
    if (band === 'catastrophic' && tgt.kind === 'faction') x = addFactionMemory(x, actor.id, { kind: 'defeat', aboutId: tgt.id, severity: 2, text: `${actorName} failed to ${action.intent}`, turn, eventId, id: `mem_${eventId}_a` });
    return x;
  };
}

function actionTitle(campaign, fam, action) {
  const actor = (getEntity(campaign, action.factionId) || {}).name || 'A faction';
  if (action.target.kind === 'self') return `${actor} moves to ${action.intent}`;
  return `${actor} ${fam.verb} ${targetName(campaign, action.target)}`;
}

function buildAction(campaign, f, cand, { rng, style, candidates, relevance }) {
  const fam = FAMILY.get(cand.family);
  const p = factionProfile(f);
  const obj = activeObjective(campaign, f.id);
  const tn = targetName(campaign, cand.target);
  const method = (METHODS.find((m) => fam.methods.includes(m.id) && p.methods.includes(m.id)) || {}).label || fam.label;
  const capV = p.capabilities[fam.cap];
  const action = {
    id: `act_${f.id}_${fam.id}`,
    factionId: f.id, family: fam.id, target: cand.target,
    objectiveId: obj ? obj.id : '', threadId: obj && obj.thread ? obj.thread.id : '',
    intent: fam.intent.replace('{target}', tn),
    method,
    resources: `${capLabel(fam.cap)}${Number.isFinite(capV) ? ` (${bandLabel(capV)})` : ' (unrated)'}`,
    benefit: fam.advances && obj ? `Moves "${obj.title}" forward` : (fam.stance > 0 ? `Warms ${tn} toward it` : fam.stance < 0 ? `Weakens ${tn}'s position` : 'Strengthens its own position'),
    risk: ['none', 'low', 'real', 'high'][fam.risk] || 'real',
    opposition: cand.target.kind === 'self' ? 'circumstance' : tn,
    failure: fam.failure,
    loud: !!fam.loud,
    score: cand.score, why: cand.why, candidates, relevance,
  };
  action.resolution = resolveAction(campaign, f, fam, cand.target, { style, rng });
  return action;
}

function finishAction(campaign, action) {
  const fam = FAMILY.get(action.family);
  const band = action.resolution.band || '';
  action.impact = impactFor(fam, band, action.target);
  action.involvement = involvementFor(action.impact);
  action.title = actionTitle(campaign, fam, action);
  action.visibility = visibilityFor(fam, band);
  action.fingerprint = `${action.factionId}|${action.family}|${action.target.id || 'self'}`;
  // A preview of the consequences, measured on a scratch copy.
  if (band) {
    const after = actionMutator(action, band)(clone(campaign), { eventId: 'preview', turn: currentFactionTurn(campaign) + 1 });
    const changes = diffChanges(campaign, after);
    action.changes = changes.map((c) => describeChange(after, c));
  } else action.changes = [];
  const hook = band ? hookFor(campaign, fam, action, band) : null;
  action.hooks = hook ? [hook] : [];
  return action;
}

// ---------------------------------------------------------------------------
// The pipeline.

/** Runs the pipeline and returns a run, without changing the campaign.
 *  `cause` is 'button', 'encounters', 'workflow', 'player-action'… */
export function proposeFactionTurn(campaign, { seed = Date.now(), cause = 'button', at, onlyFactionIds } = {}) {
  const settings = factionSettings(campaign);
  const { mode, pressure, resolution: style } = settings;
  const budget = RUN_BUDGETS[mode] || RUN_BUDGETS.standard;
  const loudCap = budget.loud[pressure];
  const triggers = pendingTriggers(campaign);
  const facs = listEntities(campaign, ['faction']);
  const considered = facs
    .filter((f) => !onlyFactionIds || onlyFactionIds.includes(f.id))
    .map((f) => ({ f, rel: factionRelevance(campaign, f, { triggers, mode, others: facs }) }))
    .sort((a, b) => b.rel.score - a.rel.score || String(a.f.name).localeCompare(String(b.f.name)) || a.f.id.localeCompare(b.f.id));
  const acting = considered.filter((x) => !x.rel.skip).slice(0, budget.factions);
  const actingIds = new Set(acting.map((x) => x.f.id));
  const actions = [];
  let loud = 0;
  for (const { f, rel } of acting) {
    if (actions.length >= budget.events) break;
    const rng = makeRng(hashSeed(`${seed}:${f.id}`));
    const cands = candidateActions(campaign, f, { pressure, rng, facs, settings });
    if (!cands.length) continue;
    let choice = cands[0];
    const loudOk = loud < loudCap;
    if (FAMILY.get(choice.family).loud && !loudOk) choice = cands.find((c) => !FAMILY.get(c.family).loud) || null;
    if (!choice) continue;
    if (FAMILY.get(choice.family).loud) loud += 1;
    const candidates = cands.map((c) => ({ family: c.family, label: FAMILY.get(c.family).label, targetId: c.target.id, score: c.score, why: c.why, chosen: c === choice }));
    const action = buildAction(campaign, f, choice, { rng, style, candidates, relevance: { score: rel.score, reasons: rel.reasons } });
    actions.push(finishAction(campaign, action));
  }
  return {
    id: rid('frun'), seed: String(seed), cause, mode, pressure, style,
    turn: currentFactionTurn(campaign) + 1, createdAt: at || new Date().toISOString(),
    status: 'preview', rerollOf: '',
    budget: { factions: budget.factions, events: budget.events, loud: Number.isFinite(loudCap) ? loudCap : null, loudUsed: loud },
    triggerIds: triggers.map((t) => t.id),
    considered: considered.map(({ f, rel }) => ({ factionId: f.id, score: rel.score, reasons: rel.reasons, acting: actingIds.has(f.id), skip: rel.skip || (actingIds.has(f.id) ? '' : 'over this run’s faction budget') })),
    actions,
    eventIds: [],
  };
}

function trimRuns(f) {
  if (f.runs.length > RUNS_KEPT) f.runs = f.runs.slice(-RUNS_KEPT);
}

/** Proposes a run and keeps it as the preview. Any earlier preview is
 *  marked superseded (kept, not deleted). Returns { campaign, runId }. */
export function startFactionTurn(campaign, opts = {}) {
  const next = normalizeFactionsState(clone(campaign));
  const run = proposeFactionTurn(next, opts);
  for (const r of next.factions.runs) if (r.status === 'preview') r.status = 'superseded';
  next.factions.runs.push(run);
  trimRuns(next.factions);
  return { campaign: next, runId: run.id };
}

/** A reroll: a new run with a new seed and id; the old one is kept. */
export function rerollFactionTurn(campaign, runId, { seed = Date.now(), at } = {}) {
  const old = factionsState(campaign).runs.find((r) => r.id === runId);
  if (!old || old.status !== 'preview') return { campaign: clone(campaign), runId: '' };
  const r = startFactionTurn(campaign, { seed, cause: old.cause, at });
  const run = r.campaign.factions.runs.find((x) => x.id === r.runId);
  run.rerollOf = old.id;
  return r;
}

export function discardFactionTurn(campaign, runId) {
  const next = normalizeFactionsState(clone(campaign));
  const run = next.factions.runs.find((r) => r.id === runId);
  if (run && run.status === 'preview') run.status = 'discarded';
  return next;
}

/** GM decides (or Intervene): sets one action's band in a preview, and
 *  recomputes its impact, changes and hooks. */
export function setRunActionBand(campaign, runId, actionId, band) {
  const next = normalizeFactionsState(clone(campaign));
  const run = next.factions.runs.find((r) => r.id === runId);
  const a = run && run.status === 'preview' ? run.actions.find((x) => x.id === actionId) : null;
  if (!a || !BAND.has(band)) return next;
  a.resolution = { ...a.resolution, band, overridden: true, factors: [...(a.resolution.factors || []).filter((t) => !t.startsWith('GM set the band')), `GM set the band: ${BAND.get(band).label}`] };
  const i = run.actions.indexOf(a);
  run.actions[i] = finishAction(next, a);
  return next;
}

/** Commits a preview: each kept action becomes an event with its own
 *  applied change set, and the faction clock moves on one turn. Critical
 *  actions are kept only when named in `include` (never by default);
 *  others are kept unless named in `skip`. An action whose band is still
 *  unpicked (GM decides) is skipped. Answered triggers are marked processed;
 *  follow-on reactions are queued as triggers for the next run (depth ≤ 2).
 *  Returns { campaign, eventIds, skipped, conflicts }. */
export function commitFactionRun(campaign, runId, { skip = [], include = [], at = new Date().toISOString() } = {}) {
  let next = normalizeFactionsState(clone(campaign));
  const run = next.factions.runs.find((r) => r.id === runId);
  if (!run || run.status !== 'preview') return { campaign: next, eventIds: [], skipped: [], conflicts: [] };
  const turn = currentFactionTurn(next) + 1;
  next.factions.lastProcessed = { ...next.factions.lastProcessed, turn };
  const eventIds = []; const skipped = []; const conflicts = []; const followOns = [];
  for (const a of run.actions) {
    const band = a.resolution && a.resolution.band;
    const keep = band && (a.impact === 'critical' ? include.includes(a.id) : !skip.includes(a.id));
    if (!keep) { skipped.push(a.id); continue; }
    const fam = FAMILY.get(a.family);
    const b = BAND.get(band);
    const r = recordEvent(next, {
      title: a.title,
      summary: `${b.label}. ${a.intent.charAt(0).toUpperCase()}${a.intent.slice(1)}${b.cost ? `: ${b.cost}` : '.'}${b.backfire ? ` ${a.failure.charAt(0).toUpperCase()}${a.failure.slice(1)}.` : ''}`,
      trigger: { kind: 'faction-turn', summary: `Faction Turn ${turn}`, refs: [a.factionId] },
      action: { kind: 'faction-turn', verb: a.family, actorId: a.factionId, targetIds: a.target.id ? [a.target.id] : [], method: a.method },
      actorIds: [a.factionId], targetRefs: a.target.id ? [a.target.id] : [],
      locationId: a.target.kind === 'location' ? a.target.id : '',
      visibility: a.visibility, impact: a.impact,
      significance: a.impact === 'critical' ? 'major' : a.impact === 'high' ? 'significant' : 'minor',
      hookSpecs: a.hooks || [], idempotencyKey: `${run.id}:${a.id}`, turn, at,
      mutate: actionMutator(a, band),
    });
    next = r.campaign;
    if (r.conflicts.length) conflicts.push(...r.conflicts);
    eventIds.push(r.eventId);
    const ev = next.factions.events.find((e) => e.id === r.eventId);
    if (ev) { ev.runId = run.id; ev.band = band; ev.impact = a.impact; ev.involvement = a.involvement; }
    const trig = next.factions.triggers.find((t) => t.id === r.triggerId);
    if (trig) trig.processedRunId = run.id;
    // PROPAGATE: the target's reaction waits for the next run.
    if (a.target.kind === 'faction' && fam.stance < 0 && (SUCCESS_BANDS.includes(band) || b.backfire)) {
      followOns.push({ factionId: a.target.id, summary: `${(getEntity(next, a.target.id) || {}).name || 'A faction'} reacts to: ${a.title}`, eventId: r.eventId });
    }
  }
  const f = next.factions;
  const answered = new Set(run.triggerIds || []);
  for (const t of f.triggers) if (answered.has(t.id) && !t.processedRunId) t.processedRunId = run.id;
  for (const fo of followOns) {
    const parent = f.triggers.find((t) => (t.eventIds || []).includes(fo.eventId));
    const depth = (parent && Number(parent.depth)) || 0;
    if (depth + 1 > PROPAGATION_DEPTH) continue;
    f.triggers.push({ id: rid('ftr'), kind: 'follow-on', summary: fo.summary, refs: [fo.factionId], turn, at, eventIds: [], depth: depth + 1, causeEventId: fo.eventId });
  }
  const live = f.runs.find((r) => r.id === runId);
  live.status = 'committed'; live.committedAt = at; live.eventIds = eventIds; live.skipped = skipped;
  f.lastProcessed = { ...f.lastProcessed, turn: Math.max(Number(f.lastProcessed.turn) || 0, turn) };
  return { campaign: next, eventIds, skipped, conflicts };
}

/** The run currently in preview, if any. */
export function previewRun(campaign) {
  return factionsState(campaign).runs.filter((r) => r.status === 'preview').pop() || null;
}

const likelyCache = new WeakMap();
/** What the factions are most likely to do next, for the Overview and the
 *  Navigator card: the top actions of a read-only proposal with a fixed
 *  seed. Cached per campaign object. */
export function likelyNext(campaign, n = 3) {
  if (campaign && typeof campaign === 'object' && likelyCache.has(campaign)) return likelyCache.get(campaign).slice(0, n);
  const run = proposeFactionTurn(campaign, { seed: 'likely', cause: 'preview' });
  const out = run.actions.slice().sort((a, b) => IMPACT_ORDER.indexOf(b.impact) - IMPACT_ORDER.indexOf(a.impact) || b.relevance.score - a.relevance.score)
    .map((a) => ({ factionId: a.factionId, title: a.title, family: a.family, label: FAMILY.get(a.family).label, impact: a.impact, reasons: a.relevance.reasons, why: a.why }));
  if (campaign && typeof campaign === 'object') likelyCache.set(campaign, out);
  return out.slice(0, n);
}

// ---------------------------------------------------------------------------
// Search and filters (U14): faction type, stance toward the party, status,
// objective, location, Conflict and activity.

export const FACTION_FILTERS = {
  stance: [{ id: 'hostile', label: 'Hostile (−2 or worse)' }, { id: 'wary', label: 'Wary (−1)' }, { id: 'neutral', label: 'Neutral (0)' }, { id: 'friendly', label: 'Friendly (+1 or better)' }],
  status: [{ id: 'active', label: 'Active' }, { id: 'on', label: 'On stage' }, { id: 'paused', label: 'Paused' }, { id: 'muted', label: 'Muted' }, { id: 'excluded', label: 'Excluded' }],
  objective: [{ id: 'has', label: 'Has a plan' }, { id: 'near', label: 'One step from its goal' }, { id: 'none', label: 'No plan' }],
  activity: [{ id: 'recent', label: 'Acted in the last 2 turns' }, { id: 'quiet', label: 'Quiet for 3 turns' }],
};

/** The factions matching every given filter. `q` matches name, type, drive
 *  and motivation; `locationId` any edge to that Location; `conflictId` a
 *  side in that Conflict. */
export function filterFactions(campaign, { q = '', type = '', stance = '', status = '', objective = '', locationId = '', conflictId = '', activity = '' } = {}) {
  const query = String(q || '').toLowerCase();
  const turn = currentFactionTurn(campaign);
  const events = factionsState(campaign).events.filter((e) => e.status === 'applied');
  const conflict = conflictId ? getEntity(campaign, conflictId) : null;
  return listEntities(campaign, ['faction']).filter((f) => {
    const p = factionProfile(f);
    if (query && ![f.name, p.factionType, p.drive, p.motivation].some((v) => String(v || '').toLowerCase().includes(query))) return false;
    if (type && p.factionType !== type) return false;
    if (stance) {
      const s = stanceOf(campaign, f.id, 'party');
      if (stance === 'hostile' && s > -2) return false;
      if (stance === 'wary' && s !== -1) return false;
      if (stance === 'neutral' && s !== 0) return false;
      if (stance === 'friendly' && s < 1) return false;
    }
    if (status) {
      if (status === 'active' && (p.paused || p.muted || p.excluded || p.stage === 'off')) return false;
      if (status === 'on' && p.stage !== 'on') return false;
      if (['paused', 'muted', 'excluded'].includes(status) && !p[status]) return false;
    }
    if (objective) {
      const obj = activeObjective(campaign, f.id);
      if (objective === 'has' && !obj) return false;
      if (objective === 'none' && obj) return false;
      if (objective === 'near' && !(obj && obj.thread && obj.thread.segments - obj.thread.filled === 1)) return false;
    }
    if (locationId && !(f.relationships || []).some((r) => r.to === locationId)) return false;
    if (conflictId && !(conflict && Array.isArray(conflict.sides) && conflict.sides.some((s) => s.factionId === f.id))) return false;
    if (activity) {
      const mine = events.filter((e) => (e.actorIds || []).includes(f.id) || (e.targetRefs || []).includes(f.id));
      if (activity === 'recent' && !mine.some((e) => (Number(e.turn) || 0) >= turn - 1)) return false;
      if (activity === 'quiet' && mine.some((e) => (Number(e.turn) || 0) >= turn - 2)) return false;
    }
    return true;
  });
}

export function familyDef(id) { return FAMILY.get(id) || null; }
export function bandDef(id) { return BAND.get(id) || null; }
