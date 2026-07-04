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
import { parseStatsString } from '../src/domain/statblocks.js';

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

// --- Narrative Trackers: Resources / Reputation (Phase 6, pack 18) ---------
test('a fresh campaign defaults Resources and Reputation to the neutral midpoint (5/10)', () => {
  const ctx = defaultCampaign().context;
  assert.equal(ctx.what.resources, 5);
  assert.equal(ctx.what.reputation, 5);
});

test('Gain/Spend Resources and Raise/Lower Reputation clamp to [0, 10]', () => {
  let ctx = defaultCampaign().context;
  ctx.what.resources = 9; ctx.what.reputation = 1;
  ctx = applyShift(ctx, 'Gain Resources').context;
  ctx = applyShift(ctx, 'Gain Resources').context;
  assert.equal(ctx.what.resources, 10); // clamps at 10, doesn't overshoot
  ctx = applyShift(ctx, 'Lower Reputation').context;
  ctx = applyShift(ctx, 'Lower Reputation').context;
  assert.equal(ctx.what.reputation, 0); // clamps at 0
});

test('Resources/Reputation shifts default an old save missing those fields to the neutral midpoint, not 0', () => {
  let ctx = defaultCampaign().context;
  delete ctx.what.resources; delete ctx.what.reputation; // simulate a pre-Narrative-Trackers save
  ctx = applyShift(ctx, 'Spend Resources').context;
  assert.equal(ctx.what.resources, 4); // 5 (default) - 1, not -1
  ctx = applyShift(ctx, 'Raise Reputation').context;
  assert.equal(ctx.what.reputation, 6); // 5 (default) + 1, not 1
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
import {
  addThread, advanceThread, removeThread, threadUnderPressure,
  listThreads, setThreadStatus, setThreadPriority, overlookedThreads, THREAD_STATUSES,
} from '../src/domain/threads.js';
import { advise } from '../src/domain/copilot.js';
import { addDocument, updateDocument, removeDocument, parseDocumentMentions, linkDocumentMentions, listDocumentMentions } from '../src/domain/documents.js';

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

test('a new thread defaults to Active status and Normal priority', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Find the medic', 4);
  assert.equal(camp.threads[0].status, 'active');
  assert.equal(camp.threads[0].priority, 'normal');
});

test('listThreads normalizes legacy threads (no status/priority) from `done` without mutating the source', () => {
  let camp = defaultCampaign();
  camp.threads = [
    { id: 'legacy-open', name: 'Old open thread', filled: 1, segments: 4, done: false },
    { id: 'legacy-done', name: 'Old finished thread', filled: 4, segments: 4, done: true },
  ];
  const listed = listThreads(camp);
  assert.equal(listed.find((t) => t.id === 'legacy-open').status, 'active');
  assert.equal(listed.find((t) => t.id === 'legacy-done').status, 'resolved');
  assert.equal(listed[0].priority, 'normal');
  // the raw campaign object itself is untouched — still missing status/priority
  assert.equal(camp.threads[0].status, undefined);
});

test('advanceThread auto-transitions status to resolved on a full clock, and back to active if backed off', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Escape', 4);
  const id = camp.threads[0].id;
  camp = advanceThread(camp, id, 4);
  assert.equal(camp.threads[0].done, true);
  assert.equal(camp.threads[0].status, 'resolved');
  camp = advanceThread(camp, id, -1);
  assert.equal(camp.threads[0].done, false);
  assert.equal(camp.threads[0].status, 'active');
});

test('advanceThread never overrides an explicitly-set non-default status (e.g. Escalating) while the clock is still open', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Escape', 4);
  const id = camp.threads[0].id;
  camp = setThreadStatus(camp, id, 'escalating');
  camp = advanceThread(camp, id, 1);
  assert.equal(camp.threads[0].status, 'escalating');
});

test('setThreadStatus sets any of the 7 lifecycle stages and rejects an unknown one', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Escape', 4);
  const id = camp.threads[0].id;
  for (const s of THREAD_STATUSES) {
    camp = setThreadStatus(camp, id, s);
    assert.equal(camp.threads[0].status, s);
  }
  camp = setThreadStatus(camp, id, 'not-a-real-status');
  assert.equal(camp.threads[0].status, 'archived'); // unchanged from the loop's last value
});

test('setThreadPriority sets low/normal/high and rejects an unknown value', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Escape', 4);
  const id = camp.threads[0].id;
  camp = setThreadPriority(camp, id, 'high');
  assert.equal(camp.threads[0].priority, 'high');
  camp = setThreadPriority(camp, id, 'urgent-ish');
  assert.equal(camp.threads[0].priority, 'high'); // unchanged
});

