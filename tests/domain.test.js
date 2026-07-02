// Domain-layer tests — the risky logic (rolls, shifts, scenes, session) is pure,
// so we can verify it headlessly. This is the "run a session without the
// software breaking" guarantee, made testable.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SCENE_TABLES, makeRng, rollTable, rollGroup, flattenKeys, getTable, tablesWithOverrides } from '../src/domain/oracles.js';
import { applyShift, listShifts, contextSummary } from '../src/domain/context.js';
import { generateScene } from '../src/domain/scenes.js';
import { continueStory, applyStoryShift, rollOracle, patchContext } from '../src/domain/session.js';
import { defaultCampaign } from '../src/core/schema.js';

// --- oracles --------------------------------------------------------------
test('oracle tables loaded as a module', () => {
  assert.ok(SCENE_TABLES['Core Oracles'], 'Core Oracles present');
  assert.ok(Array.isArray(getTable(SCENE_TABLES, 'Core Oracles', 'Action')));
});

test('seeded RNG makes rolls deterministic', () => {
  const a = rollTable(SCENE_TABLES, ['Core Oracles', 'Action'], makeRng(42));
  const b = rollTable(SCENE_TABLES, ['Core Oracles', 'Action'], makeRng(42));
  assert.equal(a.result, b.result);
  assert.ok(getTable(SCENE_TABLES, 'Core Oracles', 'Action').includes(a.result));
});

test('rollGroup returns one line per leaf table', () => {
  const g = rollGroup(SCENE_TABLES, ['Core Oracles'], makeRng(7));
  assert.ok(g.lines.length >= 2);
  for (const l of g.lines) assert.equal(typeof l.result, 'string');
});

test('flattenKeys finds leaf arrays', () => {
  const leaves = flattenKeys(SCENE_TABLES['Core Oracles'], ['Core Oracles']);
  assert.ok(leaves.length >= 1);
  assert.ok(Array.isArray(leaves[0].values));
});

test('user overrides replace a table without mutating the base', () => {
  const overridden = tablesWithOverrides({ 'Factions>Faction Type': ['Only Option'] });
  assert.deepEqual(getTable(overridden, 'Factions', 'Faction Type'), ['Only Option']);
  assert.notDeepEqual(getTable(SCENE_TABLES, 'Factions', 'Faction Type'), ['Only Option']);
});

// --- context shifts -------------------------------------------------------
test('Raise Threat clamps at 10', () => {
  let ctx = defaultCampaign().context;
  ctx.what.threat = 9;
  ctx = applyShift(ctx, 'Raise Threat').context; assert.equal(ctx.what.threat, 10);
  ctx = applyShift(ctx, 'Raise Threat').context; assert.equal(ctx.what.threat, 10);
});

test('Advance Time moves pacing forward and returns an event', () => {
  const ctx = defaultCampaign().context;
  ctx.how.summary = 'Calm';
  const { context, event } = applyShift(ctx, 'Advance Time');
  assert.equal(context.how.summary, 'Curious');
  assert.match(event.label, /pacing/i);
});

test('shifts are pure (do not mutate the input context)', () => {
  const ctx = defaultCampaign().context;
  const before = ctx.what.threat;
  applyShift(ctx, 'Raise Threat');
  assert.equal(ctx.what.threat, before);
});

test('every listed shift is applicable and yields an event', () => {
  const ctx = defaultCampaign().context;
  for (const name of listShifts()) {
    const { event } = applyShift(ctx, name, 'Test Payload');
    assert.ok(event && event.label, `${name} should produce an event`);
  }
});

// --- scenes ---------------------------------------------------------------
test('generateScene produces numbered, non-empty text', () => {
  const camp = defaultCampaign();
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  assert.equal(scene.number, 1);
  assert.match(scene.text, /Scene 1/);
  assert.ok(scene.text.length > 100);
});

