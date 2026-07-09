// Domain-layer tests — the risky logic (rolls, shifts, scenes, session) is pure,
// so we can verify it headlessly. This is the "run a session without the
// software breaking" guarantee, made testable.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SCENE_TABLES, makeRng, rollTable, rollGroup, flattenKeys, getTable, tablesWithOverrides } from '../src/domain/oracles.js';
import { ORACLE_TABLE_SOURCES } from '../src/data/oracleGroups.js';
import { applyShift, listShifts, contextSummary } from '../src/domain/context.js';
import { generateScene, recomposeSceneText } from '../src/domain/scenes.js';
import { continueStory, applyStoryShift, rollOracle, patchContext, drawSuggestionLenses, suggestNextWithLens } from '../src/domain/session.js';
import { SUGGESTION_LENSES, lensOracleCategories } from '../src/data/suggestionLenses.js';
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

test('generateScene, given lensCategories, rolls its Driver line from one of those categories instead of Plot Engine > Scene Driver; omitting it is unchanged (docs/adr/0009)', () => {
  const camp = defaultCampaign();
  const plain = generateScene(camp, SCENE_TABLES, makeRng(1));
  const lensed = generateScene(camp, SCENE_TABLES, makeRng(1), [['Conflict', 'Opposition Tactic']]);
  // Same seed, same everything else up to the Driver roll — but the Driver
  // line's source table differs, so the two scenes' text should diverge.
  assert.notEqual(plain.text, lensed.text);
  const driverTable = SCENE_TABLES['Conflict']['Opposition Tactic'];
  const driverLine = lensed.text.split('\n').find((l) => l.startsWith('Driver:'));
  assert.ok(driverTable.some((v) => driverLine.includes(v)));
});

test('generateScene exposes opening/driver/clue/complication/decisionPoint/consequence as real fields, matching what text embeds', () => {
  const camp = defaultCampaign();
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  assert.ok(scene.opening);
  assert.ok(scene.driver);
  assert.ok(scene.decisionPoint);
  assert.ok(scene.text.includes(`Opening: ${scene.opening}`));
  assert.ok(scene.text.includes(`Driver: ${scene.driver}`));
  assert.ok(scene.text.includes(`Clue: ${scene.clue}`));
  assert.ok(scene.text.includes(`Complication: ${scene.complication}`));
  assert.ok(scene.text.includes(`Decision point: ${scene.decisionPoint}`));
  assert.ok(scene.text.includes(`Likely consequence: ${scene.consequence}`));
});

test('recomposeSceneText treats an edited Decision point as a real field, not the old fixed sentence baked into the template', () => {
  const camp = defaultCampaign();
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  const edited = { ...scene, decisionPoint: 'Trust the stranger, or leave them behind.' };
  const text = recomposeSceneText(edited);
  assert.ok(text.includes('Decision point: Trust the stranger, or leave them behind.'));
});

test('generateScene captures the WHAT Situation\'s first line as situationLine, and it round-trips as an editable "Current thread" field', () => {
  const camp = defaultCampaign();
  camp.context.what.situation = 'A derelict signal repeats every six minutes.';
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  assert.equal(scene.situationLine, 'A derelict signal repeats every six minutes.');
  assert.ok(scene.text.includes('Current thread: A derelict signal repeats every six minutes.'));
  const edited = { ...scene, situationLine: 'A hand-edited thread.' };
  const text = recomposeSceneText(edited);
  assert.ok(text.includes('Current thread: A hand-edited thread.'));
});

test('recomposeSceneText rebuilds text from current field values (the Latest Scene split-field edit path)', () => {
  const camp = defaultCampaign();
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  const edited = { ...scene, driver: 'A hand-written driver' };
  const text = recomposeSceneText(edited);
  assert.ok(text.includes('Driver: A hand-written driver'));
  assert.ok(!text.includes(scene.driver) || scene.driver === 'A hand-written driver');
});

test('recomposeSceneText treats an edited Opening as the whole line, not a fragment inside a fixed template', () => {
  const camp = defaultCampaign();
  const scene = generateScene(camp, SCENE_TABLES, makeRng(1));
  const edited = { ...scene, opening: 'A hand-written opening line, in full.' };
  const text = recomposeSceneText(edited);
  assert.ok(text.includes('Opening: A hand-written opening line, in full.'));
});

// --- session orchestration ------------------------------------------------
test('updateSceneField edits a split field and recomposes the combined text to match', () => {
  let camp = defaultCampaign();
  camp = continueStory(camp);
  const sceneId = camp.scenes[0].id;
  camp = updateSceneField(camp, sceneId, 'clue', 'A hand-written clue');
  const scene = camp.scenes[0];
  assert.equal(scene.clue, 'A hand-written clue');
  assert.ok(scene.text.includes('Clue: A hand-written clue'));
});

test('updateSceneField no-ops for a nonexistent scene id', () => {
  let camp = defaultCampaign();
  camp = continueStory(camp);
  const before = JSON.stringify(camp.scenes);
  camp = updateSceneField(camp, 'not-a-real-id', 'clue', 'x');
  assert.equal(JSON.stringify(camp.scenes), before);
});

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

test('drawSuggestionLenses draws the requested count of distinct lenses from both Discovery and Approach lists combined', () => {
  const camp = defaultCampaign();
  const drawn = drawSuggestionLenses(camp, { rng: makeRng(3), count: 4 });
  assert.equal(drawn.length, 4);
  const ids = new Set(drawn.map((l) => l.id));
  assert.equal(ids.size, 4); // no duplicates
});

test('suggestNextWithLens appends a scene, timeline crumb, and journal entry the same as continueStory, with a "Lens:" marker for a recognized lens; falls back gracefully for an unknown one', () => {
  const camp = defaultCampaign();
  const next = suggestNextWithLens(camp, 'negotiation', { rng: makeRng(2) });
  assert.equal(next.scenes.length, 1);
  assert.equal(next.journal.length, 1);
  assert.equal(next.journal[0].source, 'Scene');
  assert.match(next.journal[0].text, /Lens: Negotiation/);
  assert.ok(next.timeline.some((t) => t.kind === 'scene'));

  const withUnknown = suggestNextWithLens(camp, 'not-a-real-lens', { rng: makeRng(2) });
  assert.equal(withUnknown.scenes.length, 1);
  assert.doesNotMatch(withUnknown.journal[0].text, /Lens:/);
});

test('every Suggestion Lens (docs/adr/0009) maps to at least one real, already-shipped Oracle table — no invented content', () => {
  for (const lens of SUGGESTION_LENSES) {
    const categories = lensOracleCategories(lens.id);
    assert.ok(categories.length > 0, `${lens.id} should map to at least one category`);
    for (const [group, table] of categories) {
      const values = getTable(SCENE_TABLES, group, table);
      assert.ok(Array.isArray(values) && values.length > 0, `${lens.id} -> ${group} > ${table} should be a real, non-empty table`);
    }
  }
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
  parseTextBlocks, parseInlineNodes, sanitizeExternalLinkUrl,
} from '../src/domain/documents.js';
import { titleFromFilename } from '../src/domain/titleCase.js';

// --- lightweight rich text (ADR 0018) --------------------------------------
test('parseTextBlocks: a plain single-line/multi-line paragraph stays one text block', () => {
  assert.deepEqual(parseTextBlocks('Hello world'), [{ type: 'text', text: 'Hello world' }]);
  assert.deepEqual(parseTextBlocks('Line one\nLine two'), [{ type: 'text', text: 'Line one\nLine two' }]);
});

test('parseTextBlocks: groups consecutive "- " lines into one ul block', () => {
  const blocks = parseTextBlocks('- first\n- second\n- third');
  assert.deepEqual(blocks, [{ type: 'ul', items: ['first', 'second', 'third'] }]);
});

test('parseTextBlocks: groups consecutive "N. " lines into one ol block regardless of the literal digit', () => {
  const blocks = parseTextBlocks('1. first\n1. second\n1. third');
  assert.deepEqual(blocks, [{ type: 'ol', items: ['first', 'second', 'third'] }]);
});

test('parseTextBlocks: preserves order across text/list/text sequences', () => {
  const blocks = parseTextBlocks('Intro\n- a\n- b\nOutro line one\nOutro line two');
  assert.deepEqual(blocks, [
    { type: 'text', text: 'Intro' },
    { type: 'ul', items: ['a', 'b'] },
    { type: 'text', text: 'Outro line one\nOutro line two' },
  ]);
});

test('parseInlineNodes: plain text with no markup is a single text node', () => {
  assert.deepEqual(parseInlineNodes('just text'), [{ type: 'text', text: 'just text' }]);
});

test('parseInlineNodes: bold/italic/underline each wrap their content', () => {
  assert.deepEqual(parseInlineNodes('a **bold** word'), [
    { type: 'text', text: 'a ' }, { type: 'bold', children: [{ type: 'text', text: 'bold' }] }, { type: 'text', text: ' word' },
  ]);
  assert.deepEqual(parseInlineNodes('*italic*'), [{ type: 'italic', children: [{ type: 'text', text: 'italic' }] }]);
  assert.deepEqual(parseInlineNodes('_underline_'), [{ type: 'underline', children: [{ type: 'text', text: 'underline' }] }]);
});

test('parseInlineNodes: a mention survives untouched inside bold text (nesting)', () => {
  const nodes = parseInlineNodes('**meet @[Captain Reyes] now**');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'bold');
  assert.deepEqual(nodes[0].children, [
    { type: 'text', text: 'meet ' },
    { type: 'mention', name: 'Captain Reyes', page: null, label: null },
    { type: 'text', text: ' now' },
  ]);
});

test('parseInlineNodes: an underscore inside a bracketed mention name is not treated as underline', () => {
  const nodes = parseInlineNodes('@[Some_Name] is here');
  assert.deepEqual(nodes[0], { type: 'mention', name: 'Some_Name', page: null, label: null });
});

test('parseInlineNodes: a bracketed mention with a page anchor round-trips its page/label', () => {
  const nodes = parseInlineNodes('@[Colony rules|5PFH Planetfall#12]');
  assert.deepEqual(nodes, [{ type: 'mention', name: '5PFH Planetfall', page: 12, label: 'Colony rules' }]);
});

test('parseInlineNodes: an unclosed delimiter (no matching close) is left as literal text', () => {
  assert.deepEqual(parseInlineNodes('a **b'), [{ type: 'text', text: 'a **b' }]);
});

test('parseInlineNodes: a delimiter never matches across a line break', () => {
  assert.deepEqual(parseInlineNodes('**a\nb**'), [{ type: 'text', text: '**a\nb**' }]);
});

// --- text editor extras ("USER CHANGES" batch): small/large + tables -----
test('parseInlineNodes: small (~text~) and large (^text^) wrap their content', () => {
  assert.deepEqual(parseInlineNodes('~fine print~'), [{ type: 'small', children: [{ type: 'text', text: 'fine print' }] }]);
  assert.deepEqual(parseInlineNodes('^BIG^'), [{ type: 'large', children: [{ type: 'text', text: 'BIG' }] }]);
});

// --- external links in rich text (Phase 11 backlog) -----------------------
test('sanitizeExternalLinkUrl: accepts a plain http(s) URL and normalizes it', () => {
  assert.equal(sanitizeExternalLinkUrl('https://example.com/rules'), 'https://example.com/rules');
  assert.equal(sanitizeExternalLinkUrl('http://example.com'), 'http://example.com/');
});

test('sanitizeExternalLinkUrl: auto-prepends https:// to a bare domain', () => {
  assert.equal(sanitizeExternalLinkUrl('example.com/rules'), 'https://example.com/rules');
});

test('sanitizeExternalLinkUrl: strips a query string entirely (the explicit security ask)', () => {
  assert.equal(sanitizeExternalLinkUrl('https://example.com/page?tracking=123&x=y'), 'https://example.com/page');
});

test('sanitizeExternalLinkUrl: rejects a non-http(s) scheme (javascript:/data: cannot reach a rendered href)', () => {
  assert.equal(sanitizeExternalLinkUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalLinkUrl('data:text/html,<script>1</script>'), null);
});

test('sanitizeExternalLinkUrl: rejects empty/garbage input instead of throwing', () => {
  assert.equal(sanitizeExternalLinkUrl(''), null);
  assert.equal(sanitizeExternalLinkUrl('   '), null);
  assert.equal(sanitizeExternalLinkUrl('not a url at all'), null);
});

test('parseInlineNodes: [label](url) becomes a link node with a sanitized url', () => {
  const nodes = parseInlineNodes('See [the rulebook](https://example.com/rules?ref=abc) for details');
  assert.deepEqual(nodes, [
    { type: 'text', text: 'See ' },
    { type: 'link', url: 'https://example.com/rules', children: [{ type: 'text', text: 'the rulebook' }] },
    { type: 'text', text: ' for details' },
  ]);
});

