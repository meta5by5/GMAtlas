// factionProfile.js — faction records for the Factions design
// (design/FACTION-ROADMAP.md F1; design/Faction-baseline.md B4.2–B4.4):
// the profile fields on a faction entity, standing (stance and trust)
// derived from the Ledger with decay, pins and ripple, the grouped
// breakdown, and the seeded faction generator with its collision rule.
// Pure and DOM-free: every mutator takes a campaign and returns a new one.

import {
  createEntity, getEntity, listEntities, addRelationship, updateRelationshipMeta,
} from './entities.js';
import { normalizeFactionsState, factionsState, makeLedgerEntry, migratedLedgerId, liveLedgerEntries } from './factionState.js';
import { makeRng } from './oracles.js';
import {
  STANCE_MIN, STANCE_MAX, TRUST_MIN, TRUST_MAX, STANCE_LEVELS, MIGRATED_STANCE,
} from '../data/factionRelations.js';
import {
  factionFlavorFor, BEHAVIOR_AXES, BEHAVIOR_MIN, BEHAVIOR_MAX, CAPABILITIES, CAPABILITY_BANDS, STATE_KEYS,
  STATE_BANDS, FACTION_SIZES, MEMORY_KINDS, METHODS, BEHAVIOR_PROFILES, MOTIVATIONS, DRIVES, FEARS, TABOOS,
  FACTION_TYPES, NAME_PARTS, FACE_ROLES, FACE_MANNERS, PUBLIC_FACES, HIDDEN_AGENDAS, OBJECTIVES,
} from '../data/factionOracles.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Profile fields (B4.2). Added only when first written; `factionProfile`
// reads every field with its default, so an untouched faction is valid.

const TEXT_FIELDS = ['factionType', 'publicFace', 'hiddenAgenda', 'origin', 'emblem', 'motivation', 'ideology', 'fear', 'drive'];
const LIST_FIELDS = ['interests', 'taboos', 'methods', 'faceIds'];
const METHOD_IDS = METHODS.map((m) => m.id);
const SIZE_IDS = FACTION_SIZES.map((s) => s.id);
export const FACTION_STAGES = ['auto', 'on', 'off'];
export const FACTION_MODE_OVERRIDES = ['', 'passive', 'standard', 'advanced'];
export const ATTENTION_MAX = 9;

/** A legacy 0–10 force/cunning/wealth value as a capability band 1–4. */
function bandFromStat(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n <= 2 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : 4;
}

/** Every profile field with its default, without changing the entity. */
export function factionProfile(e) {
  const f = e || {};
  const behavior = {};
  for (const a of BEHAVIOR_AXES) behavior[a.key] = Number.isFinite(f.behavior && f.behavior[a.key]) ? f.behavior[a.key] : 0;
  const capabilities = {};
  for (const c of CAPABILITIES) {
    const own = f.capabilities && f.capabilities[c.key];
    capabilities[c.key] = Number.isFinite(own) ? own : (own === null ? null : (['force', 'cunning', 'wealth'].includes(c.key) ? bandFromStat(f[c.key]) : null));
  }
  const state = {};
  for (const s of STATE_KEYS) state[s.key] = Number.isFinite(f.state && f.state[s.key]) ? f.state[s.key] : null;
  const out = {};
  for (const k of TEXT_FIELDS) out[k] = typeof f[k] === 'string' ? f[k] : '';
  for (const k of LIST_FIELDS) out[k] = Array.isArray(f[k]) ? f[k].slice() : [];
  const size = SIZE_IDS.includes(f.size) ? f.size : '';
  return {
    ...out, behavior, capabilities, state, size,
    reach: Number.isFinite(f.reach) ? f.reach : (size ? FACTION_SIZES.find((s) => s.id === size).reach : 2),
    attention: Number.isFinite(f.attention) ? f.attention : 0,
    stage: FACTION_STAGES.includes(f.stage) ? f.stage : 'auto',
    paused: !!f.paused, excluded: !!f.excluded, muted: !!f.muted,
    modeOverride: FACTION_MODE_OVERRIDES.includes(f.modeOverride) ? f.modeOverride : '',
    memories: Array.isArray(f.memories) ? f.memories.slice() : [],
  };
}

