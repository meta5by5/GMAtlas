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

// --- Narrative Trackers: Stress/Tension (Hostile Setting pp.211-219) -------
test('a fresh campaign defaults Stress to the neutral midpoint (5/10)', () => {
  const ctx = defaultCampaign().context;
  assert.equal(ctx.what.stress, 5);
});

test('Raise/Ease Stress clamp to [0, 10]', () => {
  let ctx = defaultCampaign().context;
  ctx.what.stress = 9;
  ctx = applyShift(ctx, 'Raise Stress').context;
  ctx = applyShift(ctx, 'Raise Stress').context;
  assert.equal(ctx.what.stress, 10); // clamps at 10, doesn't overshoot
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  ctx = applyShift(ctx, 'Ease Stress').context;
  assert.equal(ctx.what.stress, 0); // clamps at 0
});

test('Stress shifts default an old save missing the field to the neutral midpoint, not 0', () => {
  let ctx = defaultCampaign().context;
  delete ctx.what.stress; // simulate a pre-Stress-dial save
  ctx = applyShift(ctx, 'Ease Stress').context;
  assert.equal(ctx.what.stress, 4); // 5 (default) - 1, not -1
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
import {
  addDocument, updateDocument, removeDocument, parseDocumentMentions, parseDocumentMentionRefs, linkDocumentMentions, listDocumentMentions,
  findDocumentTabByTitle, openDocumentTab, closeDocumentTab, resolveDocumentTab, resolvedDocumentMentionNames, listReferenceDocuments,
} from '../src/domain/documents.js';
import { titleFromFilename } from '../src/domain/titleCase.js';

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

test('Co-Pilot flags high Stress (below Threat, above Resources/Mystery/Reputation in priority) and suggests the Horror Escalation oracle', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.mystery = 1;
  camp.context.what.resources = 5;
  camp.context.what.reputation = 5;
  camp.context.what.stress = 8;
  const a = advise(camp);
  assert.match(a.observation, /[Ss]tress is high/);
  assert.match(a.consequence, /cracks under the pressure/);
  assert.deepEqual(a.suggestedOraclePath, ['Horror Escalation', 'Escalation Beat']);
  assert.deepEqual(a.quickActions, ['Ease Stress', 'Advance Time']);
});

test('Co-Pilot offers a calm-holds opportunity when Stress is very low and nothing else dominates', () => {
  let camp = defaultCampaign();
  camp.context.what.mystery = 0;
  camp.context.what.reputation = 5;
  camp.context.what.resources = 5;
  camp.context.what.stress = 1;
  const a = advise(camp);
  assert.match(a.opportunity, /calm holds/);
});

test('Co-Pilot treats a pre-Stress-dial save (no stress stored) as the neutral midpoint, not high tension', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.mystery = 1;
  delete camp.context.what.stress;
  const a = advise(camp);
  assert.doesNotMatch(a.observation, /[Ss]tress is high/);
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

test('titleFromFilename derives a clean, proper-cased display title from a raw filename (shared by the Reference Library build step and the upload handler)', () => {
  assert.equal(titleFromFilename('HOSTILE-SHORTS-001GhostShip.pdf'), 'Hostile Shorts 001GhostShip');
  assert.equal(titleFromFilename('Hostile_marine_sheet.pdf'), 'Hostile marine sheet');
  assert.equal(titleFromFilename('5PFH-Five-Parsecs-From-Home-v3.pdf'), '5PFH Five Parsecs From Home v3');
  assert.equal(titleFromFilename('Crew Manifest.pdf'), 'Crew Manifest');
});

test('document mentions are parsed and linked to the library', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  camp = linkDocumentMentions(camp, 'See @Station Manual and @[Shipyard Guide]');
  assert.deepEqual(parseDocumentMentions('See @Station Manual and @[Shipyard Guide]'), ['Station Manual', 'Shipyard Guide']);
  assert.equal(listDocumentMentions(camp).length, 2);
  assert.equal(listDocumentMentions(camp)[0].documentId, camp.documents.library[0].id);
});

test('resolvedDocumentMentionNames only includes names that already resolve to a real document, ignoring page anchors', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  const names = resolvedDocumentMentionNames(camp, 'See @[Station Manual#12] and meet @Voss');
  assert.ok(names.has('station manual'));
  assert.equal(names.size, 1, 'Voss (not a known document) is excluded');
});

test('parseDocumentMentionRefs extracts a page anchor from @[Title#12] and @[Title p.12]', () => {
  assert.deepEqual(parseDocumentMentionRefs('See @[Station Manual#12] and @[Shipyard Guide p.7] and @[Field Guide p3]'), [
    { name: 'Station Manual', page: 12, label: null },
    { name: 'Shipyard Guide', page: 7, label: null },
    { name: 'Field Guide', page: 3, label: null },
  ]);
  assert.deepEqual(parseDocumentMentionRefs('@[Plain Doc] and @Station'), [
    { name: 'Plain Doc', page: null, label: null },
    { name: 'Station', page: null, label: null },
  ]);
});

test('parseDocumentMentionRefs extracts a custom @[Label|Target] display label, with or without a page anchor', () => {
  assert.deepEqual(parseDocumentMentionRefs('See @[Colony rules|5PFH Planetfall p.12] for the turn sheet.'), [
    { name: '5PFH Planetfall', page: 12, label: 'Colony rules' },
  ]);
  assert.deepEqual(parseDocumentMentionRefs('@[old friend|Captain Reyes] met us at the bay.'), [
    { name: 'Captain Reyes', page: null, label: 'old friend' },
  ]);
});