test('parseInlineNodes: a link label can itself carry bold/italic formatting', () => {
  const nodes = parseInlineNodes('[**bold label**](https://example.com)');
  assert.deepEqual(nodes, [
    { type: 'link', url: 'https://example.com/', children: [{ type: 'bold', children: [{ type: 'text', text: 'bold label' }] }] },
  ]);
});

test('parseInlineNodes: a [label](url) whose url is unsafe renders as literal bracket text, not a link', () => {
  const nodes = parseInlineNodes('[click me](javascript:alert(1))');
  assert.equal(nodes.some((n) => n.type === 'link'), false);
});

test('parseTextBlocks: recognizes a pipe table (header + --- separator + rows)', () => {
  const blocks = parseTextBlocks('| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |');
  assert.deepEqual(blocks, [{ type: 'table', headerCells: ['A', 'B'], rows: [['1', '2'], ['3', '4']] }]);
});

test('parseTextBlocks: a table with no rows after the separator is still a valid (empty-body) table', () => {
  const blocks = parseTextBlocks('| A | B |\n| --- | --- |');
  assert.deepEqual(blocks, [{ type: 'table', headerCells: ['A', 'B'], rows: [] }]);
});

test('parseTextBlocks: a lone pipe-row with no separator line is NOT treated as a table', () => {
  const blocks = parseTextBlocks('| A | B |\nJust some text');
  assert.equal(blocks[0].type, 'text');
});

test('parseTextBlocks: text/table/text sequences preserve order and stop the surrounding text block correctly', () => {
  const blocks = parseTextBlocks('Intro\n| A | B |\n| --- | --- |\n| 1 | 2 |\nOutro');
  assert.deepEqual(blocks, [
    { type: 'text', text: 'Intro' },
    { type: 'table', headerCells: ['A', 'B'], rows: [['1', '2']] },
    { type: 'text', text: 'Outro' },
  ]);
});

// --- Reference Table of Contents generation (docs/adr/0020) ---------------
import { buildTocText, generateReferenceToc } from '../src/domain/toc.js';

test('buildTocText turns flat, depth-tagged outline entries into real @[...] mention bullets', () => {
  const text = buildTocText([
    { title: 'Chapter 1', page: 10, depth: 0 },
    { title: 'Section 1.1', page: 12, depth: 1 },
  ], 'My Rulebook');
  assert.equal(text, '- @[Chapter 1|My Rulebook#10]\n- — @[Section 1.1|My Rulebook#12]');
});

test('buildTocText skips entries with no resolved page', () => {
  const text = buildTocText([{ title: 'No page', page: null, depth: 0 }, { title: 'Has page', page: 5, depth: 0 }], 'Doc');
  assert.equal(text, '- @[Has page|Doc#5]');
});

test('generateReferenceToc creates a "Table of Contents" parent doc and one child per document with bookmarks, skipping documents with none', () => {
  const camp = defaultCampaign();
  const { campaign: next, generated, skipped } = generateReferenceToc(camp, [
    { docTitle: 'Book A', entries: [{ title: 'Ch 1', page: 1, depth: 0 }] },
    { docTitle: 'Book B', entries: [] },
  ]);
  assert.equal(generated, 1);
  assert.equal(skipped, 1);
  const parent = next.guide.docs.find((d) => d.title === 'Table of Contents' && !d.parentId);
  assert.ok(parent);
  const child = next.guide.docs.find((d) => d.title === 'Book A' && d.parentId === parent.id);
  assert.ok(child);
  assert.ok(child.text.includes('@[Ch 1|Book A#1]'));
  assert.ok(!next.guide.docs.some((d) => d.title === 'Book B'));
});

test('generateReferenceToc re-run updates an existing document\'s TOC child in place rather than duplicating it', () => {
  const camp = defaultCampaign();
  const first = generateReferenceToc(camp, [{ docTitle: 'Book A', entries: [{ title: 'Ch 1', page: 1, depth: 0 }] }]);
  const second = generateReferenceToc(first.campaign, [{ docTitle: 'Book A', entries: [{ title: 'Ch 1 Revised', page: 2, depth: 0 }] }]);
  const children = second.campaign.guide.docs.filter((d) => d.title === 'Book A');
  assert.equal(children.length, 1);
  assert.ok(children[0].text.includes('Ch 1 Revised'));
});

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

// --- Phase 10: Faction Rumor -> Mission seed link in copilot.js ------------
// (createPressureTrack/getPressureTrack/factionsUnderPressure are imported
// further down this file — ES module imports are hoisted regardless of
// where the `import` statement sits, so they're already in scope here.)
test('Co-Pilot surfaces a faction whose pressure track is nearly full as a mission seed, ranked just below a hot ordinary thread', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.stress = 1;
  let factionId;
  ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId, 4);
  const track = listThreads(camp).find((t) => t.kind === 'faction-pressure' && t.factionId === factionId);
  camp = advanceThread(camp, track.id, 3); // 3/4 = 75%
  const a = advise(camp);
  assert.match(a.observation, /Sable Cartel/);
  assert.match(a.observation, /mission/);
});

test('Co-Pilot still prioritizes a hot ordinary thread over a pressured faction', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.stress = 1;
  camp = addThread(camp, 'Escape the station', 4);
  const hotThread = listThreads(camp)[0];
  camp = advanceThread(camp, hotThread.id, 3); // 3/4 = 75%
  let factionId;
  ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId, 4);
  const track = listThreads(camp).find((t) => t.kind === 'faction-pressure' && t.factionId === factionId);
  camp = advanceThread(camp, track.id, 3);
  const a = advise(camp);
  assert.match(a.observation, /Escape the station/);
});

test('Co-Pilot surfaces an expedition crossing its danger threshold (docs/adr/0009), ranked below a hot faction', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.stress = 1;
  camp = createExpedition(camp, 'Survey the ridge line');
  const exp = listExpeditions(camp)[0];
  camp = setExpeditionDial(camp, exp.id, 'supplies', 1);
  const a = advise(camp);
  assert.match(a.observation, /Survey the ridge line/);
  assert.match(a.observation, /supply/);

  // A hot faction still outranks an expedition in danger.
  let factionId;
  ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId, 4);
  const track = listThreads(camp).find((t) => t.kind === 'faction-pressure' && t.factionId === factionId);
  camp = advanceThread(camp, track.id, 3);
  const a2 = advise(camp);
  assert.match(a2.observation, /Sable Cartel/);
});

test('a near-full Trade contract (also stored as a kind-tagged Thread) does not get flagged by the ordinary hot-thread check', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 1;
  camp.context.what.stress = 1;
  const { campaign: withContract, id: contractId } = createContract(camp, { name: 'Deliver medicine', segments: 4 });
  camp = advanceThread(withContract, contractId, 3); // 3/4 = 75% — would trip the old, unfiltered hot check
  const a = advise(camp);
  assert.doesNotMatch(a.observation, /Deliver medicine/);
  assert.doesNotMatch(a.observation, /one more push resolves it/);
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
import { createEntity, updateEntity, removeEntity, addRelationship, removeRelationship, findByName, parseMentions, linkMentions, listEntities, filterEntities, addEntityTag, removeEntityTag, listTagVocabulary } from '../src/domain/entities.js';
import { addNote, editContextText, editNote, addContextEntity, removeContextEntity, updateSceneField } from '../src/domain/session.js';

test('editNote updates an existing journal entry in place and re-links mentions', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'Original text', 'Note');
  const id = camp.journal[0].id;
  camp = editNote(camp, id, 'Edited text mentioning @NewNPC');
  assert.equal(camp.journal.length, 1);
  assert.equal(camp.journal[0].text, 'Edited text mentioning @NewNPC');
  assert.ok(findByName(camp, 'NewNPC'));
});

test('editNote no-ops for a nonexistent entry id', () => {
  let camp = defaultCampaign();
  camp = addNote(camp, 'Hello', 'Note');
  const before = JSON.stringify(camp.journal);
  camp = editNote(camp, 'not-a-real-id', 'changed');
  assert.equal(JSON.stringify(camp.journal), before);
});

test('addContextEntity/removeContextEntity append/dedupe/remove from context[key].entityIds', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'The Hab' }));
  camp = addContextEntity(camp, 'where', id);
  assert.deepEqual(camp.context.where.entityIds, [id]);
  camp = addContextEntity(camp, 'where', id); // dedupes
  assert.deepEqual(camp.context.where.entityIds, [id]);
  camp = removeContextEntity(camp, 'where', id);
  assert.deepEqual(camp.context.where.entityIds, []);
});

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

import { findRuleset } from '../src/data/rulesets.js';

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