/** Sets one profile field. `path` is a field name, or `behavior.<axis>`,
 *  `capabilities.<key>`, `state.<key>`. Values are validated; an invalid
 *  one is ignored. '' or null clears a band, list or text. */
export function setFactionProfile(campaign, factionId, path, value) {
  const next = clone(campaign);
  const e = getEntity(next, factionId);
  if (!e || e.type !== 'faction') return next;
  const [group, key] = String(path).split('.');
  const empty = value === null || value === '' || value === undefined;
  if (group === 'behavior' && BEHAVIOR_AXES.some((a) => a.key === key)) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return next;
    e.behavior = { ...(e.behavior || {}), [key]: clamp(n, BEHAVIOR_MIN, BEHAVIOR_MAX) };
  } else if (group === 'capabilities' && CAPABILITIES.some((c) => c.key === key)) {
    const n = Math.round(Number(value));
    e.capabilities = { ...(e.capabilities || {}), [key]: empty || !Number.isFinite(n) ? null : clamp(n, 1, CAPABILITY_BANDS.length) };
  } else if (group === 'state' && STATE_KEYS.some((s) => s.key === key)) {
    const n = Math.round(Number(value));
    e.state = { ...(e.state || {}), [key]: empty || !Number.isFinite(n) ? null : clamp(n, 1, STATE_BANDS.length) };
  } else if (TEXT_FIELDS.includes(group) && !key) {
    e[group] = empty ? '' : String(value).slice(0, 2000);
  } else if (LIST_FIELDS.includes(group) && !key) {
    let list = empty ? [] : (Array.isArray(value) ? value : String(value).split(/\s*[,;\n]\s*/));
    list = [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
    if (group === 'methods') list = list.filter((m) => METHOD_IDS.includes(m));
    if (group === 'faceIds') list = list.filter((id) => { const n = getEntity(next, id); return n && (n.type === 'npc' || n.type === 'lifeform'); });
    e[group] = list;
  } else if (group === 'reach' && !key) {
    const n = Math.round(Number(value));
    if (Number.isFinite(n)) e.reach = clamp(n, 0, 4);
  } else if (group === 'size' && !key) {
    if (empty) e.size = '';
    else if (SIZE_IDS.includes(value)) { e.size = value; if (!Number.isFinite(e.reach)) e.reach = FACTION_SIZES.find((s) => s.id === value).reach; }
  } else if (group === 'attention' && !key) {
    const n = Math.round(Number(value));
    if (Number.isFinite(n)) e.attention = clamp(n, 0, ATTENTION_MAX);
  } else if (group === 'stage' && !key) {
    if (FACTION_STAGES.includes(value)) e.stage = value;
  } else if (['paused', 'excluded', 'muted'].includes(group) && !key) {
    e[group] = value === true || value === 'true' || value === 'on';
  } else if (group === 'modeOverride' && !key) {
    if (FACTION_MODE_OVERRIDES.includes(empty ? '' : value)) e.modeOverride = empty ? '' : value;
  }
  return next;
}

