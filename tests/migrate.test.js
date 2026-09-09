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
  importCampaign, migrateFromLegacyKeys, migrateDocument, readLegacyKeys, wrapLegacyCampaignIntoAppConfig, LEGACY_KEYS,
} from '../src/core/migrate.js';
import { SCHEMA_VERSION, defaultCampaign, GATEABLE_MODULES } from '../src/core/schema.js';
import { MAX_ENCOUNTERS } from '../src/domain/colony.js';

const here = dirname(fileURLToPath(import.meta.url));
const v053 = JSON.parse(readFileSync(join(here, 'fixtures', 'v053-export.json'), 'utf8'));

test('importCampaign detects a legacy v0.53 export and produces a current doc', () => {
  const doc = importCampaign(v053);
  assert.equal(doc.schemaVersion, SCHEMA_VERSION);
  assert.equal(doc.app, 'GMAtlas');
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
  assert.equal(doc.app, 'GMAtlas');
});

// --- docs/adr/0032: Game System Activation grandfather step -----------
test('migrateDocument: a genuinely fresh campaign keeps the schema default — gameSystemActivations.swn stays false (gated)', () => {
  const doc = migrateDocument({ ...defaultCampaign(), schemaVersion: 0 });
  assert.equal(doc.settings.gameSystemActivations.swn, false);
});

test('migrateDocument: a campaign with committed factionEvents and no explicit gameSystemActivations key is grandfathered to swn:true', () => {
  const older = { ...defaultCampaign(), schemaVersion: 0, factionEvents: [{ id: 'fev_x', factionId: 'f1', action: 'buyAsset', outcome: 'success' }] };
  delete older.settings.gameSystemActivations;
  const doc = migrateDocument(older);
  assert.equal(doc.settings.gameSystemActivations.swn, true);
});

test('migrateDocument: a campaign with a faction entity carrying real SWN Faction Turn Engine fields (hp/currentGoalId/factionAssets) and no explicit gameSystemActivations key is also grandfathered to swn:true', () => {
  const older = {
    ...defaultCampaign(), schemaVersion: 0,
    entities: { items: [{ id: 'e1', type: 'faction', name: 'Old Faction', hp: 12, currentGoalId: '', factionAssets: [] }], activeId: null, history: [] },
  };
  delete older.settings.gameSystemActivations;
  const doc = migrateDocument(older);
  assert.equal(doc.settings.gameSystemActivations.swn, true);
});

