// encounters.js — Encounters made from the Composer, the AI prompt built
// from it, and the campaign timeline (direct requests, 2026-11-08). Pure and
// DOM-free.
//
// An Encounter is the existing `conflict` entity type, which the app already
// labels "Encounter" (entities.js TYPE_LABEL). Making one from the Composer
// takes what the Composer currently holds — WHO (the scene's Protagonists/
// Antagonists/Bystanders and assets), WHERE (its locations and site text),
// WHAT/WHY/HOW (situation, intent, objective, mode, activity) — and records
// it as an Encounter linked to everyone and everything involved, stamped
// with the scene it came from. The campaign timeline then lays scenes and
// Encounters out in order.

import { createEntity, getEntity, updateEntity, addRelationship, removeRelationship, listEntities, getEntityFaction } from './entities.js';
import { factionsInRegion, getCurrentWhereLocations } from './factionTurnEngine.js';
import { tablesWithOverrides, oraclePathsWithAnyTag, excludeFactionOracleTables } from './oracles.js';
import { INTENT_ORACLE_TAGS } from '../data/entityFieldOracleLinks.js';
import { ENCOUNTER_WIZARD_GUIDE, ENCOUNTER_FIELD_ORACLE_TAGS } from '../data/encounterWizardGuide.js';

const text = (v) => String(v == null ? '' : v).trim();
const names = (campaign, ids) => (ids || []).map((id) => getEntity(campaign, id)).filter(Boolean);

/** The latest scene, or null. */
export function currentScene(campaign) {
  const scenes = (campaign && campaign.scenes) || [];
  return scenes.length ? scenes[scenes.length - 1] : null;
}

/** Everything the Composer currently holds, resolved to names: the input to
 *  both "Add as Encounter" and the AI prompt. */
export function composerSnapshot(campaign) {
  const ctx = (campaign && campaign.context) || {};
  const scene = currentScene(campaign);
  const who = ctx.who || {};
  const where = ctx.where || {};
  const what = ctx.what || {};
  const why = ctx.why || {};
  const how = ctx.how || {};
  const ent = (ids) => names(campaign, ids).map((e) => ({ id: e.id, name: e.name || 'Unnamed', type: e.type }));
  return {
    sceneId: scene ? scene.id : null,
    sceneNumber: scene ? scene.number : null,
    protagonists: ent(scene && scene.protagonistIds),
    antagonists: ent(scene && scene.antagonistIds),
    bystanders: ent(scene && scene.bystanderIds),
    assets: ent(scene && scene.assetIds),
    locations: ent(scene && scene.locationIds),
    whoNotes: text(who.summary),
    siteDescription: text(where.siteDescription),
    surroundings: text(where.surroundings),
    situation: text(what.situation),
    intent: text(what.intent),
    threat: Number(what.threat) || 0,
    mystery: Number(what.mystery) || 0,
    objective: text(why.summary),
    mode: text(how.summary),
    activity: text(how.activity),
    sceneSummary: text(scene && scene.summary),
    opening: text(scene && scene.opening),
    complication: text(scene && scene.complication),
    factions: ent(composerFactionIds(campaign)),
    encounter: composerEncounterFields(campaign),
  };
}

/** Whether the Composer holds anything worth saving as an Encounter. */
export function composerHasContent(snap) {
  const s = snap || {};
  return !!(s.protagonists.length || s.antagonists.length || s.bystanders.length || s.locations.length
    || s.situation || s.objective || s.siteDescription || s.surroundings);
}

/** A name for an Encounter made from this snapshot: the situation's first
 *  line, else "Scene N at <place>". */
export function encounterName(snap) {
  const first = (snap.situation.split('\n')[0] || '').slice(0, 60);
  if (first) return first;
  const place = (snap.locations[0] && snap.locations[0].name) || '';
  return [snap.sceneNumber ? `Scene ${snap.sceneNumber}` : 'Encounter', place ? `at ${place}` : ''].filter(Boolean).join(' ');
}

// --- The Composer as the Encounter builder (direct request, 2026-11-09) -----
// The Composer edits one Encounter (a `conflict` entity) at a time. WHO/
// WHERE/WHAT/WHY/HOW live where they always have (the current scene's cast
// lists and campaign.context); the Encounter's own fields that have no home
// there (status, the stated/root cause gap, the casualty, leverage, history,
// session hooks, GM notes) live in context.encounter, along with the id of
// the Encounter being edited (null = a new one). Saving copies all of it
// onto the record; loading copies a record back. The record keeps the same
// information, without the Composer's oracles and tips.

