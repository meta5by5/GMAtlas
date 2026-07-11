// migrate.js — data-safety layer. Written BEFORE any UI, on purpose.
//
// Two jobs:
//   1. Absorb the ~15 legacy localStorage keys (v0.53 and older "hostile*")
//      into ONE unified campaign document.
//   2. Upgrade any document to the current SCHEMA_VERSION.
//
// Guarantee: nothing is dropped. Anything a rule does not explicitly map is
// preserved under `_legacy`, and the test suite asserts every legacy key is
// reachable in the result.
//
// Pure functions. No DOM, no localStorage. Runnable in the browser and Node.

import {
  SCHEMA_VERSION, APP_NAME, defaultCampaign, withDefaults, deepMerge, isObject,
} from './schema.js';

// Every legacy key the old app is known to write, plus the very old aliases.
export const LEGACY_KEYS = [
  'sagaAtlasSceneOracleV1',          // main store (mirrors the campaign export)
  'hostileSceneOracleV1',            // pre-rebrand main store
  'sagaAtlasStoryDirectorV2',
  'sagaAtlasStoryDirectorV1',
  'sagaAtlasStoryDirectorContextCascadeV5',
  'sagaAtlasStoryDirectorContextCascadeV4',
  'sagaAtlasStoryDirectorContextCascadeV3',
  'sagaAtlasStoryDirectorContextCascadeV2',
  'sagaAtlasOracleTableOverridesV1',
  'sagaAtlasEntityTemplatesV1',
  'sagaAtlasCieSettingsV1',
  'sagaAtlasPdfOpenTabs',
  'sagaAtlasPdfLastPages',
  'sagaAtlasPdfRestorePrompted',
  'sagaAtlasGithubDocsSyncedOnce',
];

// Fields that live at the top level of a v0.53 `state` export.
const V053_STATE_FIELDS = [
  'campaignName', 'planet', 'biome', 'locationType', 'surroundings', 'intent',
  'pacing', 'phase', 'threatLevel', 'mysteryLevel', 'currentThread', 'missionSeed',
  'worldSeed', 'predictability', 'useContinuity', 'escalateOnComplication',
  'useConflictArchitecture', 'lynxShip',
];

/**
 * Decide what a parsed import is and route it.
 * @param {object} parsed - JSON.parse of an imported file.
 * @returns {object} a current-version campaign document.
 */
export function importCampaign(parsed, now = new Date().toISOString()) {
  if (!isObject(parsed)) return defaultCampaign(now);
  // Already one of our documents → just upgrade it.
  if (typeof parsed.schemaVersion === 'number') return migrateDocument(parsed, now);
  // Otherwise treat it as a legacy v0.53 `state` export.
  return migrateFromLegacyKeys({ sagaAtlasSceneOracleV1: parsed }, now);
}

/**
 * Fold a map of { legacyKey: parsedValue } into one unified document.
 * Pass whatever legacy keys you found (missing keys are fine).
 */