test('addEntityStatblockGroup builds a Traveller character sheet (original content, no sourcebook) using the 2d6-vs-8 rollTraveller mechanic', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Scout' }));
  camp = addEntityStatblockGroup(camp, id, 'character', 'traveller');
  const e = findByName(camp, 'Scout');
  const group = e.statblocks.find((g) => g.kind === 'character');
  assert.equal(group.ruleset, 'traveller');
  const keys = group.fields.map((f) => f.key);
  assert.deepEqual(keys, ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC', 'Stamina']);
  const byKey = Object.fromEntries(group.fields.map((f) => [f.key, f]));
  assert.equal(byKey.STR.rollMethod, 'traveller');
  assert.equal(byKey.STR.target, 8);
  assert.equal(byKey.STR.format, 'sign');
  assert.ok(byKey.Stamina.track && byKey.Stamina.max === 8);
  // findRuleset has no sourcebook PDF for this one — deliberately absent,
  // not a broken/guessed path.
  assert.equal(findRuleset('traveller').doc, null);
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
import { listPartyMembers, addPartyTracker, updatePartyTracker, stepPartyTracker, setPartyTrackerValue, removePartyTracker, listPartyTrackers, setPartySharedGear, addPartySharedAsset, removePartySharedAsset } from '../src/domain/party.js';

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

test('setPartySharedGear overwrites the party-wide gear note wholesale; a fresh campaign defaults it to \'\'', () => {
  let camp = defaultCampaign();
  assert.equal(camp.party.sharedGear, undefined); // lazily set on first touch, like party.trackers
  camp = setPartySharedGear(camp, 'A shared toolkit and a medkit.');
  assert.equal(camp.party.sharedGear, 'A shared toolkit and a medkit.');
  camp = setPartySharedGear(camp, 'Just the medkit now.');
  assert.equal(camp.party.sharedGear, 'Just the medkit now.');
});

test('addPartySharedAsset appends free text (no-op on blank); removePartySharedAsset drops one by index', () => {
  let camp = defaultCampaign();
  camp = addPartySharedAsset(camp, 'Spare oxygen tanks');
  camp = addPartySharedAsset(camp, '   '); // blank — no-op
  camp = addPartySharedAsset(camp, 'A working comm relay');
  assert.deepEqual(camp.party.sharedAssets, ['Spare oxygen tanks', 'A working comm relay']);
  camp = removePartySharedAsset(camp, 0);
  assert.deepEqual(camp.party.sharedAssets, ['A working comm relay']);
  const before = camp;
  camp = removePartySharedAsset(camp, 99); // out of range — no-op
  assert.deepEqual(camp, before);
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

// --- guide (docs/adr/0017: multi-doc tree, was one freeform field) --------
import {
  buildGuideTree, getActiveGuideDoc, setActiveGuideId, setGuideDocText, renameGuideDoc,
  createGuideDoc, countGuideDescendants, removeGuideDoc, moveGuideDoc,
} from '../src/domain/guide.js';

test('a fresh campaign has exactly one root Guide doc, active by default, empty text', () => {
  const camp = defaultCampaign();
  const tree = buildGuideTree(camp);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children.length, 0);
  const active = getActiveGuideDoc(camp);
  assert.equal(active.id, tree[0].id);
  assert.equal(active.text, '');
  assert.equal(active.title, 'Guide');
});

test('an old campaign\'s single guide.text migrates losslessly into that one root doc, including through schema.js\'s withDefaults deep-merge shape', () => {
  const camp = defaultCampaign();
  // withDefaults' deep-merge leaves an old {text} campaign as this exact
  // hybrid — docs already an empty array from the default, text still
  // present alongside it — the real shape ensureGuide must recognize
  // (not just "docs is missing/not an array").
  camp.guide = { docs: [], activeId: null, text: 'Colony Builder @[Colony Builder] p.44' };
  const active = getActiveGuideDoc(camp);
  assert.equal(active.text, 'Colony Builder @[Colony Builder] p.44');
  const next = setGuideDocText(camp, active.id, active.text); // triggers the real, persisted migration
  assert.equal(getActiveGuideDoc(next).text, 'Colony Builder @[Colony Builder] p.44');
  assert.equal(next.guide.text, undefined); // fully absorbed, not left lingering
});

test('setGuideDocText/renameGuideDoc are pure and scoped to the given id', () => {
  let camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  const next = setGuideDocText(camp, rootId, 'Some notes');
  assert.equal(getActiveGuideDoc(camp).text, ''); // source untouched
  assert.equal(getActiveGuideDoc(next).text, 'Some notes');
  const renamed = renameGuideDoc(next, rootId, 'Colony Builder Notes');
  assert.equal(getActiveGuideDoc(renamed).title, 'Colony Builder Notes');
});

test('createGuideDoc adds a child (or top-level) doc, appended after existing siblings, and makes it active', () => {
  let camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  let childId;
  ({ campaign: camp, id: childId } = createGuideDoc(camp, { title: 'Child One', parentId: rootId }));
  assert.equal(getActiveGuideDoc(camp).id, childId);
  let child2Id;
  ({ campaign: camp, id: child2Id } = createGuideDoc(camp, { title: 'Child Two', parentId: rootId }));
  const tree = buildGuideTree(camp);
  const root = tree.find((n) => n.id === rootId);
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].id, childId); // order preserved
  assert.equal(root.children[1].id, child2Id);

  const { campaign: withTop, id: topId } = createGuideDoc(camp, { title: 'Top Level' });
  assert.ok(buildGuideTree(withTop).some((n) => n.id === topId));
});

test('createGuideDoc falls back to top-level for an unresolvable parentId', () => {
  const camp = defaultCampaign();
  const { campaign: next, id } = createGuideDoc(camp, { title: 'Orphaned', parentId: 'not-a-real-id' });
  assert.equal(buildGuideTree(next).some((n) => n.id === id), true);
});

test('setActiveGuideId only switches to a doc that actually exists', () => {
  let camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  let childId;
  ({ campaign: camp, id: childId } = createGuideDoc(camp, { title: 'Child', parentId: rootId }));
  camp = setActiveGuideId(camp, rootId);
  assert.equal(getActiveGuideDoc(camp).id, rootId);
  const unchanged = setActiveGuideId(camp, 'not-a-real-id');
  assert.equal(getActiveGuideDoc(unchanged).id, rootId);
});

test('countGuideDescendants counts the whole subtree, not just direct children; removeGuideDoc cascades and reassigns activeId if needed', () => {
  let camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  let aId, bId, cId;
  ({ campaign: camp, id: aId } = createGuideDoc(camp, { title: 'A', parentId: rootId }));
  ({ campaign: camp, id: bId } = createGuideDoc(camp, { title: 'B', parentId: aId }));
  ({ campaign: camp, id: cId } = createGuideDoc(camp, { title: 'C', parentId: bId }));
  assert.equal(countGuideDescendants(camp, aId), 2); // B and C
  assert.equal(countGuideDescendants(camp, rootId), 3); // A, B, C

  camp = setActiveGuideId(camp, cId);
  const next = removeGuideDoc(camp, aId);
  const tree = buildGuideTree(next);
  assert.equal(tree.find((n) => n.id === rootId).children.length, 0); // A (and B, C) gone
  assert.equal(getActiveGuideDoc(next).id, rootId); // active was inside the removed subtree, reassigned
});

test('removeGuideDoc refuses to delete the last remaining doc', () => {
  const camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  const next = removeGuideDoc(camp, rootId);
  assert.equal(buildGuideTree(next).length, 1); // still exactly one doc
});

test('moveGuideDoc reparents a doc, appended after the new parent\'s existing children, and refuses a cycle', () => {
  let camp = defaultCampaign();
  const rootId = getActiveGuideDoc(camp).id;
  let aId, bId, cId;
  ({ campaign: camp, id: aId } = createGuideDoc(camp, { title: 'A', parentId: rootId }));
  ({ campaign: camp, id: bId } = createGuideDoc(camp, { title: 'B', parentId: rootId }));
  ({ campaign: camp, id: cId } = createGuideDoc(camp, { title: 'C', parentId: aId }));

  // Move B under A — A should now have C then B (appended after).
  let next = moveGuideDoc(camp, bId, aId);
  let a = buildGuideTree(next).find((n) => n.id === rootId).children.find((n) => n.id === aId);
  assert.deepEqual(a.children.map((n) => n.id), [cId, bId]);

  // Cycle guard: A can't become a child of its own descendant C.
  const cycleAttempt = moveGuideDoc(next, aId, cId);
  assert.deepEqual(cycleAttempt, next); // unchanged

  // Un-parenting back to top-level (newParentId null).
  const unparented = moveGuideDoc(next, bId, null);
  assert.equal(buildGuideTree(unparented).some((n) => n.id === bId), true);
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

test('filterOracleTree matches a composite generator\'s label via GROUP_ALIASES even though it is not a literal table name', () => {
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const filtered = filterOracleTree(tree, 'creature concept');
  const hasXenobestiary = filtered.some((cat) => cat.children.some((g) => g.label === 'Xenobestiary'));
  assert.ok(hasXenobestiary);
});

// --- docs/adr/0016: Oracle tags + entity-field links -----------------------
import {
  getOracleTags, addOracleTag, removeOracleTag, isOracleTagLocked,
  listOracleTagVocabulary, oraclePathsWithAnyTag, filterOracleTreeByTags,
} from '../src/domain/oracles.js';
import { ORACLE_TAG_SEEDS } from '../src/data/oracleTagSeeds.js';
import { ENTITY_FIELD_ORACLE_LINKS, oracleLinkTagsFor } from '../src/data/entityFieldOracleLinks.js';

test('getOracleTags reads the seed for an untouched table; addOracleTag/removeOracleTag override it going forward', () => {
  let camp = defaultCampaign();
  const path = ['Crew & NPCs', 'NPC Secret'];
  assert.deepEqual(getOracleTags(camp, path), ORACLE_TAG_SEEDS['Crew & NPCs>NPC Secret']);

  camp = addOracleTag(camp, path, 'custom-tag');
  assert.ok(getOracleTags(camp, path).includes('custom-tag'));
  assert.ok(getOracleTags(camp, path).includes('secret')); // seed tags survive the override write

  camp = addOracleTag(camp, path, 'Custom-Tag'); // case-insensitive dedup
  assert.equal(getOracleTags(camp, path).filter((t) => t.toLowerCase() === 'custom-tag').length, 1);

  camp = removeOracleTag(camp, path, 'custom-tag');
  assert.ok(!getOracleTags(camp, path).includes('custom-tag'));
});

test('isOracleTagLocked is true for every tag entityFieldOracleLinks.js references; removeOracleTag no-ops on a locked tag', () => {
  const allLinkedTags = new Set(Object.values(ENTITY_FIELD_ORACLE_LINKS).flat());
  for (const tag of allLinkedTags) assert.ok(isOracleTagLocked(tag), `${tag} should be locked`);
  assert.ok(!isOracleTagLocked('definitely-not-a-linked-tag'));

  let camp = defaultCampaign();
  const path = ['Crew & NPCs', 'NPC Secret']; // seeded with 'secret', a locked tag
  const before = getOracleTags(camp, path);
  camp = removeOracleTag(camp, path, 'secret');
  assert.deepEqual(getOracleTags(camp, path), before); // unchanged — locked
});

test('listOracleTagVocabulary collects every distinct tag currently in use, seed and campaign-added alike', () => {
  let camp = defaultCampaign();
  const vocab = listOracleTagVocabulary(camp, SCENE_TABLES);
  assert.ok(vocab.includes('secret'));
  assert.ok(vocab.includes('character'));
  camp = addOracleTag(camp, ['Core Oracles', 'Action'], 'brand-new-tag');
  assert.ok(listOracleTagVocabulary(camp, SCENE_TABLES).includes('brand-new-tag'));
});

test('oraclePathsWithAnyTag resolves every seeded path for a tag; filterOracleTreeByTags prunes the tree to just those', () => {
  const camp = defaultCampaign();
  const paths = oraclePathsWithAnyTag(camp, SCENE_TABLES, ['fear']);
  assert.ok(paths.some((p) => p.join('>') === 'Crew & NPCs>NPC Secret'));
  assert.ok(paths.some((p) => p.join('>') === 'Fear and Dread>Fear Trigger'));

  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const filtered = filterOracleTreeByTags(tree, camp, ['fear']);
  const leafLabels = [];
  const collect = (nodes) => nodes.forEach((n) => (n.kind === 'table' ? leafLabels.push(n.label) : collect(n.children)));
  collect(filtered);
  assert.ok(leafLabels.includes('Fear Trigger'));
  assert.ok(leafLabels.includes('NPC Secret'));
  assert.ok(!leafLabels.includes('Action')); // an unrelated table is pruned out

  assert.deepEqual(filterOracleTreeByTags(tree, camp, []), tree); // no tags -> unfiltered
});

test('every ORACLE_TAG_SEEDS path resolves to a real, non-empty table — no invented content', () => {
  for (const key of Object.keys(ORACLE_TAG_SEEDS)) {
    const path = key.split('>');
    const values = getTable(SCENE_TABLES, ...path);
    assert.ok(Array.isArray(values) && values.length > 0, `${key} should be a real table`);
  }
});

test('every tag entityFieldOracleLinks.js references has at least one seeded table — no field link can ever open to an empty filtered view', () => {
  const seededTags = new Set(Object.values(ORACLE_TAG_SEEDS).flat());
  for (const [field, tags] of Object.entries(ENTITY_FIELD_ORACLE_LINKS)) {
    for (const tag of tags) assert.ok(seededTags.has(tag), `${field} -> "${tag}" should have at least one seeded table`);
  }
});

test('oracleLinkTagsFor resolves a known "entityType.field" key and returns null for an unlinked one', () => {
  assert.deepEqual(oracleLinkTagsFor('faction', 'fear'), ['fear']);
  assert.equal(oracleLinkTagsFor('npc', 'name'), null);
});

test('the Stars Without Number oracle group (Faction Action, World Tag — original content, no sourcebook) rolls correctly and is bucketed under Characters & Society, not Other', () => {
  assert.ok(Array.isArray(SCENE_TABLES['Stars Without Number']['Faction Action']));
  assert.ok(Array.isArray(SCENE_TABLES['Stars Without Number']['World Tag']));
  const actionRoll = rollTable(SCENE_TABLES, ['Stars Without Number', 'Faction Action'], makeRng(4));
  assert.ok(SCENE_TABLES['Stars Without Number']['Faction Action'].includes(actionRoll.result));
  const worldRoll = rollTable(SCENE_TABLES, ['Stars Without Number', 'World Tag'], makeRng(4));
  assert.ok(SCENE_TABLES['Stars Without Number']['World Tag'].includes(worldRoll.result));

  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const societyCat = tree.find((cat) => cat.label === '👥 Characters & Society');
  assert.ok(societyCat.children.some((g) => g.label === 'Stars Without Number'));
});

test('the Starforged Oracles group (Plot Twist, Combat Gambit — original content, no sourcebook) rolls correctly and is bucketed under Story Beats, with a source label registered', () => {
  assert.ok(Array.isArray(SCENE_TABLES['Starforged Oracles']['Plot Twist']));
  assert.ok(Array.isArray(SCENE_TABLES['Starforged Oracles']['Combat Gambit']));
  const twistRoll = rollTable(SCENE_TABLES, ['Starforged Oracles', 'Plot Twist'], makeRng(4));
  assert.ok(SCENE_TABLES['Starforged Oracles']['Plot Twist'].includes(twistRoll.result));
  const gambitRoll = rollTable(SCENE_TABLES, ['Starforged Oracles', 'Combat Gambit'], makeRng(4));
  assert.ok(SCENE_TABLES['Starforged Oracles']['Combat Gambit'].includes(gambitRoll.result));

  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const storyCat = tree.find((cat) => cat.label === '📚 Story Beats');
  const group = storyCat.children.find((g) => g.label === 'Starforged Oracles');
  assert.ok(group);
  assert.equal(group.path.length, 1, 'top-level group path stays a single-element breadcrumb, unaffected by the source label');
  assert.ok(ORACLE_TABLE_SOURCES[group.label], 'a source suffix should be registered for this group, for display purposes only');
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

// --- Gallery (Phase 11, docs/adr/0021-gallery.md) ---------------------------
import {
  addGalleryImages, removeGalleryImage, addGalleryTag, removeGalleryTag,
  listGalleryImages, listGalleryTagVocabulary, setEntityThumbnail, clearEntityThumbnail, getGalleryImage,
} from '../src/domain/gallery.js';

test('addGalleryImages: an upload that needed no resize creates exactly one thumbnail record and points the entity at it', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  const r = addGalleryImages(camp, { entityId: id, lockedTag: 'npc', mimeType: 'image/png', thumbDataUrl: 'data:image/png;base64,AAA=' });
  camp = r.campaign;
  assert.equal(camp.gallery.images.length, 1);
  assert.equal(camp.gallery.images[0].kind, 'thumbnail');
  assert.equal(camp.gallery.images[0].pairId, null);
  assert.deepEqual(camp.gallery.images[0].tags, ['npc']);
  assert.equal(camp.entities.items.find((e) => e.id === id).thumbnailId, r.thumbnailId);
});

test('addGalleryImages: a resize-triggering upload creates a linked thumbnail+original pair, both entity-type tagged', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'The Hab' }));
  const r = addGalleryImages(camp, { entityId: id, lockedTag: 'location', mimeType: 'image/jpeg', thumbDataUrl: 'data:image/jpeg;base64,THUMB', originalDataUrl: 'data:image/jpeg;base64,ORIG' });
  camp = r.campaign;
  assert.equal(camp.gallery.images.length, 2);
  const thumb = camp.gallery.images.find((img) => img.id === r.thumbnailId);
  const orig = camp.gallery.images.find((img) => img.id === r.originalId);
  assert.equal(thumb.pairId, orig.id);
  assert.equal(orig.pairId, thumb.id);
  assert.equal(thumb.kind, 'thumbnail');
  assert.equal(orig.kind, 'original');
  assert.deepEqual(orig.tags, ['location']);
});

