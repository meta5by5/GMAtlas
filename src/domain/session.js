// session.js — orchestration. These take a whole campaign and return a NEW
// campaign, composing the pure domain pieces (context shifts, scene generation,
// oracle rolls) and keeping the timeline + journal in sync. The UI calls these
// through store.update(); they never touch the store or the DOM themselves.

import { applyShift } from './context.js';
import { generateScene } from './scenes.js';
import { tablesWithOverrides, rollTable, rollGroup, formatRoll, pick } from './oracles.js';
import { linkMentions, parseMentions, createEntity, updateEntity } from './entities.js';
import { linkDocumentMentions, parseDocumentMentions, resolvedDocumentMentionNames } from './documents.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function pushTimeline(campaign, crumb) {
  campaign.timeline = campaign.timeline || [];
  campaign.timeline.push({ ...crumb, at: crumb.at || new Date().toISOString() });
  // Keep the breadcrumb bar readable — cap at the most recent 6.
  if (campaign.timeline.length > 6) campaign.timeline = campaign.timeline.slice(-6);
}

function addJournal(campaign, text, source) {
  campaign.journal = campaign.journal || [];
  campaign.journal.push({
    id: 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    source: source || 'Session',
    text,
    isHtml: false,
  });
}

/** Generate the next scene, log it, and let consequences nudge the context. */
export function continueStory(campaign, { toJournal = true } = {}) {
  const next = clone(campaign);
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const scene = generateScene(next, tables);

  next.scenes = next.scenes || [];
  next.scenes.push(scene);

  // Consequences gently escalate, mirroring v0.53's applyConsequence.
  const con = String(scene.consequence || '');
  if (/threat|danger|hostil|attack/i.test(con)) next.context.what.threat = Math.min(10, (next.context.what.threat || 0) + 1);
  if (/myster|unknown|hidden|strange/i.test(con)) next.context.what.mystery = Math.min(10, (next.context.what.mystery || 0) + 1);

  pushTimeline(next, { kind: 'scene', label: `Scene ${scene.number}` });
  if (toJournal) addJournal(next, scene.text, 'Scene');
  return next;
}

/** Apply a named "Shift Story" action and record it on the timeline. */
export function applyStoryShift(campaign, shiftName, payload) {
  const next = clone(campaign);
  const { context, event } = applyShift(next.context, shiftName, payload);
  next.context = context;
  if (event) pushTimeline(next, { kind: 'shift', label: event.label });
  return next;
}

/** Roll an oracle table (path array) and append the result to the journal. */
export function rollOracle(campaign, path, { group = false, toJournal = true } = {}) {
  const next = clone(campaign);
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const roll = group ? rollGroup(tables, path) : rollTable(tables, path);
  const text = formatRoll(roll);

  // Track usage (drives Co-Pilot suggestions later).
  next.oracles = next.oracles || { overrides: {}, usage: {} };
  next.oracles.usage = next.oracles.usage || {};
  const top = path[0];
  if (top) next.oracles.usage[top] = (next.oracles.usage[top] || 0) + 1;

  if (toJournal) addJournal(next, text, 'Oracle');
  return { campaign: next, roll, text };
}

/** Add a free-form journal note. @mentions auto-create/link entities. */
export function addNote(campaign, text, source = 'Note') {
  let next = clone(campaign);
  addJournal(next, text, source);
  // A mention that already resolves to a real document (uploaded or
  // Reference Library — e.g. @[Title#12] from the "which page?" prompt)
  // must never also spawn a same-named phantom entity; linkMentions has no
  // idea the document library exists, so this is computed first and passed
  // in to exclude it explicitly.
  const docNames = resolvedDocumentMentionNames(next, text);
  if (parseMentions(text).length) next = linkMentions(next, text, { skip: docNames });
  if (parseDocumentMentions(text).length) next = linkDocumentMentions(next, text);
  return next;
}

/** File a dice-roll result (e.g. a statblock double-click-to-roll) to the journal. */
export function logRoll(campaign, text, source = 'Roll') {
  const next = clone(campaign);
  addJournal(next, text, source);
  return next;
}

/** Patch a single context question's fields (from inline editing). */
export function patchContext(campaign, key, patch) {
  const next = clone(campaign);
  next.context[key] = { ...next.context[key], ...patch };
  return next;
}

/** Roll the Characters oracle chain (Role → Goal → Revealed Aspect →
 *  Disposition → Name — Starforged's Character oracle pattern, rulebook
 *  pp.170-175) and create an NPC entity from the result in one action, the
 *  "Generate NPC" button (Phase 8). Pure/RNG-injectable like every other
 *  roll here; only tests pass a seeded rng. `overview` (shared) gets the
 *  role/disposition/first-look composite; `revealed` (GM-only) gets the
 *  rolled Revealed Aspect, matching the field's existing purpose. */
export function generateNpc(campaign, { rng = Math.random } = {}) {
  const next = clone(campaign);
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const chars = (tables && tables.Characters) || {};
  const roll = (key) => (Array.isArray(chars[key]) && chars[key].length ? pick(chars[key], rng) : '');

  const name = roll('Name') || 'Unnamed';
  const role = roll('Role');
  const goal = roll('Goal');
  const aspect = roll('Revealed Aspect');
  const disposition = roll('Disposition');
  const firstLook = roll('First Look');
  const overview = [
    role, disposition && `Disposition: ${disposition}.`,
    firstLook && `First impression: ${firstLook}.`, goal && `Goal: ${goal}.`,
  ].filter(Boolean).join(' ');

  const created = createEntity(next, { type: 'npc', name });
  const withFields = updateEntity(created.campaign, created.id, { overview, revealed: aspect });
  addJournal(withFields, `Generated NPC: ${name}${overview ? ' — ' + overview : ''}`, 'Oracle');
  return { campaign: withFields, id: created.id };
}

/** Edit a free-text context field and auto-link any @mentions it contains.
 *  Mentions default to a type that fits the field: WHERE → location,
 *  WHO → npc, otherwise npc (reclassify in one click in the inspector). */
export function editContextText(campaign, key, field, value) {
  let next = patchContext(campaign, key, { [field]: value });
  const docNames = resolvedDocumentMentionNames(next, value);
  if (parseMentions(value).length) {
    const createType = key === 'where' ? 'location' : 'npc';
    next = linkMentions(next, value, { createType, skip: docNames });
  }
  if (parseDocumentMentions(value).length) next = linkDocumentMentions(next, value);
  return next;
}