// --- session orchestration ------------------------------------------------
test('continueStory appends a scene, a timeline crumb, and a journal entry', () => {
  const camp = defaultCampaign();
  const next = continueStory(camp);
  assert.equal(next.scenes.length, 1);
  assert.equal(next.journal.length, 1);
  assert.equal(next.journal[0].source, 'Scene');
  assert.ok(next.timeline.some((t) => t.kind === 'scene'));
  // Original campaign is untouched (pure).
  assert.equal(camp.scenes.length, 0);
});

test('applyStoryShift updates context and logs a breadcrumb', () => {
  const camp = defaultCampaign();
  camp.context.what.threat = 3;
  const next = applyStoryShift(camp, 'Raise Threat');
  assert.equal(next.context.what.threat, 4);
  assert.ok(next.timeline.some((t) => t.kind === 'shift'));
});

test('rollOracle records usage and journals the result', () => {
  const camp = defaultCampaign();
  const { campaign, text } = rollOracle(camp, ['Core Oracles', 'Action']);
  assert.ok(campaign.oracles.usage['Core Oracles'] >= 1);
  assert.equal(campaign.journal[0].source, 'Oracle');
  assert.ok(text.includes('Core Oracles'));
});

test('patchContext merges fields for a question', () => {
  const camp = defaultCampaign();
  const next = patchContext(camp, 'why', { summary: 'Recover the survey team' });
  assert.equal(next.context.why.summary, 'Recover the survey team');
});

test('timeline is capped at 6 crumbs', () => {
  let camp = defaultCampaign();
  for (let i = 0; i < 10; i++) camp = continueStory(camp, { toJournal: false });
  assert.ok(camp.timeline.length <= 6);
  assert.equal(camp.scenes.length, 10);
});

test('contextSummary shows the first line of a multi-line situation', () => {
  const ctx = defaultCampaign().context;
  ctx.what.situation = 'Find the medic\n• A clue surfaces';
  assert.equal(contextSummary(ctx, 'what'), 'Find the medic');
});

// --- threads (new feature) ------------------------------------------------
import { addThread, advanceThread, removeThread, threadUnderPressure } from '../src/domain/threads.js';
import { advise } from '../src/domain/copilot.js';

test('threads: add, advance (clamped), complete, remove', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Find the medic', 4);
  const id = camp.threads[0].id;
  assert.equal(camp.threads.length, 1);
  assert.equal(camp.threads[0].filled, 0);
  camp = advanceThread(camp, id, 3);
  assert.equal(camp.threads[0].filled, 3);
  assert.equal(camp.threads[0].done, false);
  camp = advanceThread(camp, id, 5); // clamps at segments
  assert.equal(camp.threads[0].filled, 4);
  assert.equal(camp.threads[0].done, true);
  camp = advanceThread(camp, id, -10); // clamps at 0
  assert.equal(camp.threads[0].filled, 0);
  camp = removeThread(camp, id);
  assert.equal(camp.threads.length, 0);
});

test('threadUnderPressure returns the fullest open clock', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'A', 4); camp = addThread(camp, 'B', 4);
  camp = advanceThread(camp, camp.threads[1].id, 3);
  assert.equal(threadUnderPressure(camp).name, 'B');
});

test('Co-Pilot flags a nearly-complete thread', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Escape the station', 4);
  camp = advanceThread(camp, camp.threads[0].id, 3);
  const a = advise(camp);
  assert.match(a.observation, /Escape the station/);
  assert.match(a.observation, /3\/4/);
});

// --- entities + auto-linking (Phase 3A) -----------------------------------
import { createEntity, updateEntity, removeEntity, addRelationship, removeRelationship, findByName, parseMentions, linkMentions, listEntities } from '../src/domain/entities.js';
import { addNote, editContextText } from '../src/domain/session.js';