test('overlookedThreads surfaces Dormant threads and untouched (filled: 0) open threads, excluding Resolved/Archived', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Untouched', 4);
  camp = addThread(camp, 'Dormant one', 4);
  camp = setThreadStatus(camp, camp.threads[1].id, 'dormant');
  camp = addThread(camp, 'In progress', 4);
  camp = advanceThread(camp, camp.threads[2].id, 2);
  camp = addThread(camp, 'Finished', 4);
  camp = advanceThread(camp, camp.threads[3].id, 4);

  const names = overlookedThreads(camp).map((t) => t.name).sort();
  assert.deepEqual(names, ['Dormant one', 'Untouched']);
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

test('Co-Pilot surfaces overlooked (Dormant/untouched) threads as observation-only, never Resolved/Archived ones', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'Forgotten favor', 4); // untouched -> overlooked
  camp = addThread(camp, 'Escape the station', 4);
  camp = advanceThread(camp, camp.threads[1].id, 4); // fully resolved -> not overlooked
  const a = advise(camp);
  assert.deepEqual(a.overlooked, ['Forgotten favor']);
});

test('Co-Pilot flags critically low Resources (scarcity) when threat is not already the dominant signal', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.resources = 1;
  const a = advise(camp);
  assert.match(a.observation, /[Ss]upplies are critically low/);
  assert.match(a.consequence, /shortage/);
  assert.deepEqual(a.suggestedOraclePath, ['Trade & Cargo', 'Cargo Problem']);
});

test('Co-Pilot flags soured Reputation, and surfaces it below threat/resources/mystery in priority', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.mystery = 1;
  camp.context.what.resources = 5;
  camp.context.what.reputation = 1;
  const a = advise(camp);
  assert.match(a.observation, /[Rr]eputation has soured/);
  assert.match(a.consequence, /reputation/);
});

test('Co-Pilot offers an opportunity for abundant Resources or high Reputation', () => {
  let camp = defaultCampaign();
  camp.context.what.mystery = 0;
  camp.context.what.reputation = 9;
  let a = advise(camp);
  assert.match(a.opportunity, /favor|discount|introduction/);

  camp = defaultCampaign();
  camp.context.what.mystery = 0;
  camp.context.what.reputation = 5;
  camp.context.what.resources = 9;
  a = advise(camp);
  assert.match(a.opportunity, /[Ss]urplus/);
});

test('Co-Pilot treats a pre-Narrative-Trackers save (no resources/reputation stored) as the neutral midpoint, not scarce/soured', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.mystery = 1;
  delete camp.context.what.resources;
  delete camp.context.what.reputation;
  const a = advise(camp);
  assert.doesNotMatch(a.observation, /critically low|soured/);
});

test('document library adds, edits, and removes entries without mutating the source campaign', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  assert.equal(camp.documents.library.length, 1);
  const id = camp.documents.library[0].id;
  camp = updateDocument(camp, id, { title: 'Docking Manual', content: 'Updated procedures' });
  assert.equal(camp.documents.library[0].title, 'Docking Manual');
  assert.match(camp.documents.library[0].content, /Updated/);
  camp = removeDocument(camp, id);
  assert.equal(camp.documents.library.length, 0);
});

test('document library supports uploaded files distinctly from text notes', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { kind: 'file', title: 'Crew Manifest.pdf', fileName: 'Crew Manifest.pdf', mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAAA' });
  const entry = camp.documents.library[0];
  assert.equal(entry.kind, 'file');
  assert.equal(entry.fileName, 'Crew Manifest.pdf');
  assert.equal(entry.dataUrl, 'data:application/pdf;base64,AAAA');
  assert.equal(entry.content, '');
});

test('document mentions are parsed and linked to the library', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  camp = linkDocumentMentions(camp, 'See @Station Manual and @[Shipyard Guide]');
  assert.deepEqual(parseDocumentMentions('See @Station Manual and @[Shipyard Guide]'), ['Station Manual', 'Shipyard Guide']);
  assert.equal(listDocumentMentions(camp).length, 2);
  assert.equal(listDocumentMentions(camp)[0].documentId, camp.documents.library[0].id);
});

// --- entities + auto-linking (Phase 3A) -----------------------------------
import { createEntity, updateEntity, removeEntity, addRelationship, removeRelationship, findByName, parseMentions, linkMentions, listEntities, addEntityTag, removeEntityTag, listTagVocabulary } from '../src/domain/entities.js';
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

// --- tag editor: chips + per-entity-type vocabulary dropdown (Phase 7) -----
test('addEntityTag adds a tag, deduped case-insensitively against existing ones', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addEntityTag(camp, id, 'character');
  assert.deepEqual(findByName(camp, 'Voss').tags, ['character']);
  camp = addEntityTag(camp, id, 'Character'); // same tag, different case -> no duplicate
  assert.deepEqual(findByName(camp, 'Voss').tags, ['character']);
  camp = addEntityTag(camp, id, 'veteran');
  assert.deepEqual(findByName(camp, 'Voss').tags, ['character', 'veteran']);
});

test('removeEntityTag removes a tag case-insensitively without touching others', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addEntityTag(camp, id, 'character');
  camp = addEntityTag(camp, id, 'veteran');
  camp = removeEntityTag(camp, id, 'CHARACTER');
  assert.deepEqual(findByName(camp, 'Voss').tags, ['veteran']);
});