/** The Encounter fields the Composer edits beyond WHO..HOW, with their labels.
 *  All plain strings; sessionHooks ([{id, text, used}]) is kept alongside. */
export const ENCOUNTER_DETAIL_FIELDS = [
  ['status', 'Status'],
  ['statedCause', "What people say it's about"],
  ['rootCause', "What's actually driving it"],
  ['causeGapHook', 'Why the gap matters'],
  ['thirdPartyCasualty', 'Someone innocent gets hurt regardless'],
  ['precipitatingIncident', 'Precipitating incident'],
  ['deepRootSummary', 'Deep root'],
  ['partyLeverage', 'Party leverage'],
  ['lastDeescalationAttempt', 'Last de-escalation attempt'],
  ['gmNotes', 'GM notes'],
];
const DETAIL_KEYS = ENCOUNTER_DETAIL_FIELDS.map(([k]) => k);

/** The Composer's own copy of the Encounter-only fields, defaulted. */
export function composerEncounterFields(campaign) {
  const raw = (campaign && campaign.context && campaign.context.encounter) || {};
  const out = { id: raw.id || null, name: text(raw.name), sessionHooks: Array.isArray(raw.sessionHooks) ? raw.sessionHooks.map((h) => ({ ...h })) : [] };
  for (const k of DETAIL_KEYS) out[k] = k === 'status' ? (text(raw.status) || 'active') : text(raw[k]);
  return out;
}

/** The factions in play in the Composer — the same list WHO's "Factions
 *  active nearby" shows: present in the region of the scene's places, the
 *  faction each Protagonist/Antagonist/Bystander belongs to, and any added to
 *  the scene by hand (scene.factionIds), minus the ones dismissed from it. */
export function composerFactionIds(campaign) {
  const scene = currentScene(campaign);
  if (!scene) return [];
  const seen = new Set();
  const out = [];
  const add = (id) => { if (id && !seen.has(id)) { seen.add(id); out.push(id); } };
  for (const loc of getCurrentWhereLocations(campaign)) {
    for (const { faction } of factionsInRegion(campaign, loc.id, { maxDepth: 6 })) add(faction.id);
  }
  for (const id of [...(scene.protagonistIds || []), ...(scene.antagonistIds || []), ...(scene.bystanderIds || [])]) {
    const f = getEntityFaction(campaign, id);
    if (f && f.id && getEntity(campaign, f.id)) add(f.id);
  }
  for (const id of scene.factionIds || []) if (getEntity(campaign, id)) add(id);
  const dismissed = new Set(scene.dismissedFactionIds || []);
  return out.filter((id) => !dismissed.has(id));
}

const withScene = (campaign, fn) => {
  const scenes = (campaign.scenes || []).slice();
  if (!scenes.length) return campaign;
  const i = scenes.length - 1;
  scenes[i] = fn({ ...scenes[i] });
  return { ...campaign, scenes };
};

/** Adds a faction to the Composer's scene by hand (and un-dismisses it). */
export function addComposerFaction(campaign, factionId) {
  if (!getEntity(campaign, factionId)) return campaign;
  return withScene(campaign, (sc) => ({
    ...sc,
    factionIds: [...new Set([...(sc.factionIds || []), factionId])],
    dismissedFactionIds: (sc.dismissedFactionIds || []).filter((id) => id !== factionId),
  }));
}

const patchEncounter = (campaign, patch) => ({
  ...campaign,
  context: { ...campaign.context, encounter: { ...composerEncounterFields(campaign), ...patch } },
});

/** Sets one of the Composer's Encounter-only fields (or its name). */
export function setComposerEncounterField(campaign, field, value) {
  if (field !== 'name' && !DETAIL_KEYS.includes(field)) return campaign;
  return patchEncounter(campaign, { [field]: String(value == null ? '' : value) });
}