test('entity CRUD: create, update, delete', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  assert.equal(listEntities(camp).length, 1);
  assert.equal(camp.entities.activeId, id);
  camp = updateEntity(camp, id, { overview: 'Runs the colony' });
  assert.equal(findByName(camp, 'Voss').overview, 'Runs the colony');
  camp = removeEntity(camp, id);
  assert.equal(listEntities(camp).length, 0);
});

test('relationships are bidirectional and removable', () => {
  let camp = defaultCampaign();
  let a, b;
  ({ campaign: camp, id: a } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: b } = createEntity(camp, { type: 'faction', name: 'B' }));
  camp = addRelationship(camp, a, b, 'member');
  assert.ok(findByName(camp, 'A').relationships.some((r) => r.to === b));
  assert.ok(findByName(camp, 'B').relationships.some((r) => r.to === a));
  camp = removeRelationship(camp, a, b);
  assert.equal(findByName(camp, 'A').relationships.length, 0);
  assert.equal(findByName(camp, 'B').relationships.length, 0);
});

test('deleting an entity strips dangling relationships', () => {
  let camp = defaultCampaign();
  let a, b;
  ({ campaign: camp, id: a } = createEntity(camp, { name: 'A' }));
  ({ campaign: camp, id: b } = createEntity(camp, { name: 'B' }));
  camp = addRelationship(camp, a, b, 'ally');
  camp = removeEntity(camp, b);
  assert.equal(findByName(camp, 'A').relationships.length, 0);
});

test('parseMentions handles @Name and @[Multi Word]', () => {
  assert.deepEqual(parseMentions('Meet @Voss at @[Dock 3] now'), ['Voss', 'Dock 3']);
});

test('linkMentions creates missing entities and links co-mentions', () => {
  let camp = defaultCampaign();
  camp = linkMentions(camp, 'The @Medic argues with @Voss near @[Dock 3]');
  assert.equal(listEntities(camp).length, 3);
  const medic = findByName(camp, 'Medic');
  const voss = findByName(camp, 'Voss');
  assert.ok(medic.relationships.some((r) => r.to === voss.id), 'co-mentioned entities are linked');
});

test('addNote auto-links @mentions and keeps existing entities', () => {
  let camp = defaultCampaign();
  ({ campaign: camp } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addNote(camp, 'Note: @Voss lied about the reactor.');
  assert.equal(listEntities(camp).length, 1, 'existing entity reused, not duplicated');
  assert.equal(camp.journal.length, 1);
});

test('editContextText links mentions from the situation field', () => {
  let camp = defaultCampaign();
  camp = editContextText(camp, 'what', 'situation', 'Find @Medic before @Security arrives');
  assert.equal(listEntities(camp).length, 2);
  assert.match(camp.context.what.situation, /@Medic/);
});

// --- relationship graph (Phase 3B) ----------------------------------------
import { buildGraph, computeLayout, nodeColor } from '../src/domain/graph.js';

test('buildGraph produces nodes and deduplicated undirected edges', () => {
  let camp = defaultCampaign();
  let a, b, c;
  ({ campaign: camp, id: a } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: b } = createEntity(camp, { type: 'faction', name: 'B' }));
  ({ campaign: camp, id: c } = createEntity(camp, { type: 'location', name: 'C' }));
  camp = addRelationship(camp, a, b, 'member');
  camp = addRelationship(camp, a, c, 'at');
  const g = buildGraph(camp);
  assert.equal(g.nodes.length, 3);
  // A-B stored on both ends but must appear once; total 2 unique edges.
  assert.equal(g.edges.length, 2);
  assert.equal(g.nodes.find((n) => n.id === a).degree, 2);
});