test('listTagVocabulary lists tags used by other entities of the same type, excluding ones the entity already has', () => {
  let camp = defaultCampaign();
  let a, b, c, loc;
  ({ campaign: camp, id: a } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: b } = createEntity(camp, { type: 'npc', name: 'B' }));
  ({ campaign: camp, id: c } = createEntity(camp, { type: 'npc', name: 'C' }));
  ({ campaign: camp, id: loc } = createEntity(camp, { type: 'location', name: 'Dock' }));
  camp = addEntityTag(camp, a, 'character');
  camp = addEntityTag(camp, b, 'hostile');
  camp = addEntityTag(camp, b, 'character'); // duplicate casing/tag across entities collapses to one vocab entry
  camp = addEntityTag(camp, loc, 'derelict'); // different type — must not leak into npc vocabulary
  camp = addEntityTag(camp, c, 'hostile'); // C already has "hostile" — must be excluded from C's own vocabulary

  assert.deepEqual(listTagVocabulary(camp, 'npc', c), ['character']);
  assert.deepEqual(listTagVocabulary(camp, 'npc', a).sort(), ['hostile']);
});

test('default campaign uses the Starforged stat ruleset', () => {
  const camp = defaultCampaign();
  assert.equal(camp.settings.statRuleset, 'starforged');
});

test('addEntityStatblockGroup builds a full Starforged character sheet as rollable tracks', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', 'starforged');
  const e = findByName(camp, 'Scout');
  const group = e.statblocks.find((g) => g.kind === 'character');
  assert.equal(group.kind, 'character');
  assert.equal(group.ruleset, 'starforged');
  const byKey = Object.fromEntries(group.fields.map((f) => [f.key, f]));
  // Stats are rollable attribute modifiers (directly-editable number, not a
  // 1-5 meter) — resources are genuine depleting tracks (Health/Spirit/Supply).
  assert.ok(!byKey.Edge.track && byKey.Edge.attribute && byKey.Edge.group === 'stat');
  assert.equal(byKey.Edge.rollMethod, 'action');
  assert.equal(byKey.Edge.format, 'sign');
  assert.ok(byKey.Health.track && !byKey.Health.attribute && byKey.Health.group === 'resource' && byKey.Health.max === 5);
  assert.ok(byKey.Momentum);
});

test('addEntityStatblockGroup builds a 5PFH character sheet with that ruleset\'s stats', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', '5pfh');
  const e = findByName(camp, 'Scout');
  const group = e.statblocks.find((g) => g.kind === 'character');
  const keys = group.fields.map((f) => f.key);
  assert.deepEqual(keys, ['Reaction', 'Speed', 'Combat', 'Savvy', 'Tough', 'Luck', 'XP']);
  const byKey = Object.fromEntries(group.fields.map((f) => [f.key, f]));
  // 5PFH stats roll flat (d6 + value vs target) except Speed, which is
  // inches-formatted and not rollable (the concrete example the format
  // option was built for).
  assert.equal(byKey.Combat.rollMethod, 'flat');
  assert.equal(byKey.Combat.target, 6);
  assert.equal(byKey.Speed.rollMethod, 'none');
  assert.equal(byKey.Speed.format, 'inches');
});

test('addEntityStatblockGroup defaults the character ruleset to the campaign Settings choice', () => {
  let camp = defaultCampaign();
  camp.settings.statRuleset = '5pfh';
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character');
  const group = findByName(camp, 'Scout').statblocks.find((g) => g.kind === 'character');
  assert.equal(group.ruleset, '5pfh');
});

test('addEntityStatblockGroup does not add an exact duplicate (same kind + ruleset/template) twice', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', 'starforged');
  camp = addEntityStatblockGroup(camp, id, 'character', 'starforged');
  const e = findByName(camp, 'Scout');
  assert.equal(e.statblocks.filter((g) => g.kind === 'character' && g.ruleset === 'starforged').length, 1);
});

test('an entity can hold multiple statblock groups at once (e.g. two rulesets\' character sheets)', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', 'starforged');
  camp = addEntityStatblockGroup(camp, id, 'character', '5pfh');
  const e = findByName(camp, 'Scout');
  const kinds = e.statblocks.filter((g) => g.kind === 'character').map((g) => g.ruleset);
  assert.deepEqual(kinds.sort(), ['5pfh', 'starforged']);
  // the auto-attached Bestiary group from creation is untouched, not replaced
  assert.ok(e.statblocks.some((g) => g.kind === 'npc'));
});