test('removeGalleryImage clears a dangling entity.thumbnailId and un-links a surviving paired image', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  let r; ({ campaign: camp, ...r } = addGalleryImages(camp, { entityId: id, lockedTag: 'npc', thumbDataUrl: 'a', originalDataUrl: 'b' }));
  camp = removeGalleryImage(camp, r.thumbnailId);
  assert.equal(camp.entities.items.find((e) => e.id === id).thumbnailId, null);
  const orig = getGalleryImage(camp, r.originalId);
  assert.equal(orig.pairId, null);
});

test('removeGalleryTag refuses to remove the locked entity-type tag but removes any other tag normally', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'faction', name: 'Sakura Combine' }));
  let r; ({ campaign: camp, ...r } = addGalleryImages(camp, { entityId: id, lockedTag: 'faction', thumbDataUrl: 'a' }));
  camp = addGalleryTag(camp, r.thumbnailId, 'logo');
  camp = removeGalleryTag(camp, r.thumbnailId, 'faction'); // locked — no-op
  assert.deepEqual(getGalleryImage(camp, r.thumbnailId).tags, ['faction', 'logo']);
  camp = removeGalleryTag(camp, r.thumbnailId, 'logo');
  assert.deepEqual(getGalleryImage(camp, r.thumbnailId).tags, ['faction']);
});

test('listGalleryImages filters by search text and required tags', () => {
  let camp = defaultCampaign();
  camp = addGalleryImages(camp, { lockedTag: 'npc', title: 'Captain Reyes', thumbDataUrl: 'a' }).campaign;
  camp = addGalleryImages(camp, { lockedTag: 'location', title: 'Docking Bay', thumbDataUrl: 'b' }).campaign;
  assert.equal(listGalleryImages(camp, { search: 'reyes' }).length, 1);
  assert.equal(listGalleryImages(camp, { tags: ['location'] }).length, 1);
  assert.equal(listGalleryImages(camp, {}).length, 2);
});

test('listGalleryTagVocabulary is every distinct tag across the Gallery, sorted', () => {
  let camp = defaultCampaign();
  camp = addGalleryImages(camp, { lockedTag: 'npc', thumbDataUrl: 'a' }).campaign;
  camp = addGalleryImages(camp, { lockedTag: 'location', thumbDataUrl: 'b' }).campaign;
  assert.deepEqual(listGalleryTagVocabulary(camp), ['location', 'npc']);
});

test('setEntityThumbnail/clearEntityThumbnail point an entity at a real thumbnail-kind image or clear it', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  const r = addGalleryImages(camp, { lockedTag: 'npc', thumbDataUrl: 'a' });
  camp = setEntityThumbnail(r.campaign, id, r.thumbnailId);
  assert.equal(camp.entities.items.find((e) => e.id === id).thumbnailId, r.thumbnailId);
  camp = clearEntityThumbnail(camp, id);
  assert.equal(camp.entities.items.find((e) => e.id === id).thumbnailId, null);
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
  for (const t of ['linked', 'member_of', 'owns', 'controls', 'located_at', 'contains', 'allied_with', 'rival_of', 'bond']) {
    assert.ok(RELATIONSHIP_TYPES.includes(t));
  }
});

// --- entities: Faction card template (2026-07-03 ruleset review) -----------
test('a faction entity gains hq/leadership/scenarioSeed/agenda fields at creation', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  const e = getEntity(camp, id);
  assert.equal(e.hq, '');
  assert.equal(e.leadership, '');
  assert.equal(e.scenarioSeed, '');
  assert.equal(e.agenda, '');
});

test('faction fields appear when an entity is retyped to faction, and can be edited', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Mystery Org' }));
  assert.equal(getEntity(camp, id).hq, undefined);
  camp = updateEntity(camp, id, { type: 'faction' });
  assert.equal(getEntity(camp, id).hq, '');
  camp = updateEntity(camp, id, { hq: 'Orbital Station 4', leadership: 'The Quiet Council', scenarioSeed: 'They want the artifact back.', agenda: 'Consolidate the water contracts.' });
  const e = getEntity(camp, id);
  assert.equal(e.hq, 'Orbital Station 4');
  assert.equal(e.leadership, 'The Quiet Council');
  assert.equal(e.scenarioSeed, 'They want the artifact back.');
  assert.equal(e.agenda, 'Consolidate the water contracts.');
});

// --- Phase 10: Faction Pressure Track (a Thread tagged kind: 'faction-pressure') ---
import { getPressureTrack, createPressureTrack, factionsUnderPressure, advanceFactionTurns, formatFactionTurnRumors } from '../src/domain/factions.js';

test('createPressureTrack adds a Thread tagged kind: "faction-pressure" with a factionId, and every existing thread mutator still works on it unchanged', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  assert.equal(getPressureTrack(camp, factionId), null);

  camp = createPressureTrack(camp, factionId, 6);
  const track = getPressureTrack(camp, factionId);
  assert.ok(track);
  assert.equal(track.kind, 'faction-pressure');
  assert.equal(track.factionId, factionId);
  assert.equal(track.segments, 6);
  assert.equal(track.status, 'active');

  camp = advanceThread(camp, track.id, 3);
  assert.equal(getPressureTrack(camp, factionId).filled, 3);
  camp = setThreadStatus(camp, track.id, 'escalating');
  assert.equal(getPressureTrack(camp, factionId).status, 'escalating');
});

test('createPressureTrack is a no-op on a non-faction entity, or a faction that already has one', () => {
  let camp = defaultCampaign();
  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a faction' }));
  camp = createPressureTrack(camp, npcId);
  assert.equal(getPressureTrack(camp, npcId), null);

  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId);
  const before = getPressureTrack(camp, factionId);
  camp = createPressureTrack(camp, factionId); // second call must not create a duplicate
  const trackCount = listThreads(camp).filter((t) => t.kind === 'faction-pressure' && t.factionId === factionId).length;
  assert.equal(trackCount, 1);
  assert.deepEqual(getPressureTrack(camp, factionId), before);
});

test('factionsUnderPressure surfaces factions whose track is >=75% full and not yet Resolved/Archived, with the faction entity attached', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId, 4);
  const track = getPressureTrack(camp, factionId);
  camp = advanceThread(camp, track.id, 2); // 2/4 = 50%, not yet surfaced
  assert.equal(factionsUnderPressure(camp).length, 0);
  camp = advanceThread(camp, track.id, 1); // 3/4 = 75%
  const surfaced = factionsUnderPressure(camp);
  assert.equal(surfaced.length, 1);
  assert.equal(surfaced[0].faction.id, factionId);
  assert.equal(surfaced[0].faction.name, 'Sable Cartel');
});

// --- docs/adr/0009: Expedition trackers --------------------------------
import { createExpedition, getExpedition, setExpeditionDial, listExpeditions, expeditionsInDanger, EXPEDITION_DIAL_DEFAULT } from '../src/domain/expeditions.js';

test('createExpedition adds a Thread tagged kind: "expedition" with all three dials at the neutral midpoint (5); every existing Thread mutator still works on it', () => {
  let camp = defaultCampaign();
  camp = createExpedition(camp, 'Survey the ridge line', 6);
  const list = listExpeditions(camp);
  assert.equal(list.length, 1);
  const exp = list[0];
  assert.equal(exp.name, 'Survey the ridge line');
  assert.equal(exp.segments, 6);
  assert.equal(exp.supplies, EXPEDITION_DIAL_DEFAULT);
  assert.equal(exp.exposure, EXPEDITION_DIAL_DEFAULT);
  assert.equal(exp.morale, EXPEDITION_DIAL_DEFAULT);
  assert.equal(getExpedition(camp, exp.id).id, exp.id);

  camp = advanceThread(camp, exp.id, 2);
  assert.equal(getExpedition(camp, exp.id).filled, 2); // the clock IS the Progress dial, unaffected by the other three
});

test('setExpeditionDial clamps 0-10 and no-ops on an unknown thread id, a non-expedition thread, or an unrecognized field', () => {
  let camp = defaultCampaign();
  camp = createExpedition(camp, 'Survey the ridge line');
  const exp = listExpeditions(camp)[0];
  camp = setExpeditionDial(camp, exp.id, 'supplies', 1);
  assert.equal(getExpedition(camp, exp.id).supplies, 1);
  camp = setExpeditionDial(camp, exp.id, 'exposure', 99);
  assert.equal(getExpedition(camp, exp.id).exposure, 10); // clamped high
  camp = setExpeditionDial(camp, exp.id, 'morale', -5);
  assert.equal(getExpedition(camp, exp.id).morale, 0); // clamped low

  const before = getExpedition(camp, exp.id);
  camp = setExpeditionDial(camp, exp.id, 'not-a-real-field', 3);
  assert.deepEqual(getExpedition(camp, exp.id), before);

  camp = addThread(camp, 'An ordinary thread');
  const ordinary = listThreads(camp).find((t) => t.name === 'An ordinary thread');
  const campBefore = JSON.stringify(camp);
  camp = setExpeditionDial(camp, ordinary.id, 'supplies', 1);
  assert.equal(JSON.stringify(camp), campBefore); // no-op, not an expedition
});

test('expeditionsInDanger surfaces an open expedition once Supplies <=2 or Exposure >=8, excludes done ones', () => {
  let camp = defaultCampaign();
  camp = createExpedition(camp, 'Survey the ridge line');
  const exp = listExpeditions(camp)[0];
  assert.equal(expeditionsInDanger(camp).length, 0); // neutral midpoint, not in danger

  camp = setExpeditionDial(camp, exp.id, 'supplies', 2);
  assert.equal(expeditionsInDanger(camp).length, 1);

  camp = setExpeditionDial(camp, exp.id, 'supplies', 5); // back to safe
  camp = setExpeditionDial(camp, exp.id, 'exposure', 8);
  assert.equal(expeditionsInDanger(camp).length, 1);

  camp = advanceThread(camp, exp.id, 999); // fills/marks it done
  assert.equal(expeditionsInDanger(camp).length, 0);
});