test('findDocumentTabByTitle resolves a library file as openable and a text note as not', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  camp = addDocument(camp, { kind: 'file', title: 'Crew Manifest.pdf', fileName: 'Crew Manifest.pdf', mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAAA' });

  const note = findDocumentTabByTitle(camp, 'Station Manual');
  assert.equal(note.openable, false);

  const pdf = findDocumentTabByTitle(camp, 'Crew Manifest.pdf');
  assert.equal(pdf.openable, true);
  assert.equal(pdf.tabKey, 'lib:' + camp.documents.library[1].id);

  assert.equal(findDocumentTabByTitle(camp, 'Nonexistent'), null);
});

test('findDocumentTabByTitle prefers an openable match over a same-titled uploaded text note (regression: a stray phantom note used to permanently shadow a real Reference Library PDF)', () => {
  let camp = defaultCampaign();
  const refTitle = listReferenceDocuments(camp)[0].title;
  // Simulate the exact bug: a phantom text note somehow shares a real
  // Reference Library doc's title (e.g. created before linkDocumentMentions
  // checked the Reference Library too).
  camp = addDocument(camp, { title: refTitle, content: '' });
  const resolved = findDocumentTabByTitle(camp, refTitle);
  assert.equal(resolved.openable, true, 'the real PDF is reachable, not shadowed by the phantom note');
  assert.ok(resolved.tabKey.startsWith('ref:'));
});

test('linkDocumentMentions does not create a phantom document for a name that already matches a Reference Library doc', () => {
  let camp = defaultCampaign();
  const refTitle = listReferenceDocuments(camp)[0].title;
  camp = linkDocumentMentions(camp, `See @[${refTitle}] for details.`);
  assert.equal(camp.documents.library.length, 0);
});

test('opening a document tab at a page anchors the resolved src with #page=N', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { kind: 'file', title: 'Crew Manifest.pdf', fileName: 'Crew Manifest.pdf', mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAAA' });
  const tabKey = 'lib:' + camp.documents.library[0].id;

  camp = openDocumentTab(camp, tabKey, 12);
  let resolved = resolveDocumentTab(camp, tabKey);
  assert.equal(resolved.src, 'data:application/pdf;base64,AAAA#page=12');

  // Re-focusing the same tab without a page keeps the one already recorded.
  camp = openDocumentTab(camp, tabKey);
  resolved = resolveDocumentTab(camp, tabKey);
  assert.equal(resolved.page, 12);

  // Jumping to a different page re-anchors instead of stacking fragments.
  camp = openDocumentTab(camp, tabKey, 30);
  resolved = resolveDocumentTab(camp, tabKey);
  assert.equal(resolved.src, 'data:application/pdf;base64,AAAA#page=30');

  camp = closeDocumentTab(camp, tabKey);
  assert.equal(camp.documents.tabPages[tabKey], undefined);
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

test('parseMentions strips a @[Label|Name] custom label, and a page anchor (meaningful only for a document), back to the real name', () => {
  assert.deepEqual(parseMentions('Meet @[old friend|Captain Reyes] at the bay'), ['Captain Reyes']);
  assert.deepEqual(parseMentions('See @[Starforged reference guide#12] for rules'), ['Starforged reference guide']);
  assert.deepEqual(parseMentions('See @[Colony rules|5PFH Planetfall#12] for the turn sheet'), ['5PFH Planetfall']);
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

test('linkMentions keys off the real name in a @[Label|Name] mention, not the label', () => {
  let camp = defaultCampaign();
  camp = linkMentions(camp, 'Met @[old friend|Captain Reyes] at the bay');
  assert.equal(listEntities(camp).length, 1);
  assert.equal(listEntities(camp)[0].name, 'Captain Reyes');
});

test('linkMentions\' skip option excludes a name from auto-create/link entirely', () => {
  let camp = defaultCampaign();
  camp = linkMentions(camp, 'See @[Station Manual#12] and meet @Voss', { skip: new Set(['station manual']) });
  assert.equal(listEntities(camp).length, 1, 'only Voss created — Station Manual was excluded');
  assert.equal(listEntities(camp)[0].name, 'Voss');
});

test('addNote auto-links @mentions and keeps existing entities', () => {
  let camp = defaultCampaign();
  ({ campaign: camp } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addNote(camp, 'Note: @Voss lied about the reactor.');
  assert.equal(listEntities(camp).length, 1, 'existing entity reused, not duplicated');
  assert.equal(camp.journal.length, 1);
});

test('addNote never spawns a phantom entity for a document mention with a page anchor (regression: @[Title#12] used to auto-create an NPC literally named "Title#12")', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { title: 'Station Manual', content: 'Docking procedures' });
  camp = addNote(camp, 'See @[Station Manual#12] for the airlock sequence.');
  assert.equal(listEntities(camp).length, 0, 'no entity created at all — the mention resolves to the document');
  assert.equal(camp.documents.library.length, 1, 'the document itself is untouched, not duplicated');
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

test('computeLayout spreads a busy graph out with no two nodes stacked exactly on top of each other', () => {
  // A dense-ish graph pushes outer nodes hard against the layout box; before
  // the per-iteration clamp fix, an end-of-run-only clamp could collapse
  // several different overshoot amounts onto the exact same boundary
  // corner, silently stacking distinct entities at an identical point.
  let camp = defaultCampaign();
  const ids = [];
  for (let i = 0; i < 16; i++) { const { campaign, id } = createEntity(camp, { name: `E${i}` }); camp = campaign; ids.push(id); }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) if ((i * 7 + j * 3) % 5 === 0) camp = addRelationship(camp, ids[i], ids[j], 'linked');
  }
  const g = buildGraph(camp);
  const pos = computeLayout(g, { width: 600, height: 520 });
  const pts = [...pos.values()];
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) minDist = Math.min(minDist, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  }
  assert.ok(minDist > 1, `expected no near-exact overlaps, got minimum pairwise distance ${minDist}`);
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
import { rollAction, formatRollText, formatRollCopyText } from '../src/domain/dice.js';
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

test('formatRollCopyText matches the dice roll window\'s own layout: tab-indented Action/Challenge lines, then the outcome in caps on its own line', () => {
  const r = rollAction(2, { rng: makeRng(7) });
  const text = formatRollCopyText(r);
  const lines = text.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], `\tAction: ${r.actionDie} + 2 = ${r.total}`);
  assert.equal(lines[1], `\tChallenge: ${r.challenge1}, ${r.challenge2}${r.match ? ' (match)' : ''}`);
  assert.equal(lines[2], r.outcomeLabel.toUpperCase());
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
import { rollFlat, formatFlatRollText, formatFlatRollCopyText } from '../src/domain/dice.js';

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

test('formatFlatRollCopyText matches the dice roll window\'s layout for a flat check', () => {
  const r = rollFlat(2, { target: 6, rng: makeRng(3) });
  const lines = formatFlatRollCopyText(r).split('\n');
  assert.equal(lines[0], `\tRoll: ${r.die} + 2 = ${r.total}`);
  assert.equal(lines[1], '\tTarget: 6');
  assert.equal(lines[2], r.outcomeLabel.toUpperCase());
});

// --- Traveller roll (2d6 + value vs target) --------------------------------
import { rollTraveller, formatTravellerRollText, formatTravellerRollCopyText } from '../src/domain/dice.js';

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

test('formatTravellerRollCopyText matches the dice roll window\'s layout for a Traveller check', () => {
  const r = rollTraveller(2, { target: 8, rng: makeRng(9) });
  const lines = formatTravellerRollCopyText(r).split('\n');
  assert.equal(lines[0], `\tRoll: ${r.die1} + ${r.die2} = ${r.total}`);
  assert.equal(lines[1], '\tTarget: 8');
  assert.equal(lines[2], r.outcomeLabel.toUpperCase());
});

// --- party (Party tab: #character roster + free trackers) ------------------
import { listPartyMembers, addPartyTracker, updatePartyTracker, stepPartyTracker, setPartyTrackerValue, removePartyTracker, listPartyTrackers } from '../src/domain/party.js';

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

test('party trackers: add, step (currency), rename, remove', () => {
  let camp = defaultCampaign();
  camp = addPartyTracker(camp, { name: 'Credits', kind: 'currency', value: 100 });
  const t = listPartyTrackers(camp)[0];
  assert.equal(t.name, 'Credits');
  camp = stepPartyTracker(camp, t.id, 1);
  assert.equal(listPartyTrackers(camp).find((x) => x.id === t.id).value, 101);

  camp = updatePartyTracker(camp, t.id, { name: 'Funds' });
  assert.equal(listPartyTrackers(camp).find((x) => x.id === t.id).name, 'Funds');

  camp = removePartyTracker(camp, t.id);
  assert.equal(listPartyTrackers(camp).some((x) => x.id === t.id), false);
});

test('a meter tracker is click-to-set (setPartyTrackerValue), clamped to [0, max], clicking the filled box clears down by one; stepPartyTracker is a no-op for meters', () => {
  let camp = defaultCampaign();
  camp = addPartyTracker(camp, { name: 'Supply', kind: 'meter', value: 0, max: 5 });
  const meter = listPartyTrackers(camp)[0];
  camp = setPartyTrackerValue(camp, meter.id, 4);
  assert.equal(listPartyTrackers(camp)[0].value, 4);
  camp = setPartyTrackerValue(camp, meter.id, 10); // clamps at max
  assert.equal(listPartyTrackers(camp)[0].value, 5);
  camp = setPartyTrackerValue(camp, meter.id, 5); // clicking the already-filled box clears down by one
  assert.equal(listPartyTrackers(camp)[0].value, 4);
  camp = stepPartyTracker(camp, meter.id, 1); // meters don't step
  assert.equal(listPartyTrackers(camp)[0].value, 4);
});

test('a meter\'s "size" (max) is set at creation ("usually 5 or 10 in Starforged") and is not editable afterward', () => {
  let camp = defaultCampaign();
  camp = addPartyTracker(camp, { name: 'Oxygen', kind: 'meter', max: 10 });
  const meter = listPartyTrackers(camp)[0];
  assert.equal(meter.max, 10);
  camp = updatePartyTracker(camp, meter.id, { max: 3, kind: 'counter' }); // both stripped — creation-time-only
  const after = listPartyTrackers(camp)[0];
  assert.equal(after.max, 10);
  assert.equal(after.kind, 'meter');
});

test('a Starforged counter can take a difficulty rank (Troublesome..Epic) that steps by that rank\'s tick count instead of +1, clamped to the 40-tick track', () => {
  let camp = defaultCampaign();
  camp.settings.statRuleset = 'starforged';
  camp = addPartyTracker(camp, { name: 'Assault the Compound', kind: 'counter', difficulty: 'dangerous' });
  const t = listPartyTrackers(camp)[0];
  assert.equal(t.difficulty, 'dangerous');
  camp = stepPartyTracker(camp, t.id, 1); // Dangerous = 8 ticks/mark
  assert.equal(listPartyTrackers(camp)[0].value, 8);
  camp = stepPartyTracker(camp, t.id, 1);
  camp = stepPartyTracker(camp, t.id, 1);
  camp = stepPartyTracker(camp, t.id, 1);
  camp = stepPartyTracker(camp, t.id, 1);
  camp = stepPartyTracker(camp, t.id, 1); // 6 marks * 8 = 48, clamps at 40
  assert.equal(listPartyTrackers(camp)[0].value, 40);
});

test('a difficulty is only honored for a counter under the Starforged ruleset — ignored for other kinds/rulesets, and a plain counter steps by 1', () => {
  let camp = defaultCampaign();
  camp.settings.statRuleset = '5pfh';
  camp = addPartyTracker(camp, { name: 'Heat', kind: 'counter', difficulty: 'epic' }); // wrong ruleset — ignored
  assert.equal(listPartyTrackers(camp)[0].difficulty, undefined);
  camp = stepPartyTracker(camp, listPartyTrackers(camp)[0].id, 1);
  assert.equal(listPartyTrackers(camp)[0].value, 1); // plain +1, no rank applied

  camp = defaultCampaign();
  camp.settings.statRuleset = 'starforged';
  camp = addPartyTracker(camp, { name: 'Cash', kind: 'currency', difficulty: 'epic' }); // wrong kind — ignored
  assert.equal(listPartyTrackers(camp)[0].difficulty, undefined);
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

// --- oracle table entry editor (Phase 8) ------------------------------------
import {
  currentTableEntries, hasOracleOverride, addOracleEntry, updateOracleEntry, removeOracleEntry, resetOracleTable,
} from '../src/domain/oracles.js';

test('currentTableEntries reads the shipped default until an override is saved', () => {
  const camp = defaultCampaign();
  const path = ['Missions', 'Patron Benefit'];
  const defaults = currentTableEntries(camp, path);
  assert.ok(defaults.length > 0);
  assert.equal(hasOracleOverride(camp, path), false);
});

test('addOracleEntry/updateOracleEntry/removeOracleEntry mutate a table via override, without touching SCENE_TABLES', () => {
  let camp = defaultCampaign();
  const path = ['Missions', 'Patron Benefit'];
  const before = currentTableEntries(camp, path);

  camp = addOracleEntry(camp, path, 'a custom benefit');
  assert.equal(hasOracleOverride(camp, path), true);
  let entries = currentTableEntries(camp, path);
  assert.equal(entries.length, before.length + 1);
  assert.equal(entries[entries.length - 1], 'a custom benefit');

  camp = updateOracleEntry(camp, path, 0, 'edited first entry');
  assert.equal(currentTableEntries(camp, path)[0], 'edited first entry');

  camp = removeOracleEntry(camp, path, 0);
  entries = currentTableEntries(camp, path);
  assert.equal(entries.length, before.length);
  assert.ok(!entries.includes('edited first entry'));

  // SCENE_TABLES itself is never mutated by any of this.
  assert.equal(SCENE_TABLES.Missions['Patron Benefit'].length, before.length);
});

test('resetOracleTable discards the override and reverts to the shipped default', () => {
  let camp = defaultCampaign();
  const path = ['Missions', 'Patron Hazard'];
  const before = currentTableEntries(camp, path);
  camp = addOracleEntry(camp, path, 'temporary entry');
  assert.equal(hasOracleOverride(camp, path), true);
  camp = resetOracleTable(camp, path);
  assert.equal(hasOracleOverride(camp, path), false);
  assert.deepEqual(currentTableEntries(camp, path), before);
});

test('the Characters oracle group carries a Name table alongside Role/Goal/Disposition (NPC generation chain)', () => {
  const chars = SCENE_TABLES.Characters;
  for (const key of ['Role', 'Goal', 'Revealed Aspect', 'Disposition', 'Name']) {
    assert.ok(Array.isArray(chars[key]) && chars[key].length > 0, `Characters.${key} should be a non-empty table`);
  }
});

test('Missions carries a Patron Benefit/Hazard/Danger Pay job-offer set (5PFH-style Patron table)', () => {
  for (const key of ['Patron Benefit', 'Patron Hazard', 'Danger Pay Reason']) {
    assert.ok(Array.isArray(SCENE_TABLES.Missions[key]) && SCENE_TABLES.Missions[key].length > 0, `Missions.${key} should be a non-empty table`);
  }
});

test('Scenario Framing and Environmental Hazards oracle content shipped and are reachable via the grouped tree', () => {
  assert.ok(Array.isArray(SCENE_TABLES['Scenario Framing'].Dilemma) && SCENE_TABLES['Scenario Framing'].Dilemma.length === 5);
  assert.ok(Array.isArray(SCENE_TABLES['Environmental Hazards']['Environmental Event']));
  assert.ok(SCENE_TABLES['Environmental Hazards']['Environmental Event'].length >= 20);
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const allKeys = new Set();
  for (const cat of tree) for (const group of cat.children) allKeys.add(group.label);
  assert.ok(allKeys.has('Scenario Framing'));
  assert.ok(allKeys.has('Environmental Hazards'));
});

// --- Generate NPC (Phase 8 NPC-generation oracle chain) ---------------------
import { generateNpc } from '../src/domain/session.js';

test('generateNpc rolls the Characters chain into a new NPC entity, seeded and reproducible', () => {
  let camp = defaultCampaign();
  const { campaign: next, id } = generateNpc(camp, { rng: makeRng(42) });
  const npc = getEntity(next, id);
  assert.ok(npc);
  assert.equal(npc.type, 'npc');
  assert.ok(npc.name && npc.name !== 'Unnamed');
  assert.ok(npc.overview.length > 0);
  assert.ok(npc.revealed.length > 0);
  assert.equal(next.journal[next.journal.length - 1].source, 'Oracle');
  assert.match(next.journal[next.journal.length - 1].text, /Generated NPC/);

  // Same seed -> same result (deterministic, like every other roll here).
  const again = generateNpc(camp, { rng: makeRng(42) });
  assert.equal(getEntity(again.campaign, again.id).name, npc.name);
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
import {
  updateRelationshipLabel, updateRelationshipType, updateRelationshipStrength,
  isRelationshipFlagged, listFlaggedRelationships, RELATIONSHIP_TYPES,
} from '../src/domain/entities.js';

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

// --- entities: typed/weighted relationships (Phase 7) -----------------------
test('a new relationship defaults to type "linked" and strength 0 on both sides', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'npc', name: 'B' }));
  camp = addRelationship(camp, aId, bId, 'linked');
  const a = getEntity(camp, aId), b = getEntity(camp, bId);
  assert.equal(a.relationships[0].type, 'linked');
  assert.equal(a.relationships[0].strength, 0);
  assert.equal(b.relationships[0].type, 'linked');
});

test('addRelationship accepts an explicit type, falling back to "linked" for an unrecognized one', () => {
  let camp = defaultCampaign();
  let aId, bId, cId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'faction', name: 'B' }));
  ({ campaign: camp, id: cId } = createEntity(camp, { type: 'npc', name: 'C' }));
  camp = addRelationship(camp, aId, bId, 'rank and file', 'member_of');
  camp = addRelationship(camp, aId, cId, 'note', 'not_a_real_type');
  assert.equal(getEntity(camp, aId).relationships.find((r) => r.to === bId).type, 'member_of');
  assert.equal(getEntity(camp, aId).relationships.find((r) => r.to === cId).type, 'linked');
});

test('updateRelationshipType/Strength edit only the requested side, and strength clamps to 0-10', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'npc', name: 'B' }));
  camp = addRelationship(camp, aId, bId, 'linked');
  camp = updateRelationshipType(camp, aId, bId, 'bond');
  camp = updateRelationshipStrength(camp, aId, bId, 15);
  const a = getEntity(camp, aId), b = getEntity(camp, bId);
  assert.equal(a.relationships.find((r) => r.to === bId).type, 'bond');
  assert.equal(a.relationships.find((r) => r.to === bId).strength, 10);
  assert.equal(b.relationships.find((r) => r.to === aId).type, 'linked');
  camp = updateRelationshipStrength(camp, aId, bId, -5);
  assert.equal(getEntity(camp, aId).relationships.find((r) => r.to === bId).strength, 0);
});