test('parseStatsString orders Starforged stats first and 5PFH stats in the correct sequence', () => {
  const result = parseStatsString('combat: 3, edge: 2, tough: 4, wits: 1, speed: 2, heart: 3');
  assert.deepEqual(result.ordered.map((s) => s.key), ['edge','heart','wits','reaction','speed','combat','savvy','tough'].filter((k) => result.map.has(k)));
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

// --- statblocks (Phase 3C, multi-group array since the Phase 5 revision) ---
import { makeStatblock, hasVehicleTag, ensureAutoStatblock, setStatblockField, addStatblockField, removeStatblockField } from '../src/domain/statblocks.js';
import {
  addEntityStatblockGroup, removeEntityStatblockGroup, setEntityStatblockField, addEntityStatblockField, removeEntityStatblockField,
  getEntity, setEntityTags,
} from '../src/domain/entities.js';

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

test('ensureAutoStatblock attaches a Bestiary statblock group to npc entities', () => {
  const e = { type: 'npc', tags: [] };
  ensureAutoStatblock(e);
  assert.equal(e.statblocks.length, 1);
  assert.equal(e.statblocks[0].kind, 'npc');
});

test('ensureAutoStatblock attaches a vehicle statblock group to #vehicle-tagged assets only', () => {
  const plain = { type: 'asset', tags: ['crate'] };
  ensureAutoStatblock(plain);
  assert.deepEqual(plain.statblocks, []);

  const veh = { type: 'asset', tags: ['vehicle', 'rusty'] };
  ensureAutoStatblock(veh);
  assert.equal(veh.statblocks.length, 1);
  assert.equal(veh.statblocks[0].kind, 'vehicle');
});

test('ensureAutoStatblock never deletes an existing statblock group when type/tags change away', () => {
  const e = { type: 'npc', tags: [], statblocks: [makeStatblock('npc')] };
  e.statblocks[0].fields[0].value = 'custom';
  e.type = 'faction'; // no longer auto-managed
  ensureAutoStatblock(e);
  assert.equal(e.statblocks[0].fields[0].value, 'custom', 'existing data preserved');
});

test('statblock field CRUD (groupIndex + fieldIndex)', () => {
  const e = { statblocks: [makeStatblock('npc')] };
  setStatblockField(e, 0, 0, { value: 'Guard captain' });
  assert.equal(e.statblocks[0].fields[0].value, 'Guard captain');
  addStatblockField(e, 0, 'Fear', 'Fire');
  assert.ok(e.statblocks[0].fields.some((f) => f.key === 'Fear' && f.value === 'Fire'));
  const before = e.statblocks[0].fields.length;
  removeStatblockField(e, 0, 0);
  assert.equal(e.statblocks[0].fields.length, before - 1);
});

test('createEntity auto-attaches statblock groups through the campaign-level API', () => {
  let camp = defaultCampaign();
  let npcId, assetId;
  ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Guard' }));
  assert.equal(getEntity(camp, npcId).statblocks[0].kind, 'npc');

  ({ campaign: camp, id: assetId } = createEntity(camp, { type: 'asset', name: 'Truck' }));
  assert.deepEqual(getEntity(camp, assetId).statblocks, []);

  camp = setEntityTags(camp, assetId, 'vehicle, dented');
  assert.equal(getEntity(camp, assetId).statblocks[0].kind, 'vehicle');
});

test('manual statblock group add/remove and field edits via campaign-level API', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'faction', name: 'Cartel' }));
  assert.deepEqual(getEntity(camp, id).statblocks, []);

  camp = addEntityStatblockGroup(camp, id, 'vehicle');
  assert.equal(getEntity(camp, id).statblocks[0].kind, 'vehicle');

  camp = setEntityStatblockField(camp, id, 0, 0, { value: '8/8' });
  assert.equal(getEntity(camp, id).statblocks[0].fields[0].value, '8/8');

  camp = addEntityStatblockField(camp, id, 0);
  const countAfterAdd = getEntity(camp, id).statblocks[0].fields.length;
  camp = removeEntityStatblockField(camp, id, 0, 0);
  assert.equal(getEntity(camp, id).statblocks[0].fields.length, countAfterAdd - 1);

  camp = removeEntityStatblockGroup(camp, id, 0);
  assert.deepEqual(getEntity(camp, id).statblocks, []);
});

test('addEntityStatblockGroup lets an entity hold both a Bestiary group and a manually-added second one', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Marshal' }));
  assert.equal(getEntity(camp, id).statblocks.length, 1); // auto-attached Bestiary
  camp = addEntityStatblockGroup(camp, id, 'npc', '5pfh');
  const groups = getEntity(camp, id).statblocks;
  assert.equal(groups.length, 2);
  assert.ok(groups.some((g) => g.templateId === 'generic'));
  assert.ok(groups.some((g) => g.templateId === '5pfh'));
});

// --- statblock numeric tracks + double-click-to-roll (Crew-Link-style) -----
import { toggleStatblockFieldTrack, setStatblockTrackValue, setStatblockAttributeValue } from '../src/domain/statblocks.js';
import { toggleEntityStatblockFieldTrack, setEntityStatblockTrackValue, setEntityStatblockAttributeValue } from '../src/domain/entities.js';
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
  const e = { statblocks: [makeStatblock('npc')] };
  addStatblockField(e, 0, { key: 'Grit', value: 2, max: 3, track: true });
  const grit = e.statblocks[0].fields.find((f) => f.key === 'Grit');
  assert.equal(grit.track, true);
  assert.equal(grit.value, 2);
  assert.equal(grit.max, 3);
  // out-of-range values get clamped on add
  addStatblockField(e, 0, { key: 'Over', value: 99, max: 5, track: true });
  assert.equal(e.statblocks[0].fields.find((f) => f.key === 'Over').value, 5);
});