test('advanceFactionTurns advances every tracked faction\'s pressure by one tick and rolls a Faction Activity rumor for each, skipping factions with no track', () => {
  let camp = defaultCampaign();
  let trackedId, untrackedId;
  ({ campaign: camp, id: trackedId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  ({ campaign: camp, id: untrackedId } = createEntity(camp, { type: 'faction', name: 'No Track Inc' }));
  camp = createPressureTrack(camp, trackedId, 6);

  const { campaign: next, rumors } = advanceFactionTurns(camp, { rng: makeRng(3) });
  assert.equal(getPressureTrack(next, trackedId).filled, 1);
  assert.equal(getPressureTrack(next, untrackedId), null); // still no track — untouched
  assert.equal(rumors.length, 1);
  assert.equal(rumors[0].factionName, 'Sable Cartel');
  assert.ok(tablesWithOverrides({}, 'hostile')['Corporate Powers']['Faction Activity'].includes(rumors[0].activity));
});

test('advanceFactionTurns does not mutate the source campaign, and is a no-op (empty rumors) with no tracked factions', () => {
  let camp = defaultCampaign();
  const before = JSON.parse(JSON.stringify(camp));
  const { campaign: next, rumors } = advanceFactionTurns(camp, { rng: makeRng(3) });
  assert.deepEqual(camp, before);
  assert.deepEqual(rumors, []);
  assert.deepEqual(next.threads, camp.threads);
});

test('formatFactionTurnRumors renders a readable block, or an explanatory message when nothing is tracked', () => {
  assert.match(formatFactionTurnRumors([]), /no factions are being tracked yet/);
  const text = formatFactionTurnRumors([{ factionName: 'Sable Cartel', activity: 'quietly buys out a smaller rival' }]);
  assert.match(text, /^Faction turn:/);
  assert.match(text, /Sable Cartel quietly buys out a smaller rival\./);
});

// --- SWN/CWN content (2026-07-06, docs/adr/0011-swn-cwn-content.md) --------
import { setFactionStat, addFactionAsset, removeFactionAsset } from '../src/domain/entities.js';
import { addLocationTradeCode, removeLocationTradeCode } from '../src/domain/entities.js';
import { resolveFactionTurn, formatFactionTurnResult, rollFactionAsset, FACTION_ACTION_TYPES } from '../src/domain/factions.js';
import { deepenNpc } from '../src/domain/session.js';
import {
  generateCreatureConcept, formatCreatureConcept, generateSiteConcept, formatSiteConcept,
  generateAdventureSeed, formatAdventureSeed,
} from '../src/domain/worldbuilding.js';
import {
  getEnhancements, strainUsed, strainCapacity, isOverStrained, installEnhancement, removeEnhancement, setStrainCapacity,
  DEFAULT_STRAIN_CAPACITY, DEFAULT_ENHANCEMENT_TYPE,
} from '../src/domain/enhancements.js';

test('a faction entity defaults Force/Cunning/Wealth to 3 and an empty Assets list; setFactionStat clamps 0-10 and no-ops on a non-faction entity', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  let e = getEntity(camp, factionId);
  assert.equal(e.force, 3); assert.equal(e.cunning, 3); assert.equal(e.wealth, 3);
  assert.deepEqual(e.assets, []);

  camp = setFactionStat(camp, factionId, 'force', 15);
  assert.equal(getEntity(camp, factionId).force, 10); // clamped high
  camp = setFactionStat(camp, factionId, 'cunning', -4);
  assert.equal(getEntity(camp, factionId).cunning, 0); // clamped low

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a faction' }));
  const before = getEntity(camp, npcId);
  camp = setFactionStat(camp, npcId, 'force', 5);
  assert.deepEqual(getEntity(camp, npcId), before); // no-op, no force field added
});

test('a faction entity defaults the Diplomacy Engine fields (fear/need/secret) to empty strings, editable like hq/leadership/agenda', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  let e = getEntity(camp, factionId);
  assert.equal(e.fear, ''); assert.equal(e.need, ''); assert.equal(e.secret, '');

  camp = updateEntity(camp, factionId, { fear: 'losing its monopoly', need: 'a new supply route', secret: 'is secretly bankrupt' });
  e = getEntity(camp, factionId);
  assert.equal(e.fear, 'losing its monopoly');
  assert.equal(e.need, 'a new supply route');
  assert.equal(e.secret, 'is secretly bankrupt');
});

test('addFactionAsset appends a trimmed, non-empty asset; removeFactionAsset removes by index; both no-op on a non-faction entity', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = addFactionAsset(camp, factionId, '  an elite enforcer cadre  ');
  camp = addFactionAsset(camp, factionId, '');
  assert.deepEqual(getEntity(camp, factionId).assets, ['an elite enforcer cadre']);

  camp = addFactionAsset(camp, factionId, 'a hidden cache');
  camp = removeFactionAsset(camp, factionId, 0);
  assert.deepEqual(getEntity(camp, factionId).assets, ['a hidden cache']);
  camp = removeFactionAsset(camp, factionId, 99); // out of range, no-op
  assert.deepEqual(getEntity(camp, factionId).assets, ['a hidden cache']);

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a faction' }));
  camp = addFactionAsset(camp, npcId, 'should not attach');
  assert.equal(getEntity(camp, npcId).assets, undefined);
});

test('resolveFactionTurn rolls d10 + the acting stat against a flat difficulty, deterministically under a seeded rng, and returns null for a non-faction entity', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));

  const setback = resolveFactionTurn(camp, factionId, { rng: makeRng(0) });
  assert.ok(FACTION_ACTION_TYPES[setback.type]);
  assert.equal(setback.outcome, 'setback');
  assert.equal(setback.total, setback.roll + setback.statValue);

  const strong = resolveFactionTurn(camp, factionId, { rng: makeRng(9) });
  assert.equal(strong.outcome, 'strong success');

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a faction' }));
  assert.equal(resolveFactionTurn(camp, npcId, { rng: makeRng(0) }), null);
});

test('formatFactionTurnResult renders a readable line including the stat check and outcome', () => {
  const r = { factionName: 'Sable Cartel', type: 'attack', verb: 'moves against a rival with open force', stat: 'force', statValue: 3, roll: 1, total: 4, outcome: 'setback' };
  const text = formatFactionTurnResult(r);
  assert.match(text, /Sable Cartel moves against a rival with open force/);
  assert.match(text, /force 3 \+ d10 1 = 4/);
  assert.match(text, /setback\.$/);
});

test('advanceFactionTurns applies a strong success (stat +1) or a setback (an extra Pressure Track tick) from the mechanical turn, on top of the ordinary per-turn advance', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  camp = createPressureTrack(camp, factionId, 10);

  // seed 0: Faction Activity roll then a setback stat check -> pressure advances 1 (ordinary) + 1 (setback) = 2
  const { campaign: afterSetback } = advanceFactionTurns(camp, { rng: makeRng(0) });
  assert.equal(getPressureTrack(afterSetback, factionId).filled, 2);

  // seed 7: a strong success -> the acting stat (force, for seed 7) ticks up by 1, ordinary +1 tick only
  const { campaign: afterStrong } = advanceFactionTurns(camp, { rng: makeRng(7) });
  assert.equal(getPressureTrack(afterStrong, factionId).filled, 1);
  assert.equal(getEntity(afterStrong, factionId).force, 4);
});

test('rollFactionAsset rolls the Faction Asset table (Corporate Powers group) and appends it to the faction, returning the campaign unchanged with an empty asset for a non-faction entity', () => {
  let camp = defaultCampaign();
  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  const { campaign: next, asset } = rollFactionAsset(camp, factionId, { rng: makeRng(1) });
  assert.ok(asset);
  assert.ok(tablesWithOverrides({}, 'hostile')['Corporate Powers']['Faction Asset'].includes(asset));
  assert.deepEqual(getEntity(next, factionId).assets, [asset]);

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Not a faction' }));
  const r2 = rollFactionAsset(camp, npcId, { rng: makeRng(1) });
  assert.equal(r2.asset, ''); // addFactionAsset no-ops on a non-faction entity
});

test('deepenNpc rolls Stereotype into Overview and Want/Complication into Revealed/hidden (GM), and journals the combined addition; no-ops on a non-npc entity', () => {
  let camp = defaultCampaign();
  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = updateEntity(camp, npcId, { overview: 'A dock foreman.', revealed: 'Owes a debt.' });
  const { campaign: next, added } = deepenNpc(camp, npcId, { rng: makeRng(2) });
  assert.ok(added);
  assert.match(added, /Stereotype:/);
  assert.match(added, /wants:/);
  assert.match(added, /Complication:/);
  const e = getEntity(next, npcId);
  assert.ok(e.overview.startsWith('A dock foreman.'));
  assert.match(e.overview, /Stereotype:/);
  assert.doesNotMatch(e.overview, /wants:|Complication:/);
  assert.ok(e.revealed.startsWith('Owes a debt.'));
  assert.match(e.revealed, /wants:/);
  assert.match(e.revealed, /Complication:/);
  assert.doesNotMatch(e.revealed, /Stereotype:/);
  assert.match(next.journal[next.journal.length - 1].text, /Deepened Voss:/);

  let factionId; ({ campaign: camp, id: factionId } = createEntity(camp, { type: 'faction', name: 'Sable Cartel' }));
  const r2 = deepenNpc(camp, factionId, { rng: makeRng(2) });
  assert.equal(r2.added, null);
});

test('generateCreatureConcept/formatCreatureConcept roll the Xenobestiary tables into a readable block', () => {
  const camp = defaultCampaign();
  const c = generateCreatureConcept(camp, { rng: makeRng(4) });
  const tables = tablesWithOverrides({}, 'hostile');
  assert.ok(tables.Xenobestiary['Creature Origin'].includes(c.origin));
  assert.ok(tables.Xenobestiary['Creature Method'].includes(c.method));
  assert.ok(tables.Xenobestiary['Creature Trait'].includes(c.trait));
  assert.ok(tables.Xenobestiary['Creature Threat'].includes(c.threat));
  const text = formatCreatureConcept(c);
  assert.match(text, /^Creature concept:/);
  assert.match(text, /Origin:/); assert.match(text, /Gets around by:/); assert.match(text, /trait:/); assert.match(text, /dangerous:/);
});

test('generateSiteConcept/formatSiteConcept roll the Site Concept tables into a readable block', () => {
  const camp = defaultCampaign();
  const s = generateSiteConcept(camp, { rng: makeRng(4) });
  const tables = tablesWithOverrides({}, 'hostile');
  assert.ok(tables['Site Concept']['Site Feature'].includes(s.feature));
  assert.ok(tables['Site Concept']['Site Danger'].includes(s.danger));
  assert.ok(tables['Site Concept']['Site Wonder'].includes(s.wonder));
  const text = formatSiteConcept(s);
  assert.match(text, /^Site concept:/);
  assert.match(text, /Notable feature:/); assert.match(text, /Worth seeing:/); assert.match(text, /Danger:/);
});

test('generateAdventureSeed/formatAdventureSeed rolls Hook/Twist plus the existing Story Complication table (no new table for the third leg)', () => {
  const camp = defaultCampaign();
  const s = generateAdventureSeed(camp, { rng: makeRng(4) });
  const tables = tablesWithOverrides({}, 'hostile');
  assert.ok(tables['Adventure Seed'].Hook.includes(s.hook));
  assert.ok(tables['Adventure Seed'].Twist.includes(s.twist));
  assert.ok(tables.Miscellaneous['Story Complication'].includes(s.complication));
  const text = formatAdventureSeed(s);
  assert.match(text, /^Adventure seed:/);
  assert.match(text, /Hook:/); assert.match(text, /Twist:/); assert.match(text, /Complication:/);
});

test('the Xenobestiary/Site Concept/Adventure Seed/Augmentation oracle groups are bucketed correctly, not left under Other', () => {
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const byLabel = (l) => tree.find((cat) => cat.label === l);
  assert.ok(byLabel('👹 Creatures & Xeno').children.some((g) => g.label === 'Xenobestiary'));
  assert.ok(byLabel('🌌 Locations').children.some((g) => g.label === 'Site Concept'));
  assert.ok(byLabel('📚 Story Beats').children.some((g) => g.label === 'Adventure Seed'));
  assert.ok(byLabel('👥 Characters & Society').children.some((g) => g.label === 'Augmentation'));
});

test('a fresh entity has no enhancements and the default Strain capacity; is not over-strained', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  const e = getEntity(camp, id);
  assert.deepEqual(getEnhancements(e), []);
  assert.equal(strainUsed(e), 0);
  assert.equal(strainCapacity(e), DEFAULT_STRAIN_CAPACITY);
  assert.equal(isOverStrained(e), false);
});

test('installEnhancement adds an item with a coerced non-negative integer strain (default 1) and a type (default cybernetics); removeEnhancement removes it by id; both round-trip through a real campaign', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  camp = installEnhancement(camp, id, { name: 'Ocular implants', type: 'wetware', strain: 2, notes: 'sees in the dark' });
  camp = installEnhancement(camp, id, { name: 'Weird one', strain: -5 }); // coerces to default 1 strain, default type
  camp = installEnhancement(camp, id, { name: '  ' }); // blank name, no-op
  let e = getEntity(camp, id);
  assert.equal(getEnhancements(e).length, 2);
  assert.equal(e.enhancements[0].strain, 2);
  assert.equal(e.enhancements[0].type, 'wetware');
  assert.equal(e.enhancements[1].strain, 1);
  assert.equal(e.enhancements[1].type, DEFAULT_ENHANCEMENT_TYPE);
  assert.equal(strainUsed(e), 3);

  const idToRemove = e.enhancements[0].id;
  camp = removeEnhancement(camp, id, idToRemove);
  e = getEntity(camp, id);
  assert.equal(getEnhancements(e).length, 1);
  assert.equal(e.enhancements[0].name, 'Weird one');
});

test('getEnhancements tolerantly reads a pre-rename entity\'s old `cyberware` field, normalizing a missing type to the old default', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Legacy Export' }));
  const e = getEntity(camp, id);
  e.cyberware = [{ id: 'cw_old1', name: 'Old-style implant', strain: 3, notes: '' }];
  const list = getEnhancements(e);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Old-style implant');
  assert.equal(list[0].type, DEFAULT_ENHANCEMENT_TYPE);
  assert.equal(strainUsed(e), 3);
});