test('a pre-Phase-7 relationship with no type/strength normalizes to "linked"/0 on read', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'npc', name: 'B' }));
  const a = getEntity(camp, aId);
  a.relationships.push({ to: bId, label: 'old-style link' }); // no type/strength, like data saved before this shipped
  camp = updateRelationshipLabel(camp, aId, bId, 'old-style link'); // any mutator runs ensure()
  const rel = getEntity(camp, aId).relationships.find((r) => r.to === bId);
  assert.equal(rel.type, 'linked');
  assert.equal(rel.strength, 0);
});

// --- entities: "flag, don't delete" invalid relationships (pack 9) ----------
test('a typed relationship is flagged when its target no longer matches the type it implies', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = addRelationship(camp, aId, bId, 'rank and file', 'member_of');
  assert.equal(isRelationshipFlagged(camp, getEntity(camp, aId).relationships[0]), false);

  // The target's type changes out from under the relationship.
  camp = updateEntity(camp, bId, { type: 'location' });
  assert.equal(isRelationshipFlagged(camp, getEntity(camp, aId).relationships[0]), true);
  assert.equal(getEntity(camp, aId).relationships.length, 1); // nothing was removed

  const flagged = listFlaggedRelationships(camp);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].entityName, 'Voss');
  assert.equal(flagged[0].toName, 'Sable Cartel');
});