test('toggleStatblockFieldTrack converts text <-> numeric track, preserving intent', () => {
  const e = { statblocks: [{ kind: 'npc', fields: [{ key: 'Combat / Danger', value: '3' }] }] };
  toggleStatblockFieldTrack(e, 0, 0);
  assert.equal(e.statblocks[0].fields[0].track, true);
  assert.equal(e.statblocks[0].fields[0].value, 3);
  assert.equal(e.statblocks[0].fields[0].max, 5);

  toggleStatblockFieldTrack(e, 0, 0);
  assert.equal(e.statblocks[0].fields[0].track, undefined);
  assert.equal(e.statblocks[0].fields[0].value, '3');

  // non-numeric text defaults to 0 on conversion, not NaN
  const f = { statblocks: [{ kind: 'npc', fields: [{ key: 'Notes', value: 'friendly' }] }] };
  toggleStatblockFieldTrack(f, 0, 0);
  assert.equal(f.statblocks[0].fields[0].value, 0);
});

test('setStatblockTrackValue click-to-set clamps and toggles the active box down by one', () => {
  const e = { statblocks: [{ kind: 'npc', fields: [{ key: 'Health', value: 0, max: 5, track: true }] }] };
  setStatblockTrackValue(e, 0, 0, 3);
  assert.equal(e.statblocks[0].fields[0].value, 3);
  // clicking the already-active box decrements by one (lets you zero out a track)
  setStatblockTrackValue(e, 0, 0, 3);
  assert.equal(e.statblocks[0].fields[0].value, 2);
  // clamps to [0, max]
  setStatblockTrackValue(e, 0, 0, 99);
  assert.equal(e.statblocks[0].fields[0].value, 5);
  setStatblockTrackValue(e, 0, 0, 1);
  setStatblockTrackValue(e, 0, 0, 1);
  assert.equal(e.statblocks[0].fields[0].value, 0);
});

test('campaign-level toggle/set-track wrappers round-trip through a real campaign', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Marshal' }));
  const healthIdx = getEntity(camp, id).statblocks[0].fields.findIndex((f) => f.key === 'Health');

  camp = setEntityStatblockTrackValue(camp, id, 0, healthIdx, 2);
  assert.equal(getEntity(camp, id).statblocks[0].fields[healthIdx].value, 2);

  camp = toggleEntityStatblockFieldTrack(camp, id, 0, healthIdx);
  assert.equal(getEntity(camp, id).statblocks[0].fields[healthIdx].track, undefined);
  assert.equal(getEntity(camp, id).statblocks[0].fields[healthIdx].value, '2');
});

test('setStatblockAttributeValue parses a directly-typed number, with no min/max clamp', () => {
  const e = { statblocks: [{ kind: 'character', fields: [{ key: 'Edge', value: 3, attribute: true }] }] };
  setStatblockAttributeValue(e, 0, 0, '4');
  assert.equal(e.statblocks[0].fields[0].value, 4);
  // a stat modifier can legitimately go negative or exceed an old 1-5 scale
  setStatblockAttributeValue(e, 0, 0, '-2');
  assert.equal(e.statblocks[0].fields[0].value, -2);
  setStatblockAttributeValue(e, 0, 0, '99');
  assert.equal(e.statblocks[0].fields[0].value, 99);
  // non-numeric input falls back to 0, never NaN
  setStatblockAttributeValue(e, 0, 0, 'abc');
  assert.equal(e.statblocks[0].fields[0].value, 0);
});