test('isOverStrained flags once installed Strain exceeds capacity; setStrainCapacity overrides the default, clamped 1-30', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  camp = setStrainCapacity(camp, id, 2);
  assert.equal(strainCapacity(getEntity(camp, id)), 2);
  camp = installEnhancement(camp, id, { name: 'A', strain: 2 });
  assert.equal(isOverStrained(getEntity(camp, id)), false); // exactly at capacity, not over
  camp = installEnhancement(camp, id, { name: 'B', strain: 1 });
  assert.equal(isOverStrained(getEntity(camp, id)), true);

  camp = setStrainCapacity(camp, id, 999);
  assert.equal(strainCapacity(getEntity(camp, id)), 30); // clamped high
  camp = setStrainCapacity(camp, id, -5);
  assert.equal(strainCapacity(getEntity(camp, id)), 1); // clamped low
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

// --- Sourcebook Inventory (Settings' "what third-party content is actually
// used" view) — every curated entry must key against a real, currently-
// scanned Reference Library PDF, or it's silently dead data nobody notices.
import { SOURCEBOOK_INVENTORY } from '../src/data/sourcebookInventory.js';
import { DOCS_MANIFEST } from '../src/data/docsManifest.js';

test('every SOURCEBOOK_INVENTORY entry keys a real DOCS_MANIFEST file, and every entry has a status', () => {
  const manifestFiles = new Set(DOCS_MANIFEST.map((d) => d.file));
  for (const s of SOURCEBOOK_INVENTORY) {
    assert.ok(manifestFiles.has(s.file), `"${s.file}" is not a real file in the current Reference Library scan`);
    assert.ok(s.status && s.status.length, `"${s.file}" has no status blurb`);
  }
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

// --- docs/adr/0013: tag-driven Location economy types -----------------------
import { economyBiasAt } from '../src/domain/trade.js';
import { findEconomyType, economyTypesForModel } from '../src/data/economyTypes.js';

test('economyBiasAt is exactly 1 (no change) for an untagged Location, or a Location tagged with something that isn\'t a recognized economy type', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Prospect Station' }));
  assert.equal(economyBiasAt(getEntity(camp, id), 'water'), 1);
  camp = addEntityTag(camp, id, 'derelict'); // not an economy type
  assert.equal(economyBiasAt(getEntity(camp, id), 'water'), 1);
});

test('economyBiasAt prices a raw commodity off scarcity and a manufactured commodity off the inverse of manufacturing, for a Location tagged with a recognized economy type', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  const extraction = findEconomyType('extraction');
  camp = addEntityTag(camp, id, extraction.label);
  const loc = getEntity(camp, id);
  // water (raw) prices off scarcity=6 -> 0.6 + 6/10*0.8 = 1.08
  assert.ok(Math.abs(economyBiasAt(loc, 'water') - 1.08) < 1e-9);
  // weapons (manufactured) prices off (10 - manufacturing=3)=7 -> 0.6 + 7/10*0.8 = 1.16
  assert.ok(Math.abs(economyBiasAt(loc, 'weapons') - 1.16) < 1e-9);
});

test('priceAt multiplies in the economy bias on top of the supply/demand dials, still never dropping below 1', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  const corporate = findEconomyType('corporate-enclave'); // scarcity 1, manufacturing 8
  camp = addEntityTag(camp, id, corporate.label);
  const loc = getEntity(camp, id);
  const water = findCommodity('water');
  const expectedBias = economyBiasAt(loc, 'water');
  assert.equal(priceAt(loc, 'water'), Math.max(1, Math.round(water.basePrice * expectedBias)));
});

test('switching settings.tradeEconomyModel never orphans a Location already tagged from the other model — economyBiasAt checks both regardless of which is active', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Meridian' }));
  const travellerType = economyTypesForModel('traveller')[0];
  camp.settings.tradeEconomyModel = 'traveller';
  camp = addEntityTag(camp, id, travellerType.label);
  camp.settings.tradeEconomyModel = 'hostile'; // switch away
  assert.notEqual(economyBiasAt(getEntity(camp, id), 'water'), 1); // the tag still applies
});

test('a fresh campaign defaults settings.tradeEconomyModel to hostile, and Location tag vocabulary offers only the active model\'s economy types', () => {
  const camp = defaultCampaign();
  assert.equal(camp.settings.tradeEconomyModel, 'hostile');
  let id; let camp2 = camp; ({ campaign: camp2, id } = createEntity(camp2, { type: 'location', name: 'Meridian' }));
  const vocab = listTagVocabulary(camp2, 'location', id);
  for (const t of economyTypesForModel('hostile')) assert.ok(vocab.includes(t.label));
  for (const t of economyTypesForModel('traveller')) assert.ok(!vocab.includes(t.label));
});

// --- docs/adr/0025: Location biome + development-level fields, smart trade bias
import { developmentLevelBiasAt, biomeBiasAt } from '../src/domain/trade.js';
import { findBiome } from '../src/data/biomes.js';

test('ensureLocationFields defaults a fresh Location\'s developmentLevel and biome to \'\', and leaves non-Locations untouched', () => {
  let camp = defaultCampaign();
  let locId; ({ campaign: camp, id: locId } = createEntity(camp, { type: 'location', name: 'Prospect Station' }));
  const loc = getEntity(camp, locId);
  assert.equal(loc.developmentLevel, '');
  assert.equal(loc.biome, '');

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  const npc = getEntity(camp, npcId);
  assert.equal(npc.developmentLevel, undefined);
  assert.equal(npc.biome, undefined);
});

test('developmentLevelBiasAt prefers the Location\'s developmentLevel field over a tag match, but falls back to the tag scan when the field is unset', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  // Field unset, no tag -> no bias.
  assert.equal(developmentLevelBiasAt(getEntity(camp, id), 'water'), 1);

  // Tag-only (legacy path) still works.
  const extraction = findEconomyType('extraction');
  camp = addEntityTag(camp, id, extraction.label);
  assert.ok(Math.abs(developmentLevelBiasAt(getEntity(camp, id), 'water') - economyBiasAt(getEntity(camp, id), 'water')) < 1e-9);

  // Field set to a DIFFERENT economy type takes priority over the tag.
  const corporate = findEconomyType('corporate-enclave'); // scarcity 1, manufacturing 8
  camp = updateEntity(camp, id, { developmentLevel: corporate.id });
  const loc = getEntity(camp, id);
  assert.ok(Math.abs(developmentLevelBiasAt(loc, 'water') - (0.6 + (corporate.scarcity / 10) * 0.8)) < 1e-9);
});

test('biomeBiasAt resolves the Location\'s biome field against the commodity\'s resourceType, and is 1 for an unset/unmatched biome or a commodity with no resourceType', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Meridian' }));
  assert.equal(biomeBiasAt(getEntity(camp, id), 'water'), 1); // unset biome

  const waterworld = findBiome('waterworld');
  camp = updateEntity(camp, id, { biome: waterworld.id });
  const loc = getEntity(camp, id);
  const expected = 0.6 + (waterworld.resourceScarcity.water / 10) * 0.8;
  assert.ok(Math.abs(biomeBiasAt(loc, 'water') - expected) < 1e-9);

  camp = updateEntity(camp, id, { biome: 'not-a-real-biome' });
  assert.equal(biomeBiasAt(getEntity(camp, id), 'water'), 1);
});

test('priceAt compounds developmentLevel bias and biome bias independently, on top of supply/demand', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  const extraction = findEconomyType('extraction'); // scarcity 6
  const waterworld = findBiome('waterworld'); // water scarcity dial 0
  camp = updateEntity(camp, id, { developmentLevel: extraction.id, biome: waterworld.id });
  const loc = getEntity(camp, id);
  const water = findCommodity('water');
  const expectedBias = developmentLevelBiasAt(loc, 'water') * biomeBiasAt(loc, 'water');
  assert.equal(priceAt(loc, 'water'), Math.max(1, Math.round(water.basePrice * expectedBias)));
  // Waterworld's near-zero water scarcity should pull the combined bias down from extraction's alone.
  assert.ok(biomeBiasAt(loc, 'water') < 1);
});

// --- docs/adr/0026: HOSTILE canon locations (World Profile fields + import)
import { importHostileLocations } from '../src/domain/hostileLocations.js';
import { HOSTILE_LOCATIONS, HOSTILE_STARS, HOSTILE_BASES, HOSTILE_ZONES } from '../src/data/hostileLocations.js';
import { addLocationBase, removeLocationBase } from '../src/domain/entities.js';

test('ensureLocationFields defaults every World Profile field to blank/false/empty-array on a fresh Location', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Prospect Station' }));
  const loc = getEntity(camp, id);
  for (const f of ['hex', 'zone', 'starport', 'worldSize', 'atmosphere', 'hydrographics', 'population', 'government', 'lawLevel', 'techLevel', 'starSystem']) {
    assert.equal(loc[f], '', `expected ${f} to default to ''`);
  }
  assert.deepEqual(loc.bases, []);
  assert.deepEqual(loc.tradeCodes, []);
  assert.equal(loc.gasGiant, false);
});

test('importHostileLocations creates one Location entity per base, zone, star, and world entry — bases/zones/stars first, so a world\'s references resolve', () => {
  let camp = defaultCampaign();
  const { campaign: next, createdIds } = importHostileLocations(camp);
  assert.equal(createdIds.length, HOSTILE_BASES.length + HOSTILE_ZONES.length + HOSTILE_STARS.length + HOSTILE_LOCATIONS.length);

  const ussc = findByName(next, 'USSC');
  assert.ok(ussc);
  assert.ok(ussc.tags.includes('base'));

  const nez = findByName(next, 'Near Earth Zone');
  assert.ok(nez);
  assert.ok(nez.tags.includes('zone'));

  const wolf359 = findByName(next, 'Wolf 359');
  assert.ok(wolf359);
  assert.ok(wolf359.tags.includes('star'));
  assert.equal(wolf359.starSystem, 'Wolf 359', 'a star self-references its own name');

  const earth = HOSTILE_LOCATIONS.find((l) => l.name === 'Earth');
  const entity = findByName(next, 'Earth');
  assert.ok(entity);
  assert.equal(entity.type, 'location');
  assert.equal(entity.hex, earth.hex);
  assert.equal(entity.starport, earth.starport);
  assert.equal(entity.starSystem, earth.starSystem);
  assert.equal(entity.starSystem, 'The Sun');
  assert.deepEqual(entity.bases, earth.bases);
  assert.deepEqual(entity.tradeCodes, earth.tradeCodes);
  assert.equal(entity.gasGiant, earth.gasGiant);
  assert.equal(entity.overview, earth.summary);
  assert.ok(entity.tags.includes('hostile-canon'));
  assert.ok(entity.tags.includes(earth.zone));
  assert.ok(!entity.tags.includes(earth.starSystem), 'the star is a relationship now, not duplicated as a tag');
  assert.ok(entity.tags.includes(earth.locationKind));

  // Zone -Contains-> Star -Contains-> World -Contains-> Base, reverse edges Located At.
  const sun = findByName(next, 'The Sun');
  const sunRel = sun.relationships.find((r) => r.to === nez.id);
  assert.equal(sunRel.type, 'located_at');
  assert.equal(sunRel.label, 'Located At');
  const nezRel = nez.relationships.find((r) => r.to === sun.id);
  assert.equal(nezRel.type, 'contains');
  assert.equal(nezRel.label, 'Contains');

  const earthRel = entity.relationships.find((r) => r.to === sun.id);
  assert.equal(earthRel.type, 'located_at');
  assert.equal(earthRel.label, 'Located At');
  const sunToEarthRel = sun.relationships.find((r) => r.to === entity.id);
  assert.equal(sunToEarthRel.type, 'contains');
  assert.equal(sunToEarthRel.label, 'Contains');

  const usscRel = ussc.relationships.find((r) => r.to === entity.id);
  assert.equal(usscRel.type, 'located_at');
  const earthToUsscRel = entity.relationships.find((r) => r.to === ussc.id);
  assert.equal(earthToUsscRel.type, 'contains');
});

test('importHostileLocations is idempotent — re-running it creates nothing new, and never overwrites a GM\'s edits to an already-imported world', () => {
  let camp = defaultCampaign();
  let next; ({ campaign: next } = importHostileLocations(camp));
  const earthId = findByName(next, 'Earth').id;
  next = updateEntity(next, earthId, { overview: 'GM-edited overview, do not clobber' });
  const again = importHostileLocations(next);
  assert.equal(again.createdIds.length, 0);
  assert.equal(findByName(again.campaign, 'Earth').overview, 'GM-edited overview, do not clobber');
  assert.equal((again.campaign.entities.items || []).filter((e) => e.name === 'Earth').length, 1);
});

test('importHostileLocations skips only the already-present name, still importing everything else', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Earth' }));
  const { createdIds } = importHostileLocations(camp);
  assert.equal(createdIds.length, HOSTILE_BASES.length + HOSTILE_ZONES.length + HOSTILE_STARS.length + HOSTILE_LOCATIONS.length - 1);
});