test('"linked" is never flagged regardless of either side\'s type — it\'s the untyped fallback with no implied constraint', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'A' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'location', name: 'B' }));
  camp = addRelationship(camp, aId, bId, 'note', 'linked');
  assert.equal(isRelationshipFlagged(camp, getEntity(camp, aId).relationships[0], 'npc'), false);
});

test('allied_with/rival_of/bond are social relationships — flagged unless BOTH sides are an NPC or a Faction (an Asset/Location/Lore can\'t have a rivalry)', () => {
  let camp = defaultCampaign();
  let npcId, factionId, assetId;
  ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  ({ campaign: camp, id: assetId } = createEntity(camp, { type: 'asset', name: 'AR-5' }));

  // NPC <-> Faction: valid on both sides, never flagged.
  camp = addRelationship(camp, npcId, factionId, 'grudge', 'rival_of');
  const npcRel = getEntity(camp, npcId).relationships.find((r) => r.to === factionId);
  assert.equal(isRelationshipFlagged(camp, npcRel, 'npc'), false);

  // NPC <-> Asset: the target (Asset) isn't a valid side for a rivalry.
  camp = addRelationship(camp, npcId, assetId, 'jealous of', 'rival_of');
  const assetRel = getEntity(camp, npcId).relationships.find((r) => r.to === assetId);
  assert.equal(isRelationshipFlagged(camp, assetRel, 'npc'), true);
  assert.equal(getEntity(camp, npcId).relationships.length, 2, 'nothing was removed — flagged, not deleted');

  // Asset <-> Asset: neither side is valid.
  let asset2Id;
  ({ campaign: camp, id: asset2Id } = createEntity(camp, { type: 'asset', name: 'AR-6' }));
  camp = addRelationship(camp, assetId, asset2Id, '', 'allied_with');
  const assetAssetRel = getEntity(camp, assetId).relationships.find((r) => r.to === asset2Id);
  assert.equal(isRelationshipFlagged(camp, assetAssetRel, 'asset'), true);

  // Only the side that was actually given the typed relationship is flagged
  // — _link() mirrors the reverse edge as plain 'linked' (unconstrained)
  // until the GM deliberately retypes it too, same as directional types.
  const flagged = listFlaggedRelationships(camp);
  assert.equal(flagged.length, 2);
});