/** Adds a session hook to the Composer's Encounter. */
export function addComposerSessionHook(campaign, value) {
  const t = text(value);
  if (!t) return campaign;
  const hooks = composerEncounterFields(campaign).sessionHooks;
  return patchEncounter(campaign, { sessionHooks: [...hooks, { id: `hk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: t, used: false }] });
}

/** Removes one session hook from the Composer's Encounter. */
export function removeComposerSessionHook(campaign, hookId) {
  return patchEncounter(campaign, { sessionHooks: composerEncounterFields(campaign).sessionHooks.filter((h) => h.id !== hookId) });
}

/** Starts a new Encounter in the Composer: forgets which record it was
 *  editing and clears the Encounter-only fields (the scene is left alone). */
export function newComposerEncounter(campaign) {
  const blank = { id: null, name: '', sessionHooks: [] };
  for (const k of DETAIL_KEYS) blank[k] = k === 'status' ? 'active' : '';
  return { ...campaign, context: { ...campaign.context, encounter: blank } };
}

// Relationships saving manages on the record (rebuilt on each save).
const CAST_LINKS = [['protagonists', 'protagonist', 'linked'], ['antagonists', 'antagonist', 'linked'], ['bystanders', 'bystander', 'linked'], ['assets', 'asset in play', 'linked'], ['locations', 'takes place at', 'located_at']];
const MANAGED_LABELS = new Set(CAST_LINKS.map(([, label]) => label));

/** Saves what the Composer holds as an Encounter: updates the one it is
 *  editing (context.encounter.id), else creates one and remembers it. The
 *  record gets every Composer field — cast and place id lists, factions (as
 *  its Involved factions), site/surroundings, situation, intent, pressure,
 *  objective, mode, activity — plus the Encounter-only fields, and is linked
 *  to everyone and everything in it. Returns {campaign, id, created}; with
 *  nothing in the Composer, the campaign unchanged and id null. */
export function saveComposerEncounter(campaign, { name } = {}) {
  const snap = composerSnapshot(campaign);
  const enc = snap.encounter;
  const existing = enc.id ? getEntity(campaign, enc.id) : null;
  const editing = existing && existing.type === 'conflict' ? existing : null;
  if (!editing && !composerHasContent(snap)) return { campaign, id: null, created: false };
  let next = campaign;
  let id;
  if (editing) id = editing.id;
  else {
    const made = createEntity(campaign, { type: 'conflict', name: text(name) || enc.name || encounterName(snap) });
    next = made.campaign;
    id = made.id;
  }
  const ids = (list) => list.map((e) => e.id);
  const patch = {
    sceneId: snap.sceneId,
    sceneNumber: snap.sceneNumber,
    locationId: snap.locations[0] ? snap.locations[0].id : '',
    protagonistIds: ids(snap.protagonists),
    antagonistIds: ids(snap.antagonists),
    bystanderIds: ids(snap.bystanders),
    assetIds: ids(snap.assets),
    locationIds: ids(snap.locations),
    factionIds: ids(snap.factions),
    siteDescription: snap.siteDescription,
    surroundings: snap.surroundings,
    situation: snap.situation,
    intent: snap.intent,
    threat: snap.threat,
    mystery: snap.mystery,
    objective: snap.objective,
    encounterMode: snap.mode,
    encounterActivity: snap.activity,
    sessionHooks: enc.sessionHooks,
    fromComposer: true,
  };
  for (const k of DETAIL_KEYS) patch[k] = enc[k];
  if (text(name)) patch.name = text(name);
  else if (enc.name && editing) patch.name = enc.name;
  if (!editing) patch.overview = [snap.situation, snap.objective && `Objective: ${snap.objective}`].filter(Boolean).join('\n\n');
  next = updateEntity(next, id, patch);
  // Rebuild the links this save manages: cast/places by label, factions as
  // `involves` (the Composer's faction list is the Involved list).
  const rec = getEntity(next, id);
  const factionSet = new Set(patch.factionIds);
  const stale = (rec.relationships || []).filter((rl) => MANAGED_LABELS.has(rl.label) || (rl.type === 'involves' && !factionSet.has(rl.to))).map((rl) => rl.to);
  for (const to of new Set(stale)) next = removeRelationship(next, id, to);
  for (const [key, label, type] of CAST_LINKS) for (const e of snap[key]) next = addRelationship(next, id, e.id, label, type);
  const have = new Set((getEntity(next, id).relationships || []).filter((rl) => rl.type === 'involves').map((rl) => rl.to));
  for (const fid of patch.factionIds) if (!have.has(fid)) next = addRelationship(next, id, fid, 'involves', 'involves');
  next = patchEncounter(next, { id, name: getEntity(next, id).name || '' });
  return { campaign: next, id, created: !editing };
}

/** Always makes a NEW Encounter from what the Composer holds. */
export function createEncounterFromComposer(campaign, { name } = {}) {
  const fresh = patchEncounter(campaign, { id: null });
  const r = saveComposerEncounter(fresh, { name });
  return { campaign: r.id ? r.campaign : campaign, id: r.id };
}

const numOr = (v, fallback) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? fallback : Number(v));

/** Fills the Composer from an Encounter record, to edit it: the current
 *  scene's cast, assets, places and hand-added factions (a scene is started
 *  if there is none), WHERE/WHAT/WHY/HOW, and the Encounter-only fields;
 *  the Composer then edits that record. A record saved before Encounters
 *  kept their own cast lists falls back to its relationship labels. */
export function loadEncounterIntoComposer(campaign, id) {
  const e = getEntity(campaign, id);
  if (!e || e.type !== 'conflict') return campaign;
  const rels = e.relationships || [];
  const byLabel = (label) => rels.filter((rl) => rl.label === label).map((rl) => rl.to);
  const list = (field, label) => (Array.isArray(e[field]) && e[field].length ? e[field] : byLabel(label)).filter((x) => getEntity(campaign, x));
  const factionIds = (Array.isArray(e.factionIds) && e.factionIds.length ? e.factionIds : rels.filter((rl) => rl.type === 'involves').map((rl) => rl.to)).filter((x) => getEntity(campaign, x));
  let next = { ...campaign, scenes: (campaign.scenes || []).slice() };
  if (!next.scenes.length) {
    next.scenes.push({ id: `scn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, number: 1, createdAt: new Date().toISOString(), summary: '', protagonistIds: [], antagonistIds: [], bystanderIds: [], assetIds: [], locationIds: [], npcStates: {}, dismissedFactionIds: [] });
  }
  const locationIds = list('locationIds', 'takes place at');
  next = withScene(next, (sc) => ({
    ...sc,
    protagonistIds: list('protagonistIds', 'protagonist'),
    antagonistIds: list('antagonistIds', 'antagonist'),
    bystanderIds: list('bystanderIds', 'bystander'),
    assetIds: list('assetIds', 'asset in play'),
    locationIds: locationIds.length ? locationIds : (e.locationId && getEntity(campaign, e.locationId) ? [e.locationId] : []),
    factionIds,
    dismissedFactionIds: (sc.dismissedFactionIds || []).filter((x) => !factionIds.includes(x)),
  }));
  const ctx = next.context || {};
  const encounter = { id: e.id, name: e.name || '', sessionHooks: Array.isArray(e.sessionHooks) ? e.sessionHooks.map((h) => ({ ...h })) : [] };
  for (const k of DETAIL_KEYS) encounter[k] = text(e[k]) || (k === 'status' ? 'active' : '');
  const what = ctx.what || {};
  next.context = {
    ...ctx,
    where: { ...(ctx.where || {}), siteDescription: text(e.siteDescription), surroundings: text(e.surroundings) },
    what: { ...what, situation: text(e.situation), intent: text(e.intent) || what.intent || 'Discovery', threat: numOr(e.threat, what.threat), mystery: numOr(e.mystery, what.mystery) },
    why: { ...(ctx.why || {}), summary: text(e.objective) },
    how: { ...(ctx.how || {}), summary: text(e.encounterMode), activity: text(e.encounterActivity) },
    encounter,
  };
  return next;
}

/** Every Encounter, oldest first. */
export function listEncounters(campaign) {
  return listEntities(campaign, ['conflict']).slice().sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

// --- AI prompt -------------------------------------------------------------

const line = (label, v) => (v ? `${label}: ${v}` : null);
const list = (label, arr) => (arr.length ? `${label}: ${arr.map((e) => e.name).join(', ')}` : null);

/** A well-formed prompt asking an AI client to write the encounter's
 *  description from what the Composer holds. `genre`/`ruleset` name the
 *  setting so the reply fits it. The reply format is fixed (JSON with
 *  title/description/hooks) so a future automated client can parse it. */
export function composerPrompt(campaign, { genre = '', ruleset = '' } = {}) {
  const s = composerSnapshot(campaign);
  const facts = [
    line('Setting', [genre, ruleset].filter(Boolean).join(' · ')),
    line('Scene', s.sceneNumber ? `#${s.sceneNumber}${s.sceneSummary ? ` — ${s.sceneSummary}` : ''}` : s.sceneSummary),
    list('Protagonists (the players\' characters)', s.protagonists),
    list('Antagonists', s.antagonists),
    list('Bystanders', s.bystanders),
    list('Assets in play', s.assets),
    line('Who notes', s.whoNotes),
    list('Location', s.locations),
    line('Site', s.siteDescription),
    line('Surroundings', s.surroundings),
    line('Situation', s.situation),
    line('Intent', s.intent),
    line('Pressure', `threat ${s.threat}/10, mystery ${s.mystery}/10`),
    line('Objective', s.objective),
    line('Mode', s.mode),
    line('Activity', s.activity),
    line('Opening', s.opening),
    line('Complication', s.complication),
    list('Factions involved', s.factions),
    line('What people say it is about', s.encounter.statedCause),
    line('What is actually driving it', s.encounter.rootCause),
    line('Why the gap matters', s.encounter.causeGapHook),
    line('Someone innocent gets hurt', s.encounter.thirdPartyCasualty),
    line('What lit the fuse', s.encounter.precipitatingIncident),
    line('Party leverage', s.encounter.partyLeverage),
  ].filter(Boolean);
  return [
    'You are helping a tabletop RPG game master prepare an encounter.',
    '',
    'Using only the facts below (invent nothing that contradicts them), write:',
    '1. a short evocative title;',
    '2. a read-aloud description of 3–5 sentences for the players;',
    '3. three hooks or complications the GM can use, one sentence each.',
    '',
    'Facts:',
    ...facts.map((f) => `- ${f}`),
    '',
    'Reply with JSON only, in this shape:',
    '{"title": "...", "description": "...", "hooks": ["...", "...", "..."]}',
  ].join('\n');
}

/** Parses an AI client's reply to composerPrompt into
 *  {title, description, hooks}, or null if it isn't in that shape. For the
 *  future automated flow (core/aiClient.js). */
export function parseEncounterReply(reply) {
  const raw = String(reply || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let data;
  try { data = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  if (!data || typeof data.title !== 'string' || typeof data.description !== 'string') return null;
  return { title: data.title.trim(), description: data.description.trim(), hooks: Array.isArray(data.hooks) ? data.hooks.filter((h) => typeof h === 'string').map((h) => h.trim()) : [] };
}

// --- campaign timeline -------------------------------------------------------

/** The campaign's steps in order: every scene, with the Encounters made from
 *  it, plus Encounters not tied to a scene at the point they were made.
 *  [{kind: 'scene'|'encounter', id, at, label, number?, encounters?}] */
export function campaignTimeline(campaign) {
  const scenes = (campaign && campaign.scenes) || [];
  const encounters = listEncounters(campaign);
  const bySceneId = new Map();
  const loose = [];
  for (const e of encounters) {
    if (e.sceneId && scenes.some((s) => s.id === e.sceneId)) {
      if (!bySceneId.has(e.sceneId)) bySceneId.set(e.sceneId, []);
      bySceneId.get(e.sceneId).push(e);
    } else loose.push(e);
  }
  const enc = (e) => ({ kind: 'encounter', id: e.id, at: e.createdAt || '', label: e.name || 'Unnamed encounter', status: e.status || '' });
  const items = [
    ...scenes.map((s) => ({
      kind: 'scene', id: s.id, at: s.createdAt || '', number: s.number, label: s.summary || `Scene ${s.number}`,
      encounters: (bySceneId.get(s.id) || []).map(enc),
    })),
    ...loose.map(enc),
  ];
  return items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// --- The Encounter wizard's guidance (data/encounterWizardGuide.js) ---------

/** The oracle tags the wizard suggests tables from at one step, in priority
 *  order, deduped. WHAT leads with the current Intent's own tags. */
export function wizardStepTags(campaign, stepKey) {
  const guide = ENCOUNTER_WIZARD_GUIDE[stepKey];
  if (!guide) return [];
  const intent = campaign && campaign.context && campaign.context.what && campaign.context.what.intent;
  const lead = guide.useIntent ? (INTENT_ORACLE_TAGS[intent] || []) : [];
  return [...new Set([...lead, ...guide.tags])];
}

/** Where a kept result for `tag` at `stepKey` goes: "key.field" or 'npc'. */
export function wizardResultTarget(stepKey, tag) {
  const guide = ENCOUNTER_WIZARD_GUIDE[stepKey];
  if (!guide) return null;
  return (guide.tagTargets && guide.tagTargets[tag]) || guide.target;
}

// The tables the Oracle drawer shows: genre pack, GM overrides, and the
// faction-tables switch.
function oracleTablesFor(campaign) {
  const settings = (campaign && campaign.settings) || {};
  const genrePack = settings.statRuleset === 'ironsworn' ? 'fantasy' : settings.genrePack;
  const raw = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, genrePack);
  return settings.factionOraclesEnabled === false ? excludeFactionOracleTables(raw) : raw;
}

/** The oracle tables a Composer field's 🎲 can roll from (its
 *  ENCOUNTER_FIELD_ORACLE_TAGS), as paths; [] for a field with none. */
export function encounterFieldOraclePaths(campaign, target) {
  const tags = ENCOUNTER_FIELD_ORACLE_TAGS[target];
  if (!tags) return [];
  return oraclePathsWithAnyTag(campaign, oracleTablesFor(campaign), tags);
}

/** Oracle tables to suggest at one wizard step: tables carrying the step's
 *  tags, taken one tag at a time in turn so every tag is represented, each
 *  table once. `offset` pages through the full list (wrapping), so "Other
 *  suggestions" shows the next few. Uses the same tables the Oracle drawer
 *  shows (genre pack, GM overrides, the faction-tables switch). Returns
 *  [{ path, tag, target }]. Deterministic. */
export function wizardOracleSuggestions(campaign, stepKey, { limit = 5, offset = 0 } = {}) {
  const tags = wizardStepTags(campaign, stepKey);
  if (!tags.length) return [];
  const tables = oracleTablesFor(campaign);
  const perTag = tags.map((tag) => ({ tag, paths: oraclePathsWithAnyTag(campaign, tables, [tag]) }));
  const seen = new Set();
  const all = [];
  for (let i = 0; perTag.some((t) => i < t.paths.length); i++) {
    for (const t of perTag) {
      const path = t.paths[i];
      if (!path) continue;
      const key = path.join('>');
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ path, tag: t.tag, target: wizardResultTarget(stepKey, t.tag) });
    }
  }
  if (all.length <= limit) return all;
  const start = ((offset % all.length) + all.length) % all.length;
  return Array.from({ length: limit }, (_, k) => all[(start + k) % all.length]);
}

/** Appends a kept oracle result to a Composer field ("key.field", e.g.
 *  'what.situation'), on a new line after anything already there. Returns a
 *  new campaign; an unknown target or empty text returns it unchanged. */
export function applyWizardResult(campaign, target, value) {
  if (target === 'encounter.sessionHooks') return addComposerSessionHook(campaign, value);
  const t = text(value);
  const [key, field] = String(target || '').split('.');
  if (!t || !key || !field || !campaign.context || !campaign.context[key]) return campaign;
  const current = text(campaign.context[key][field]);
  return {
    ...campaign,
    context: { ...campaign.context, [key]: { ...campaign.context[key], [field]: current ? `${current}\n${t}` : t } },
  };
}

/** A short NPC name from an oracle result: its last line, after any
 *  "Table:" or "→" label, cut to a few words. */
export function npcNameFromOracleText(value) {
  const last = text(value).split('\n').filter(Boolean).pop() || '';
  const body = last.split(/→|:\s/).pop().trim().replace(/[.;,]+$/, '');
  const words = body.split(/\s+/).filter(Boolean);
  return words.length > 6 ? `${words.slice(0, 6).join(' ')}…` : body;
}

/** An oracle roll's text without its "Table > Subtable" breadcrumb line —
 *  what goes into a Composer field or an NPC's overview. */
export function oracleResultBody(value) {
  const lines = text(value).split('\n');
  return (lines.length > 1 && / > /.test(lines[0]) ? lines.slice(1) : lines).join('\n').trim();
}

/** Whether loading an Encounter would replace anything in the Composer: a
 *  cast, place, situation or objective (composerHasContent), an Encounter it
 *  is editing, a name, any Encounter-only field other than the default
 *  status, or a session hook. */
export function composerHoldsAnything(campaign) {
  if (composerHasContent(composerSnapshot(campaign))) return true;
  const enc = composerEncounterFields(campaign);
  if (enc.id || enc.name || enc.sessionHooks.length) return true;
  return DETAIL_KEYS.some((k) => (k === 'status' ? enc.status !== 'active' : !!enc[k]));
}