test('computeLayout is deterministic and stays within bounds', () => {
  let camp = defaultCampaign();
  let a, b;
  ({ campaign: camp, id: a } = createEntity(camp, { name: 'A' }));
  ({ campaign: camp, id: b } = createEntity(camp, { name: 'B' }));
  camp = addRelationship(camp, a, b, 'ally');
  const g = buildGraph(camp);
  const l1 = computeLayout(g, { width: 600, height: 520 });
  const l2 = computeLayout(g, { width: 600, height: 520 });
  assert.equal(l1.get(a).x, l2.get(a).x); // deterministic
  assert.equal(l1.get(a).y, l2.get(a).y);
  for (const p of l1.values()) {
    assert.ok(p.x >= 0 && p.x <= 600 && p.y >= 0 && p.y <= 520, 'within bounds');
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'no NaN');
  }
});

test('empty graph yields empty layout; nodeColor covers all types', () => {
  const g = buildGraph(defaultCampaign());
  assert.equal(g.nodes.length, 0);
  assert.equal(computeLayout(g).size, 0);
  for (const t of ['npc', 'location', 'faction', 'asset', 'lore']) assert.match(nodeColor(t), /^#/);
});

// --- statblocks (Phase 3C) -------------------------------------------------
import { makeStatblock, hasVehicleTag, ensureAutoStatblock, setStatblockField, addStatblockField, removeStatblockField } from '../src/domain/statblocks.js';
import { setEntityStatblockKind, removeEntityStatblock, setEntityStatblockField, addEntityStatblockField, removeEntityStatblockField, getEntity, setEntityTags } from '../src/domain/entities.js';

test('makeStatblock returns the right default fields per kind', () => {
  const npc = makeStatblock('npc');
  assert.equal(npc.kind, 'npc');
  assert.ok(npc.fields.some((f) => f.key === 'Role'));
  const veh = makeStatblock('vehicle');
  assert.equal(veh.kind, 'vehicle');
  assert.ok(veh.fields.some((f) => f.key === 'Hull / Integrity'));
});

test('hasVehicleTag matches "vehicle"/"vehicles" exactly, case-insensitive, not substrings', () => {
  assert.equal(hasVehicleTag({ tags: ['Vehicle'] }), true);
  assert.equal(hasVehicleTag({ tags: ['vehicles'] }), true);
  assert.equal(hasVehicleTag({ tags: ['  VEHICLE  '.trim()] }), true);
  assert.equal(hasVehicleTag({ tags: ['vehicular-parts'] }), false);
  assert.equal(hasVehicleTag({ tags: [] }), false);
  assert.equal(hasVehicleTag({}), false);
});

test('ensureAutoStatblock attaches npc statblock to npc entities', () => {
  const e = { type: 'npc', tags: [] };
  ensureAutoStatblock(e);
  assert.equal(e.statblock.kind, 'npc');
});

test('ensureAutoStatblock attaches vehicle statblock to #vehicle-tagged assets only', () => {
  const plain = { type: 'asset', tags: ['crate'] };
  ensureAutoStatblock(plain);
  assert.equal(plain.statblock, undefined);

  const veh = { type: 'asset', tags: ['vehicle', 'rusty'] };
  ensureAutoStatblock(veh);
  assert.equal(veh.statblock.kind, 'vehicle');
});

test('ensureAutoStatblock never deletes an existing statblock when type/tags change away', () => {
  const e = { type: 'npc', tags: [], statblock: makeStatblock('npc') };
  e.statblock.fields[0].value = 'custom';
  e.type = 'faction'; // no longer auto-managed
  ensureAutoStatblock(e);
  assert.equal(e.statblock.fields[0].value, 'custom', 'existing data preserved');
});

test('statblock field CRUD', () => {
  const e = { statblock: makeStatblock('npc') };
  setStatblockField(e, 0, { value: 'Guard captain' });
  assert.equal(e.statblock.fields[0].value, 'Guard captain');
  addStatblockField(e, 'Fear', 'Fire');
  assert.ok(e.statblock.fields.some((f) => f.key === 'Fear' && f.value === 'Fire'));
  const before = e.statblock.fields.length;
  removeStatblockField(e, 0);
  assert.equal(e.statblock.fields.length, before - 1);
});

test('createEntity auto-attaches statblocks through the campaign-level API', () => {
  let camp = defaultCampaign();
  let npcId, assetId;
  ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Guard' }));
  assert.equal(getEntity(camp, npcId).statblock.kind, 'npc');

  ({ campaign: camp, id: assetId } = createEntity(camp, { type: 'asset', name: 'Truck' }));
  assert.equal(getEntity(camp, assetId).statblock, undefined);

  camp = setEntityTags(camp, assetId, 'vehicle, dented');
  assert.equal(getEntity(camp, assetId).statblock.kind, 'vehicle');
});

test('manual statblock add/remove and field edits via campaign-level API', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'faction', name: 'Cartel' }));
  assert.equal(getEntity(camp, id).statblock, undefined);

  camp = setEntityStatblockKind(camp, id, 'vehicle');
  assert.equal(getEntity(camp, id).statblock.kind, 'vehicle');

  camp = setEntityStatblockField(camp, id, 0, { value: '8/8' });
  assert.equal(getEntity(camp, id).statblock.fields[0].value, '8/8');

  camp = addEntityStatblockField(camp, id);
  const countAfterAdd = getEntity(camp, id).statblock.fields.length;
  camp = removeEntityStatblockField(camp, id, 0);
  assert.equal(getEntity(camp, id).statblock.fields.length, countAfterAdd - 1);

  camp = removeEntityStatblock(camp, id);
  assert.equal(getEntity(camp, id).statblock, undefined);
});