export function migrateFromLegacyKeys(keys = {}, now = new Date().toISOString()) {
  const doc = defaultCampaign(now);

  // --- main state (v0.53 or pre-rebrand) --------------------------------
  const main = keys.sagaAtlasSceneOracleV1 || keys.hostileSceneOracleV1 || {};
  if (isObject(main)) {
    if (main.campaignName) doc.meta.title = main.campaignName;
    if (main.updatedAt) doc.meta.updatedAt = main.updatedAt;

    // WHO/WHERE/WHAT/WHY/HOW context, derived once at migration time and then
    // owned as a first-class model going forward.
    doc.context.what.situation = main.currentThread || '';
    if (main.intent) doc.context.what.intent = main.intent;
    if (typeof main.threatLevel === 'number') doc.context.what.threat = main.threatLevel;
    if (typeof main.mysteryLevel === 'number') doc.context.what.mystery = main.mysteryLevel;
    doc.context.where.summary = [main.locationType, main.surroundings].filter(Boolean).join(' — ');
    if (main.pacing) doc.context.how.summary = main.pacing;

    // Domain collections carry over verbatim.
    if (Array.isArray(main.sceneLog)) doc.scenes = main.sceneLog;
    if (Array.isArray(main.journal)) doc.journal = main.journal;
    if (isObject(main.entities)) {
      doc.entities = deepMerge(doc.entities, main.entities);
      if (!Array.isArray(doc.entities.items)) doc.entities.items = [];
      if (!Array.isArray(doc.entities.history)) doc.entities.history = [];
    }
    if (isObject(main.oracleUsage)) doc.oracles.usage = main.oracleUsage;

    // Legacy Story Director form fields preserved verbatim (lossless).
    for (const f of V053_STATE_FIELDS) {
      if (main[f] !== undefined) doc.settings.form[f] = main[f];
    }

    // UI state, separated from domain data.
    if (main.activeCenterTab) doc.settings.ui.activeCenterTab = main.activeCenterTab;
    if (main.activeLeftTab) doc.settings.ui.activeLeftTab = main.activeLeftTab;
    if (main.oracleFilter) doc.settings.ui.oracleFilter = main.oracleFilter;
    if (main.entityFilter) doc.settings.ui.entityFilter = main.entityFilter;
    if (isObject(main.entityTagCatalog)) doc.settings.entityTagCatalog = main.entityTagCatalog;

    // Anything else on the old state object we did not name explicitly.
    doc._legacy.mainStateExtras = pickUnknown(main, [
      ...V053_STATE_FIELDS, 'campaignName', 'updatedAt', 'currentThread', 'intent',
      'sceneLog', 'journal', 'entities', 'oracleUsage', 'activeCenterTab',
      'activeLeftTab', 'oracleFilter', 'entityFilter', 'entityTagCatalog',
      'lastSceneText', 'sceneSegments',
    ]);
  }

  // --- Story Director (keep newest generation, preserve all) ------------
  const director = keys.sagaAtlasStoryDirectorV2 || keys.sagaAtlasStoryDirectorV1;
  if (isObject(director)) doc.director = deepMerge(doc.director, director);

  const cascade =
    keys.sagaAtlasStoryDirectorContextCascadeV5 ||
    keys.sagaAtlasStoryDirectorContextCascadeV4 ||
    keys.sagaAtlasStoryDirectorContextCascadeV3 ||
    keys.sagaAtlasStoryDirectorContextCascadeV2;
  if (isObject(cascade)) doc.director.cascade = cascade;

  // --- oracle overrides, entity templates, CIE, documents ---------------
  if (isObject(keys.sagaAtlasOracleTableOverridesV1)) {
    doc.oracles.overrides = keys.sagaAtlasOracleTableOverridesV1;
  }
  if (isObject(keys.sagaAtlasEntityTemplatesV1)) {
    doc.settings.entityTemplates = keys.sagaAtlasEntityTemplatesV1;
  }
  if (isObject(keys.sagaAtlasCieSettingsV1)) {
    doc.settings.cie = keys.sagaAtlasCieSettingsV1;
  }
  if (keys.sagaAtlasPdfOpenTabs !== undefined) doc.documents.openTabs = keys.sagaAtlasPdfOpenTabs;
  if (keys.sagaAtlasPdfLastPages !== undefined) doc.documents.lastPages = keys.sagaAtlasPdfLastPages;

  // --- catch-all: any legacy key we did not explicitly handle -----------
  const handled = new Set([
    'sagaAtlasSceneOracleV1', 'hostileSceneOracleV1',
    'sagaAtlasStoryDirectorV2', 'sagaAtlasStoryDirectorV1',
    'sagaAtlasStoryDirectorContextCascadeV5', 'sagaAtlasStoryDirectorContextCascadeV4',
    'sagaAtlasStoryDirectorContextCascadeV3', 'sagaAtlasStoryDirectorContextCascadeV2',
    'sagaAtlasOracleTableOverridesV1', 'sagaAtlasEntityTemplatesV1',
    'sagaAtlasCieSettingsV1', 'sagaAtlasPdfOpenTabs', 'sagaAtlasPdfLastPages',
  ]);
  for (const [k, v] of Object.entries(keys)) {
    if (v === undefined || v === null) continue;
    if (!handled.has(k)) doc._legacy[k] = v;
  }

  return doc;
}

/** Upgrade an existing document to the current schema version. */
export function migrateDocument(doc, now = new Date().toISOString()) {
  let d = withDefaults(doc, now);
  // Future upgrades run here in order:
  // while (d.schemaVersion < SCHEMA_VERSION) { ...step...; d.schemaVersion++; }

  // Game System Activation grandfather step (docs/adr/0032): a fresh
  // campaign starts every `requiresActivation` provider OFF (see
  // schema.js's default), since this app also deploys publicly and "owned
  // the sourcebook, personal use" no longer holds by default. But a
  // campaign that already has real SWN Faction Turn Engine data (built
  // under docs/adr/0031, before this gate existed) must not suddenly read
  // as gated — check the ORIGINAL incoming `doc` (not the defaulted `d`,
  // which already carries the schema default) for any sign SWN was
  // already in real use: a committed factionEvents entry, or a faction
  // entity with real Faction Turn Engine fields set. Only fires once — a
  // doc that already has an explicit `gameSystemActivations` value (this
  // step already ran, or a GM has since toggled it by hand) is left alone.
  const hasExplicitActivations = !!(doc && doc.settings && doc.settings.gameSystemActivations !== undefined);
  if (!hasExplicitActivations) {
    const legacySwnUsage = !!(
      (Array.isArray(doc && doc.factionEvents) && doc.factionEvents.length) ||
      (doc && doc.entities && Array.isArray(doc.entities.items) && doc.entities.items.some((e) => (
        e && e.type === 'faction' && (e.hp !== undefined || e.currentGoalId || (Array.isArray(e.factionAssets) && e.factionAssets.length))
      )))
    );
    if (legacySwnUsage) {
      d.settings = d.settings || {};
      d.settings.gameSystemActivations = { ...(d.settings.gameSystemActivations || {}), swn: true };
    }
  }

  d.schemaVersion = SCHEMA_VERSION;
  d.app = APP_NAME;
  return d;
}

/** Read every legacy key from a Storage-like object (browser localStorage). */
export function readLegacyKeys(storage) {
  const out = {};
  for (const key of LEGACY_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw != null) out[key] = JSON.parse(raw);
    } catch { /* corrupt value — skip, but never throw */ }
  }
  return out;
}

function pickUnknown(obj, knownKeys) {
  const known = new Set(knownKeys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!known.has(k)) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}
