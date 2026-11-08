// store.js — the ONLY module that touches persistence.
//
// Everything else calls store.get() / store.update(fn) / store.subscribe(fn).
// No global function reassignment, no polling, no timing hacks — state changes
// notify subscribers and the UI follows. This is the structural fix for the
// v0.53 "load order is the architecture" problem.
//
// Backed by IndexedDB (docs/adr/0015-indexeddb-persistence.md), not
// localStorage — localStorage's ~5-10MB per-origin quota was a real,
// user-hit ceiling (a campaign with a few embedded uploaded documents gets
// there fast). IndexedDB's quota is a large fraction of free disk space
// (a few GB in practice), same local-only/zero-server/works-via-file://
// architecture, just a bigger box. `store.get()` stays fully synchronous —
// it always reads the in-memory `doc`, which is authoritative — so the ~100
// ordinary `store.update((d) => ...)` call sites throughout ui/shell.js
// needed NO changes: mutate in memory and notify() immediately (identical,
// instant UI feedback to before), persist to IndexedDB in the background,
// and roll back + notify again on the rare async failure (Article VIII:
// never show a change as there when it didn't really persist — just
// surfaced a beat later than a synchronous throw would have been). Only the
// handful of call sites that already wanted a real success/failure signal
// (import, restoreBackup, newCampaign) are real async functions now.
//
// Rules Profiles + multi-campaign (design/adr/rules-profiles-multi-
// campaign.md): this module now also owns a small app-level registry
// (`appConfig` — which campaigns exist, which Rules Profiles exist, which
// campaign is active), stored under its own IndexedDB key, separate from
// any one campaign's document. `get()`/`update()` keep their exact old
// call shape — they always operate on "the active campaign" — so nothing
// outside this file needed to change for the ~100 existing call sites.
// `get()` additionally overlays the active profile's ruleset fields onto
// the returned doc's `settings` (see overlayProfile below); `update()`'s
// mutator still clones the RAW un-overlaid doc, so profile values are never
// baked back into a persisted campaign record.

import { defaultCampaign, defaultAppConfig } from './schema.js';
import {
  importCampaign, migrateDocument, migrateFromLegacyKeys, readLegacyKeys, wrapLegacyCampaignIntoAppConfig, LEGACY_KEYS,
} from './migrate.js';
import { createCampaign, renameCampaignEntry, setActiveCampaign, createRulesProfile, reassignCampaignProfile, backfillDefaultCrewTasks, grandfatherCampaignPanelActivation, migrateLicensesFromActivations, migrateLicensesV2, backfillDnd5eStoryboardProfile, backfillFiveLeaguesStoryboardProfile, backfillGenrePackRename } from '../domain/rulesProfiles.js';
import { createTurnStepList, hoistLegacyProfileTurnSteps, backfillTurnStepListInventory, fixPlanetfallBranching } from '../domain/turnStepLists.js';
import { ensureRulesetGuideDefault } from '../domain/rulesetGuide.js';
import { TURN_STEPS_5PFH } from '../data/turnStepsDefault5pfh.js';
import { PLANETFALL_TURN_STEPS } from '../data/turnStepListPlanetfall.js';
import { TURN_STEPS_FIVE_LEAGUES } from '../data/turnStepListFiveLeagues.js';
import { CREW_TASKS_5PFH } from '../data/crewTasksDefault5pfh.js';
import { listInlineBlobs, applyMovedBlobs, blobKeysToInline, inlineBlobsForExport, contentBlobKey } from '../domain/inlineBlobs.js';
import { documentsToRekey, rekeyDocumentBlobs, resolveBlobAlias } from '../domain/documents.js';
import { rekeyTocLibrary } from '../domain/toc.js';
import { effectiveLicenses } from '../domain/licensing.js';
import { diffDoc, applyOps, nextHlc, observeHlc, createReplica, syncedView, withLocalPaths, withoutInlineBytes } from '../domain/syncOps.js';
import { CAMPAIGN_SYNC_POLICY } from '../data/syncPolicy.js';
import { accountSettingsView, withAccountSettings, joinAccountSettings, remapCampaignProfiles, remapTurnStepSlots } from '../domain/accountSettings.js';
const STORAGE_KEY = 'sagaatlas.campaign'; // legacy localStorage key — read-only fallback for pre-IndexedDB campaigns, never written again
const BACKUP_KEY = 'sagaatlas.campaign.backup'; // ditto
const MIGRATED_FLAG = 'sagaatlas.migratedFromLegacy';

const DB_NAME = 'gmatlas';
// Bumped 1 -> 2 to add DOC_BLOB_STORE (Reference Library doc bytes, direct
// follow-up request — "create a bulk export/import to transfer the
// library records and docs themselves from one browser to another so the
// docs can be transferred like the campaign data"). A deliberate,
// documented exception to "one object store" — doc bytes are a
// meaningfully different shape of data (potentially hundreds of MB across
// many PDFs) than the campaign document, with their own lifecycle
// (imported once, read many times, never touched by the campaign
// document's own save/backup cycle) — kept in this one module, alongside
// the campaign store, rather than a second persistence mechanism
// elsewhere in the app.
const DB_VERSION = 2;
const STORE_NAME = 'kv';
const DOC_BLOB_STORE = 'docBlobs';
// Pre-Rules-Profile fixed keys — a single campaign lived here. Now a
// read-only legacy fallback (load() absorbs it once into the new
// per-campaign-key scheme below and never writes here again), same
// treatment as STORAGE_KEY/BACKUP_KEY above.
const CAMPAIGN_KEY = 'campaign';
const CAMPAIGN_BACKUP_KEY = 'campaignBackup';
// New scheme: one appConfig record (the campaign index + Rules Profiles),
// each campaign's actual document under its own key.
const APP_CONFIG_KEY = 'appConfig';
// {oldKey: 'sha256:…'}: uploads re-keyed by content (S3) keep resolving by
// the key they had before. This device's own record, never synced.
const BLOB_ALIASES_KEY = 'blobAliases';
const campaignDocKey = (id) => `campaign:${id}`;
const campaignBackupDocKey = (id) => `campaignBackup:${id}`;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
      if (!req.result.objectStoreNames.contains(DOC_BLOB_STORE)) req.result.createObjectStore(DOC_BLOB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked (another tab holding an old version?)'));
  });
}

function idbGet(db, key, storeName = STORE_NAME) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
  });
}

function idbPut(db, key, value, storeName = STORE_NAME) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
  });
}

function idbDelete(db, key, storeName = STORE_NAME) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
  });
}

function idbKeys(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error || new Error('IndexedDB getAllKeys failed'));
  });
}

/** Several puts in ONE transaction: all land or none do. */
function idbPutMany(db, entries, storeName = STORE_NAME) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const os = tx.objectStore(storeName);
    for (const [key, value] of entries) os.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
  });
}

// Sync (design/ACCOUNTS-SYNC-ROADMAP.md 5.3, Phase S2). Per synced campaign,
// `sync:<id>` holds:
//   base      the document as last diffed (the synced view: no inline bytes)
//   meta      the merge clock tree (domain/syncOps.js) describing `base`
//   hlc       this device's last clock
//   cursor    the highest server seq applied here
//   outbox    op batches not yet acknowledged by the server
// Every change to a synced campaign, by any path (update, import, rename,
// image moves, restore, a rollback), is found by diffing `base` against the
// live document a moment later, so nothing needs to remember to record ops.
// The base is persisted, so a change made just before a crash or reload is
// still found on the next load: the diff then runs against the stored base.
const SYNC_KEYS_KEY = 'syncKeys';
// Account settings sync state (domain/accountSettings.js):
// {v, userId, deviceId, base, meta, hlc, version, outbox}.
const SYNC_ACCOUNT_KEY = 'syncAccount';
const syncStateKey = (id) => `sync:${id}`;
const SYNC_FLUSH_MS = 100;