// --- statblock numeric tracks + double-click-to-roll (Crew-Link-style) -----
import { toggleStatblockFieldTrack, setStatblockTrackValue } from '../src/domain/statblocks.js';
import { toggleEntityStatblockFieldTrack, setEntityStatblockTrackValue } from '../src/domain/entities.js';
import { rollAction, formatRollText } from '../src/domain/dice.js';
import { logRoll } from '../src/domain/session.js';

test('npc/vehicle default statblocks carry a Health/Hull track field', () => {
  const npc = makeStatblock('npc');
  const health = npc.fields.find((f) => f.key === 'Health');
  assert.equal(health.track, true);
  assert.equal(health.value, 5);
  assert.equal(health.max, 5);

  const veh = makeStatblock('vehicle');
  const hull = veh.fields.find((f) => f.key === 'Hull / Integrity');
  assert.equal(hull.track, true);
  assert.equal(hull.value, 5);
});

test('addStatblockField supports an options-object form for track fields (positional form still works)', () => {
  const e = { statblock: makeStatblock('npc') };
  addStatblockField(e, { key: 'Grit', value: 2, max: 3, track: true });
  const grit = e.statblock.fields.find((f) => f.key === 'Grit');
  assert.equal(grit.track, true);
  assert.equal(grit.value, 2);
  assert.equal(grit.max, 3);
  // out-of-range values get clamped on add
  addStatblockField(e, { key: 'Over', value: 99, max: 5, track: true });
  assert.equal(e.statblock.fields.find((f) => f.key === 'Over').value, 5);
});

test('toggleStatblockFieldTrack converts text <-> numeric track, preserving intent', () => {
  const e = { statblock: { kind: 'npc', fields: [{ key: 'Combat / Danger', value: '3' }] } };
  toggleStatblockFieldTrack(e, 0);
  assert.equal(e.statblock.fields[0].track, true);
  assert.equal(e.statblock.fields[0].value, 3);
  assert.equal(e.statblock.fields[0].max, 5);

  toggleStatblockFieldTrack(e, 0);
  assert.equal(e.statblock.fields[0].track, undefined);
  assert.equal(e.statblock.fields[0].value, '3');

  // non-numeric text defaults to 0 on conversion, not NaN
  const f = { statblock: { kind: 'npc', fields: [{ key: 'Notes', value: 'friendly' }] } };
  toggleStatblockFieldTrack(f, 0);
  assert.equal(f.statblock.fields[0].value, 0);
});