test('setEntityStatblockAttributeValue round-trips a character sheet stat through a real campaign', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', 'starforged');
  const gi = getEntity(camp, id).statblocks.findIndex((g) => g.kind === 'character');
  const fi = getEntity(camp, id).statblocks[gi].fields.findIndex((f) => f.key === 'Edge');

  camp = setEntityStatblockAttributeValue(camp, id, gi, fi, '2');
  assert.equal(getEntity(camp, id).statblocks[gi].fields[fi].value, 2); // Edge starts at 1
  camp = setEntityStatblockAttributeValue(camp, id, gi, fi, '-1');
  assert.equal(getEntity(camp, id).statblocks[gi].fields[fi].value, -1);
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

// --- flat roll (5PFH-style d6 + value vs target) ---------------------------
import { rollFlat, formatFlatRollText } from '../src/domain/dice.js';

test('rollFlat succeeds/fails against a target and is deterministic under a seeded rng', () => {
  const a = rollFlat(3, { target: 6, rng: makeRng(5) });
  const b = rollFlat(3, { target: 6, rng: makeRng(5) });
  assert.equal(a.total, b.total);
  assert.equal(a.success, a.total >= 6);
  assert.equal(a.success, a.outcome === 'success');
});

test('formatFlatRollText includes the formula and target', () => {
  const r = rollFlat(2, { target: 6, rng: makeRng(3) });
  const text = formatFlatRollText('Grunt — Combat', r);
  assert.match(text, /Grunt — Combat/);
  assert.match(text, /vs target 6/);
});

// --- Traveller roll (2d6 + value vs target) --------------------------------
import { rollTraveller, formatTravellerRollText } from '../src/domain/dice.js';

test('rollTraveller succeeds/fails against a target (default 8) and is deterministic under a seeded rng', () => {
  const a = rollTraveller(1, { rng: makeRng(5) });
  const b = rollTraveller(1, { rng: makeRng(5) });
  assert.deepEqual(a, b);
  assert.equal(a.target, 8);
  assert.equal(a.total, a.die1 + a.die2 + 1);
  assert.equal(a.success, a.total >= 8);
  assert.equal(a.success, a.outcome === 'success');
  assert.ok(a.die1 >= 1 && a.die1 <= 6 && a.die2 >= 1 && a.die2 <= 6);
});

test('formatTravellerRollText includes both dice, the formula, and the target', () => {
  const r = rollTraveller(2, { target: 8, rng: makeRng(9) });
  const text = formatTravellerRollText('Pilot — Reaction', r);
  assert.match(text, /Pilot — Reaction/);
  assert.match(text, new RegExp(`${r.die1}\\+${r.die2}`));
  assert.match(text, /vs target 8/);
});

// --- party (Party tab: #character roster + free trackers) ------------------
import { listPartyMembers, addPartyTracker, updatePartyTracker, stepPartyTracker, removePartyTracker, listPartyTrackers } from '../src/domain/party.js';

test('listPartyMembers returns only npc entities tagged #character', () => {
  let camp = defaultCampaign();
  let heroId, guardId, shipId;
  ({ campaign: camp, id: heroId } = createEntity(camp, { type: 'npc', name: 'Hero' }));
  camp = setEntityTags(camp, heroId, 'character, veteran');
  ({ campaign: camp, id: guardId } = createEntity(camp, { type: 'npc', name: 'Guard' }));
  ({ campaign: camp, id: shipId } = createEntity(camp, { type: 'asset', name: 'Ship' }));
  camp = setEntityTags(camp, shipId, 'character'); // wrong type, must not count

  const members = listPartyMembers(camp);
  assert.equal(members.length, 1);
  assert.equal(members[0].id, heroId);
});

test('#character-tagged npc entities gain a full character sheet, alongside (not instead of) their Bestiary group', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Hero' }));
  camp = setEntityTags(camp, id, 'character');
  const groups = getEntity(camp, id).statblocks;
  assert.ok(groups.some((g) => g.kind === 'character'));
  assert.ok(groups.some((g) => g.kind === 'npc'), 'auto-attached Bestiary group is not replaced, just supplemented');
});

test('party trackers: add, step (clamped for meters), update, remove', () => {
  let camp = defaultCampaign();
  camp = addPartyTracker(camp, { name: 'Credits', kind: 'currency', value: 100 });
  const t = listPartyTrackers(camp)[0];
  assert.equal(t.name, 'Credits');

  camp = addPartyTracker(camp, { name: 'Supply', kind: 'meter', value: 3, max: 5 });
  const meter = listPartyTrackers(camp).find((x) => x.name === 'Supply');
  camp = stepPartyTracker(camp, meter.id, 1);
  assert.equal(listPartyTrackers(camp).find((x) => x.id === meter.id).value, 4);
  camp = stepPartyTracker(camp, meter.id, 10); // clamps at max
  assert.equal(listPartyTrackers(camp).find((x) => x.id === meter.id).value, 5);

  camp = updatePartyTracker(camp, meter.id, { name: 'Fuel' });
  assert.equal(listPartyTrackers(camp).find((x) => x.id === meter.id).name, 'Fuel');

  camp = removePartyTracker(camp, meter.id);
  assert.equal(listPartyTrackers(camp).some((x) => x.id === meter.id), false);
});

// --- colony (5PFH Planetfall turn sheet + crew + lifeform filter) ----------
import { COLONY_FIELDS, setColonyField, getColonyFields, addCrewRow, updateCrewRow, removeCrewRow, listCrewRows, listLifeformEncounters } from '../src/domain/colony.js';

test('setColonyField coerces number fields and leaves text/textarea fields as strings', () => {
  let camp = defaultCampaign();
  camp = setColonyField(camp, 'campaignTurn', '4');
  camp = setColonyField(camp, 'notes', 'Watch the ridge line.');
  assert.equal(getColonyFields(camp).campaignTurn, 4);
  assert.equal(getColonyFields(camp).notes, 'Watch the ridge line.');
  assert.ok(COLONY_FIELDS.some((f) => f.key === 'campaignTurn' && f.type === 'number'));
});

test('colony crew rows reference entities by id and round-trip through add/update/remove', () => {
  let camp = defaultCampaign();
  camp = addCrewRow(camp, { role: 'Pilot' });
  const row = listCrewRows(camp)[0];
  assert.equal(row.role, 'Pilot');
  camp = updateCrewRow(camp, row.id, { role: 'Gunner' });
  assert.equal(listCrewRows(camp)[0].role, 'Gunner');
  camp = removeCrewRow(camp, row.id);
  assert.equal(listCrewRows(camp).length, 0);
});

test('listLifeformEncounters filters entities tagged #lifeform', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Creeper' }));
  camp = setEntityTags(camp, id, 'lifeform, hostile');
  const found = listLifeformEncounters(camp);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, id);
});

// --- guide (freeform reference document) ------------------------------------
import { getGuideText, setGuideText } from '../src/domain/guide.js';

