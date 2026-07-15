// session.js — orchestration. These take a whole campaign and return a NEW
// campaign, composing the pure domain pieces (context shifts, scene generation,
// oracle rolls) and keeping the timeline + journal in sync. The UI calls these
// through store.update(); they never touch the store or the DOM themselves.

import { applyShift } from './context.js';
import { generateScene, recomposeSceneText } from './scenes.js';
import { tablesWithOverrides, rollTable, rollGroup, formatRoll, pick } from './oracles.js';
import { linkMentions, parseMentions, createEntity, updateEntity, getEntity } from './entities.js';
import { linkDocumentMentions, parseDocumentMentions, resolvedDocumentMentionNames } from './documents.js';
import { SUGGESTION_LENSES, findLens, lensOracleCategories } from '../data/suggestionLenses.js';

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
  bumpFactionPacing(next);
  return next;
}

/** Faction Turn pacing (Living Faction Engine Phase B): each scene
 *  generated is the closest proxy this app has for "a unit of party
 *  activity has passed" — bump the counter `factionTurnEngine.js`'s
 *  `isFactionRoundDue()` compares against `settings.factionPacing.
 *  scenesPerRound`. Purely a nudge (Co-Pilot surfaces it, the GM still
 *  clicks Step/Full Round themselves) — never auto-advances a faction
 *  turn on its own, matching Article II. */
function bumpFactionPacing(campaign) {
  campaign.settings = campaign.settings || {};
  const p = campaign.settings.factionPacing || { scenesPerRound: 3, scenesSinceLastRound: 0 };
  campaign.settings.factionPacing = { ...p, scenesSinceLastRound: (p.scenesSinceLastRound || 0) + 1 };
}

/** "What Happens Next?"'s lens-picker step (docs/adr/0009-situation-engine-
 *  revisited.md, Decision item 3): a small random draw across both the
 *  Discovery and Approach lens lists, offered as chips instead of
 *  immediately generating — picking one calls suggestNextWithLens below.
 *  Not deterministic-count in a way that matters narratively (3-4, same
 *  "not exhaustive" spirit as this app's other small random draws); the GM
 *  can also just re-open the picker for a different draw if none appeal. */
// Which lens ids read as more relevant to a given scene snapshot
// (copilot.js's gatherSceneContext — passed in by the caller, not computed
// here, so this module doesn't need to depend on copilot.js at all) —
// realizes docs/adr/0009's named-but-never-built idea ("surface the active
// faction's fear/need when Activity is Negotiate"), generalized: any
// in-scene faction boosts trade/politics/economics too, any Conflict here
// boosts violence/politics. A lookup, not a formula, same "data over
// mechanism" posture LENS_ORACLE_CATEGORIES above already established.
function boostedLensIdsFor(sceneContext) {
  const ids = new Set();
  if (sceneContext.activity === 'negotiate') { ids.add('negotiation'); ids.add('social-leverage'); }
  if ((sceneContext.conflictsHere || []).length) { ids.add('violence'); ids.add('politics'); }
  if ((sceneContext.factionsHere || []).length) { ids.add('trade'); ids.add('economics'); ids.add('politics'); }
  return ids;
}

/** `sceneContext` (optional — gatherSceneContext(campaign)'s snapshot) is
 *  purely additive: omitted (the existing WHAT-tab "What Happens Next?"
 *  call site), the draw is exactly as pure-random as it always was. Given,
 *  a boosted lens id (boostedLensIdsFor above) gets extra tickets in the
 *  sampling pool instead of a flat one-each — still drawn without
 *  replacement (a `seen` guard, needed now that a lens can appear more
 *  than once in the pool; harmless/never triggered in the unweighted case,
 *  where duplicates are structurally impossible). */
export function drawSuggestionLenses(campaign, { rng = Math.random, count = 4, sceneContext = null } = {}) {
  const boosted = sceneContext ? boostedLensIdsFor(sceneContext) : null;
  const pool = [];
  for (const lens of SUGGESTION_LENSES) {
    const tickets = boosted && boosted.has(lens.id) ? 3 : 1;
    for (let i = 0; i < tickets; i++) pool.push(lens);
  }
  const drawn = [];
  const seen = new Set();
  const n = Math.min(count, SUGGESTION_LENSES.length);
  while (drawn.length < n && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const lens = pool.splice(idx, 1)[0];
    if (seen.has(lens.id)) continue;
    seen.add(lens.id);
    drawn.push(lens);
  }
  return drawn;
}

/** "What Happens Next?", lens-filtered — this is Continue Story's own
 *  generateScene(), just handed the chosen lens's mapped Oracle categories
 *  so its Driver line pulls from THAT lens's content instead of the
 *  generic Plot Engine > Scene Driver a lens-less Continue Story always
 *  uses (see scenes.js's generateScene for exactly what changes). Continue
 *  Story itself (the other button) is completely untouched by this —
 *  same no-input, immediate-generation behavior as before this ADR. Falls
 *  back to ordinary (lens-less) behavior for an unrecognized lensId,
 *  rather than erroring. */