test('every HOSTILE_LOCATIONS entry\'s starSystem matches a real HOSTILE_STARS name, and every star name is unique from every world name (no import collisions)', () => {
  const starNames = new Set(HOSTILE_STARS.map((s) => s.name));
  for (const loc of HOSTILE_LOCATIONS) {
    assert.ok(starNames.has(loc.starSystem), `${loc.name}'s starSystem "${loc.starSystem}" has no matching HOSTILE_STARS entry`);
  }
  const worldNames = new Set(HOSTILE_LOCATIONS.map((l) => l.name));
  for (const star of HOSTILE_STARS) {
    assert.ok(!worldNames.has(star.name), `star name "${star.name}" collides with a world name`);
  }
});

test('addLocationTradeCode appends a code deduped; removeLocationTradeCode drops it; both no-op on a non-Location entity', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  camp = addLocationTradeCode(camp, id, 'agricultural');
  camp = addLocationTradeCode(camp, id, 'agricultural'); // dedup
  camp = addLocationTradeCode(camp, id, 'garden');
  assert.deepEqual(getEntity(camp, id).tradeCodes, ['agricultural', 'garden']);
  camp = removeLocationTradeCode(camp, id, 'agricultural');
  assert.deepEqual(getEntity(camp, id).tradeCodes, ['garden']);

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  const before = camp;
  camp = addLocationTradeCode(camp, npcId, 'agricultural');
  assert.deepEqual(camp, before);
});

test('addLocationBase appends a name deduped; removeLocationBase drops it; both no-op on a non-Location entity', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'location', name: 'Rustwell' }));
  camp = addLocationBase(camp, id, 'USSC');
  camp = addLocationBase(camp, id, 'USSC'); // dedup
  camp = addLocationBase(camp, id, 'MRA');
  assert.deepEqual(getEntity(camp, id).bases, ['USSC', 'MRA']);
  camp = removeLocationBase(camp, id, 'USSC');
  assert.deepEqual(getEntity(camp, id).bases, ['MRA']);

  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Reyes' }));
  const before = camp;
  camp = addLocationBase(camp, npcId, 'USSC');
  assert.deepEqual(camp, before);
});

// --- docs/adr/0014: Game Mechanics Index (pure storage half only — the
// actual PDF.js scan is async/browser-only, see ui/mechanicsScan.js) -------
import { getMechanicsIndex, setMechanicsIndex } from '../src/domain/mechanicsIndex.js';

test('a fresh campaign has an empty Mechanics Index; setMechanicsIndex replaces it wholesale', () => {
  let camp = defaultCampaign();
  assert.deepEqual(getMechanicsIndex(camp), []);
  const entries = [{ term: 'Strain', docTitle: 'Cities Without Number', docFile: 'assets/docs/CitiesWithoutNumber_Deluxe.pdf', page: 42 }];
  camp = setMechanicsIndex(camp, entries);
  assert.deepEqual(getMechanicsIndex(camp), entries);
  camp = setMechanicsIndex(camp, []);
  assert.deepEqual(getMechanicsIndex(camp), []);
});

test('setMechanicsIndex tolerates a non-array argument, storing an empty index rather than throwing', () => {
  const camp = setMechanicsIndex(defaultCampaign(), null);
  assert.deepEqual(getMechanicsIndex(camp), []);
});

// relevantDocs() itself is a plain, DOM-free filter (no window/PDF.js touch
// unless a scan actually runs), so it's headlessly testable despite living
// in ui/ alongside the async scan it scopes.
import { relevantDocs } from '../src/ui/mechanicsScan.js';

test('relevantDocs always includes Hostile-titled PDFs, plus whichever provider matches the active stat ruleset, falling back to every PDF if nothing matches', () => {
  const hostileOnly = relevantDocs({ statRuleset: 'no-such-ruleset' });
  assert.ok(hostileOnly.length > 0);
  assert.ok(hostileOnly.every((d) => d.title.toLowerCase().includes('hostile')));

  const withTraveller = relevantDocs({ statRuleset: 'traveller' });
  assert.ok(withTraveller.some((d) => d.title.toLowerCase().includes('traveller')));
  assert.ok(withTraveller.some((d) => d.title.toLowerCase().includes('hostile')));
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

test('createContract defaults description/conflict/opportunity to \'\', and both create and updateContract accept them', () => {
  let camp = defaultCampaign();
  let { campaign, id } = createContract(camp, { name: 'A contract' });
  camp = campaign;
  let contract = listContracts(camp).find((c) => c.id === id);
  assert.equal(contract.description, '');
  assert.equal(contract.conflict, '');
  assert.equal(contract.opportunity, '');

  ({ campaign, id } = createContract(camp, { name: 'Fully specified', description: 'Ferry cargo', conflict: 'Pirates', opportunity: 'A bonus if early' }));
  camp = campaign;
  contract = listContracts(camp).find((c) => c.id === id);
  assert.equal(contract.description, 'Ferry cargo');
  assert.equal(contract.conflict, 'Pirates');
  assert.equal(contract.opportunity, 'A bonus if early');

  camp = updateContract(camp, id, { description: 'Updated', conflict: 'Storms', opportunity: 'None' });
  contract = listContracts(camp).find((c) => c.id === id);
  assert.equal(contract.description, 'Updated');
  assert.equal(contract.conflict, 'Storms');
  assert.equal(contract.opportunity, 'None');
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

// --- Phase 10: Mission/Job generator ----------------------------------------
import { generateMission, formatMission } from '../src/domain/missions.js';

test('generateMission defaults danger to context.what.threat, and higher danger raises payout while tightening the deadline', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 0;
  const low = generateMission(camp, { rng: makeRng(1) });
  assert.equal(low.danger, 0);
  assert.equal(low.payout, 100);
  assert.equal(low.deadlineDays, 7);

  camp.context.what.threat = 10;
  const high = generateMission(camp, { rng: makeRng(1) });
  assert.equal(high.danger, 10);
  assert.equal(high.payout, 300); // 100 * (1 + 10*0.2)
  assert.equal(high.deadlineDays, 2);
  assert.ok(high.payout > low.payout);
  assert.ok(high.deadlineDays < low.deadlineDays);
});

test('generateMission accepts an explicit danger override instead of reading context.what.threat', () => {
  let camp = defaultCampaign();
  camp.context.what.threat = 8;
  const m = generateMission(camp, { danger: 2, rng: makeRng(1) });
  assert.equal(m.danger, 2);
  assert.equal(m.payout, 140); // 100 * (1 + 2*0.2), not threat=8's value
});

test('generateMission rolls its complication from the existing Miscellaneous > Story Complication oracle table (no new table)', () => {
  let camp = defaultCampaign();
  const m = generateMission(camp, { rng: makeRng(5) });
  assert.ok(tablesWithOverrides({}, 'hostile').Miscellaneous['Story Complication'].includes(m.complication));
});

test('generateMission\'s penalty escalates with danger', () => {
  let camp = defaultCampaign();
  const lowM = generateMission(camp, { danger: 1, rng: makeRng(1) });
  const midM = generateMission(camp, { danger: 4, rng: makeRng(1) });
  const highM = generateMission(camp, { danger: 7, rng: makeRng(1) });
  assert.match(lowM.penalty, /modest penalty/);
  assert.match(midM.penalty, /halves the payout/);
  assert.match(highM.penalty, /voids the payout entirely/);
});

test('formatMission renders a readable multi-line block including payout, deadline, complication, and penalty', () => {
  const m = { danger: 5, payout: 200, deadlineDays: 4, complication: 'a rescue creates a hostage', penalty: 'Late or damaged delivery halves the payout.' };
  const text = formatMission(m);
  assert.match(text, /danger 5\/10/);
  assert.match(text, /Payout: 200/);
  assert.match(text, /Deadline: 4 days/);
  assert.match(text, /a rescue creates a hostage/);
  assert.match(text, /halves the payout/);
});

// --- Gear/Item entity sub-type (ADR 0012) -----------------------------------
import { createItemFromCatalog, listEntityTagVocabulary } from '../src/domain/entities.js';
import { GEAR_TEMPLATE_SYSTEMS, findGearTemplate } from '../src/data/gearTemplates.js';
import { GEAR_CATALOG, findCatalogItem } from '../src/data/gearCatalog.js';

test('"item" is a real entity type and creates like any other', () => {
  const camp = defaultCampaign();
  const { campaign, id } = createEntity(camp, { type: 'item', name: 'Multitool' });
  const e = getEntity(campaign, id);
  assert.equal(e.type, 'item');
  assert.equal(e.name, 'Multitool');
});

test('every DEFAULT_GEAR_TEMPLATES system builds a valid "gear" statblock group via makeStatblock', () => {
  for (const id of GEAR_TEMPLATE_SYSTEMS) {
    const group = makeStatblock('gear', id, undefined, {});
    assert.equal(group.kind, 'gear');
    assert.equal(group.ruleset, id);
    assert.ok(group.fields.length > 0, `${id} gear template has no fields`);
    for (const f of group.fields) assert.equal(typeof f.key, 'string');
  }
});

test('makeStatblock falls back to the hostile gear template for an unknown ruleset id', () => {
  const group = makeStatblock('gear', 'nonexistent-system', undefined, {});
  assert.equal(group.ruleset, 'hostile');
  assert.deepEqual(group.fields.map((f) => f.key), findGearTemplate('hostile').fields.map((f) => f.key));
});

test('an Item entity can carry several gear groups simultaneously (one per system), additive not replacing', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createEntity(camp, { type: 'item', name: 'Snub Pistol' }));
  camp = addEntityStatblockGroup(camp, id, 'gear', 'starforged');
  camp = addEntityStatblockGroup(camp, id, 'gear', 'traveller');
  camp = addEntityStatblockGroup(camp, id, 'gear', 'starforged'); // duplicate — should no-op
  const e = getEntity(camp, id);
  const gearGroups = e.statblocks.filter((g) => g.kind === 'gear');
  assert.equal(gearGroups.length, 2);
  assert.deepEqual(gearGroups.map((g) => g.ruleset).sort(), ['starforged', 'traveller']);
});

test('GEAR_CATALOG has a reasonable number of entries, each with an id/name/category/tags/stats', () => {
  assert.ok(GEAR_CATALOG.length >= 40, `expected an extensive catalog, got ${GEAR_CATALOG.length}`);
  for (const c of GEAR_CATALOG) {
    assert.equal(typeof c.id, 'string');
    assert.equal(typeof c.name, 'string');
    assert.ok(['weapon', 'armor', 'gear'].includes(c.category), `${c.id} has an invalid category`);
    assert.ok(Array.isArray(c.tags) && c.tags.length > 0, `${c.id} has no tags`);
    assert.ok(c.stats && Object.keys(c.stats).length > 0, `${c.id} has no system stats`);
    for (const sys of Object.keys(c.stats)) assert.ok(GEAR_TEMPLATE_SYSTEMS.includes(sys), `${c.id} references unknown system "${sys}"`);
  }
});

test('catalog ids are unique', () => {
  const ids = GEAR_CATALOG.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('findCatalogItem resolves a known id and returns null for an unknown one', () => {
  assert.equal(findCatalogItem('medkit').name, 'Medkit / First Aid Kit');
  assert.equal(findCatalogItem('nonexistent'), null);
});

test('createItemFromCatalog creates an Item entity with tags and one gear group per system the entry has stats for, pre-filled', () => {
  const camp = defaultCampaign();
  const entry = findCatalogItem('sidearm-pistol');
  const { campaign: next, id } = createItemFromCatalog(camp, entry);
  const e = getEntity(next, id);
  assert.equal(e.type, 'item');
  assert.equal(e.name, 'Sidearm Pistol');
  assert.deepEqual(e.tags, ['handgun']);
  const gearGroups = e.statblocks.filter((g) => g.kind === 'gear');
  assert.deepEqual(gearGroups.map((g) => g.ruleset).sort(), Object.keys(entry.stats).sort());
  const hostileGroup = gearGroups.find((g) => g.ruleset === 'hostile');
  const damageField = hostileGroup.fields.find((f) => f.key === 'Damage');
  assert.equal(damageField.value, entry.stats.hostile.Damage);
});

test('createItemFromCatalog no-ops (returns the campaign unchanged, null id) for a missing catalog entry', () => {
  const camp = defaultCampaign();
  const { campaign: next, id } = createItemFromCatalog(camp, null);
  assert.equal(id, null);
  assert.deepEqual(next, camp);
});

test('listEntityTagVocabulary is cumulative over the current type filter, not a static global list', () => {
  let camp = defaultCampaign();
  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = { ...camp, entities: { ...camp.entities, items: camp.entities.items.map((e) => e.id === npcId ? { ...e, tags: ['veteran'] } : e) } };
  let itemId; ({ campaign: camp, id: itemId } = createItemFromCatalog(camp, findCatalogItem('combat-knife')));

  const npcTags = listEntityTagVocabulary(camp, { types: ['npc'] });
  assert.deepEqual(npcTags, ['veteran']);

  const itemTags = listEntityTagVocabulary(camp, { types: ['item'] });
  assert.ok(itemTags.includes('melee') && itemTags.includes('blade'));
  assert.ok(!itemTags.includes('veteran'));

  const allTags = listEntityTagVocabulary(camp, {});
  assert.ok(allTags.includes('veteran') && allTags.includes('melee'));
});

test('listEntityTagVocabulary respects the search filter the same way the entity list itself does', () => {
  let camp = defaultCampaign();
  camp = createItemFromCatalog(camp, findCatalogItem('combat-knife')).campaign;
  camp = createItemFromCatalog(camp, findCatalogItem('medkit')).campaign;
  const narrowed = listEntityTagVocabulary(camp, { types: ['item'], search: 'knife' });
  assert.ok(narrowed.includes('blade'));
  assert.ok(!narrowed.includes('medical-gear'));
});

// --- filterEntities (shared by the Cast drawer and the delete-while-
// filtered fix below) -------------------------------------------------------
test('filterEntities narrows by type, required tags (AND, case-insensitive), and search (name/type label/raw type/tags)', () => {
  let camp = defaultCampaign();
  let npcId; ({ campaign: camp, id: npcId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = { ...camp, entities: { ...camp.entities, items: camp.entities.items.map((e) => e.id === npcId ? { ...e, tags: ['Veteran', 'hostile'] } : e) } };
  let locId; ({ campaign: camp, id: locId } = createEntity(camp, { type: 'location', name: 'The Hab' }));

  assert.deepEqual(filterEntities(camp, { types: ['npc'] }).map((e) => e.id), [npcId]);
  assert.deepEqual(filterEntities(camp, { types: ['npc'], tags: ['veteran', 'HOSTILE'] }).map((e) => e.id), [npcId]);
  assert.deepEqual(filterEntities(camp, { types: ['npc'], tags: ['veteran', 'friendly'] }), []); // AND semantics — not all required tags present
  assert.deepEqual(filterEntities(camp, { search: 'hab' }).map((e) => e.id), [locId]);
  assert.deepEqual(filterEntities(camp, { search: 'NPC' }).map((e) => e.id), [npcId]); // matches the type LABEL, not just the raw id
  assert.deepEqual(filterEntities(camp, {}).map((e) => e.id).sort(), [npcId, locId].sort()); // no filters — everything
});

test('filterEntities returns [] rather than throwing on an empty/default campaign', () => {
  assert.deepEqual(filterEntities(defaultCampaign(), { types: ['npc'], search: 'x', tags: ['y'] }), []);
});

// --- Planetfall Grid Battlemap (Phase 11, docs/adr/0023) -------------------
import {
  listBattlemaps, getBattlemap, getActiveBattlemap, createBattlemap, renameBattlemap, removeBattlemap,
  setActiveBattlemap, setBattlemapBackground, setBattlemapGrid, addBattlemapIcon, moveBattlemapIcon,
  updateBattlemapIcon, removeBattlemapIcon,
} from '../src/domain/battlemaps.js';

test('a fresh campaign has no battlemaps; createBattlemap adds one, names it, and makes it active', () => {
  let camp = defaultCampaign();
  assert.deepEqual(listBattlemaps(camp), []);
  assert.equal(getActiveBattlemap(camp), null);
  let id; ({ campaign: camp, id } = createBattlemap(camp, 'Docking Bay 3'));
  assert.equal(listBattlemaps(camp).length, 1);
  const m = getBattlemap(camp, id);
  assert.equal(m.name, 'Docking Bay 3');
  assert.equal(m.backgroundImageId, null);
  assert.equal(m.gridEnabled, false);
  assert.equal(m.gridSize, 40);
  assert.deepEqual(m.icons, []);
  assert.equal(getActiveBattlemap(camp).id, id);
});

test('createBattlemap falls back to "New Map" for a blank/missing name', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createBattlemap(camp, '   '));
  assert.equal(getBattlemap(camp, id).name, 'New Map');
});

test('getActiveBattlemap falls back to the first map when activeId is unset/stale, and to null with no maps', () => {
  let camp = defaultCampaign();
  let id1; ({ campaign: camp, id: id1 } = createBattlemap(camp, 'Map One'));
  let id2; ({ campaign: camp, id: id2 } = createBattlemap(camp, 'Map Two'));
  assert.equal(getActiveBattlemap(camp).id, id2); // creating a map makes it active
  camp = removeBattlemap(camp, id2);
  assert.equal(getActiveBattlemap(camp).id, id1); // falls back once the active one is gone
  camp = removeBattlemap(camp, id1);
  assert.equal(getActiveBattlemap(camp), null);
});

test('renameBattlemap ignores a blank name; removeBattlemap drops the map and re-targets activeId', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createBattlemap(camp, 'Original Name'));
  camp = renameBattlemap(camp, id, 'Renamed');
  assert.equal(getBattlemap(camp, id).name, 'Renamed');
  camp = renameBattlemap(camp, id, '   ');
  assert.equal(getBattlemap(camp, id).name, 'Renamed');
  camp = removeBattlemap(camp, id);
  assert.equal(getBattlemap(camp, id), null);
  assert.equal(getActiveBattlemap(camp), null);
});

test('setActiveBattlemap switches the active map, and no-ops for an unknown id', () => {
  let camp = defaultCampaign();
  let id1; ({ campaign: camp, id: id1 } = createBattlemap(camp, 'Map One'));
  let id2; ({ campaign: camp } = createBattlemap(camp, 'Map Two'));
  camp = setActiveBattlemap(camp, id1);
  assert.equal(getActiveBattlemap(camp).id, id1);
  camp = setActiveBattlemap(camp, 'not-a-real-id');
  assert.equal(getActiveBattlemap(camp).id, id1); // unchanged
});

test('setBattlemapBackground sets/clears a Gallery image reference', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createBattlemap(camp, 'Map'));
  camp = setBattlemapBackground(camp, id, 'img_abc123');
  assert.equal(getBattlemap(camp, id).backgroundImageId, 'img_abc123');
  camp = setBattlemapBackground(camp, id, null);
  assert.equal(getBattlemap(camp, id).backgroundImageId, null);
});

