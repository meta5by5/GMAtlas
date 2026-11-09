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

import { createEntity, getEntity, updateEntity, addRelationship, listEntities } from './entities.js';

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

/** Saves what the Composer holds as an Encounter (a `conflict` entity) and
 *  links it to the scene's people, assets and locations. Returns
 *  {campaign, id}; with nothing in the Composer, returns the campaign
 *  unchanged and id null. */
export function createEncounterFromComposer(campaign, { name } = {}) {
  const snap = composerSnapshot(campaign);
  if (!composerHasContent(snap)) return { campaign, id: null };
  const made = createEntity(campaign, { type: 'conflict', name: text(name) || encounterName(snap) });
  let next = made.campaign;
  const overview = [snap.situation, snap.objective && `Objective: ${snap.objective}`].filter(Boolean).join('\n\n');
  next = updateEntity(next, made.id, {
    status: 'active',
    overview,
    locationId: snap.locations[0] ? snap.locations[0].id : '',
    precipitatingIncident: snap.opening || snap.sceneSummary,
    gmNotes: [snap.siteDescription, snap.surroundings, snap.complication && `Complication: ${snap.complication}`].filter(Boolean).join('\n'),
    sceneId: snap.sceneId,
    sceneNumber: snap.sceneNumber,
    encounterMode: snap.mode,
    encounterActivity: snap.activity,
    fromComposer: true,
  });
  const link = (list, label, type = 'linked') => { for (const e of list) next = addRelationship(next, made.id, e.id, label, type); };
  link(snap.protagonists, 'protagonist');
  link(snap.antagonists, 'antagonist');
  link(snap.bystanders, 'bystander');
  link(snap.assets, 'asset in play');
  link(snap.locations, 'takes place at', 'located_at');
  return { campaign: next, id: made.id };
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