export function suggestNextWithLens(campaign, lensId, { toJournal = true, rng = Math.random } = {}) {
  const next = clone(campaign);
  const lens = findLens(lensId);
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const scene = generateScene(next, tables, rng, lens ? lensOracleCategories(lensId) : []);

  next.scenes = next.scenes || [];
  next.scenes.push(scene);

  const con = String(scene.consequence || '');
  if (/threat|danger|hostil|attack/i.test(con)) next.context.what.threat = Math.min(10, (next.context.what.threat || 0) + 1);
  if (/myster|unknown|hidden|strange/i.test(con)) next.context.what.mystery = Math.min(10, (next.context.what.mystery || 0) + 1);

  pushTimeline(next, { kind: 'scene', label: `Scene ${scene.number}` });
  const text = lens ? `${scene.text}\n\nLens: ${lens.label}` : scene.text;
  if (toJournal) addJournal(next, text, 'Scene');
  bumpFactionPacing(next);
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

/** Edit an existing journal entry's text in place (the "USER CHANGES" batch's
 *  Journal edit icon) — same @mention (re)linking addNote already does, so an
 *  edit that adds a brand-new @Name still creates/links it, not just the
 *  original creation. No-ops if the entry no longer exists. */
export function editNote(campaign, id, text) {
  let next = clone(campaign);
  const entry = (next.journal || []).find((j) => j.id === id);
  if (!entry) return next;
  entry.text = text;
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

/** Append entityId to context[key].entityIds (deduped) — the WHERE tab's
 *  tag-filter → pick-a-candidate flow (the "USER CHANGES" batch) is this
 *  mechanism's first real user; written generically (keyed by `key`, same
 *  shape entities.js's addEntityTag already uses) so WHO/WHY could reuse it
 *  later without a second near-identical mutator. */
export function addContextEntity(campaign, key, entityId) {
  const next = clone(campaign);
  const ctx = next.context[key] || (next.context[key] = {});
  if (!Array.isArray(ctx.entityIds)) ctx.entityIds = [];
  if (!ctx.entityIds.includes(entityId)) ctx.entityIds.push(entityId);
  return next;
}

export function removeContextEntity(campaign, key, entityId) {
  const next = clone(campaign);
  const ctx = next.context[key];
  if (ctx && Array.isArray(ctx.entityIds)) ctx.entityIds = ctx.entityIds.filter((id) => id !== entityId);
  return next;
}

/** Edits one of the Latest Scene's split fields (opening/driver/clue/
 *  complication/consequence — the "USER CHANGES" batch's Scene-splitting
 *  ask) and
 *  recomposes `text` from the scene's now-current field values, so the
 *  combined view stays a live, correct derivation instead of a second,
 *  independently-editable copy. No-ops if the scene no longer exists (the
 *  array only ever grows, so this is mostly a defensive guard). */
export function updateSceneField(campaign, sceneId, field, value) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene) return next;
  scene[field] = value;
  scene.text = recomposeSceneText(scene);
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

/** "Deepening NPCs" (2026-07-06, docs/adr/0011-swn-cwn-content.md): unlike
 *  generateNpc (which builds a brand-new NPC from scratch), this rolls a
 *  Stereotype/Want/Complication for an EXISTING npc entity and appends the
 *  result to its Overview — a quick-prep pass a GM can run on any Cast
 *  member who's outgrown their first-draft description, the same "roll a
 *  few tables, append what they add" shape generateNpc already uses, just
 *  aimed at an entity that already exists instead of a new one. No-op
 *  (added: null) on a missing entity, a non-npc entity, or if none of the
 *  three tables have any entries. */
export function deepenNpc(campaign, entityId, { rng = Math.random } = {}) {
  const next = clone(campaign);
  const entity = getEntity(next, entityId);
  if (!entity || entity.type !== 'npc') return { campaign: next, added: null };
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const chars = (tables && tables.Characters) || {};
  const roll = (key) => (Array.isArray(chars[key]) && chars[key].length ? pick(chars[key], rng) : '');
  const stereotype = roll('Stereotype');
  const want = roll('Want');
  const complication = roll('Complication');
  // Stereotype is a character-concept beat, not a secret, so it stays in the
  // shared Overview as before; Want and Complication are GM-facing hooks
  // (what they're really after, what's in the way) that read more like
  // secrets than public knowledge, so they append to `revealed` instead
  // (docs/adr/next-request.md, 2026-07-06) — the same field generateNpc's
  // "Revealed Aspect" roll already populates.
  const overviewLine = stereotype && `Stereotype: ${stereotype}.`;
  const revealedLines = [
    want && `Right now, wants: ${want}.`,
    complication && `Complication: ${complication}.`,
  ].filter(Boolean);
  const lines = [overviewLine, ...revealedLines].filter(Boolean);
  if (!lines.length) return { campaign: next, added: null };
  const addition = lines.join(' ');
  const patch = {};
  if (overviewLine) patch.overview = [entity.overview, overviewLine].filter(Boolean).join(' ');
  if (revealedLines.length) patch.revealed = [entity.revealed, revealedLines.join(' ')].filter(Boolean).join(' ');
  const withFields = updateEntity(next, entityId, patch);
  addJournal(withFields, `Deepened ${entity.name || 'NPC'}: ${addition}`, 'Oracle');
  return { campaign: withFields, added: addition };
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