test('a bond relationship auto-creates a "Bond: <Name>" track on the source entity\'s Starforged character sheet', () => {
  let camp = defaultCampaign();
  let voss, reyes;
  ({ campaign: camp, id: voss } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  ({ campaign: camp, id: reyes } = createEntity(camp, { type: 'npc', name: 'Captain Reyes' }));
  camp = addEntityStatblockGroup(camp, voss, 'character', 'starforged');
  camp = addRelationship(camp, voss, reyes, '', 'bond');

  const group = findByName(camp, 'Voss').statblocks.find((g) => g.kind === 'character' && g.ruleset === 'starforged');
  const bondField = group.fields.find((f) => f.key === 'Bond: Captain Reyes');
  assert.ok(bondField, 'a Bond track field was added');
  assert.equal(bondField.track, true);
  assert.equal(bondField.max, 10);
  assert.equal(bondField.value, 0);
  // The relationship object itself carries no bond value — "no reference to
  // the bond is needed in this link."
  const rel = findByName(camp, 'Voss').relationships.find((r) => r.to === reyes);
  assert.equal(rel.strength, 0);

  // Doesn't duplicate on a second bond (e.g. retyping back and forth).
  camp = updateRelationshipType(camp, voss, reyes, 'linked');
  camp = updateRelationshipType(camp, voss, reyes, 'bond');
  const fieldsNamed = findByName(camp, 'Voss').statblocks.find((g) => g.ruleset === 'starforged').fields.filter((f) => f.key === 'Bond: Captain Reyes');
  assert.equal(fieldsNamed.length, 1);
});

test('a bond relationship does NOT create a track when the source has no Starforged character sheet, or either side is not an NPC/Faction', () => {
  let camp = defaultCampaign();
  let voss, reyes, ar5;
  ({ campaign: camp, id: voss } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  ({ campaign: camp, id: reyes } = createEntity(camp, { type: 'npc', name: 'Captain Reyes' }));
  ({ campaign: camp, id: ar5 } = createEntity(camp, { type: 'asset', name: 'AR-5' }));

  // No Starforged character sheet yet (NPCs auto-attach a Bestiary group at
  // creation — that's a different kind, not a character sheet).
  camp = addRelationship(camp, voss, reyes, '', 'bond');
  const noCharGroup = (findByName(camp, 'Voss').statblocks || []).find((g) => g.kind === 'character' && g.ruleset === 'starforged');
  assert.equal(noCharGroup, undefined);

  // Has a sheet now, but the other side is an Asset, not NPC/Faction.
  camp = addEntityStatblockGroup(camp, voss, 'character', 'starforged');
  camp = addRelationship(camp, voss, ar5, '', 'linked');
  camp = updateRelationshipType(camp, voss, ar5, 'bond');
  const group = findByName(camp, 'Voss').statblocks.find((g) => g.ruleset === 'starforged');
  assert.equal(group.fields.some((f) => f.key.startsWith('Bond:')), false);
});

test('RELATIONSHIP_TYPES includes the Constitution-named taxonomy plus the legacy "linked" fallback', () => {
  for (const t of ['linked', 'member_of', 'owns', 'controls', 'located_at', 'allied_with', 'rival_of', 'bond']) {
    assert.ok(RELATIONSHIP_TYPES.includes(t));
  }
});

// --- entities: Faction card template (2026-07-03 ruleset review) -----------
test('a faction entity gains hq/leadership/scenarioSeed fields at creation', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  const e = getEntity(camp, id);
  assert.equal(e.hq, '');
  assert.equal(e.leadership, '');
  assert.equal(e.scenarioSeed, '');
});

test('faction fields appear when an entity is retyped to faction, and can be edited', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Mystery Org' }));
  assert.equal(getEntity(camp, id).hq, undefined);
  camp = updateEntity(camp, id, { type: 'faction' });
  assert.equal(getEntity(camp, id).hq, '');
  camp = updateEntity(camp, id, { hq: 'Orbital Station 4', leadership: 'The Quiet Council', scenarioSeed: 'They want the artifact back.' });
  const e = getEntity(camp, id);
  assert.equal(e.hq, 'Orbital Station 4');
  assert.equal(e.leadership, 'The Quiet Council');
  assert.equal(e.scenarioSeed, 'They want the artifact back.');
});

