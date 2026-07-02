// Migration test suite — run with: node --test
//
// Core promise of Phase 0: no user ever loses data in the transition from
// v0.53's ~15 scattered keys to the single unified document. These tests feed
// a realistic v0.53 export plus every known legacy key and assert that every
// piece of content is reachable in the result.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  importCampaign, migrateFromLegacyKeys, migrateDocument, readLegacyKeys, LEGACY_KEYS,
} from '../src/core/migrate.js';
import { SCHEMA_VERSION, defaultCampaign } from '../src/core/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const v053 = JSON.parse(readFileSync(join(here, 'fixtures', 'v053-export.json'), 'utf8'));

test('importCampaign detects a legacy v0.53 export and produces a current doc', () => {
  const doc = importCampaign(v053);
  assert.equal(doc.schemaVersion, SCHEMA_VERSION);
  assert.equal(doc.app, 'Saga Atlas');
});

test('core domain data carries over intact', () => {
  const doc = importCampaign(v053);
  assert.equal(doc.meta.title, 'Hostile Frontier');
  assert.equal(doc.scenes.length, 2);
  assert.equal(doc.journal.length, 2);
  assert.equal(doc.entities.items.length, 2);
  assert.equal(doc.entities.activeId, 'ent_a');
  assert.deepEqual(doc.oracles.usage, { 'Core Oracles': 12, 'Plot Engine': 5 });
});

test('WHO/WHERE/WHAT/WHY/HOW context is derived from v0.53 state', () => {
  const doc = importCampaign(v053);
  assert.equal(doc.context.what.threat, 6);
  assert.equal(doc.context.what.mystery, 4);
  assert.equal(doc.context.what.intent, 'Investigation');
  assert.match(doc.context.what.situation, /medic/);
  assert.equal(doc.context.where.summary, 'Mining facility — Maintenance tunnel');
  assert.equal(doc.context.how.summary, 'Tense');
});

test('legacy Story Director form fields are preserved verbatim', () => {
  const doc = importCampaign(v053);
  const f = doc.settings.form;
  assert.equal(f.planet, 'Rocky world');
  assert.equal(f.missionSeed, v053.missionSeed);
  assert.equal(f.worldSeed, v053.worldSeed);
  assert.equal(f.predictability, 65);
  assert.equal(f.useConflictArchitecture, true);
  assert.deepEqual(f.lynxShip, v053.lynxShip);
});

test('unknown/experimental fields are NOT dropped — captured under _legacy', () => {
  const doc = importCampaign(v053);
  assert.ok(doc._legacy.mainStateExtras, 'unmapped fields should be retained');
  assert.deepEqual(doc._legacy.mainStateExtras.someUnknownExperimentalField, { keepMe: true });
});

test('absorbs the full spread of legacy keys without loss', () => {
  const keys = {
    sagaAtlasSceneOracleV1: v053,
    sagaAtlasStoryDirectorV2: { mode: 'exploration', clock: 3 },
    sagaAtlasStoryDirectorContextCascadeV5: { world: 'Rocky world', site: 'Ore Processing' },
    sagaAtlasOracleTableOverridesV1: { 'Factions>Faction Type': ['Cartel', 'Syndicate'] },
    sagaAtlasEntityTemplatesV1: { npc: { fields: ['role', 'loyalty'] } },
    sagaAtlasCieSettingsV1: { genre: 'Hostile', tone: 'grim', guidance: 'Strong recommendations' },
    sagaAtlasPdfOpenTabs: { activeDocId: 'doc1', tabs: ['doc1', 'doc2'] },
    sagaAtlasPdfLastPages: { doc1: 44 },
    sagaAtlasSomeFutureKey: { mystery: 'value' }, // never-seen key must survive
  };
  const doc = migrateFromLegacyKeys(keys);

  assert.equal(doc.director.mode, 'exploration');
  assert.equal(doc.director.cascade.site, 'Ore Processing');
  assert.deepEqual(doc.oracles.overrides['Factions>Faction Type'], ['Cartel', 'Syndicate']);
  assert.deepEqual(doc.settings.entityTemplates.npc.fields, ['role', 'loyalty']);
  assert.equal(doc.settings.cie.tone, 'grim');
  assert.equal(doc.documents.lastPages.doc1, 44);
  // The unrecognized key is preserved, proving the catch-all works.
  assert.deepEqual(doc._legacy.sagaAtlasSomeFutureKey, { mystery: 'value' });
});

test('pre-rebrand hostileSceneOracleV1 is accepted as the main store', () => {
  const doc = migrateFromLegacyKeys({ hostileSceneOracleV1: { campaignName: 'Old Hostile Save', journal: [] } });
  assert.equal(doc.meta.title, 'Old Hostile Save');
});

test('migrateDocument upgrades and normalizes an existing document', () => {
  const older = { ...defaultCampaign(), schemaVersion: 0, app: 'Whatever' };
  const doc = migrateDocument(older);
  assert.equal(doc.schemaVersion, SCHEMA_VERSION);
  assert.equal(doc.app, 'Saga Atlas');
});

test('round-trip: export → import is stable', () => {
  const doc = importCampaign(v053);
  const roundTripped = importCampaign(JSON.parse(JSON.stringify(doc)));
  assert.equal(roundTripped.meta.title, doc.meta.title);
  assert.equal(roundTripped.scenes.length, doc.scenes.length);
  assert.equal(roundTripped.entities.items.length, doc.entities.items.length);
  assert.deepEqual(roundTripped.settings.form, doc.settings.form);
});

test('readLegacyKeys tolerates corrupt values without throwing', () => {
  const fakeStorage = {
    data: { sagaAtlasSceneOracleV1: '{"campaignName":"Good"}', sagaAtlasCieSettingsV1: '{corrupt' },
    getItem(k) { return this.data[k] ?? null; },
  };
  const keys = readLegacyKeys(fakeStorage);
  assert.equal(keys.sagaAtlasSceneOracleV1.campaignName, 'Good');
  assert.equal(keys.sagaAtlasCieSettingsV1, undefined); // corrupt skipped, not thrown
});

test('LEGACY_KEYS covers the documented v0.53 storage surface', () => {
  for (const k of [
    'sagaAtlasSceneOracleV1', 'sagaAtlasStoryDirectorV2',
    'sagaAtlasStoryDirectorContextCascadeV5', 'sagaAtlasOracleTableOverridesV1',
    'sagaAtlasEntityTemplatesV1', 'sagaAtlasCieSettingsV1',
  ]) {
    assert.ok(LEGACY_KEYS.includes(k), `${k} should be in LEGACY_KEYS`);
  }
});