test('setStatblockTrackValue click-to-set clamps and toggles the active box down by one', () => {
  const e = { statblock: { kind: 'npc', fields: [{ key: 'Health', value: 0, max: 5, track: true }] } };
  setStatblockTrackValue(e, 0, 3);
  assert.equal(e.statblock.fields[0].value, 3);
  // clicking the already-active box decrements by one (lets you zero out a track)
  setStatblockTrackValue(e, 0, 3);
  assert.equal(e.statblock.fields[0].value, 2);
  // clamps to [0, max]
  setStatblockTrackValue(e, 0, 99);
  assert.equal(e.statblock.fields[0].value, 5);
  setStatblockTrackValue(e, 0, 1);
  setStatblockTrackValue(e, 0, 1);
  assert.equal(e.statblock.fields[0].value, 0);
});

test('campaign-level toggle/set-track wrappers round-trip through a real campaign', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Marshal' }));
  const healthIdx = getEntity(camp, id).statblock.fields.findIndex((f) => f.key === 'Health');

  camp = setEntityStatblockTrackValue(camp, id, healthIdx, 2);
  assert.equal(getEntity(camp, id).statblock.fields[healthIdx].value, 2);

  camp = toggleEntityStatblockFieldTrack(camp, id, healthIdx);
  assert.equal(getEntity(camp, id).statblock.fields[healthIdx].track, undefined);
  assert.equal(getEntity(camp, id).statblock.fields[healthIdx].value, '2');
});

// --- dice (action roll: d6 + value vs 2d10) --------------------------------
test('rollAction is deterministic under a seeded rng and computes hits/outcome correctly', () => {
  const rng = makeRng(42);
  const r = rollAction(2, { rng });
  assert.equal(r.actionDie >= 1 && r.actionDie <= 6, true);
  assert.equal(r.challenge1 >= 1 && r.challenge1 <= 10, true);
  assert.equal(r.total, r.actionDie + 2);
  const expectedHits = (r.total > r.challenge1 ? 1 : 0) + (r.total > r.challenge2 ? 1 : 0);
  assert.equal(r.hits, expectedHits);
  assert.equal(r.outcome, expectedHits === 2 ? 'strong-hit' : expectedHits === 1 ? 'weak-hit' : 'miss');

  // same seed -> same sequence -> same result
  const r2 = rollAction(2, { rng: makeRng(42) });
  assert.deepEqual(r, r2);
});

test('rollAction: a guaranteed miss (rng always returns 0) still resolves cleanly', () => {
  const zero = () => 0; // rollDie(sides) = floor(0*sides)+1 = 1 always
  const r = rollAction(0, { rng: zero });
  assert.equal(r.actionDie, 1);
  assert.equal(r.challenge1, 1);
  assert.equal(r.challenge2, 1);
  assert.equal(r.match, true); // both challenge dice are 1
  assert.equal(r.total, 1);
  assert.equal(r.hits, 0); // 1 is not > 1
  assert.equal(r.outcome, 'miss');
});

test('formatRollText includes the formula and outcome label', () => {
  const r = rollAction(3, { rng: makeRng(7) });
  const text = formatRollText('Marshal — Health', r);
  assert.match(text, /Marshal — Health/);
  assert.match(text, new RegExp(`${r.actionDie} \\+ 3`));
  assert.match(text, new RegExp(r.outcomeLabel));
});

test('logRoll files a roll result to the journal', () => {
  let camp = defaultCampaign();
  const before = camp.journal.length;
  camp = logRoll(camp, '🎲 test roll line');
  assert.equal(camp.journal.length, before + 1);
  assert.equal(camp.journal[camp.journal.length - 1].text, '🎲 test roll line');
  assert.equal(camp.journal[camp.journal.length - 1].source, 'Roll');
});