/** Adds a memory (a debt, promise, betrayal, favor, defeat or grievance). */
export function addFactionMemory(campaign, factionId, fields = {}) {
  const next = clone(campaign);
  const e = getEntity(next, factionId);
  if (!e || e.type !== 'faction') return next;
  if (!Array.isArray(e.memories)) e.memories = [];
  e.memories.push({
    id: fields.id || `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind: MEMORY_KINDS.some((k) => k.id === fields.kind) ? fields.kind : 'grievance',
    aboutId: String(fields.aboutId || ''),
    text: String(fields.text || ''),
    severity: clamp(Math.round(Number(fields.severity)) || 1, 1, 3),
    turn: Number.isFinite(Number(fields.turn)) ? Number(fields.turn) : currentFactionTurn(next),
    eventId: fields.eventId || '',
    tags: Array.isArray(fields.tags) ? fields.tags.map(String) : [],
  });
  return next;
}

export function removeFactionMemory(campaign, factionId, memoryId) {
  const next = clone(campaign);
  const e = getEntity(next, factionId);
  if (e && Array.isArray(e.memories)) e.memories = e.memories.filter((m) => m.id !== memoryId);
  return next;
}

// ---------------------------------------------------------------------------
// Standing (B4.4): stance −3..+3 and trust −2..+2, derived from the Ledger.

/** The faction clock: the later of the SWN round counter and the engine's
 *  own processed turn. */
export function currentFactionTurn(campaign) {
  const f = factionsState(campaign);
  return Math.max(Number(campaign && campaign.factionTurnNumber) || 0, Number(f.lastProcessed && f.lastProcessed.turn) || 0);
}

/** Half-life in faction turns per decay kind. */
export const DECAY_HALF_LIFE = { none: Infinity, slow: 6, fast: 2 };
export function decayFactor(decay, age) {
  const h = DECAY_HALF_LIFE[decay];
  if (!h || h === Infinity || age <= 0) return 1;
  return Math.pow(0.5, age / h);
}

const RANGE = { stance: [STANCE_MIN, STANCE_MAX], trust: [TRUST_MIN, TRUST_MAX] };

function edgeBetween(campaign, fromId, toId) {
  const a = getEntity(campaign, fromId);
  return (a && Array.isArray(a.relationships) && a.relationships.find((r) => r.to === toId)) || null;
}

/** The stance an allied_with/rival_of edge implies while the Ledger has no
 *  entry for that pair yet (so a GM-typed edge reads correctly). */
function impliedStance(campaign, fromId, toId) {
  const r = edgeBetween(campaign, fromId, toId);
  return (r && MIGRATED_STANCE[r.type]) || 0;
}

function pinOf(campaign, fromId, toId, field) {
  if (toId === 'party') {
    const e = getEntity(campaign, fromId);
    const p = e && e.partyPin;
    return p && Number.isFinite(p[field]) ? p[field] : null;
  }
  const r = edgeBetween(campaign, fromId, toId);
  if (!r) return null;
  if (field === 'stance' && r.stancePinned && Number.isFinite(r.stance)) return r.stance;
  if (field === 'trust' && r.trustPinned && Number.isFinite(r.trust)) return r.trust;
  return null;
}

/** The full standing of `fromId` toward `toId` for one field:
 *  { value, raw, pinned, entries }. */
export function standing(campaign, fromId, toId, field = 'stance') {
  const turn = currentFactionTurn(campaign);
  const entries = factionsState(campaign).ledger.filter((l) => l.fromId === fromId && l.toId === toId && l.field === field);
  let raw = 0;
  for (const l of entries) raw += l.delta * decayFactor(l.decay, turn - (l.turn || 0));
  if (!entries.length && field === 'stance') raw = impliedStance(campaign, fromId, toId);
  const [lo, hi] = RANGE[field];
  const pin = pinOf(campaign, fromId, toId, field);
  const derived = clamp(Math.round(raw), lo, hi);
  return { value: pin === null ? derived : clamp(pin, lo, hi), derived, raw, pinned: pin !== null, entries };
}

export function stanceOf(campaign, fromId, toId) { return standing(campaign, fromId, toId, 'stance').value; }
export function trustOf(campaign, fromId, toId) { return standing(campaign, fromId, toId, 'trust').value; }

/** The label and glyph for a stance number, never color alone (B4.4). */
export function stanceLabel(n) {
  const lv = STANCE_LEVELS.find((s) => s.n === n) || STANCE_LEVELS.find((s) => s.n === 0);
  const glyph = n <= -2 ? '⚔' : n < 0 ? '⚠' : n === 0 ? '○' : n < 2 ? '◇' : '◆';
  return { n, label: lv.label, glyph, text: `${glyph} ${n > 0 ? '+' : ''}${n} ${lv.label}` };
}

/** Why the number is what it is: Ledger entries grouped by reason, each
 *  with its count, decayed total, newest age and decay (R10, R11). */
export function standingBreakdown(campaign, fromId, toId, field = 'stance') {
  const s = standing(campaign, fromId, toId, field);
  const turn = currentFactionTurn(campaign);
  const groups = new Map();
  for (const l of liveLedgerEntries(s.entries)) {
    const key = `${l.reason}\u0000${l.decay}`;
    const g = groups.get(key) || { reason: l.reason || '(no reason given)', decay: l.decay, count: 0, total: 0, raw: 0, newestAge: Infinity, sources: new Set() };
    g.count += 1;
    g.raw += l.delta;
    g.total += l.delta * decayFactor(l.decay, turn - (l.turn || 0));
    g.newestAge = Math.min(g.newestAge, turn - (l.turn || 0));
    g.sources.add(l.source);
    groups.set(key, g);
  }
  const lines = [...groups.values()].map((g) => ({ ...g, total: Math.round(g.total * 100) / 100, sources: [...g.sources] }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  if (!s.entries.length && field === 'stance' && s.raw) {
    lines.push({ reason: s.raw > 0 ? 'Marked Allied With' : 'Marked Rival Of', decay: 'none', count: 1, total: s.raw, raw: s.raw, newestAge: 0, sources: ['graph'] });
  }
  return { ...s, lines };
}

/** Keeps an existing linked/allied_with/rival_of edge in step with stance
 *  (+2 or more allied, −2 or less rival). Never creates an edge, and never
 *  retypes an edge the GM gave another type. */
function syncStanceEdge(campaign, fromId, toId) {
  const r = edgeBetween(campaign, fromId, toId);
  if (!r || !['linked', 'allied_with', 'rival_of'].includes(r.type)) return;
  const v = stanceOf(campaign, fromId, toId);
  if (v >= 2) r.type = 'allied_with';
  else if (v <= -2) r.type = 'rival_of';
  else if (r.type !== 'linked') r.type = 'linked';
}

function isFaction(campaign, id) { const e = getEntity(campaign, id); return !!e && e.type === 'faction'; }

/** Records a change in how `fromId` regards `toId` (a faction or 'party'):
 *  one Ledger entry, then ripple (stance only): factions that are friends of
 *  `fromId` (+2 or more) shift by +Δ/2 toward `toId`, its enemies (−2 or
 *  less) by −Δ/2. Ripple entries decay fast and share the change set. */
export function changeStanding(campaign, fields = {}) {
  let next = normalizeFactionsState(clone(campaign));
  const field = fields.field === 'trust' ? 'trust' : 'stance';
  const { fromId, toId } = fields;
  const delta = Number(fields.delta);
  if (!fromId || !toId || fromId === toId || !Number.isFinite(delta) || !delta) return next;
  const turn = Number.isFinite(Number(fields.turn)) ? Number(fields.turn) : currentFactionTurn(next);
  const base = { turn, source: fields.source || 'gm', eventId: fields.eventId || '', changeSetId: fields.changeSetId || '', visibility: fields.visibility || 'gm' };
  const ledger = next.factions.ledger;
  const seedImplied = (a, b) => {
    if (b === 'party' || ledger.some((l) => l.fromId === a && l.toId === b && l.field === 'stance')) return;
    const implied = impliedStance(next, a, b);
    const id = migratedLedgerId(a, b);
    if (implied && !ledger.some((l) => l.id === id)) {
      ledger.push(makeLedgerEntry({ id, fromId: a, toId: b, delta: implied, reason: implied > 0 ? 'Allied before the Ledger began' : 'Rivals before the Ledger began', source: 'migrated', turn: 0 }));
    }
  };
  // Who ripples, measured before this change lands.
  const ripples = [];
  if (field === 'stance' && fields.ripple !== false && isFaction(next, fromId)) {
    for (const f of listEntities(next, ['faction'])) {
      if (f.id === fromId || f.id === toId) continue;
      const s = stanceOf(next, f.id, fromId);
      if (s >= 2) ripples.push({ id: f.id, d: delta / 2 });
      else if (s <= -2) ripples.push({ id: f.id, d: -delta / 2 });
    }
  }
  if (field === 'stance') seedImplied(fromId, toId);
  ledger.push(makeLedgerEntry({ ...base, fromId, toId, field, delta, reason: fields.reason || '', decay: fields.decay || 'none' }));
  const via = getEntity(next, fromId);
  for (const r of ripples) {
    seedImplied(r.id, toId);
    ledger.push(makeLedgerEntry({ ...base, fromId: r.id, toId, field: 'stance', delta: r.d, reason: `Because of ${(via && via.name) || 'an ally'}: ${fields.reason || 'a change in standing'}`, decay: 'fast' }));
  }
  if (field === 'stance' && toId !== 'party') {
    syncStanceEdge(next, fromId, toId);
    for (const r of ripples) syncStanceEdge(next, r.id, toId);
  }
  return next;
}

/** Pins (or with null, unpins) stance or trust so it overrides the Ledger.
 *  Toward the party it lives on the faction (`partyPin`); toward another
 *  faction on the edge, creating a plain linked edge if none exists. */
export function pinStanding(campaign, fromId, toId, value, field = 'stance') {
  const f = field === 'trust' ? 'trust' : 'stance';
  let next = clone(campaign);
  if (!isFaction(next, fromId)) return next;
  const clear = value === null || value === '' || value === undefined;
  const [lo, hi] = RANGE[f];
  const v = clamp(Math.round(Number(value)), lo, hi);
  if (!clear && !Number.isFinite(v)) return next;
  if (toId === 'party') {
    const e = getEntity(next, fromId);
    const pin = { ...(e.partyPin || {}) };
    if (clear) delete pin[f]; else pin[f] = v;
    e.partyPin = pin;
    return next;
  }
  if (!getEntity(next, toId)) return next;
  if (!edgeBetween(next, fromId, toId)) {
    if (clear) return next;
    next = addRelationship(next, fromId, toId, 'linked', 'linked');
  }
  next = updateRelationshipMeta(next, fromId, toId, clear ? { [f]: null, [`${f}Pinned`]: null } : { [f]: v, [`${f}Pinned`]: true });
  return next;
}

// ---------------------------------------------------------------------------
// The generator (B4.2, B4.3; FACTION-ROADMAP F1).

function picker(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const pickN = (arr, n) => {
    const pool = arr.slice(); const out = [];
    while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  return { pick, pickN };
}

const TURF_TYPES = ['controls', 'owns', 'occupies', 'claims', 'influences'];

/** Where existing factions stand: their active objectives, and the
 *  Locations they hold. */
function collisionTargets(campaign) {
  const objectives = factionsState(campaign).objectives.filter((o) => o && o.status !== 'resolved' && o.status !== 'abandoned' && isFaction(campaign, o.factionId));
  const turf = [];
  for (const f of listEntities(campaign, ['faction'])) {
    for (const r of f.relationships || []) {
      const loc = getEntity(campaign, r.to);
      if (TURF_TYPES.includes(r.type) && loc && loc.type === 'location') turf.push({ factionId: f.id, locationId: loc.id });
    }
  }
  return { objectives, turf };
}

function objectiveTemplates(flavor, stake) {
  const own = (OBJECTIVES[flavor] || []).filter((o) => !stake || o.stake === stake);
  const gen = OBJECTIVES.generic.filter((o) => !stake || o.stake === stake);
  return [...own, ...gen];
}

const PLACE_FALLBACK = { generic: 'the old market', fantasy: 'the river crossing', scifi: 'the orbital yards', cyberpunk: 'the night market' };

/** Generates one faction from the oracle tables, seeded and deterministic
 *  apart from record ids and timestamps. Returns { campaign, id,
 *  objectiveId, faceId, collidesWith }.
 *
 *  Collision rule (B4.3): the first objective collides with an existing
 *  faction's objective (same stake, same target) or, failing that, with
 *  an existing faction's turf. Only the very first faction is free. */
export function generateFaction(campaign, { seed = Date.now(), genrePack, locationId, at } = {}) {
  const rng = makeRng(seed);
  const { pick, pickN } = picker(rng);
  const stamp = at || now();
  let next = normalizeFactionsState(clone(campaign));
  const priorActive = next.entities && next.entities.activeId;
  const flavor = factionFlavorFor(genrePack || (next.settings && next.settings.genrePack));
  const taken = new Set(listEntities(next, ['faction']).map((f) => (f.name || '').toLowerCase()));
  const parts = NAME_PARTS[flavor] || NAME_PARTS.generic;
  let name = '';
  for (let i = 0; i < 20 && (!name || taken.has(name.toLowerCase())); i += 1) name = `${i > 10 ? 'New ' : ''}${pick(parts.a)} ${pick(parts.b)}`;
  if (taken.has(name.toLowerCase())) name = `${name} ${taken.size + 1}`;

  const profile = pick(BEHAVIOR_PROFILES);
  const size = pick(['gang', 'organization', 'organization', 'organization', 'power']);
  const methods = [...new Set([...profile.methods, pick(METHODS).id])];
  const capKeys = pickN(CAPABILITIES.map((c) => c.key), 3);
  const capabilities = {};
  capKeys.forEach((k, i) => { capabilities[k] = i === 0 ? 3 : 1 + Math.floor(rng() * 3); });

  // The objective and its collision.
  const { objectives, turf } = collisionTargets(next);
  let template; let placeId = locationId && getEntity(next, locationId) ? locationId : '';
  let collidesWith = null;
  if (objectives.length) {
    const other = pick(objectives);
    const pool = objectiveTemplates(flavor, other.stake);
    template = pick(pool.length ? pool : objectiveTemplates(flavor));
    const otherPlace = (other.targetRefs || []).find((id) => { const l = getEntity(next, id); return l && l.type === 'location'; });
    if (otherPlace) placeId = otherPlace;
    collidesWith = { factionId: other.factionId, objectiveId: other.id, stake: other.stake };
  } else if (turf.length) {
    const t = pick(turf);
    const placed = objectiveTemplates(flavor).filter((o) => o.title.includes('{place}'));
    template = pick(placed);
    placeId = t.locationId;
    collidesWith = { factionId: t.factionId, locationId: t.locationId, stake: template.stake };
  } else {
    template = pick(objectiveTemplates(flavor));
  }
  const placeName = placeId ? (getEntity(next, placeId).name || 'the contested place') : PLACE_FALLBACK[flavor];
  const fill = (s) => s.split('{place}').join(placeName);
  const title = fill(template.title);

  // The faction entity.
  const made = createEntity(next, { type: 'faction', name });
  next = made.campaign;
  const id = made.id;
  const e = getEntity(next, id);
  Object.assign(e, {
    factionType: pick(FACTION_TYPES[flavor] || FACTION_TYPES.generic),
    motivation: pick(MOTIVATIONS),
    drive: pick(DRIVES),
    fear: pick(FEARS),
    taboos: [pick(TABOOS)],
    publicFace: pick(PUBLIC_FACES),
    hiddenAgenda: pick(HIDDEN_AGENDAS),
    behavior: { ...profile.behavior },
    behaviorProfile: profile.label,
    methods,
    capabilities,
    size,
    reach: FACTION_SIZES.find((s) => s.id === size).reach,
    attention: 0,
    stage: 'auto',
    agenda: title,
    generatedFrom: { seed: Number(seed) >>> 0, flavor },
  });
  e.secret = e.secret || e.hiddenAgenda;

  // Its face: someone players can talk to (R4).
  const role = pick(FACE_ROLES[flavor] || FACE_ROLES.generic);
  const faceMade = createEntity(next, { type: 'npc', name: `${role} of the ${name}` });
  next = faceMade.campaign;
  const face = getEntity(next, faceMade.id);
  face.overview = `${role} for the ${name}: ${pick(FACE_MANNERS)}.`;
  next = addRelationship(next, faceMade.id, id, 'face', 'member_of');
  getEntity(next, id).faceIds = [faceMade.id];

  // The objective, its project and the project's Thread with Signs.
  const objectiveId = `obj_${Date.now().toString(36)}_${Math.floor(rng() * 1e8).toString(36)}`;
  const projectId = `prj_${Date.now().toString(36)}_${Math.floor(rng() * 1e8).toString(36)}`;
  const threadId = `thr_${Date.now().toString(36)}_${Math.floor(rng() * 1e8).toString(36)}`;
  const signs = template.signs.map(fill);
  next.factions.objectives.push({
    id: objectiveId, factionId: id, title, intent: '', priority: 2, scope: placeId ? 'local' : 'regional',
    successCondition: signs[signs.length - 1], failureCondition: '', deadline: '', status: 'active',
    visibility: 'gm', targetRefs: placeId ? [placeId] : [], stake: template.stake, collidesWith,
    createdAt: stamp, updatedAt: stamp,
  });
  next.factions.projects.push({ id: projectId, factionId: id, objectiveId, threadId, status: 'active', createdAt: stamp, updatedAt: stamp });
  if (!Array.isArray(next.threads)) next.threads = [];
  next.threads.push({
    id: threadId, name: `${name}: ${title}`, filled: 0, segments: signs.length, done: false, status: 'active', priority: 'normal',
    kind: 'faction-project', factionId: id, objectiveId, projectId, signs, createdAt: stamp,
  });

  // Presence at the place, and the collision as a first strain.
  if (placeId && !collidesWith) next = addRelationship(next, id, placeId, 'present', 'influences');
  if (placeId && collidesWith && collidesWith.locationId) next = addRelationship(next, id, placeId, 'wants', 'claims');
  if (collidesWith) {
    const why = `Both want it: ${title}`;
    next = changeStanding(next, { fromId: id, toId: collidesWith.factionId, delta: -1, reason: why, source: 'gm', ripple: false });
    next = changeStanding(next, { fromId: collidesWith.factionId, toId: id, delta: -1, reason: why, source: 'gm', ripple: false });
  }
  if (next.entities) next.entities.activeId = priorActive || null;
  return { campaign: next, id, objectiveId, faceId: faceMade.id, collidesWith };
}

/** The starting trio (open question 1's recommendation): three factions,
 *  each after the first colliding with one already made, and one extra
 *  strand in the web so not every tie is hostile. Offered, never automatic. */
export function generateStartingTrio(campaign, { seed = Date.now(), genrePack, locationId } = {}) {
  let next = campaign;
  const ids = [];
  for (let i = 0; i < 3; i += 1) {
    const r = generateFaction(next, { seed: (Number(seed) >>> 0) + i * 7919, genrePack, locationId });
    next = r.campaign;
    ids.push(r.id);
  }
  const rng = makeRng((Number(seed) >>> 0) ^ 0x5f3759df);
  const [a, , c] = ids;
  if (!standing(next, a, c).entries.length) {
    const d = rng() < 0.5 ? 1 : -1;
    const why = d > 0 ? 'An old, quiet understanding' : 'Bad blood from years back';
    next = changeStanding(next, { fromId: a, toId: c, delta: d, reason: why, ripple: false });
    next = changeStanding(next, { fromId: c, toId: a, delta: d, reason: why, ripple: false });
  }
  return { campaign: next, ids };
}

/** Adds an objective by hand: the objective, its project and a 4-segment
 *  faction-project Thread (Signs blank until the GM writes them). */
export function addFactionObjective(campaign, factionId, { title, stake = '', targetRefs = [], segments = 4, signs } = {}) {
  let next = normalizeFactionsState(clone(campaign));
  if (!isFaction(next, factionId) || !String(title || '').trim()) return next;
  const stamp = now();
  const rnd = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const objectiveId = `obj_${rnd()}`; const projectId = `prj_${rnd()}`; const threadId = `thr_${rnd()}`;
  const n = clamp(Math.round(Number(segments)) || 4, 2, 12);
  const f = getEntity(next, factionId);
  next.factions.objectives.push({
    id: objectiveId, factionId, title: String(title).trim(), intent: '', priority: 2, scope: '', successCondition: '', failureCondition: '',
    deadline: '', status: 'active', visibility: 'gm', targetRefs: targetRefs.filter((id) => getEntity(next, id)), stake, collidesWith: null,
    createdAt: stamp, updatedAt: stamp,
  });
  next.factions.projects.push({ id: projectId, factionId, objectiveId, threadId, status: 'active', createdAt: stamp, updatedAt: stamp });
  if (!Array.isArray(next.threads)) next.threads = [];
  next.threads.push({
    id: threadId, name: `${f.name || 'Faction'}: ${String(title).trim()}`, filled: 0, segments: n, done: false, status: 'active', priority: 'normal',
    kind: 'faction-project', factionId, objectiveId, projectId, signs: Array.isArray(signs) ? signs.slice(0, n).map(String) : Array(n).fill(''), createdAt: stamp,
  });
  return next;
}

/** Advance (U10): fills the next segment of a faction-project Thread. A
 *  full Thread marks its objective `achieved` (the outcome a later phase
 *  proposes for review); stepping back reopens it. */
export function advanceFactionProject(campaign, threadId, delta = 1) {
  const next = normalizeFactionsState(clone(campaign));
  const t = (next.threads || []).find((x) => x.id === threadId && x.kind === 'faction-project');
  if (!t) return next;
  t.filled = clamp(t.filled + (delta < 0 ? -1 : 1), 0, t.segments);
  t.done = t.filled >= t.segments;
  t.status = t.done ? 'resolved' : (t.status === 'resolved' ? 'active' : t.status);
  const o = next.factions.objectives.find((x) => x.id === t.objectiveId);
  if (o) {
    if (t.done && o.status === 'active') o.status = 'achieved';
    else if (!t.done && o.status === 'achieved') o.status = 'active';
    o.updatedAt = now();
  }
  return next;
}

/** Adds or removes an NPC as one of a faction's faces. Adding also makes it
 *  a member (member_of) when it has no tie to the faction yet. */
export function addFactionFace(campaign, factionId, npcId) {
  let next = clone(campaign);
  const f = getEntity(next, factionId); const n = getEntity(next, npcId);
  if (!f || f.type !== 'faction' || !n || (n.type !== 'npc' && n.type !== 'lifeform')) return next;
  if (!(n.relationships || []).some((r) => r.to === factionId)) next = addRelationship(next, npcId, factionId, 'face', 'member_of');
  const g = getEntity(next, factionId);
  g.faceIds = [...new Set([...(Array.isArray(g.faceIds) ? g.faceIds : []), npcId])];
  return next;
}
export function removeFactionFace(campaign, factionId, npcId) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  if (f && Array.isArray(f.faceIds)) f.faceIds = f.faceIds.filter((x) => x !== npcId);
  return next;
}

/** A faction's objectives, with their project and Thread. */
export function factionObjectives(campaign, factionId) {
  const f = factionsState(campaign);
  const threads = Array.isArray(campaign.threads) ? campaign.threads : [];
  return f.objectives.filter((o) => o.factionId === factionId).map((o) => {
    const project = f.projects.find((p) => p.objectiveId === o.id) || null;
    const thread = project ? threads.find((t) => t.id === project.threadId) || null : null;
    return { ...o, project, thread };
  });
}