test('guide text round-trips and does not mutate the source campaign', () => {
  const camp = defaultCampaign();
  const next = setGuideText(camp, 'Colony Builder @[Colony Builder] p.44');
  assert.equal(getGuideText(camp), '');
  assert.equal(getGuideText(next), 'Colony Builder @[Colony Builder] p.44');
});

// --- oracle grouped/collapsible tree -----------------------------------------
import { buildGroupedOracleTree, filterOracleTree } from '../src/domain/oracles.js';

test('buildGroupedOracleTree buckets every top-level table under a category, including leftovers under Other', () => {
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const allKeys = new Set();
  for (const cat of tree) for (const group of cat.children) allKeys.add(group.label);
  for (const key of Object.keys(SCENE_TABLES)) assert.ok(allKeys.has(key), `${key} should appear somewhere in the tree`);
});

test('filterOracleTree keeps a whole group when its name matches, else only matching leaves', () => {
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const filtered = filterOracleTree(tree, 'core oracles');
  const hasCoreOracles = filtered.some((cat) => cat.children.some((g) => g.label === 'Core Oracles'));
  assert.ok(hasCoreOracles);

  const empty = filterOracleTree(tree, 'zzz-no-such-table-zzz');
  assert.equal(empty.length, 0);
});

// --- documents: tags, search, rename ----------------------------------------
import { addDocumentTag, removeDocumentTag, allDocumentTags, filterDocuments, renameDocument } from '../src/domain/documents.js';

test('document tags add/remove, dedupe, and normalize (lowercase, no leading #)', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Field Guide' });
  const id = camp.documents.library[0].id;
  camp = addDocumentTag(camp, id, '#Rules');
  camp = addDocumentTag(camp, id, 'rules'); // dedupe
  assert.deepEqual(camp.documents.library[0].tags, ['rules']);
  camp = removeDocumentTag(camp, id, 'RULES');
  assert.deepEqual(camp.documents.library[0].tags, []);
});

test('allDocumentTags lists every distinct tag across the library, sorted', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'A', tags: ['zeta', 'alpha'] });
  camp = addDocument(camp, { title: 'B', tags: ['alpha'] });
  assert.deepEqual(allDocumentTags(camp), ['alpha', 'zeta']);
});

test('filterDocuments matches by title/tag search AND required tags', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Colony Builder', tags: ['5pfh', 'rules'] });
  camp = addDocument(camp, { title: 'Starforged Guide', tags: ['starforged', 'rules'] });
  assert.equal(filterDocuments(camp, { search: 'colony' }).length, 1);
  assert.equal(filterDocuments(camp, { tags: ['rules'] }).length, 2);
  assert.equal(filterDocuments(camp, { tags: ['5pfh'] }).length, 1);
  assert.equal(filterDocuments(camp, { search: 'guide', tags: ['5pfh'] }).length, 0);
});

test('renameDocument changes only the display title, never the underlying file', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { kind: 'file', title: 'scan1.pdf', fileName: 'scan1.pdf', dataUrl: 'data:application/pdf;base64,AA==' });
  const id = camp.documents.library[0].id;
  camp = renameDocument(camp, id, 'Ship Manifest');
  const doc = camp.documents.library[0];
  assert.equal(doc.title, 'Ship Manifest');
  assert.equal(doc.fileName, 'scan1.pdf');
  assert.equal(doc.dataUrl, 'data:application/pdf;base64,AA==');
});

// --- entities: editable relationship note/label -----------------------------
import { updateRelationshipLabel } from '../src/domain/entities.js';

test('updateRelationshipLabel edits the note on an existing relationship without touching the mirrored side\'s id', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'npc', name: 'B' }));
  camp = addRelationship(camp, aId, bId, 'linked');
  camp = updateRelationshipLabel(camp, aId, bId, 'sworn rival');
  const a = getEntity(camp, aId);
  assert.equal(a.relationships.find((r) => r.to === bId).label, 'sworn rival');
  // the mirrored side is untouched — labels are per-direction notes
  const b = getEntity(camp, bId);
  assert.equal(b.relationships.find((r) => r.to === aId).label, 'linked');
});

// --- statblock Bestiary templates (per-system, Settings-editable) ----------
import { getStatblockTemplates, listStatblockTemplateIds } from '../src/domain/statblocks.js';
import {
  addTemplateSystem, addTemplateField, updateTemplateField, removeTemplateField, moveTemplateField, listTemplates,
} from '../src/domain/statblockTemplates.js';

test('getStatblockTemplates exposes the shipped defaults when settings has no overrides', () => {
  const templates = getStatblockTemplates({});
  assert.ok(templates.generic);
  assert.ok(templates.starforged);
  assert.ok(templates['5pfh']);
  assert.ok(listStatblockTemplateIds({}).includes('generic'));
});

test('a NPC entity can add a Bestiary template by id, alongside its existing group', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Grunt' }));
  camp = addEntityStatblockGroup(camp, id, 'npc', '5pfh');
  const e = getEntity(camp, id);
  const fivePfh = e.statblocks.find((g) => g.templateId === '5pfh');
  assert.ok(fivePfh);
  assert.ok(fivePfh.fields.some((f) => f.key === 'Toughness'));
  // the auto-attached generic Bestiary group from creation is untouched, not replaced
  assert.ok(e.statblocks.some((g) => g.templateId === 'generic'));
});