// --- copilot: flagged-relationship review card -----------------------------
test('advise() surfaces flagged relationships without altering them', () => {
  let camp = defaultCampaign();
  let aId, bId;
  ({ campaign: camp, id: aId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  ({ campaign: camp, id: bId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = addRelationship(camp, aId, bId, 'rank and file', 'member_of');
  camp = updateEntity(camp, bId, { type: 'location' });
  const a = advise(camp);
  assert.equal(a.flaggedRelationships.length, 1);
  assert.match(a.flaggedRelationships[0], /Voss/);
  assert.match(a.flaggedRelationships[0], /Sable Cartel/);
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

// --- Universal Search (Phase 8, pack 23) ------------------------------------
import { universalSearch } from '../src/domain/search.js';

test('universalSearch returns no results for an empty query', () => {
  const camp = defaultCampaign();
  assert.deepEqual(universalSearch(camp, ''), []);
  assert.deepEqual(universalSearch(camp, '   '), []);
});

test('universalSearch matches an entity by name and by tag, targeting the Entity Detail tab', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss Calder' }));
  camp = setEntityTags(camp, id, 'smuggler, veteran');
  const byName = universalSearch(camp, 'calder');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].category, 'Cast');
  assert.deepEqual(byName[0].target, { drawer: 'entity-detail', entityId: id });

  const byTag = universalSearch(camp, 'smuggler').filter((r) => r.category === 'Cast');
  assert.equal(byTag.length, 1);
  assert.equal(byTag[0].id, id);
});

test('universalSearch matches journal text and oracle table names/entries', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'The derelict beacon pulses every six seconds.', 'Note');
  const journalHits = universalSearch(camp, 'derelict beacon');
  assert.ok(journalHits.some((r) => r.category === 'Journal'));

  const tableNameHits = universalSearch(camp, 'patron benefit');
  assert.ok(tableNameHits.some((r) => r.category === 'Oracle' && r.label === 'Missions > Patron Benefit'));

  const entryHits = universalSearch(camp, 'rival'); // matches individual table entries, not a table name
  assert.ok(entryHits.some((r) => r.category === 'Oracle'));
});

test('universalSearch matches documents (library + Reference Library), Party trackers, and Colony fields', () => {
  let camp = defaultCampaign();
  camp = addDocument(camp, { kind: 'file', title: 'Crew Manifest Alpha', fileName: 'x.pdf', mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,AA==' });
  camp = addPartyTracker(camp, { name: 'Emergency Credits' });
  camp = setColonyField(camp, 'notes', 'The reactor needs a new coolant line.');

  const docHit = universalSearch(camp, 'manifest alpha');
  assert.equal(docHit.length, 1);
  assert.equal(docHit[0].category, 'Documents');
  assert.equal(docHit[0].target.docTabKey, 'lib:' + camp.documents.library[0].id);

  const partyHit = universalSearch(camp, 'emergency credits');
  assert.ok(partyHit.some((r) => r.category === 'Party'));

  const colonyHit = universalSearch(camp, 'coolant line');
  assert.ok(colonyHit.some((r) => r.category === 'Colony'));
});

// --- Phase 9: Activity -> Rules Lens recommender --------------------------
import { ACTIVITIES, findActivity, suggestRulesLens } from '../src/domain/activities.js';

test('every Activity references a real GAMEPLAY_AREAS area', () => {
  const areas = new Set(GAMEPLAY_AREAS.map((g) => g.area));
  for (const a of ACTIVITIES) assert.ok(areas.has(a.area), `Activity "${a.id}" references unknown area "${a.area}"`);
});

test('findActivity resolves a known id and returns null for an unknown one', () => {
  assert.equal(findActivity('trade').label, 'Trade');
  assert.equal(findActivity('nonexistent'), null);
});

test('suggestRulesLens returns the registered provider(s) for an Activity, and null for an unknown Activity', () => {
  const combat = suggestRulesLens('combat');
  assert.equal(combat.area, 'Tactical combat');
  assert.deepEqual(combat.providers.map((p) => p.id), ['fivepfh']);
  assert.equal(combat.providers[0].rulesetId, '5pfh');

  assert.equal(suggestRulesLens('nonexistent'), null);
});

test('a fresh campaign has no Activity set, and patchContext can set one', () => {
  const camp = defaultCampaign();
  assert.equal(camp.context.how.activity, '');
  const next = patchContext(camp, 'how', { activity: 'investigate' });
  assert.equal(next.context.how.activity, 'investigate');
});

// --- Phase 9: genre packs (data/genrePacks.js) ------------------------------
import { GENRE_PACKS, findGenrePack } from '../src/data/genrePacks.js';
import { FANTASY_TABLES } from '../src/data/tables-fantasy.js';

test('every genre pack carries the load-bearing categories copilot.js/generateNpc reference by exact path', () => {
  for (const pack of GENRE_PACKS) {
    const t = pack.tables;
    assert.ok(t.Characters, `${pack.id}: missing Characters`);
    for (const key of ['Role', 'Goal', 'Revealed Aspect', 'Disposition', 'First Look', 'Name']) {
      assert.ok(Array.isArray(t.Characters[key]) && t.Characters[key].length > 0, `${pack.id}: Characters.${key} should be a non-empty table`);
    }
    assert.ok(Array.isArray(t['Location Themes']?.['Sensory Detail']) && t['Location Themes']['Sensory Detail'].length > 0, `${pack.id}: missing Location Themes > Sensory Detail`);
    assert.ok(Array.isArray(t['Plot Engine']?.['Plot Target']) && t['Plot Engine']['Plot Target'].length > 0, `${pack.id}: missing Plot Engine > Plot Target`);
    assert.ok(Array.isArray(t['Plot Engine']?.['Scene Driver']) && t['Plot Engine']['Scene Driver'].length > 0, `${pack.id}: missing Plot Engine > Scene Driver`);
    assert.ok(Array.isArray(t.Miscellaneous?.['Story Complication']) && t.Miscellaneous['Story Complication'].length > 0, `${pack.id}: missing Miscellaneous > Story Complication`);
    assert.ok(Array.isArray(t.Miscellaneous?.['Story Clue']) && t.Miscellaneous['Story Clue'].length > 0, `${pack.id}: missing Miscellaneous > Story Clue`);
    assert.ok(Array.isArray(t['Trade & Cargo']?.['Cargo Problem']) && t['Trade & Cargo']['Cargo Problem'].length > 0, `${pack.id}: missing Trade & Cargo > Cargo Problem`);
  }
});

test('findGenrePack resolves a known id and falls back to hostile (the default) for an unset/unknown one', () => {
  assert.equal(findGenrePack('cyberpunk').id, 'cyberpunk');
  assert.equal(findGenrePack('fantasy').id, 'fantasy');
  assert.equal(findGenrePack('nonexistent').id, 'hostile');
  assert.equal(findGenrePack(undefined).id, 'hostile');
});

test('tablesWithOverrides selects the requested genre pack, and defaults to hostile when unset', () => {
  const hostile = tablesWithOverrides({});
  const cyberpunk = tablesWithOverrides({}, 'cyberpunk');
  const fantasy = tablesWithOverrides({}, 'fantasy');
  assert.ok(hostile.Characters.Name.includes('Reyes Okafor')); // hostile-pack-specific name
  assert.ok(cyberpunk.Characters.Name.includes('Mireille Okoye')); // cyberpunk-pack-specific name
  assert.ok(fantasy.Characters.Name.includes('Ysolde Thorne')); // fantasy-pack-specific name
  assert.notDeepEqual(cyberpunk.Characters.Name, hostile.Characters.Name);
  assert.notDeepEqual(fantasy.Characters.Name, hostile.Characters.Name);
});

test('an oracle override still applies correctly on top of a non-default genre pack', () => {
  let camp = defaultCampaign();
  camp.settings.genrePack = 'cyberpunk';
  camp = addOracleEntry(camp, ['Trade & Cargo', 'Cargo Problem'], 'a custom cyberpunk cargo problem');
  const entries = currentTableEntries(camp, ['Trade & Cargo', 'Cargo Problem']);
  assert.ok(entries.includes('a custom cyberpunk cargo problem'));
  // The hostile pack's own Cargo Problem table is untouched.
  assert.ok(!tablesWithOverrides({}, 'hostile')['Trade & Cargo']['Cargo Problem'].includes('a custom cyberpunk cargo problem'));
});

test('generateNpc rolls a coherent NPC from a non-default genre pack', () => {
  let camp = defaultCampaign();
  camp.settings.genrePack = 'fantasy';
  const { campaign: next, id } = generateNpc(camp, { rng: makeRng(7) });
  const npc = getEntity(next, id);
  assert.ok(npc.name && npc.name !== 'Unnamed');
  assert.ok(FANTASY_TABLES.Characters.Name.includes(npc.name));
  assert.ok(npc.overview.length > 0);
});

test('a fresh campaign defaults settings.genrePack to hostile', () => {
  const camp = defaultCampaign();
  assert.equal(camp.settings.genrePack, 'hostile');
});

// --- Phase 10: Merchant Rules Lens (ADR 0003/0004) --------------------------
import { COMMODITIES, findCommodity } from '../src/data/commodities.js';
import {
  getMarket, setMarketDial, priceAt, listCargoManifest, buyCommodity, sellCommodity,
  listContracts, createContract, updateContract, generateContract,
} from '../src/domain/trade.js';

test('a fresh Location has no stored market, but getMarket reads every commodity at the neutral 50/50 midpoint', () => {
  let camp = defaultCampaign();
  const { campaign, id } = createEntity(camp, { type: 'location', name: 'Prospect Station' });
  const loc = getEntity(campaign, id);
  assert.equal(loc.market, undefined);
  const market = getMarket(loc);
  for (const c of COMMODITIES) assert.deepEqual(market[c.id], { supply: 50, demand: 50 });
});

test('priceAt is basePrice at a neutral market, rises with demand, falls with supply, and never drops below 1', () => {
  let camp = defaultCampaign();
  let { campaign, id } = createEntity(camp, { type: 'location', name: 'Prospect Station' });
  camp = campaign;
  const water = findCommodity('water');
  assert.equal(priceAt(getEntity(camp, id), 'water'), water.basePrice);

  camp = setMarketDial(camp, id, 'water', 'demand', 100);
  assert.ok(priceAt(getEntity(camp, id), 'water') > water.basePrice);

  camp = setMarketDial(camp, id, 'water', 'demand', 50);
  camp = setMarketDial(camp, id, 'water', 'supply', 100);
  assert.ok(priceAt(getEntity(camp, id), 'water') < water.basePrice);

  camp = setMarketDial(camp, id, 'water', 'supply', 0);
  camp = setMarketDial(camp, id, 'water', 'demand', 0);
  assert.ok(priceAt(getEntity(camp, id), 'water') >= 1);
});

test('setMarketDial clamps to [0, 100] and no-ops on a non-Location entity or unknown commodity', () => {
  let camp = defaultCampaign();
  let { campaign, id } = createEntity(camp, { type: 'location', name: 'Depot' });
  camp = campaign;
  camp = setMarketDial(camp, id, 'water', 'demand', 500);
  assert.equal(getMarket(getEntity(camp, id)).water.demand, 100);
  camp = setMarketDial(camp, id, 'water', 'demand', -50);
  assert.equal(getMarket(getEntity(camp, id)).water.demand, 0);

  const { campaign: camp2, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a location' });
  const before = getEntity(camp2, npcId).market;
  const after = setMarketDial(camp2, npcId, 'water', 'demand', 90);
  assert.equal(getEntity(after, npcId).market, before);

  const untouched = setMarketDial(camp, id, 'not-a-real-commodity', 'demand', 90);
  assert.equal(getEntity(untouched, id).market?.['not-a-real-commodity'], undefined);
});

test('buyCommodity adds to the party cargo manifest and drains local supply; sellCommodity reverses both, clamped to what the party has', () => {
  let camp = defaultCampaign();
  let { campaign, id } = createEntity(camp, { type: 'location', name: 'Prospect Station' });
  camp = campaign;
  assert.deepEqual(listCargoManifest(camp), []);

  camp = buyCommodity(camp, id, 'fuel', 10);
  assert.deepEqual(listCargoManifest(camp), [{ commodityId: 'fuel', qty: 10 }]);
  assert.equal(getMarket(getEntity(camp, id)).fuel.supply, 40); // drained by 10

  camp = buyCommodity(camp, id, 'fuel', 5);
  assert.equal(listCargoManifest(camp).find((m) => m.commodityId === 'fuel').qty, 15);

  camp = sellCommodity(camp, id, 'fuel', 100); // clamps to the 15 actually carried
  assert.deepEqual(listCargoManifest(camp), []); // row removed once qty hits 0
  assert.equal(getMarket(getEntity(camp, id)).fuel.supply, 50); // 40 + 10 (only 15 sold, but supply clamps at 100 well under that)

  // Selling a commodity the party doesn't carry, or at a non-Location, is a no-op.
  const before = camp;
  camp = sellCommodity(camp, id, 'weapons', 1);
  assert.deepEqual(listCargoManifest(camp), listCargoManifest(before));
});

test('createContract is a Thread carrying kind: "contract" plus patron/type/route/payout, and every existing thread mutator still works on it unchanged', () => {
  let camp = defaultCampaign();
  const { campaign, id } = createContract(camp, { name: 'Deliver medicine', type: 'Humanitarian', patronId: 'ent_patron', originId: 'ent_a', destinationId: 'ent_b', payout: 120, segments: 6 });
  camp = campaign;
  const contract = listThreads(camp).find((t) => t.id === id);
  assert.equal(contract.kind, 'contract');
  assert.equal(contract.type, 'Humanitarian');
  assert.equal(contract.patronId, 'ent_patron');
  assert.equal(contract.payout, 120);
  assert.equal(contract.segments, 6);
  assert.equal(contract.status, 'active'); // same lifecycle default as any other thread

  camp = advanceThread(camp, id, 2);
  assert.equal(listThreads(camp).find((t) => t.id === id).filled, 2);
  camp = setThreadStatus(camp, id, 'escalating');
  assert.equal(listThreads(camp).find((t) => t.id === id).status, 'escalating');
  camp = removeThread(camp, id);
  assert.equal(listThreads(camp).some((t) => t.id === id), false);
});

test('createContract logs a Journal entry with type/patron/route/payout resolved to entity names, the same way generateNpc/rollOracle already record what they created', () => {
  let camp = defaultCampaign();
  let patronId, originId, destinationId;
  ({ campaign: camp, id: patronId } = createEntity(camp, { type: 'npc', name: 'Patron Reyes' }));
  ({ campaign: camp, id: originId } = createEntity(camp, { type: 'location', name: 'Prospect Station' }));
  ({ campaign: camp, id: destinationId } = createEntity(camp, { type: 'location', name: 'Dry World' }));
  const before = camp.journal.length;
  const { campaign: next } = createContract(camp, { name: 'Deliver medicine', type: 'Humanitarian', patronId, originId, destinationId, payout: 300 });
  assert.equal(next.journal.length, before + 1);
  const entry = next.journal[next.journal.length - 1];
  assert.equal(entry.source, 'Trade');
  assert.match(entry.text, /Deliver medicine/);
  assert.match(entry.text, /Humanitarian/);
  assert.match(entry.text, /Patron Reyes/);
  assert.match(entry.text, /Prospect Station.*Dry World/);
  assert.match(entry.text, /300/);
});

test('generateContract also logs a Journal entry (createContract does the logging, so every contract-creation path gets one for free)', () => {
  let camp = defaultCampaign();
  const before = camp.journal.length;
  const { campaign: next } = generateContract(camp, { rng: makeRng(3) });
  assert.equal(next.journal.length, before + 1);
  assert.equal(next.journal[next.journal.length - 1].source, 'Trade');
});

test('listContracts only returns kind: "contract" threads, excluding ordinary WHY-question threads', () => {
  let camp = defaultCampaign();
  camp = addThread(camp, 'An unrelated WHY thread');
  const { campaign: withContract, id } = createContract(camp, { name: 'A contract', type: 'Courier' });
  camp = withContract;
  const contracts = listContracts(camp);
  assert.equal(contracts.length, 1);
  assert.equal(contracts[0].id, id);
});

test('updateContract patches trade-specific fields and no-ops on a non-contract thread id', () => {
  let camp = defaultCampaign();
  let { campaign, id } = createContract(camp, { name: 'A contract', type: 'Courier', payout: 10 });
  camp = campaign;
  camp = updateContract(camp, id, { patronId: 'ent_x', payout: 250 });
  const contract = listContracts(camp).find((c) => c.id === id);
  assert.equal(contract.patronId, 'ent_x');
  assert.equal(contract.payout, 250);

  camp = addThread(camp, 'A plain thread');
  const plainId = listThreads(camp).find((t) => t.name === 'A plain thread').id;
  const before = listThreads(camp).find((t) => t.id === plainId);
  camp = updateContract(camp, plainId, { payout: 999 });
  assert.deepEqual(listThreads(camp).find((t) => t.id === plainId), before);
});

test('generateContract rolls the Contract Type oracle table (Trade & Cargo group) and creates a contract from it', () => {
  let camp = defaultCampaign();
  const { campaign, id } = generateContract(camp, { rng: makeRng(3) });
  const contract = listContracts(campaign).find((c) => c.id === id);
  assert.ok(contract);
  assert.ok(tablesWithOverrides({}, 'hostile')['Trade & Cargo']['Contract Type'].includes(contract.type));
  assert.equal(contract.payout, 50); // no route picked — flat default
});

test('generateContract prices its payout from the real gap between two Locations\' markets for a commodity, not a flat number', () => {
  let camp = defaultCampaign();
  let origin, destination;
  ({ campaign: camp, id: origin } = createEntity(camp, { type: 'location', name: 'Cheap Water World' }));
  ({ campaign: camp, id: destination } = createEntity(camp, { type: 'location', name: 'Dry World' }));
  camp = setMarketDial(camp, origin, 'luxury-goods', 'supply', 100); // cheap here
  camp = setMarketDial(camp, destination, 'luxury-goods', 'demand', 100); // dear here
  const { campaign: next, id } = generateContract(camp, { rng: makeRng(3), originId: origin, destinationId: destination, commodityId: 'luxury-goods' });
  const contract = listContracts(next).find((c) => c.id === id);
  assert.equal(contract.originId, origin);
  assert.equal(contract.destinationId, destination);
  const delta = Math.abs(priceAt(getEntity(next, destination), 'luxury-goods') - priceAt(getEntity(next, origin), 'luxury-goods'));
  assert.equal(contract.payout, Math.max(20, delta * 10));
  assert.ok(contract.payout > 50); // a real route beats the flat no-route default
});