test('setBattlemapGrid toggles enabled and clamps size to [10, 200]', () => {
  let camp = defaultCampaign();
  let id; ({ campaign: camp, id } = createBattlemap(camp, 'Map'));
  camp = setBattlemapGrid(camp, id, { enabled: true, size: 60 });
  assert.equal(getBattlemap(camp, id).gridEnabled, true);
  assert.equal(getBattlemap(camp, id).gridSize, 60);
  camp = setBattlemapGrid(camp, id, { size: 9999 });
  assert.equal(getBattlemap(camp, id).gridSize, 200);
  camp = setBattlemapGrid(camp, id, { size: 1 });
  assert.equal(getBattlemap(camp, id).gridSize, 10);
  camp = setBattlemapGrid(camp, id, { enabled: false });
  assert.equal(getBattlemap(camp, id).gridEnabled, false);
  assert.equal(getBattlemap(camp, id).gridSize, 10); // untouched by the enabled-only call
});

test('addBattlemapIcon adds an annotation icon with iconKey/note, defaulting position to dead center', () => {
  let camp = defaultCampaign();
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  camp = addBattlemapIcon(camp, mapId, { kind: 'annotation', iconKey: 'hazard', note: 'Radiation leak' });
  const icons = getBattlemap(camp, mapId).icons;
  assert.equal(icons.length, 1);
  assert.equal(icons[0].kind, 'annotation');
  assert.equal(icons[0].iconKey, 'hazard');
  assert.equal(icons[0].note, 'Radiation leak');
  assert.equal(icons[0].entityId, null);
  assert.equal(icons[0].x, 0.5);
  assert.equal(icons[0].y, 0.5);
});

test('addBattlemapIcon adds a token icon linked to an entity, at a given position, clamped to [0,1]', () => {
  let camp = defaultCampaign();
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  let entId; ({ campaign: camp, id: entId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addBattlemapIcon(camp, mapId, { kind: 'token', entityId: entId, x: 1.5, y: -0.5 });
  const icon = getBattlemap(camp, mapId).icons[0];
  assert.equal(icon.kind, 'token');
  assert.equal(icon.entityId, entId);
  assert.equal(icon.iconKey, '');
  assert.equal(icon.x, 1); // clamped
  assert.equal(icon.y, 0); // clamped
});

test('addBattlemapIcon no-ops for an unknown map or an invalid kind', () => {
  let camp = defaultCampaign();
  const before = camp;
  camp = addBattlemapIcon(camp, 'not-a-real-map', { kind: 'annotation', iconKey: 'hazard' });
  assert.deepEqual(camp, before);
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  camp = addBattlemapIcon(camp, mapId, { kind: 'bogus' });
  assert.equal(getBattlemap(camp, mapId).icons.length, 0);
});

test('moveBattlemapIcon updates position and clamps to [0,1]; no-ops for an unknown icon', () => {
  let camp = defaultCampaign();
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  camp = addBattlemapIcon(camp, mapId, { kind: 'annotation', iconKey: 'door' });
  const iconId = getBattlemap(camp, mapId).icons[0].id;
  camp = moveBattlemapIcon(camp, mapId, iconId, 0.2, 0.8);
  assert.equal(getBattlemap(camp, mapId).icons[0].x, 0.2);
  assert.equal(getBattlemap(camp, mapId).icons[0].y, 0.8);
  camp = moveBattlemapIcon(camp, mapId, iconId, 5, -5);
  assert.equal(getBattlemap(camp, mapId).icons[0].x, 1);
  assert.equal(getBattlemap(camp, mapId).icons[0].y, 0);
  const before = camp;
  camp = moveBattlemapIcon(camp, mapId, 'not-a-real-icon', 0.1, 0.1);
  assert.deepEqual(camp, before);
});

test('updateBattlemapIcon edits an annotation\'s note or a token\'s label, never the fixed kind/entityId/iconKey', () => {
  let camp = defaultCampaign();
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  camp = addBattlemapIcon(camp, mapId, { kind: 'annotation', iconKey: 'hazard', note: 'Original note' });
  const annId = getBattlemap(camp, mapId).icons[0].id;
  camp = updateBattlemapIcon(camp, mapId, annId, { note: 'Updated note' });
  assert.equal(getBattlemap(camp, mapId).icons[0].note, 'Updated note');
  assert.equal(getBattlemap(camp, mapId).icons[0].iconKey, 'hazard');

  let entId; ({ campaign: camp, id: entId } = createEntity(camp, { type: 'npc', name: 'Voss' }));
  camp = addBattlemapIcon(camp, mapId, { kind: 'token', entityId: entId, label: 'Fallback name' });
  const tokId = getBattlemap(camp, mapId).icons[1].id;
  camp = updateBattlemapIcon(camp, mapId, tokId, { label: 'New fallback' });
  assert.equal(getBattlemap(camp, mapId).icons[1].label, 'New fallback');
  assert.equal(getBattlemap(camp, mapId).icons[1].entityId, entId);
  // A token's `note` patch is ignored (wrong field for its kind), an annotation's `label` patch is ignored too.
  camp = updateBattlemapIcon(camp, mapId, tokId, { note: 'should not apply' });
  assert.equal(getBattlemap(camp, mapId).icons[1].note, '');
});

test('removeBattlemapIcon drops just that icon, leaving the rest of the map intact', () => {
  let camp = defaultCampaign();
  let mapId; ({ campaign: camp, id: mapId } = createBattlemap(camp, 'Map'));
  camp = addBattlemapIcon(camp, mapId, { kind: 'annotation', iconKey: 'door' });
  camp = addBattlemapIcon(camp, mapId, { kind: 'annotation', iconKey: 'crate' });
  const [first, second] = getBattlemap(camp, mapId).icons;
  camp = removeBattlemapIcon(camp, mapId, first.id);
  const remaining = getBattlemap(camp, mapId).icons;
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.id);
});

test('multiple named maps coexist independently — icons/background/grid on one never affect another', () => {
  let camp = defaultCampaign();
  let idA; ({ campaign: camp, id: idA } = createBattlemap(camp, 'Map A'));
  let idB; ({ campaign: camp, id: idB } = createBattlemap(camp, 'Map B'));
  camp = setBattlemapBackground(camp, idA, 'img_a');
  camp = setBattlemapGrid(camp, idB, { enabled: true });
  camp = addBattlemapIcon(camp, idA, { kind: 'annotation', iconKey: 'hazard' });
  assert.equal(getBattlemap(camp, idA).backgroundImageId, 'img_a');
  assert.equal(getBattlemap(camp, idB).backgroundImageId, null);
  assert.equal(getBattlemap(camp, idA).gridEnabled, false);
  assert.equal(getBattlemap(camp, idB).gridEnabled, true);
  assert.equal(getBattlemap(camp, idA).icons.length, 1);
  assert.equal(getBattlemap(camp, idB).icons.length, 0);
});
