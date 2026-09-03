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
import { createCampaign, renameCampaignEntry, setActiveCampaign, createRulesProfile, reassignCampaignProfile, backfillDefaultTurnSteps, backfillDefaultCrewTasks } from '../domain/rulesProfiles.js';
import { TURN_STEPS_5PFH } from '../data/turnStepsDefault5pfh.js';
import { CREW_TASKS_5PFH } from '../data/crewTasksDefault5pfh.js';

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

function createStore() {
  const subs = new Set();
  const persistErrorSubs = new Set();
  // appConfig: { activeCampaignId, campaigns: [{id,title,profileId,...}], profiles: [...] }
  let appConfig = defaultAppConfig();
  // Loaded campaign documents, keyed by campaign id — the active one is
  // always present once load() resolves; others load lazily on switch.
  const docs = new Map();
  let dbPromise = null;
  let boundFileHandle = null;
  // Kept in sync with the ACTIVE campaign's backup record so storageInfo()
  // (read by every Settings render) stays synchronous — an async IndexedDB
  // read on every render would be a much bigger ripple for no real benefit.
  let backupMeta = { exists: false, bytes: 0 };

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
  // active profile's Turn Step and Crew Tasks definitions are spliced in
  // the same way, as top-level `turnSteps`/`crewTasks` (not campaign
  // content — never persisted back, update()'s mutator still clones the
  // RAW doc).
  function overlayProfile(rawDoc) {
    if (!rawDoc) return rawDoc;
    const profile = activeProfile();
    if (!profile) return rawDoc;
    return { ...rawDoc, settings: { ...rawDoc.settings, ...profile.ruleset }, turnSteps: profile.turnSteps, crewTasks: profile.crewTasks };
  }

  async function refreshBackupMeta(campaignId) {
    const database = await db();
    const backup = await idbGet(database, campaignBackupDocKey(campaignId));
    backupMeta = { exists: !!backup, bytes: byteSize(JSON.stringify(backup || null)) };
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
      // won't run) — fills in the 5PFH Turn Step/Crew Tasks seed content
      // only for a profile literally named "5PFH" with no steps/tasks of
      // its own yet. See domain/rulesProfiles.js's own comment for why
      // this is safe.
      let backfilled = backfillDefaultTurnSteps(appConfig, TURN_STEPS_5PFH);
      backfilled = backfillDefaultCrewTasks(backfilled, CREW_TASKS_5PFH);
      if (backfilled !== appConfig) {
        appConfig = backfilled;
        await idbPut(database, APP_CONFIG_KEY, appConfig);
      }
      const activeId = appConfig.activeCampaignId;
      let activeDoc = await idbGet(database, campaignDocKey(activeId));
      activeDoc = activeDoc ? migrateDocument(activeDoc) : defaultCampaign();
      docs.set(activeId, activeDoc);
      await refreshBackupMeta(activeId);
      notify();
      return get();
    }

    // No appConfig yet — one-time upgrade path (mirrors the pre-Rules-
    // Profile legacy-absorption logic exactly, just wrapped into the new
    // registry afterward instead of written straight to CAMPAIGN_KEY).
    let legacyDoc = await idbGet(database, CAMPAIGN_KEY);
    if (!legacyDoc) {
      const existing = safeParse(localStorage.getItem(STORAGE_KEY));
      if (existing) {
        legacyDoc = existing;
      } else if (!localStorage.getItem(MIGRATED_FLAG)) {
        const legacy = readLegacyKeys(localStorage);
        legacyDoc = Object.keys(legacy).length ? migrateFromLegacyKeys(legacy) : defaultCampaign();
        localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
      } else if (typeof window !== 'undefined' && window.__importedCampaign) {
        try { legacyDoc = window.__importedCampaign; } catch (e) { legacyDoc = defaultCampaign(); }
      } else {
        legacyDoc = defaultCampaign();
      }
    }
    const wrapped = wrapLegacyCampaignIntoAppConfig(legacyDoc);
    appConfig = wrapped.appConfig;
    docs.set(wrapped.campaignDoc.meta.id, wrapped.campaignDoc);
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await idbPut(database, campaignDocKey(wrapped.campaignDoc.meta.id), wrapped.campaignDoc);
    notify();
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
   *  outcome to throw from anymore). */
  function update(mutator) {
    const activeId = appConfig.activeCampaignId;
    const prev = docs.get(activeId);
    const next = mutator(structuredCloneSafe(prev));
    const nextDoc = next || prev;
    nextDoc.meta.updatedAt = new Date().toISOString();
    docs.set(activeId, nextDoc);
    notify();
    persistCampaignDoc(activeId, prev, nextDoc).catch((err) => {
      console.warn('persist failed (IndexedDB)', err);
      if (docs.get(activeId) === nextDoc) { docs.set(activeId, prev); notify(); }
      notifyPersistError(err);
    });
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
    await idbPut(database, campaignDocKey(campaignId), nextDoc);
  }

  async function persistAppConfig() {
    const database = await db();
    await idbPut(database, APP_CONFIG_KEY, appConfig);
  }

  // --- portability: one serialize path → lossless by construction -------
  function exportDocument() { return JSON.stringify(get(), null, 2); }

  // Imported JSON replaces the ACTIVE campaign's content in place — same
  // "Import Campaign JSON" behavior as before multi-campaign existed. It
  // does not create a new campaign entry; switch to (or create) the
  // campaign you want the import to land in first if that's the goal.
  async function importDocument(rawText) {
    const activeId = appConfig.activeCampaignId;
    const imported = importCampaign(safeParse(rawText));
    imported.meta.id = activeId;
    docs.set(activeId, imported);
    await persistCampaignDoc(activeId, imported, imported);
    appConfig = renameCampaignEntry(appConfig, activeId, imported.meta.title);
    await persistAppConfig();
    notify();
    return get();
  }

  /** Register + switch to a brand-new campaign under the given (or default)
   *  Rules Profile. Does NOT touch any other campaign's data. */
  async function newCampaign({ title, profileId } = {}) {
    const chosenProfileId = profileId || (appConfig.profiles[0] && appConfig.profiles[0].id) || null;
    const created = createCampaign(appConfig, { title, profileId: chosenProfileId });
    appConfig = setActiveCampaign(created.appConfig, created.doc.meta.id);
    docs.set(created.doc.meta.id, created.doc);
    const database = await db();
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await idbPut(database, campaignDocKey(created.doc.meta.id), created.doc);
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
      target = migrateDocument(raw || defaultCampaign());
      docs.set(campaignId, target);
    }
    appConfig = setActiveCampaign(appConfig, campaignId);
    await idbPut(database, APP_CONFIG_KEY, appConfig);
    await refreshBackupMeta(campaignId);
    notify();
    return get();
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
    notify();
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
  }
  async function getDocBlob(key) {
    const database = await db();
    return idbGet(database, key, DOC_BLOB_STORE);
  }
  async function deleteDocBlob(key) {
    const database = await db();
    await idbDelete(database, key, DOC_BLOB_STORE);
  }
  async function listDocBlobKeys() {
    const database = await db();
    return idbKeys(database, DOC_BLOB_STORE);
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
    putDocBlob, getDocBlob, deleteDocBlob, listDocBlobKeys,
    listCampaigns, switchCampaign, renameCampaign, setCampaignProfile,
    listProfiles, getActiveProfile, createProfile, updateProfile, renameProfile,
    STORAGE_KEY, BACKUP_KEY, LEGACY_KEYS,
  };
}

function safeParse(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}

export const store = createStore();