function createStore() {
  const subs = new Set();
  const persistErrorSubs = new Set();
  // appConfig: { activeCampaignId, campaigns: [{id,title,profileId,...}], profiles: [...] }
  let appConfig = defaultAppConfig();
  const syncStates = new Map();
  const syncTimers = new Map();
  const syncWrites = new Map();
  const localOpsSubs = new Set();
  // Loaded campaign documents, keyed by campaign id — the active one is
  // always present once load() resolves; others load lazily on switch.
  // Every set() also tells sync that the campaign may have changed.
  class DocMap extends Map {
    set(id, doc) { super.set(id, doc); scheduleSyncFlush(id); return this; }
  }
  const docs = new DocMap();
  let dbPromise = null;
  let boundFileHandle = null;
  // Kept in sync with the ACTIVE campaign's backup record so storageInfo()
  // (read by every Settings render) stays synchronous — an async IndexedDB
  // read on every render would be a much bigger ripple for no real benefit.
  let backupMeta = { exists: false, bytes: 0 };
  // The signed-in account's entitlement certificate payload, once its
  // signature has been checked (Phase S1, by the account client), or null
  // when signed out. In memory only: the signed certificate itself is kept
  // in appConfig.account and re-verified on each boot.
  let accountCert = null;
  // Gallery images and legacy uploaded documents keep their bytes in the
  // docBlobs store under a content hash, not inline in the campaign
  // document (design/ACCOUNTS-SYNC-ROADMAP.md, Phase S0). This is the
  // in-memory blobKey -> data: URL copy that keeps rendering and export()
  // synchronous: warmed before a campaign is first shown, filled as bytes
  // move out.
  const blobDataUrls = new Map();
  // Campaign ids with a move in flight, and ids that changed meanwhile and
  // need one more pass once it finishes.
  const moving = new Set();
  const moveAgain = new Set();

  function db() {
    if (!dbPromise) dbPromise = idbOpen();
    return dbPromise;
  }

  function notify() {
    for (const fn of subs) {
      try { fn(get()); } catch (e) { console.error('subscriber failed', e); }
    }
  }

  function notifyPersistError(err) {
    for (const fn of persistErrorSubs) {
      try { fn(err); } catch (e) { console.error('persist-error subscriber failed', e); }
    }
  }

  function activeCampaignEntry() {
    return appConfig.campaigns.find((c) => c.id === appConfig.activeCampaignId) || null;
  }

  function activeProfile() {
    const entry = activeCampaignEntry();
    const byId = entry && appConfig.profiles.find((p) => p.id === entry.profileId);
    return byId || appConfig.profiles[0] || null;
  }

  // The six ruleset fields (design/adr/rules-profiles-multi-campaign.md) shadow whatever is persisted in
  // the raw doc's own `settings` — see this file's header comment. The
  // active profile's Crew Tasks definitions are spliced in the same way, as
  // a top-level `crewTasks` (not campaign content — never persisted back,
  // update()'s mutator still clones the RAW doc). Turn Step Lists (direct
  // follow-up request: "create an inventory of Turn Step List profiles
  // managed in Settings") are a DIFFERENT kind of overlay — appConfig-level
  // shared content, not profile-scoped — so `turnStepLists` is spliced onto
  // every doc unconditionally, even when no profile resolves at all
  // (unlike settings/crewTasks below, which need an active profile to mean
  // anything).
  // `licenses` (install-wide book ownership, Settings -> Licenses) rides
  // along on settings the same way, so isLicensed/isGameSystemActivated
  // (data/rulesConstitution.js) can read it from any doc.
  function overlayProfileWith(rawDoc, profile) {
    if (!rawDoc) return rawDoc;
    const licenses = effectiveLicenses({ attested: appConfig.licenses, cert: accountCert, devicePolicy: accountCert && accountCert.policy });
    const withLists = { ...rawDoc, turnStepLists: appConfig.turnStepLists || [], settings: { ...rawDoc.settings, licenses } };
    if (!profile) return withLists;
    return { ...withLists, settings: { ...rawDoc.settings, ...profile.ruleset, licenses }, crewTasks: profile.crewTasks };
  }

  function overlayProfile(rawDoc) { return overlayProfileWith(rawDoc, activeProfile()); }

  function profileForCampaign(campaignId) {
    const entry = appConfig.campaigns.find((c) => c.id === campaignId);
    const byId = entry && appConfig.profiles.find((p) => p.id === entry.profileId);
    return byId || appConfig.profiles[0] || null;
  }

  // Real per-campaign state (which list backs which Campaign-panel tab) —
  // backfilled defensively wherever a doc is loaded/created, defaulting to
  // the "Planetfall"/"5PFH"-named lists (direct follow-up request:
  // "reassign the Planetfall Turn Step list to the Colony tab" / "the
  // Starship tab... is to play the base game 5PFH"). Requires appConfig.
  // turnStepLists to already contain those two lists — see
  // backfillTurnStepListInventory, called once in load() before this ever
  // runs. A GM's own later reassignment (Settings) is left untouched — this
  // only fills in a still-null slot, never overwrites an explicit choice.
  function backfillCampaignTurnStepSlots(doc) {
    if (!doc.turnStepSlotAssignments || typeof doc.turnStepSlotAssignments !== 'object') doc.turnStepSlotAssignments = { colony: null, starship: null, warband: null };
    const lists = appConfig.turnStepLists || [];
    if (!doc.turnStepSlotAssignments.colony) {
      const l = lists.find((x) => x.name === 'Planetfall');
      if (l) doc.turnStepSlotAssignments.colony = l.id;
    }
    if (!doc.turnStepSlotAssignments.starship) {
      const l = lists.find((x) => x.name === '5PFH');
      if (l) doc.turnStepSlotAssignments.starship = l.id;
    }
    if (!doc.turnStepSlotAssignments.warband) {
      const l = lists.find((x) => x.name === 'Five Leagues');
      if (l) doc.turnStepSlotAssignments.warband = l.id;
    }
    return doc;
  }

  // Ruleset Guide ToC + "Load" sourcebook button (direct follow-up
  // request): "add it automatically if the ruleset is enabled" — resolves
  // a campaign's EFFECTIVE Game System Ruleset (the active profile's own
  // ruleset.statRuleset) from appConfig, for ensureRulesetGuideDefault's
  // own one-time-per-campaign-per-ruleset seed. Called alongside
  // backfillCampaignTurnStepSlots at the same call sites, same "idempotent,
  // cheap no-op once already done" posture (including the same accepted
  // limitation: a campaign already cached in-session from an earlier visit
  // isn't re-checked on every switchCampaign call, same as that backfill).
  function resolveActiveStatRuleset(cfg, campaignId) {
    const entry = cfg.campaigns.find((c) => c.id === campaignId);
    const profile = entry && cfg.profiles.find((p) => p.id === entry.profileId);
    return (profile && profile.ruleset && profile.ruleset.statRuleset) || null;
  }

  // --- inline bytes -> content-addressed blobs (domain/inlineBlobs.js) ---
  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(5, comma);
    const mime = header.split(';')[0] || 'application/octet-stream';
    const body = dataUrl.slice(comma + 1);
    if (!/;base64/i.test(header)) return new Blob([decodeURIComponent(body)], { type: mime });
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  // Blob.arrayBuffer() is missing in older Safari; FileReader is everywhere.
  function blobBytes(blob) {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  async function blobToDataUrl(blob) {
    const bytes = new Uint8Array(await blobBytes(blob));
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
  }

  async function blobKeyFor(blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blobBytes(blob));
    return contentBlobKey([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }

  /** Loads into memory the bytes a campaign's moved records point at, so
   *  they render and export synchronously. Bytes missing on this device
   *  are skipped: the record keeps its link, and shows empty here. Never
   *  throws, because it runs on the way to showing a campaign at all. */
  async function warmBlobCache(doc) {
    const keys = blobKeysToInline(doc).filter((k) => !blobDataUrls.has(k));
    if (!keys.length) return;
    try {
      const database = await db();
      await Promise.all(keys.map(async (k) => {
        try {
          const blob = await idbGet(database, k, DOC_BLOB_STORE);
          if (blob) blobDataUrls.set(k, await blobToDataUrl(blob));
        } catch (err) {
          console.warn('could not load stored image', k, err);
        }
      }));
    } catch (err) {
      console.warn('could not open the blob store', err);
    }
  }

  /** Moves a campaign's inline bytes into docBlobs, then rewrites the
   *  document to point at them and persists it. Runs in the background
   *  after every load, import and update that leaves inline bytes behind.
   *  Any failure leaves the bytes inline, exactly as before. */
  async function moveInlineBlobs(campaignId) {
    if (moving.has(campaignId)) { moveAgain.add(campaignId); return; }
    const pending = listInlineBlobs(docs.get(campaignId));
    const toRekey = documentsToRekey(docs.get(campaignId));
    if (!pending.length && !toRekey.length) return;
    moving.add(campaignId);
    try {
      const database = await db();
      if (pending.length) {
        const moved = [];
        for (const item of pending) {
          const blob = dataUrlToBlob(item.dataUrl);
          const blobKey = await blobKeyFor(blob);
          await idbPut(database, blobKey, blob, DOC_BLOB_STORE);
          blobDataUrls.set(blobKey, item.dataUrl);
          moved.push({ ...item, blobKey });
        }
        const current = docs.get(campaignId);
        if (current) {
          const next = applyMovedBlobs(current, moved);
          docs.set(campaignId, next);
          await persistCampaignDoc(campaignId, current, next);
        }
      }
      if (toRekey.length) await rekeyUploads(database, campaignId, toRekey);
    } catch (err) {
      console.warn('moving bytes to content keys failed; they stay where they were', err);
    } finally {
      moving.delete(campaignId);
      if (moveAgain.delete(campaignId)) moveInlineBlobs(campaignId);
    }
  }

  let blobAliases = null;
  async function loadBlobAliases(database) {
    if (!blobAliases) blobAliases = (await idbGet(database, BLOB_ALIASES_KEY)) || {};
    return blobAliases;
  }

  /** Moves uploads stored under their document id (before S3) to content
   *  keys: copy, record the alias, then drop the old copy, so the bytes are
   *  never stored twice and never missing. An upload whose bytes aren't on
   *  this device keeps its old key until they arrive. Rewrites the campaign
   *  (and the app-wide TOC library) to the new keys. */
  async function rekeyUploads(database, campaignId, toRekey) {
    const aliases = await loadBlobAliases(database);
    const map = {};
    for (const { oldKey } of toRekey) {
      if (map[oldKey]) continue;
      if (aliases[oldKey]) { map[oldKey] = aliases[oldKey]; continue; }
      const blob = await idbGet(database, oldKey, DOC_BLOB_STORE);
      if (!blob) continue;
      const key = await blobKeyFor(blob);
      await idbPut(database, key, blob, DOC_BLOB_STORE);
      aliases[oldKey] = key;
      await idbPut(database, BLOB_ALIASES_KEY, aliases);
      await idbDelete(database, oldKey, DOC_BLOB_STORE);
      map[oldKey] = key;
    }
    if (!Object.keys(map).length) return;
    const current = docs.get(campaignId);
    if (current) {
      const next = rekeyDocumentBlobs(current, map);
      docs.set(campaignId, next);
      await persistCampaignDoc(campaignId, current, next);
    }
    if (appConfig.tocLibrary && Object.keys(map).some((k) => appConfig.tocLibrary[k])) {
      updateAppConfig((c) => ({ ...c, tocLibrary: rekeyTocLibrary(c.tocLibrary, map) }));
    } else {
      notify();
    }
  }

  async function refreshBackupMeta(campaignId) {
    const database = await db();
    const backup = await idbGet(database, campaignBackupDocKey(campaignId));
    backupMeta = { exists: !!backup, bytes: byteSize(JSON.stringify(backup || null)) };
  }

  /** The idempotent appConfig backfills every boot runs (load() below). */
  function bootBackfills(cfg) {
    let backfilled = hoistLegacyProfileTurnSteps(cfg);
    backfilled = backfillTurnStepListInventory(backfilled, TURN_STEPS_5PFH, PLANETFALL_TURN_STEPS, TURN_STEPS_FIVE_LEAGUES);
    backfilled = fixPlanetfallBranching(backfilled);
    backfilled = backfillDefaultCrewTasks(backfilled, CREW_TASKS_5PFH);
    backfilled = grandfatherCampaignPanelActivation(backfilled);
    backfilled = migrateLicensesV2(migrateLicensesFromActivations(backfilled));
    backfilled = backfillDnd5eStoryboardProfile(backfilled);
    backfilled = backfillFiveLeaguesStoryboardProfile(backfilled);
    backfilled = backfillGenrePackRename(backfilled);
    return backfilled;
  }

  /** The profiles and Turn Step Lists a brand-new install starts with: an
   *  account settings join folds a record still exactly like its seed into
   *  the account's same-named one (domain/accountSettings.js). */
  function freshSeeds() {
    const fresh = bootBackfills(migrateLicensesV2(migrateLicensesFromActivations(wrapLegacyCampaignIntoAppConfig(defaultCampaign()).appConfig)));
    return { profiles: fresh.profiles || [], turnStepLists: fresh.turnStepLists || [] };
  }

  /** Load on boot: absorb legacy keys once, else read our own registry.
   *  Async now (IndexedDB) — main.js awaits this before mounting the shell. */
  async function load() {
    const database = await db();
    const savedAppConfig = await idbGet(database, APP_CONFIG_KEY);
    if (savedAppConfig) {
      appConfig = savedAppConfig;
      // Narrow, idempotent, additive-only backfill for an install that
      // already has an appConfig (so wrapLegacyCampaignIntoAppConfig below
      // won't run). Direct follow-up request ("create an inventory of Turn
      // Step List profiles managed in Settings"): Turn Step content used to
      // live on a profile literally named "5PFH" — hoistLegacyProfileTurnSteps
      // moves any such pre-existing content into the new standalone
      // appConfig.turnStepLists inventory (named after the profile it came
      // from), then backfillTurnStepListInventory ensures the "5PFH"/
      // "Planetfall" lists exist regardless (seeding from this app's own
      // default content if either is still missing) — both idempotent, run
      // every boot, cheap no-ops once already done.
      const backfilled = bootBackfills(appConfig);
      if (backfilled !== appConfig) {
        appConfig = backfilled;
        await idbPut(database, APP_CONFIG_KEY, appConfig);
      }
      const activeId = appConfig.activeCampaignId;
      let activeDoc = await idbGet(database, campaignDocKey(activeId));
      activeDoc = activeDoc ? migrateDocument(activeDoc) : defaultCampaign();
      activeDoc = backfillCampaignTurnStepSlots(activeDoc);
      activeDoc = ensureRulesetGuideDefault(activeDoc, resolveActiveStatRuleset(appConfig, activeId));
      docs.set(activeId, activeDoc);
      await loadSyncState(activeId);
      await warmBlobCache(activeDoc);
      await refreshBackupMeta(activeId);
      notify();
      moveInlineBlobs(activeId);
      return get();
    }

    // No appConfig yet — one-time upgrade path (mirrors the pre-Rules-
    // Profile legacy-absorption logic exactly, just wrapped into the new
    // registry afterward instead of written straight to CAMPAIGN_KEY).
    let legacyDoc = await idbGet(database, CAMPAIGN_KEY);
    // A brand-new install's blank campaign starts as not edited (see
    // noteEdited); anything brought forward from older storage counts as
    // edited.
    let blank = false;
    if (!legacyDoc) {
      const existing = safeParse(localStorage.getItem(STORAGE_KEY));
      if (existing) {
        legacyDoc = existing;
      } else if (!localStorage.getItem(MIGRATED_FLAG)) {
        const legacy = readLegacyKeys(localStorage);
        blank = !Object.keys(legacy).length;
        legacyDoc = blank ? defaultCampaign() : migrateFromLegacyKeys(legacy);
        localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
      } else if (typeof window !== 'undefined' && window.__importedCampaign) {
        try { legacyDoc = window.__importedCampaign; } catch (e) { legacyDoc = defaultCampaign(); blank = true; }
      } else {
        legacyDoc = defaultCampaign();
        blank = true;
      }
    }
    const wrapped = wrapLegacyCampaignIntoAppConfig(legacyDoc);
    appConfig = migrateLicensesV2(migrateLicensesFromActivations(wrapped.appConfig));
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => ({ ...c, edited: !blank })) };
    docs.set(wrapped.campaignDoc.meta.id, wrapped.campaignDoc);
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await idbPut(database, campaignDocKey(wrapped.campaignDoc.meta.id), wrapped.campaignDoc);
    notify();
    moveInlineBlobs(wrapped.campaignDoc.meta.id);
    return get();
  }

  function get() { return overlayProfile(docs.get(appConfig.activeCampaignId)); }

  /** Mutate immutably: pass a function that returns a new (or mutated) doc.
   *  Updates the in-memory doc and notifies subscribers immediately (same
   *  instant feedback as before IndexedDB), then persists in the
   *  background. If that background persist fails, rolls back to the
   *  pre-mutation doc and notifies again — unless a newer edit has already
   *  landed on top of this one, in which case the newer edit wins rather
   *  than a stale rollback clobbering it. Failures surface via
   *  onPersistError(fn), not a thrown exception (there is no synchronous
   *  outcome to throw from anymore). `{silent: true}` skips the immediate
   *  notify — for a value the screen already shows (the Journal compose
   *  box's draft, saved on blur), where a re-render would only get in the
   *  way of the click that caused the blur. A rollback still notifies.
   *  `{system: true}` marks the app's own housekeeping (defaults it fills
   *  in), which doesn't count as editing the campaign (noteEdited). */
  function update(mutator, { silent = false, system = false } = {}) {
    const activeId = appConfig.activeCampaignId;
    const prev = docs.get(activeId);
    const next = mutator(structuredCloneSafe(prev));
    const nextDoc = next || prev;
    nextDoc.meta.updatedAt = new Date().toISOString();
    docs.set(activeId, nextDoc);
    if (!system) noteEdited(activeId, prev, nextDoc);
    if (!silent) notify();
    persistCampaignDoc(activeId, prev, nextDoc).catch((err) => {
      console.warn('persist failed (IndexedDB)', err);
      if (docs.get(activeId) === nextDoc) { docs.set(activeId, prev); notify(); }
      notifyPersistError(err);
    });
    if (listInlineBlobs(nextDoc).length) moveInlineBlobs(activeId);
    return get();
  }

  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function onPersistError(fn) { persistErrorSubs.add(fn); return () => persistErrorSubs.delete(fn); }

  /** Best-effort one-slot backup of the outgoing doc, then the real write —
   *  same ordering/intent as the pre-IndexedDB version (ADR 0005: a failed
   *  backup write is never fatal, only a failed real write is), just async,
   *  and now scoped per-campaign-id rather than one fixed key pair. */
  async function persistCampaignDoc(campaignId, prevDoc, nextDoc) {
    const database = await db();
    try {
      await idbPut(database, campaignBackupDocKey(campaignId), prevDoc);
      if (campaignId === appConfig.activeCampaignId) backupMeta = { exists: true, bytes: byteSize(JSON.stringify(prevDoc)) };
    } catch (e) {
      console.warn('backup write skipped (quota?)', e);
    }
    // A synced campaign's document is always written together with its
    // sync state (the change diffed into the outbox first), so the stored
    // base never runs ahead of the stored document.
    if (syncStates.has(campaignId)) {
      flushSync(campaignId);
      await persistSync(campaignId);
      return;
    }
    await idbPut(database, campaignDocKey(campaignId), nextDoc);
  }

  async function persistAppConfig() {
    const database = await db();
    await idbPut(database, APP_CONFIG_KEY, appConfig);
  }

  // --- portability: one serialize path → lossless by construction -------
  // Moved bytes go back inline, so an export file is self-contained and
  // has the shape older versions wrote (domain/inlineBlobs.js).
  function forExport(doc) { return inlineBlobsForExport(doc, (k) => blobDataUrls.get(k)); }
  function exportDocument() { return JSON.stringify(forExport(get()), null, 2); }

  // Imported JSON replaces the ACTIVE campaign's content in place — same
  // "Import Campaign JSON" behavior as before multi-campaign existed. It
  // does not create a new campaign entry; switch to (or create) the
  // campaign you want the import to land in first if that's the goal.
  async function importDocument(rawText) {
    const activeId = appConfig.activeCampaignId;
    let imported = backfillCampaignTurnStepSlots(importCampaign(safeParse(rawText)));
    imported = ensureRulesetGuideDefault(imported, resolveActiveStatRuleset(appConfig, activeId));
    imported.meta.id = activeId;
    docs.set(activeId, imported);
    await persistCampaignDoc(activeId, imported, imported);
    appConfig = renameCampaignEntry(appConfig, activeId, imported.meta.title);
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => (c.id === activeId ? { ...c, edited: true } : c)) };
    await persistAppConfig();
    await warmBlobCache(imported);
    notify();
    moveInlineBlobs(activeId);
    return get();
  }

  /** Register + switch to a brand-new campaign under the given (or default)
   *  Rules Profile. Does NOT touch any other campaign's data. */
  async function newCampaign({ title, profileId } = {}) {
    const chosenProfileId = profileId || (appConfig.profiles[0] && appConfig.profiles[0].id) || null;
    const chosenProfile = chosenProfileId && appConfig.profiles.find((p) => p.id === chosenProfileId);
    const created = createCampaign(appConfig, { title, profileId: chosenProfileId });
    appConfig = setActiveCampaign(created.appConfig, created.doc.meta.id);
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => (c.id === created.doc.meta.id ? { ...c, edited: false } : c)) };
    let newDoc = backfillCampaignTurnStepSlots(created.doc);
    newDoc = ensureRulesetGuideDefault(newDoc, chosenProfile && chosenProfile.ruleset && chosenProfile.ruleset.statRuleset);
    docs.set(created.doc.meta.id, newDoc);
    const database = await db();
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await idbPut(database, campaignDocKey(created.doc.meta.id), newDoc);
    backupMeta = { exists: false, bytes: 0 };
    notify();
    return get();
  }

  /** Switch the active campaign, lazily loading its document if this is the
   *  first time it's been visited this session. */
  async function switchCampaign(campaignId) {
    if (!appConfig.campaigns.some((c) => c.id === campaignId)) return get();
    if (campaignId === appConfig.activeCampaignId) return get();
    const database = await db();
    let target = docs.get(campaignId);
    if (!target) {
      const raw = await idbGet(database, campaignDocKey(campaignId));
      target = backfillCampaignTurnStepSlots(migrateDocument(raw || defaultCampaign()));
      target = ensureRulesetGuideDefault(target, resolveActiveStatRuleset(appConfig, campaignId));
      docs.set(campaignId, target);
    }
    await loadSyncState(campaignId);
    await warmBlobCache(target);
    appConfig = setActiveCampaign(appConfig, campaignId);
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await refreshBackupMeta(campaignId);
    notify();
    moveInlineBlobs(campaignId);
    return get();
  }

  /** Serialize any one campaign (not necessarily the active one) for a
   *  standalone backup download — direct follow-up request ("Add the
   *  ability to delete a campaign and all its data. Prompt to backup the
   *  data first."). Same overlay-the-right-profile-onto-settings shape as
   *  exportDocument()/get(), just resolved for an arbitrary campaign id
   *  instead of always the active one, and without switching away from
   *  whatever campaign is actually active right now. Returns null if the
   *  campaign doesn't exist. */
  async function exportCampaignById(campaignId) {
    let target = docs.get(campaignId);
    if (!target) {
      const database = await db();
      const raw = await idbGet(database, campaignDocKey(campaignId));
      if (!raw) return null;
      target = migrateDocument(raw);
    }
    await warmBlobCache(target);
    return JSON.stringify(forExport(overlayProfileWith(target, profileForCampaign(campaignId))), null, 2);
  }

  /** Loads a campaign's document into memory without switching to it — the
   *  same lazy load switchCampaign() does — so Settings can configure a
   *  campaign other than the active one. Resolves to the profile-overlaid
   *  doc (same shape get() returns), or null for an unknown id. */
  async function loadCampaign(campaignId) {
    if (!appConfig.campaigns.some((c) => c.id === campaignId)) return null;
    if (!docs.has(campaignId)) {
      const database = await db();
      const raw = await idbGet(database, campaignDocKey(campaignId));
      let target = backfillCampaignTurnStepSlots(migrateDocument(raw || defaultCampaign()));
      target = ensureRulesetGuideDefault(target, resolveActiveStatRuleset(appConfig, campaignId));
      if (!docs.has(campaignId)) docs.set(campaignId, target);
    }
    await loadSyncState(campaignId);
    await warmBlobCache(docs.get(campaignId));
    moveInlineBlobs(campaignId);
    return peekCampaign(campaignId);
  }

  /** Sync read of an already-loaded campaign (loadCampaign first), profile-
   *  overlaid for THAT campaign's own profile; null if not loaded yet. */
  function peekCampaign(campaignId) {
    if (campaignId === appConfig.activeCampaignId) return get();
    const raw = docs.get(campaignId);
    return raw ? overlayProfileWith(raw, profileForCampaign(campaignId)) : null;
  }

  /** update() for any campaign, active or not. The active one goes through
   *  update() itself, so the change shows immediately; any other campaign
   *  is loaded if needed, changed, and persisted (backup slot first, same
   *  as update()) without becoming active. Resolves once persisted; a
   *  failed write rolls the in-memory doc back and rejects. */
  async function updateCampaign(campaignId, mutator) {
    if (campaignId === appConfig.activeCampaignId) return update(mutator);
    if (!(await loadCampaign(campaignId))) throw new Error('Unknown campaign');
    const prev = docs.get(campaignId);
    const nextDoc = mutator(structuredCloneSafe(prev)) || prev;
    nextDoc.meta.updatedAt = new Date().toISOString();
    docs.set(campaignId, nextDoc);
    noteEdited(campaignId, prev, nextDoc);
    notify();
    try {
      await persistCampaignDoc(campaignId, prev, nextDoc);
    } catch (err) {
      if (docs.get(campaignId) === nextDoc) { docs.set(campaignId, prev); notify(); }
      throw err;
    }
    if (listInlineBlobs(nextDoc).length) moveInlineBlobs(campaignId);
    return peekCampaign(campaignId);
  }

  /** Permanently remove a campaign and its document + backup from
   *  IndexedDB. Refuses to delete the active campaign (switch away first —
   *  callers should only ever offer this for a non-active row, same as the
   *  existing Switch button) or the last remaining campaign (this app
   *  always needs one active campaign to exist). Never touches any other
   *  campaign's data. */
  async function deleteCampaign(campaignId) {
    if (campaignId === appConfig.activeCampaignId) {
      return { ok: false, error: new Error('Cannot delete the active campaign — switch to another one first.') };
    }
    if (appConfig.campaigns.length <= 1) {
      return { ok: false, error: new Error('Cannot delete the only campaign.') };
    }
    const database = await db();
    await idbDelete(database, campaignDocKey(campaignId));
    await idbDelete(database, campaignBackupDocKey(campaignId));
    await idbDelete(database, syncStateKey(campaignId));
    clearTimeout(syncTimers.get(campaignId));
    syncStates.delete(campaignId);
    docs.delete(campaignId);
    // A synced campaign deleted here stays on the account for the other
    // devices; remember not to download it here again.
    const wasSynced = isSyncedEntry(campaignId);
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.filter((c) => c.id !== campaignId) };
    if (wasSynced) appConfig = { ...appConfig, syncDeclined: [...new Set([...(appConfig.syncDeclined || []), campaignId])] };
    await persistAppConfig();
    notify();
    return { ok: true };
  }

  /** Rename a campaign's title — keeps the campaign-list entry and (once
   *  loaded) its own document's meta.title in sync. */
  async function renameCampaign(campaignId, title) {
    const database = await db();
    let targetDoc = docs.get(campaignId);
    if (!targetDoc) targetDoc = await idbGet(database, campaignDocKey(campaignId));
    if (targetDoc) {
      const renamedDoc = { ...targetDoc, meta: { ...targetDoc.meta, title, updatedAt: new Date().toISOString() } };
      docs.set(campaignId, renamedDoc);
      await idbPut(database, campaignDocKey(campaignId), renamedDoc);
    }
    appConfig = renameCampaignEntry(appConfig, campaignId, title);
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => (c.id === campaignId ? { ...c, edited: true } : c)) };
    await persistAppConfig();
    notify();
    return get();
  }

  function listCampaigns() {
    return appConfig.campaigns.map((c) => ({ ...c, active: c.id === appConfig.activeCampaignId }));
  }

  /** Reassign an existing campaign to a different Rules Profile — appConfig
   *  only, never touches that campaign's own document, so its data is
   *  never at risk. */
  async function setCampaignProfile(campaignId, profileId) {
    appConfig = reassignCampaignProfile(appConfig, campaignId, profileId);
    await persistAppConfig();
    notify();
    return get();
  }

  function listProfiles() { return appConfig.profiles; }
  function getActiveProfile() { return activeProfile(); }
  /** Read-only access to the whole appConfig record — same live-reference
   *  convention as listCampaigns()/listProfiles() above. Entitlements
   *  (domain/entitlements.js) is the one current reader; a future caller
   *  needing something else out of appConfig should use this too rather
   *  than adding another single-purpose getter. */
  function getAppConfig() { return appConfig; }

  /** Create a new Rules Profile, optionally cloning an existing one's
   *  ruleset/moduleEnabled/storyboardPositions. */
  async function createProfile({ name, cloneFromId } = {}) {
    appConfig = createRulesProfile(appConfig, { name, cloneFromId });
    await persistAppConfig();
    notify();
    return get();
  }

  /** Generic Rules Profile mutator — same optimistic/persist/rollback shape
   *  as update(), but scoped to one profile in appConfig.profiles. Pass any
   *  pure mutator from domain/rulesProfiles.js (setModuleEnabled,
   *  setStoryboardPosition, updateProfileRuleset, ...). */
  function updateProfile(profileId, mutator) {
    const prevConfig = appConfig;
    const prevProfile = appConfig.profiles.find((p) => p.id === profileId);
    if (!prevProfile) return get();
    const nextProfile = mutator(structuredCloneSafe(prevProfile)) || prevProfile;
    appConfig = { ...appConfig, profiles: appConfig.profiles.map((p) => (p.id === profileId ? nextProfile : p)) };
    notify();
    const thisConfig = appConfig;
    persistAppConfig().catch((err) => {
      console.warn('profile persist failed (IndexedDB)', err);
      if (appConfig === thisConfig) { appConfig = prevConfig; notify(); }
      notifyPersistError(err);
    });
    return get();
  }

  // Sync-call-shape, same contract as updateProfile()/update() themselves.
  function renameProfile(profileId, name) {
    return updateProfile(profileId, (p) => ({ ...p, name }));
  }

  /** Create a new, empty Turn Step List — Settings' "+ New List" action
   *  (direct follow-up request: "create an inventory of Turn Step List
   *  profiles managed in Settings"). Mirrors createProfile's shape. */
  async function addTurnStepList(name) {
    const result = createTurnStepList(appConfig, name);
    appConfig = result.appConfig;
    await persistAppConfig();
    notify();
    return get();
  }

  /** Generic Turn Step List inventory mutator — same optimistic/persist/
   *  rollback shape as updateProfile(), but scoped to the whole appConfig
   *  (turnStepLists is a shared, appConfig-level inventory, not one
   *  profile's content). Pass any pure mutator from domain/turnStepLists.js
   *  (renameTurnStepList, deleteTurnStepList, moveTurnStepInList,
   *  updateTurnStepText, setTurnStepShowCrewTasks,
   *  loadDefaultIntoTurnStepList, ...), or a small inline one for
   *  campaign.turnStepSlotAssignments-adjacent Settings controls. */
  function updateAppConfig(mutator) {
    const prevConfig = appConfig;
    const nextConfig = mutator(structuredCloneSafe(appConfig)) || appConfig;
    appConfig = nextConfig;
    notify();
    const thisConfig = appConfig;
    persistAppConfig().catch((err) => {
      console.warn('appConfig persist failed (IndexedDB)', err);
      if (appConfig === thisConfig) { appConfig = prevConfig; notify(); }
      notifyPersistError(err);
    });
    return get();
  }

  /** Sets the verified certificate payload that decides owned licenses
   *  (licensing.js effectiveLicenses), or clears it with null to fall back
   *  to this install's own ticks. Callers verify the signature first. */
  function setCertificate(payload) {
    accountCert = payload || null;
    notify();
  }

  // --- sync (Phase S2; see the block comment above createStore) -----------
  // core/sync.js does the networking and calls only these. Nothing here
  // runs for a campaign that isn't synced.

  const isSyncedEntry = (id) => !!(appConfig.campaigns.find((c) => c.id === id) || {}).sync;

  // Whether a campaign's content has ever been changed (`edited` on its
  // appConfig entry): false for a campaign created blank, set true on its
  // first change to any synced path. Device-only state (open panels,
  // drafts) and the updatedAt stamp don't count, so just looking around a
  // new install doesn't make its blank campaign "edited". Sync by default
  // (core/sync.js) leaves unedited campaigns local, so blanks don't
  // multiply across devices. Entries from before this flag have none.
  function noteEdited(id, prevDoc, nextDoc) {
    const entry = appConfig.campaigns.find((c) => c.id === id);
    if (!entry || entry.edited !== false || !prevDoc || !nextDoc || prevDoc === nextDoc) return;
    let changed = true;
    try {
      const same = { ...nextDoc, meta: { ...nextDoc.meta, updatedAt: prevDoc.meta && prevDoc.meta.updatedAt } };
      changed = diffDoc({ doc: withoutInlineBytes(prevDoc), meta: createReplica({}).meta }, withoutInlineBytes(same), { hlc: '0', policy: CAMPAIGN_SYNC_POLICY }).length > 0;
    } catch { /* treat as edited */ }
    if (!changed) return;
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => (c.id === id ? { ...c, edited: true } : c)) };
    persistAppConfig().catch((err) => console.warn('appConfig persist failed', err));
  }

  /** true / false, or undefined for a campaign from before the flag. */
  function campaignEdited(id) {
    const entry = appConfig.campaigns.find((c) => c.id === id);
    return entry ? entry.edited : undefined;
  }

  function scheduleSyncFlush(id) {
    if (!syncStates.has(id)) return;
    clearTimeout(syncTimers.get(id));
    syncTimers.set(id, setTimeout(() => {
      syncTimers.delete(id);
      if (flushSync(id)) persistSync(id).catch((err) => console.warn('sync state write failed', err));
    }, SYNC_FLUSH_MS));
  }

  /** Diffs the campaign's sync base against its live document into a new
   *  outbox batch. In memory only; returns whether a batch was added. */
  function flushSync(id) {
    clearTimeout(syncTimers.get(id));
    syncTimers.delete(id);
    const st = syncStates.get(id);
    const current = docs.get(id);
    if (!st || !current) return false;
    const view = withoutInlineBytes(current);
    if (view === st.base) return false;
    let next;
    try {
      const hlc = nextHlc(st.hlc, Date.now(), st.deviceId);
      const ops = diffDoc({ doc: st.base, meta: st.meta }, view, { hlc, policy: CAMPAIGN_SYNC_POLICY });
      if (!ops.length) { syncStates.set(id, { ...st, base: view }); return false; }
      const { meta } = applyOps({ doc: st.base, meta: st.meta }, ops);
      const batchId = `b${Date.now().toString(36)}.${st.nextBatch}`;
      next = { ...st, base: view, meta, hlc, outbox: [...st.outbox, { batchId, ops }], nextBatch: st.nextBatch + 1 };
    } catch (err) {
      // A diff that can't be made (it never should) leaves the base alone,
      // so the change is retried with the next one rather than lost.
      console.warn('sync diff failed', err);
      return false;
    }
    syncStates.set(id, next);
    for (const fn of localOpsSubs) {
      try { fn(id); } catch (e) { console.error('sync subscriber failed', e); }
    }
    return true;
  }

  /** Writes the campaign's live document and its sync state in ONE
   *  transaction, chained per campaign so a later write never lands before
   *  an earlier one. Both values are read when the write starts, so the
   *  last write always carries the latest of each. */
  function persistSync(id) {
    const prev = syncWrites.get(id) || Promise.resolve();
    const run = prev.catch(() => {}).then(async () => {
      const st = syncStates.get(id);
      const current = docs.get(id);
      if (!st) return;
      const database = await db();
      const entries = [[syncStateKey(id), st]];
      if (current) entries.push([campaignDocKey(id), current]);
      await idbPutMany(database, entries);
    });
    syncWrites.set(id, run);
    return run;
  }

  async function loadSyncState(id) {
    if (syncStates.has(id) || !isSyncedEntry(id)) return;
    const database = await db();
    const st = await idbGet(database, syncStateKey(id));
    if (!st) return;
    syncStates.set(id, st);
    // A change saved just before the last reload or crash, but not yet
    // diffed, is found now: the stored base predates it.
    scheduleSyncFlush(id);
  }

  function setEntrySync(id, on) {
    appConfig = { ...appConfig, campaigns: appConfig.campaigns.map((c) => (c.id === id ? { ...c, sync: on || undefined } : c)) };
  }

  /** Whether a campaign syncs, and how far along it is. */
  function syncStatus(id) {
    if (!isSyncedEntry(id)) return null;
    const st = syncStates.get(id);
    return { synced: true, loaded: !!st, cursor: st ? st.cursor : 0, pending: st ? st.outbox.length : 0 };
  }

  /** Starts syncing a local campaign. Resolves to the first snapshot to
   *  upload: `{replica: {doc, meta}, cursor: 0}`. */
  async function enableSync(id, { deviceId }) {
    if (!(await loadCampaign(id))) throw new Error('Unknown campaign');
    const current = docs.get(id);
    syncStates.set(id, {
      v: 1, deviceId, base: withoutInlineBytes(current), meta: createReplica({}).meta,
      hlc: null, cursor: 0, outbox: [], nextBatch: 0,
    });
    setEntrySync(id, true);
    await persistAppConfig();
    await persistSync(id);
    return syncSnapshot(id);
  }

  /** Stops syncing a campaign on this device. The local copy is untouched. */
  async function disableSync(id) {
    clearTimeout(syncTimers.get(id));
    syncStates.delete(id);
    setEntrySync(id, false);
    const database = await db();
    await idbDelete(database, syncStateKey(id));
    await persistAppConfig();
    notify();
  }

  /** The op batches waiting for the server, newest change included. */
  async function pendingBatches(id) {
    await loadSyncState(id);
    if (flushSync(id)) await persistSync(id);
    const st = syncStates.get(id);
    return st ? st.outbox.map((b) => ({ batchId: b.batchId, ops: b.ops })) : [];
  }

  /** The server stored a batch as `seq`. */
  async function ackBatch(id, batchId, seq) {
    const st = syncStates.get(id);
    if (!st) return;
    syncStates.set(id, { ...st, outbox: st.outbox.filter((b) => b.batchId !== batchId), cursor: Math.max(st.cursor, seq || 0) });
    await persistSync(id);
  }

  /** Merges ops from another device (server seq `seq`) into a synced
   *  campaign, persists, and notifies like any other change. A local change
   *  not yet diffed is diffed first, so it can't be mistaken for part of
   *  the remote one. */
  async function applyRemote(id, ops, seq) {
    if (!docs.has(id) && !(await loadCampaign(id))) throw new Error('Unknown campaign');
    await loadSyncState(id);
    if (!syncStates.has(id)) throw new Error('Campaign is not synced');
    flushSync(id);
    const st = syncStates.get(id);
    const current = docs.get(id);
    let nextDoc = current;
    let meta = st.meta;
    let hlc = st.hlc;
    let base = st.base;
    if (ops && ops.length) {
      const merged = applyOps({ doc: current, meta: st.meta }, ops);
      nextDoc = merged.doc;
      meta = merged.meta;
      base = withoutInlineBytes(nextDoc);
      const latest = ops.reduce((m, op) => (op.t > m ? op.t : m), '');
      hlc = observeHlc(hlc, latest, Date.now(), st.deviceId);
    }
    syncStates.set(id, { ...st, base, meta, hlc, cursor: Math.max(st.cursor, seq || 0) });
    if (nextDoc !== current) {
      Map.prototype.set.call(docs, id, nextDoc);
      const entry = appConfig.campaigns.find((c) => c.id === id);
      if (entry && nextDoc.meta && nextDoc.meta.title && entry.title !== nextDoc.meta.title) {
        appConfig = renameCampaignEntry(appConfig, id, nextDoc.meta.title);
        persistAppConfig().catch((err) => console.warn('appConfig persist failed', err));
      }
    }
    await persistSync(id);
    if (nextDoc !== current) {
      await warmBlobCache(nextDoc);
      notify();
    }
  }

  /** What another device needs to start from: the synced view of the base
   *  and its clocks, plus the seq they include. */
  async function syncSnapshot(id) {
    await loadSyncState(id);
    if (flushSync(id)) await persistSync(id);
    const st = syncStates.get(id);
    if (!st) throw new Error('Campaign is not synced');
    return { replica: { doc: syncedView(st.base, CAMPAIGN_SYNC_POLICY), meta: st.meta }, cursor: st.cursor };
  }

  /** Brings a synced campaign onto this device from its snapshot, as a new
   *  campaign or replacing the local copy with the same id. A replaced copy
   *  goes to the backup slot first, and its device-only state (drafts,
   *  open panels) is kept. */
  async function adoptSyncedCampaign({ id, title, replica, cursor, deviceId }) {
    const database = await db();
    const existing = appConfig.campaigns.some((c) => c.id === id);
    const local = existing ? (docs.get(id) || await idbGet(database, campaignDocKey(id))) : null;
    let doc = migrateDocument(structuredCloneSafe(replica.doc));
    if (local) doc = withLocalPaths(doc, local, CAMPAIGN_SYNC_POLICY);
    doc.meta.id = id;
    doc = backfillCampaignTurnStepSlots(doc);
    doc = ensureRulesetGuideDefault(doc, resolveActiveStatRuleset(appConfig, id));
    if (local) await idbPut(database, campaignBackupDocKey(id), local);
    if (!existing) {
      const now = new Date().toISOString();
      // The profile the account uses for it, when account settings know.
      const chosen = accountSync && accountSync.base && accountSync.base.campaignProfiles && accountSync.base.campaignProfiles[id];
      const profileId = (chosen && appConfig.profiles.some((p) => p.id === chosen) && chosen) || (appConfig.profiles[0] && appConfig.profiles[0].id) || null;
      appConfig = { ...appConfig, campaigns: [...appConfig.campaigns, { id, title: title || doc.meta.title, profileId, createdAt: now, updatedAt: now, edited: true }] };
    }
    setEntrySync(id, true);
    appConfig = renameCampaignEntry(appConfig, id, title || doc.meta.title);
    syncStates.set(id, { v: 1, deviceId, base: replica.doc, meta: replica.meta, hlc: null, cursor: cursor || 0, outbox: [], nextBatch: 0 });
    Map.prototype.set.call(docs, id, doc);
    await persistAppConfig();
    // Anything this device's migrations or backfills changed is diffed
    // into the outbox here, and written with the document.
    flushSync(id);
    await persistSync(id);
    await warmBlobCache(doc);
    if (id === appConfig.activeCampaignId) await refreshBackupMeta(id);
    notify();
    return id;
  }

  /** "Keep both": gives a local campaign a new id (and a title suffix) so a
   *  synced campaign with its old id can come in beside it. Resolves to the
   *  new id. */
  async function forkCampaign(id, suffix = ' (this device)') {
    const database = await db();
    const local = docs.get(id) || await idbGet(database, campaignDocKey(id));
    if (!local) throw new Error('Unknown campaign');
    const fresh = defaultCampaign().meta.id;
    const title = `${local.meta.title || 'Campaign'}${suffix}`;
    const forked = { ...structuredCloneSafe(local), meta: { ...local.meta, id: fresh, title } };
    await idbPut(database, campaignDocKey(fresh), forked);
    appConfig = {
      ...appConfig,
      activeCampaignId: appConfig.activeCampaignId === id ? fresh : appConfig.activeCampaignId,
      campaigns: appConfig.campaigns.map((c) => (c.id === id ? { ...c, id: fresh, title, sync: undefined } : c)),
    };
    await persistAppConfig();
    await idbDelete(database, campaignDocKey(id));
    await idbDelete(database, campaignBackupDocKey(id));
    docs.delete(id);
    docs.set(fresh, forked);
    notify();
    return fresh;
  }

  // --- account settings sync (domain/accountSettings.js) ----------------
  // Profiles, Turn Step Lists, the TOC library and each synced campaign's
  // profile, shared by every device of the account. core/sync.js fetches
  // the account's copy (a replica: document + per-field clocks), this
  // merges it with what changed here since the last sync, and sync.js
  // uploads the result if anything here was new.

  let accountSync = null;
  let accountSyncLoaded = false;

  async function loadAccountSync() {
    if (accountSyncLoaded) return;
    const database = await db();
    accountSync = (await idbGet(database, SYNC_ACCOUNT_KEY)) || null;
    accountSyncLoaded = true;
  }

  /** The account settings sync state: the server version last merged, and
   *  whether changes made here wait to be uploaded. Null before the first
   *  sync, or for another account. */
  async function accountSettingsStatus(userId) {
    await loadAccountSync();
    if (!accountSync || accountSync.userId !== userId) return null;
    const view = accountSettingsView(appConfig, accountSync.base);
    let pending = accountSync.outbox.length > 0;
    if (!pending) {
      try { pending = diffDoc({ doc: accountSync.base, meta: accountSync.meta }, view, { hlc: '0' }).length > 0; } catch { pending = true; }
    }
    return { version: accountSync.version, pending };
  }

  /** Merges the account's settings into this device's.
   *  `remote`: `{version, replica}` from the server, `'same'` when the
   *  server still has the version this device last merged, or null when
   *  the account has none yet. The first merge for an account joins: the
   *  account's settings win, this device's extras are added, and its
   *  untouched seeds fold into the account's (campaigns pointing at them
   *  are moved over). Resolves to `{upload, replica, baseVersion}`:
   *  `upload` is true when the account copy lacks something from here. */
  async function mergeAccountSettings({ userId, deviceId, remote }) {
    await loadAccountSync();
    const st = accountSync && accountSync.userId === userId ? accountSync : null;
    if (remote === 'same' && !st) throw new Error('Account settings were never synced here.');
    const hlc = nextHlc(st && st.hlc, Date.now(), deviceId);
    let start;
    let version;
    if (remote === 'same') { start = { doc: st.base, meta: st.meta }; version = st.version; }
    else if (remote) { start = remote.replica; version = remote.version; }
    else { start = createReplica({}); version = 0; }

    let ops;
    let remap = null;
    if (st && remote) {
      // Steady state: what changed here since the last merge (plus anything
      // merged before but not yet uploaded), on top of the account's copy.
      ops = [...st.outbox, ...diffDoc({ doc: st.base, meta: st.meta }, accountSettingsView(appConfig, st.base), { hlc })];
    } else if (remote) {
      const joined = joinAccountSettings(remote.replica.doc, accountSettingsView(appConfig), { seeds: freshSeeds() });
      remap = joined.remap;
      ops = diffDoc(start, joined.view, { hlc });
    } else {
      // The account has none (first device, or sync was reset): all of it.
      ops = diffDoc(start, accountSettingsView(appConfig), { hlc });
    }
    const merged = applyOps(start, ops);

    const before = JSON.stringify(accountSettingsView(appConfig, merged.doc));
    let nextConfig = remap ? remapCampaignProfiles(appConfig, remap.profiles) : appConfig;
    nextConfig = withAccountSettings(nextConfig, merged.doc);
    const changed = !!remap || JSON.stringify(accountSettingsView(nextConfig, merged.doc)) !== before;
    accountSync = { v: 1, userId, deviceId, base: merged.doc, meta: merged.meta, hlc, version, outbox: ops };
    const database = await db();
    if (changed) {
      appConfig = nextConfig;
      await idbPutMany(database, [[APP_CONFIG_KEY, appConfig], [SYNC_ACCOUNT_KEY, accountSync]]);
      if (remap && Object.keys(remap.turnStepLists).length) await remapCampaignSlots(remap.turnStepLists);
      notify();
    } else {
      await idbPut(database, SYNC_ACCOUNT_KEY, accountSync);
    }
    return { upload: ops.length > 0 || !remote, replica: merged, baseVersion: version };
  }

  /** The server stored the merged settings as `version`. */
  async function ackAccountSettings(version) {
    await loadAccountSync();
    if (!accountSync) return;
    accountSync = { ...accountSync, version, outbox: [] };
    const database = await db();
    await idbPut(database, SYNC_ACCOUNT_KEY, accountSync);
  }

  /** After joining: every campaign here whose Turn Step slots pointed at a
   *  seed list that folded into the account's points at the account's. */
  async function remapCampaignSlots(listRemap) {
    const database = await db();
    for (const c of appConfig.campaigns) {
      const prev = docs.get(c.id) || await idbGet(database, campaignDocKey(c.id));
      if (!prev) continue;
      const next = remapTurnStepSlots(prev, listRemap);
      if (next === prev) continue;
      if (docs.has(c.id)) docs.set(c.id, next);
      if (docs.has(c.id)) await persistCampaignDoc(c.id, prev, next);
      else await idbPut(database, campaignDocKey(c.id), next);
    }
  }

  /** Called with a campaign id whenever a new outbox batch is ready. */
  function onLocalOps(fn) { localOpsSubs.add(fn); return () => localOpsSubs.delete(fn); }

  /** This device's sync keys (core/syncKeys.js): its key pair, the unlocked
   *  vault key and campaign keys, as CryptoKeys IndexedDB holds natively. */
  async function getSyncKeys() {
    const database = await db();
    return (await idbGet(database, SYNC_KEYS_KEY)) || {};
  }
  async function setSyncKeys(patch) {
    const database = await db();
    const next = { ...((await idbGet(database, SYNC_KEYS_KEY)) || {}), ...patch };
    await idbPut(database, SYNC_KEYS_KEY, next);
    return next;
  }

  // --- storage visibility + recovery (ADR 0005 follow-up) ----------------
  // Byte counts via Blob (UTF-8) rather than .length (UTF-16 code units) —
  // meaningfully different once a campaign has any non-ASCII text (accented
  // names, curly quotes from a pasted document, etc.), and this number
  // exists specifically so a GM can judge it against a real quota.
  function byteSize(str) { return str ? new Blob([str]).size : 0; }

  function storageInfo() {
    return {
      campaignBytes: byteSize(JSON.stringify(docs.get(appConfig.activeCampaignId))),
      hasBackup: backupMeta.exists,
      backupBytes: backupMeta.bytes,
    };
  }

  // Restore the ACTIVE campaign's one-slot backup — the counterpart to
  // persistCampaignDoc()'s backup write. Same "never show a change as there
  // when it didn't really happen" posture as update(): a bad/missing backup
  // rolls back to whatever was current rather than leaving doc
  // half-replaced.
  async function restoreBackup() {
    const activeId = appConfig.activeCampaignId;
    const prevDoc = docs.get(activeId);
    const database = await db();
    let backup;
    try { backup = await idbGet(database, campaignBackupDocKey(activeId)); }
    catch (e) { return { ok: false, error: e }; }
    if (!backup) return { ok: false, error: new Error('No backup available.') };
    const restored = importCampaign(backup);
    restored.meta.id = activeId;
    docs.set(activeId, restored);
    try {
      await persistCampaignDoc(activeId, restored, restored);
    } catch (e) {
      docs.set(activeId, prevDoc);
      notify();
      return { ok: false, error: e };
    }
    await warmBlobCache(restored);
    notify();
    moveInlineBlobs(activeId);
    return { ok: true };
  }

  // --- Reference Library doc blobs (direct follow-up request: "create a
  // bulk export/import to transfer the library records and docs
  // themselves from one browser to another") -----------------------------
  // Keyed by the SAME stable "file" identity documents.js's DOCS_MANIFEST/
  // refOverrides already use (e.g. "assets/docs/Foo.pdf") — never a
  // separate id, so a blob and its manifest entry/title-tag overrides
  // always agree on which real doc they're both talking about. Plain
  // Blobs in, plain Blobs out — the UI layer builds a blob: object URL
  // from whatever's returned when it actually needs to display one.
  async function putDocBlob(key, blob) {
    const database = await db();
    await idbPut(database, key, blob, DOC_BLOB_STORE);
    // An old export's attachment arriving under its pre-S3 key: move it to
    // its content key now rather than at the next load.
    const activeId = appConfig.activeCampaignId;
    if (documentsToRekey(docs.get(activeId)).some((r) => r.oldKey === key)) moveInlineBlobs(activeId);
    // A gallery image that arrived from another device (S3): show it now.
    const doc = docs.get(activeId);
    if (doc && !blobDataUrls.has(key) && blobKeysToInline(doc).includes(key)) {
      blobDataUrls.set(key, await blobToDataUrl(blob));
      notify();
    }
  }
  /** The content key (`sha256:<hex>`) some bytes would be stored under. */
  function contentKeyFor(blob) { return blobKeyFor(blob); }
  /** Stores bytes under their content key and resolves to that key. */
  async function putContentBlob(blob) {
    const key = await blobKeyFor(blob);
    const database = await db();
    await idbPut(database, key, blob, DOC_BLOB_STORE);
    return key;
  }
  async function getDocBlob(key) {
    const database = await db();
    const aliases = await loadBlobAliases(database);
    const resolved = resolveBlobAlias(aliases, key);
    return (await idbGet(database, resolved, DOC_BLOB_STORE)) || (resolved !== key ? idbGet(database, key, DOC_BLOB_STORE) : undefined);
  }
  async function deleteDocBlob(key) {
    const database = await db();
    await idbDelete(database, key, DOC_BLOB_STORE);
  }
  /** The in-memory data: URL for a moved image or document, or undefined
   *  when its bytes aren't on this device. Synchronous, for rendering. */
  function blobDataUrl(key) { return blobDataUrls.get(key); }
  /** Every stored key, plus each old key whose re-keyed bytes are here
   *  (`withAliases: false` for just the stored keys, as an export wants). */
  async function listDocBlobKeys({ withAliases = true } = {}) {
    const database = await db();
    const keys = await idbKeys(database, DOC_BLOB_STORE);
    if (!withAliases) return keys;
    const aliases = await loadBlobAliases(database);
    const present = new Set(keys);
    return [...keys, ...Object.keys(aliases).filter((k) => !present.has(k) && present.has(aliases[k]))];
  }

  // --- optional File System Access binding (OneDrive-synced folder) -----
  function supportsFileBinding() { return typeof window !== 'undefined' && 'showSaveFilePicker' in window; }
  async function bindFile() {
    if (!supportsFileBinding()) throw new Error('File binding unsupported in this browser.');
    boundFileHandle = await window.showSaveFilePicker({
      suggestedName: 'gmatlas-campaign.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });
    await saveBoundFile();
  }
  async function saveBoundFile() {
    if (!boundFileHandle) return;
    const w = await boundFileHandle.createWritable();
    await w.write(exportDocument());
    await w.close();
  }

  return {
    load, get, update, subscribe, onPersistError,
    export: exportDocument, import: importDocument, newCampaign,
    supportsFileBinding, bindFile, saveBoundFile,
    storageInfo, restoreBackup,
    putDocBlob, putContentBlob, contentKeyFor, getDocBlob, deleteDocBlob, listDocBlobKeys, blobDataUrl,
    listCampaigns, switchCampaign, renameCampaign, setCampaignProfile, deleteCampaign, exportCampaignById,
    loadCampaign, peekCampaign, updateCampaign,
    listProfiles, getActiveProfile, getAppConfig, createProfile, updateProfile, renameProfile,
    addTurnStepList, updateAppConfig, setCertificate,
    campaignEdited, syncStatus, enableSync, disableSync, pendingBatches, ackBatch, applyRemote, syncSnapshot,
    adoptSyncedCampaign, forkCampaign, onLocalOps, getSyncKeys, setSyncKeys,
    accountSettingsStatus, mergeAccountSettings, ackAccountSettings,
    STORAGE_KEY, BACKUP_KEY, LEGACY_KEYS,
  };
}

function safeParse(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

export const store = createStore();