test('template field CRUD: add, update, remove, and reorder via campaign settings', () => {
  let camp = defaultCampaign();
  camp = addTemplateSystem(camp, 'D&D', 'Dungeons & Dragons');
  camp = addTemplateField(camp, 'd&d', { key: 'Strength', kind: 'attribute', rollMethod: 'flat', max: 20 });
  camp = addTemplateField(camp, 'd&d', { key: 'Dexterity', kind: 'attribute', rollMethod: 'flat', max: 20 });
  let tpl = listTemplates(camp.settings).find((t) => t.id === 'd&d');
  assert.equal(tpl.fields.length, 2);
  assert.equal(tpl.fields[0].key, 'Strength');

  camp = updateTemplateField(camp, 'd&d', 0, { max: 18 });
  tpl = listTemplates(camp.settings).find((t) => t.id === 'd&d');
  assert.equal(tpl.fields[0].max, 18);

  camp = moveTemplateField(camp, 'd&d', 0, 1); // Strength moves after Dexterity
  tpl = listTemplates(camp.settings).find((t) => t.id === 'd&d');
  assert.equal(tpl.fields[0].key, 'Dexterity');
  assert.equal(tpl.fields[1].key, 'Strength');

  camp = removeTemplateField(camp, 'd&d', 0);
  tpl = listTemplates(camp.settings).find((t) => t.id === 'd&d');
  assert.equal(tpl.fields.length, 1);
  assert.equal(tpl.fields[0].key, 'Strength');
});

test('editing one system\'s template does not affect another system\'s defaults', () => {
  let camp = defaultCampaign();
  camp = addTemplateField(camp, 'generic', { key: 'Custom Field' });
  const generic = listTemplates(camp.settings).find((t) => t.id === 'generic');
  const starforged = listTemplates(camp.settings).find((t) => t.id === 'starforged');
  assert.ok(generic.fields.some((f) => f.key === 'Custom Field'));
  assert.equal(starforged.fields.some((f) => f.key === 'Custom Field'), false);
});

// --- Session Recap / "Narrative Recall" (Phase 6) --------------------------
import { buildSessionRecap, formatSessionRecap } from '../src/domain/recap.js';

test('buildSessionRecap composes last-time journal, open threads, objective, entities, pressure, and a recommendation', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'The crew found a derelict beacon.', 'Note');
  camp = addThread(camp, 'Escape the station');
  camp = advanceThread(camp, listThreads(camp)[0].id, 3); // 3/4, nearly done
  camp = patchContext(camp, 'why', { summary: 'Get everyone out alive.' });
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Marshal' }));
  camp = patchContext(camp, 'who', { entityIds: [id] });

  const recap = buildSessionRecap(camp);
  assert.equal(recap.lastTime.length, 1);
  assert.match(recap.lastTime[0].text, /derelict beacon/);
  assert.equal(recap.openThreads.length, 1);
  assert.equal(recap.openThreads[0].name, 'Escape the station');
  assert.ok(recap.threadUnderPressure && recap.threadUnderPressure.name === 'Escape the station');
  assert.equal(recap.objective, 'Get everyone out alive.');
  assert.deepEqual(recap.relevantEntities.map((e) => e.name), ['Marshal']);
  assert.equal(typeof recap.pressure.threat, 'number');
  assert.ok(recap.recommendedNext.observation);
});

test('buildSessionRecap never mutates the source campaign', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'A clue was found.', 'Note');
  const before = JSON.stringify(camp);
  buildSessionRecap(camp);
  assert.equal(JSON.stringify(camp), before);
});

test('buildSessionRecap excludes previously-saved recaps from its own "last time" list', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'A real event happened.', 'Note');
  camp = addNote(camp, 'Previously on...\n\nLast time:\n- something', 'Session Recap');
  const recap = buildSessionRecap(camp);
  assert.equal(recap.lastTime.length, 1);
  assert.match(recap.lastTime[0].text, /real event/);
});

test('formatSessionRecap renders a readable plain-text block', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'Found the derelict.', 'Note');
  camp = addThread(camp, 'Escape the station');
  const text = formatSessionRecap(buildSessionRecap(camp));
  assert.match(text, /Previously on/);
  assert.match(text, /Found the derelict/);
  assert.match(text, /Escape the station/);
});

// --- Rules Constitution (data reference, requirements/initial design inputs/gameplay-goals.md) ---
import { RULES_PROVIDERS, GAMEPLAY_AREAS, providerLabel } from '../src/data/rulesConstitution.js';

test('every provider referenced in GAMEPLAY_AREAS is a registered RULES_PROVIDERS entry', () => {
  const ids = new Set(Object.keys(RULES_PROVIDERS));
  for (const { area, providers } of GAMEPLAY_AREAS) {
    for (const p of providers) assert.ok(ids.has(p), `${area} references unregistered provider "${p}"`);
  }
});

test('providerLabel resolves a known id and falls back to the id itself for an unknown one', () => {
  assert.equal(providerLabel('starforged'), 'Starforged');
  assert.equal(providerLabel('nonexistent'), 'nonexistent');
});