test('migrateDocument: a campaign that already has an EXPLICIT gameSystemActivations value is left alone, even if it also shows legacy SWN usage', () => {
  const older = {
    ...defaultCampaign(), schemaVersion: 0,
    factionEvents: [{ id: 'fev_x', factionId: 'f1', action: 'buyAsset', outcome: 'success' }],
  };
  older.settings.gameSystemActivations = { swn: false };
  const doc = migrateDocument(older);
  assert.equal(doc.settings.gameSystemActivations.swn, false, 'a GM\'s own explicit choice is never silently overridden');
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

// --- Rules Profiles + multi-campaign one-time upgrade (design/adr/rules-profiles-multi-campaign.md) ------
test('wrapLegacyCampaignIntoAppConfig: a pre-Rules-Profile single campaign becomes one Default profile carrying its current ruleset, one campaign entry assigned to it, and it is made active', () => {
  const legacy = defaultCampaign();
  legacy.meta.title = 'My Old Campaign';
  legacy.settings.statRuleset = 'traveller';
  legacy.settings.genrePack = 'cyberpunk';
  legacy.settings.partyHeadlineFields = ['Luck', 'XP'];

  const { appConfig, campaignDoc } = wrapLegacyCampaignIntoAppConfig(legacy);

  assert.equal(appConfig.campaigns.length, 1);
  assert.equal(appConfig.campaigns[0].id, campaignDoc.meta.id);
  assert.equal(appConfig.campaigns[0].title, 'My Old Campaign');
  assert.equal(appConfig.activeCampaignId, campaignDoc.meta.id);

  assert.equal(appConfig.profiles.length, 2);
  const [defaultProfile, fivePfhProfile] = appConfig.profiles;
  assert.equal(defaultProfile.name, 'Default');
  assert.equal(appConfig.campaigns[0].profileId, defaultProfile.id);
  assert.equal(defaultProfile.ruleset.statRuleset, 'traveller', 'carries over the legacy doc\'s own ruleset choice');
  assert.equal(defaultProfile.ruleset.genrePack, 'cyberpunk');
  assert.deepEqual(defaultProfile.ruleset.partyHeadlineFields, ['Luck', 'XP']);
  for (const id of GATEABLE_MODULES) assert.equal(defaultProfile.moduleEnabled[id], true, `Default profile: ${id} stays enabled (nothing was hidden before)`);

  assert.equal(fivePfhProfile.name, '5PFH');
  assert.equal(fivePfhProfile.ruleset.statRuleset, 'traveller', 'same ruleset as Default');
  assert.equal(fivePfhProfile.moduleEnabled.trade, false);
  assert.equal(fivePfhProfile.moduleEnabled.battlemap, false);
  assert.equal(fivePfhProfile.moduleEnabled.graph, false);
  assert.equal(fivePfhProfile.moduleEnabled['faction-events'], false);
  assert.equal(fivePfhProfile.moduleEnabled.colony, true, 'Colony/World Tracker stay enabled in 5PFH');
  assert.equal(fivePfhProfile.moduleEnabled['world-tracker'], true);
  assert.deepEqual(fivePfhProfile.storyboardPositions, { composer: 'colony', navigator: 'world-tracker', advisor: 'party' });

  // Direct follow-up request ("create an inventory of Turn Step List
  // profiles managed in Settings"): a first-time install seeds both named
  // lists in the standalone appConfig.turnStepLists inventory, and the
  // Campaign panel's Colony/Starship tabs are pre-assigned to them.
  assert.equal(appConfig.turnStepLists.length, 2);
  const fivePfhList = appConfig.turnStepLists.find((l) => l.name === '5PFH');
  const planetfallList = appConfig.turnStepLists.find((l) => l.name === 'Planetfall');
  assert.ok(fivePfhList && fivePfhList.groups.length, '5PFH list seeded with real content');
  assert.ok(planetfallList && planetfallList.groups.length, 'Planetfall list seeded with real content');
  assert.deepEqual(campaignDoc.turnStepSlotAssignments, { colony: planetfallList.id, starship: fivePfhList.id }, 'Colony tab -> Planetfall, Starship tab -> 5PFH, per direct request');
});

test('wrapLegacyCampaignIntoAppConfig runs the campaign doc through the normal migrateDocument upgrade path (e.g. the SWN grandfather step still fires)', () => {
  const legacy = defaultCampaign();
  legacy.factionEvents = [{ id: 'e1' }]; // legacy SWN usage signal, no explicit gameSystemActivations
  delete legacy.settings.gameSystemActivations;
  const { appConfig, campaignDoc } = wrapLegacyCampaignIntoAppConfig(legacy);
  assert.equal(campaignDoc.schemaVersion, SCHEMA_VERSION);
  assert.equal(appConfig.profiles[0].ruleset.gameSystemActivations.swn, true, 'Default profile inherits the grandfathered activation');
});

test('migrateDocument backfills colony.encounters up to MAX_ENCOUNTERS for a pre-existing campaign, additively and idempotently', () => {
  // A campaign predating the "default to 10 rows" feature — 3 rows already
  // added the old way, one with real GM data on it.
  const legacy = defaultCampaign();
  legacy.colony.encounters = [
    { id: 'enc_a', note: 'Something in the ridge grass.', entityId: '' },
    { id: 'enc_b', note: '', entityId: '' },
    { id: 'enc_c', note: '', entityId: '' },
  ];
  const migrated = migrateDocument(legacy);
  assert.equal(migrated.colony.encounters.length, MAX_ENCOUNTERS);
  // The 3 real rows are preserved untouched, in order, not dropped/reordered.
  assert.equal(migrated.colony.encounters[0].id, 'enc_a');
  assert.equal(migrated.colony.encounters[0].note, 'Something in the ridge grass.');
  assert.equal(migrated.colony.encounters[1].id, 'enc_b');
  assert.equal(migrated.colony.encounters[2].id, 'enc_c');
  // The 7 padding rows all have real, distinct ids.
  const padIds = migrated.colony.encounters.slice(3).map((r) => r.id);
  assert.equal(new Set(padIds).size, 7);

  // A campaign already missing colony entirely (older than colony.js itself)
  // still ends up with the full fixed grid.
  const noColony = defaultCampaign();
  delete noColony.colony;
  const migratedNoColony = migrateDocument(noColony);
  assert.equal(migratedNoColony.colony.encounters.length, MAX_ENCOUNTERS);

  // A campaign already at MAX_ENCOUNTERS is left alone (idempotent).
  const full = migrateDocument(defaultCampaign());
  assert.equal(full.colony.encounters.length, MAX_ENCOUNTERS);
  const reMigrated = migrateDocument(full);
  assert.deepEqual(reMigrated.colony.encounters.map((r) => r.id), full.colony.encounters.map((r) => r.id));
});

test('migrateDocument backfills combatTracker for a campaign predating the Combat Initiative Tracker, additively and idempotently', () => {
  const legacy = defaultCampaign();
  delete legacy.combatTracker;
  const migrated = migrateDocument(legacy);
  assert.deepEqual(migrated.combatTracker, { entries: [], activeEntryId: null });

  // A campaign with real entries already on it is left untouched.
  const withEntries = defaultCampaign();
  withEntries.combatTracker = { entries: [{ id: 'ctr_a', entityId: 'ent_1' }], activeEntryId: null };
  const migratedWithEntries = migrateDocument(withEntries);
  assert.deepEqual(migratedWithEntries.combatTracker, { entries: [{ id: 'ctr_a', entityId: 'ent_1' }], activeEntryId: null });

  // A campaign predating just the "active combatant" follow-up (real
  // entries, no activeEntryId key yet) gets it backfilled without
  // disturbing the entries already there.
  const noActiveKey = defaultCampaign();
  noActiveKey.combatTracker = { entries: [{ id: 'ctr_b', entityId: 'ent_2' }] };
  const migratedNoActiveKey = migrateDocument(noActiveKey);
  assert.deepEqual(migratedNoActiveKey.combatTracker, { entries: [{ id: 'ctr_b', entityId: 'ent_2' }], activeEntryId: null });
});

test('migrateDocument backfills settings.dice3dEnabled (3D dice, diceBox3d.js) to true for a campaign predating it, additively — an existing explicit false is left alone, never flipped back on', () => {
  const legacy = defaultCampaign();
  delete legacy.settings.dice3dEnabled;
  const migrated = migrateDocument(legacy);
  assert.equal(migrated.settings.dice3dEnabled, true);

  const disabled = defaultCampaign();
  disabled.settings.dice3dEnabled = false;
  const migratedDisabled = migrateDocument(disabled);
  assert.equal(migratedDisabled.settings.dice3dEnabled, false);
});

test('migrateDocument backfills settings.dice3dTheme/dice3dColor (Dice settings tab, direct follow-up request) for a campaign predating them, additively — an existing explicit choice is left alone', () => {
  const legacy = defaultCampaign();
  delete legacy.settings.dice3dTheme;
  delete legacy.settings.dice3dColor;
  const migrated = migrateDocument(legacy);
  assert.equal(migrated.settings.dice3dTheme, 'default');
  assert.equal(migrated.settings.dice3dColor, '');

  const customized = defaultCampaign();
  customized.settings.dice3dTheme = 'rust';
  customized.settings.dice3dColor = '#aa4f4a';
  const migratedCustomized = migrateDocument(customized);
  assert.equal(migratedCustomized.settings.dice3dTheme, 'rust');
  assert.equal(migratedCustomized.settings.dice3dColor, '#aa4f4a');
});

test('migrateDocument converts a pre-existing FLAT turnStepProgress ({groupId,stepIndex,returnStack}) into the new slot-keyed shape, folding it into turnStepProgress.starship (the old content was always the 5PFH sequence), leaving turnStepProgress.colony fresh — a doc already in the new shape (or with no turnStepProgress at all) is untouched', () => {
  const legacy = defaultCampaign();
  legacy.turnStepProgress = { groupId: 'daily-life', stepIndex: 2, returnStack: [{ groupId: 'root', stepIndex: 0 }] };
  const migrated = migrateDocument(legacy);
  assert.deepEqual(migrated.turnStepProgress.starship, { groupId: 'daily-life', stepIndex: 2, returnStack: [{ groupId: 'root', stepIndex: 0 }] });
  assert.deepEqual(migrated.turnStepProgress.colony, { groupId: null, stepIndex: 0, returnStack: [] }, 'colony slot starts fresh, unrelated to the old single-slot progress');

  // Already-current shape is left alone.
  const current = defaultCampaign();
  current.turnStepProgress = { colony: { groupId: 'g1', stepIndex: 1, returnStack: [] }, starship: { groupId: null, stepIndex: 0, returnStack: [] } };
  const reMigrated = migrateDocument(current);
  assert.deepEqual(reMigrated.turnStepProgress, current.turnStepProgress);

  // A doc with no turnStepProgress at all just gets the schema default.
  const bare = defaultCampaign();
  delete bare.turnStepProgress;
  const migratedBare = migrateDocument(bare);
  assert.deepEqual(migratedBare.turnStepProgress, defaultCampaign().turnStepProgress);
});
